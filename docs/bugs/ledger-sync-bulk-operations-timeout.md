# Bug: Ledger Sync Failure With Bulk Operations

## 1. Executive Summary

Ledger synchronization had two related but distinct failure modes. The first occurred while creating a ledger and linking transactions: the frontend queued `upsert_ledger` data using the ledger's `id`, while the backend accepted only `ledger.clientId`. The server skipped the upsert, so subsequent `link_entry` operations failed the ledger ownership check. A captured request contained 506 operations but acknowledged only four deletes.

After the identifier contract was corrected, bulk removal exposed a second bottleneck. Removing 173 entries created 173 `unlink_entry` operations. The backend processed every unlink sequentially, performing one ownership query and one entry deletion per operation before the final canonical reads. At this scale, the request could exceed the available request timeout and cause Axios retries.

The fixes were intentionally narrow. The frontend now includes `clientId` in queued ledger upserts, and the backend batches contiguous unlink operations with one ownership query and one `deleteMany`. No timeout, retry behavior, API contract, IndexedDB schema, or frontend removal behavior was changed.

## 2. User-Visible Symptoms

### Scenario A

- The user created a ledger and linked transactions locally.
- Initial sync behavior involved a large durable IndexedDB outbox.
- The original captured failed request contained:

  ```text
  506 operations

  327 unlink_entry
  173 link_entry
  4 delete_ledger
  2 upsert_ledger

  processedOperationIds: 4
  bulkWriteCandidateCount: 0
  responseEntries: 38
  ```

- The two ledger upserts were skipped because the queued ledger objects did not contain the `clientId` field required by the backend.
- Without the server-side ledgers, the 173 link operations failed the ownership check and did not become bulk-write candidates.
- This was an identifier-contract failure, not a confirmed link batching failure.

After Fix #1, the production-shaped upsert was accepted and link operations became bulk-write candidates. The regression integration tests verify this path.

### Scenario B

- Approximately 173 transactions had successfully synced into a ledger.
- The user selected and removed all transactions from the ledger in one bulk action.
- The ledger itself was retained, with zero local entries.
- The removal created 173 `unlink_entry` operations.
- Sync then failed after approximately three to four Axios retries at bulk scale.

This was a separate failure mode from Scenario A. Its bottleneck was the backend's sequential unlink implementation: each operation awaited a ledger ownership query and an entry deletion.

## 3. System Architecture

The operation-based sync flow is:

```text
UI
→ Redux/LedgerSlice
→ IndexedDB outbox
→ getSyncOperations()
→ Axios PUT /api/v1/ledgers/sync
→ Express controller
→ LedgerService.syncOperations()
→ MongoDB
→ canonical response
→ IndexedDB cleanup/replacement
```

Relevant implementation points:

| Stage             | File                                                                         | Relevant function or component                                       |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Ledger UI         | `money-mind-client/src/features/transactions/components/LedgerList.tsx`      | Ledger list and sync action                                          |
| Ledger detail UI  | `money-mind-client/src/features/transactions/components/LedgerDetails.tsx`   | Bulk remove dispatch                                                 |
| Redux operations  | `money-mind-client/src/features/transactions/store/ledgerSlice.ts`           | `createLedger`, `updateLedger`, `removeLedgerEntries`, `syncLedgers` |
| IndexedDB outbox  | `money-mind-client/src/features/transactions/helpers/indexDB/ledgerStore.ts` | `addSyncOperation`, `getSyncOperations`, `removeSyncOperations`      |
| HTTP client       | `money-mind-client/src/features/transactions/services/ledgerService.ts`      | `syncLedgers`                                                        |
| Retry interceptor | `money-mind-client/src/shared/services/axiosClient.ts`                       | Axios response retry interceptor                                     |
| Controller        | `money-mind-server/src/modules/transactions/ledger.controller.ts`            | `syncLedgers`                                                        |
| Sync service      | `money-mind-server/src/modules/transactions/ledger.service.ts`               | `syncOperations`                                                     |
| Mongo models      | `money-mind-server/src/modules/transactions/models/ledger.model.ts`          | `Ledger`, `LedgerEntry`                                              |

On a successful response, the client removes acknowledged operation IDs from IndexedDB, replaces the local canonical ledger entries, and returns the canonical ledger and entry state to Redux. If the request fails before that response is processed, the outbox operations remain queued.

## 4. Investigation Method

The investigation started with source tracing from the UI bulk action through Redux, IndexedDB, Axios, the Express route, `LedgerService.syncOperations()`, MongoDB, and the final response handling.

Source inspection identified the operation types and skip conditions, but it could not establish the actual queue size, operation mix, identifier values, acknowledgement count, or runtime failure boundary. Temporary `[LEDGER_SYNC_DEBUG]` instrumentation was therefore added at the client request boundary, Axios retry boundary, controller boundary, service operation categories, bulk-write boundary, and final canonical reads.

The instrumentation measured operation counts, operation identifiers, entry identifiers, ledger/transaction pairs, upsert client IDs, processed IDs, operation-category counts, bulk-write results, query durations, total service duration, and request errors. It was removed after the runtime investigation. No diagnostic code remains in the final application changes.

## 5. Runtime Evidence

The original failed request captured during the investigation contained exactly:

```text
506 operations

327 unlink_entry
173 link_entry
4 delete_ledger
2 upsert_ledger

processedOperationIds: 4
bulkWriteCandidateCount: 0
responseEntries: 38
```

This established that:

- The request contained both mutation categories and was substantially larger than the 173 newly linked transactions alone.
- The four delete operations were acknowledged.
- No link operation became a bulk-write candidate.
- The response contained 38 entries, rather than the expected complete linked state.
- The server was receiving the request; the failure was not proven to occur before request receipt.

The later local reproduction after the identifier fix showed a request with 174 operations: one upsert and 173 links. It returned HTTP 200 and acknowledged 140 operations; the remaining 34 links were sent in a second request and returned HTTP 200 with all 34 acknowledged. This demonstrated the separate UUID-key ordering behavior described in Section 14.

For the bulk-unlink path, source tracing established the database workload and the sequential await behavior. The integration regression added for the fix verifies completion of 173 unlink operations against a real replica-set test database.

## 6. Root Cause #1 — Upsert Identifier Contract

The frontend originally queued an `upsert_ledger` operation containing the local ledger object with its `id` field. The backend service checked `incoming.clientId`:

```text
Frontend produced: ledger.id
Backend expected:  ledger.clientId
```

The relevant paths were:

- `money-mind-client/src/features/transactions/store/ledgerSlice.ts`
  - `createLedger`
  - `updateLedger`
- `money-mind-server/src/modules/transactions/ledger.service.ts`
  - `syncOperations`

The backend behavior was:

```text
upsert skipped
→ ledger unavailable on server
→ link ownership check failed
→ 173 links skipped
```

Because link ownership is resolved from server-side ledgers, a skipped upsert prevented the dependent link operations from being accepted.

## 7. Fix #1

The frontend now includes the local ledger identifier as `clientId` when creating the queued upsert operation:

```text
ledger.id → ledger.clientId
```

The change is in `createLedger` and `updateLedger` in `ledgerSlice.ts`. `ILedger` was also extended with the optional `clientId` field in `types/ledger.ts` so sync-shaped ledger data is represented by the client type system.

Regression coverage added:

- A frontend ledger slice test verifies that creating a ledger queues an `upsert_ledger` operation with a non-empty `clientId`.
- Backend integration tests verify that a production-shaped upsert creates the ledger and that subsequent links become bulk-write candidates and are persisted.

## 8. Root Cause #2 — Sequential Unlink Processing

Bulk removal creates one operation for every selected entry:

```text
173 unlink_entry operations
```

The previous backend implementation processed each operation in the main sync loop as follows:

```text
per unlink:
  Ledger.exists()
  LedgerEntry.deleteOne()
```

Both database calls were awaited before the next unlink was processed. For 173 operations, the approximate workload was:

```text
173 × Ledger.exists()
+ 173 × LedgerEntry.deleteOne()
+ 2 final canonical queries
= approximately 348 sequential calls
```

The final canonical queries were unchanged:

- `Ledger.find(...).sort(...).lean()`
- `LedgerEntry.find(...).lean()`

The 29-second Lambda timeout is configured in `money-mind-server/serverless.yml`. The frontend Axios client has a 60-second request timeout and retries network-level failures and 502/503/504 responses up to three times. A sequential workload of this size can exceed the available request time and trigger retries. No timeout or retry configuration was changed.

## 9. Fix #2 — Batched Unlink Processing

The backend now applies the same contiguous-block strategy used for link operations. For each contiguous unlink block it performs:

```text
one ownership query
+
one deleteMany
+
existing final canonical queries
```

The comparison is:

| Metric                     | Before | After |
| -------------------------- | -----: | ----: |
| Ownership queries          |    173 |     1 |
| Delete operations          |    173 |     1 |
| Final canonical queries    |      2 |     2 |
| Approximate database calls |    348 |     4 |

The implementation preserves the existing semantics:

- **Unauthorized entries:** operations targeting ledgers not owned by the authenticated user are not included in the deletion filter and are not acknowledged.
- **Missing entries:** an owned operation is acknowledged even when no matching entry exists, matching the prior `deleteOne()` behavior.
- **Already-deleted entries:** treated the same as missing entries and acknowledged when the ledger is owned.
- **Duplicate operations:** duplicate entry IDs are de-duplicated in the bulk deletion filter, while each owned operation is acknowledged in its original order.
- **Multiple ledgers:** entry IDs are grouped by ledger so the deletion filter retains the ledger ownership constraint.
- **Processed IDs:** IDs are appended in the original order of each unlink block. Unrelated operations remain in their original relative position because blocks are processed without reordering.
- **MongoDB errors:** errors from the ownership query or `deleteMany()` are allowed to propagate; they are not swallowed.

The final canonical ledger and entry queries were left unchanged.

## 10. Why Retries Made The Symptom Worse

The IndexedDB outbox is durable. Operations remain in `ledger_sync_operations` until the server returns their IDs in `processedOperationIds` and the client calls `removeSyncOperations()`.

When a sync request fails or times out before the client processes a successful response:

1. The pending operations remain in IndexedDB.
2. Axios retries the same pending request according to its existing retry policy.
3. The same large operation set can be sent again.
4. Each retry repeats the expensive sequential unlink work.

The investigation did not establish overlapping Lambda executions, so no such claim is made here.

## 11. Tests And Validation

Backend validation completed after Fix #2:

- Focused ledger service tests: **27 passed**
- Focused ledger sync integration tests: **10 passed**
- Full backend unit suite: **251 passed**, 16 suites
- Full backend integration suite: **181 passed**, 12 suites
- TypeScript: **passed**
- ESLint: **passed**
- `git diff --check`: **passed**

Regression coverage includes:

- 173 contiguous unlink operations use one ownership lookup and one bulk deletion instead of one ownership/deletion pair per operation.
- Owned entries are deleted.
- Unauthorized ledger entries are not deleted or acknowledged.
- Missing and already-deleted entries preserve acknowledgement behavior.
- Duplicate unlink operations are safe.
- Multiple unlink blocks remain separated by normal operations.
- `processedOperationIds` preserves operation order.
- MongoDB deletion errors are propagated.
- The actual 173-entry integration scenario leaves the ledger intact, removes all entries, acknowledges all operations, and returns successfully.
- Existing link batching tests remain passing.
- Existing sync response shape remains unchanged.

## 12. Files Changed

| Repository          | File                                                          | Purpose                                                   |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `money-mind-client` | `src/features/transactions/store/ledgerSlice.ts`              | Include `clientId` in queued ledger upserts.              |
| `money-mind-client` | `src/features/transactions/types/ledger.ts`                   | Represent optional `clientId` on client ledger data.      |
| `money-mind-client` | `src/features/transactions/__tests__/ledgerSlice.test.ts`     | Regression coverage for queued upsert identifiers.        |
| `money-mind-server` | `src/modules/transactions/ledger.service.ts`                  | Batch contiguous unlink operations.                       |
| `money-mind-server` | `src/modules/transactions/__tests__/ledger.service.spec.ts`   | Unit coverage for unlink batching and semantics.          |
| `money-mind-server` | `src/modules/transactions/__tests__/ledger.sync.intg.spec.ts` | End-to-end regression coverage for 173 unlink operations. |

## 13. Before / After Flow

### Before

```text
bulk unlink
→ 173 operations
→ 346 sequential DB calls
→ timeout
→ retry
```

### After

```text
bulk unlink
→ 173 operations
→ ownership query
→ deleteMany
→ canonical reads
→ response
→ queue cleanup
```

## 14. Remaining Known Issue

IndexedDB uses random UUIDs as the primary keys for sync operations. `getAll()` returns records in primary-key order, but that order is not guaranteed to represent causal or user mutation order.

Consequently, operations that logically require this order:

```text
upsert_ledger
→ link_entry
```

could theoretically be returned as:

```text
link_entry
→ upsert_ledger
```

In that case, the link may be processed before the ledger is available on the server and may be skipped until a later sync. This issue was identified during the investigation and was intentionally not changed as part of this bug fix. It was not the cause of the successful bulk-unlink failure and remains separate technical debt.

## 15. Prevention / Recommendations

- Share the sync-operation contract and required identifiers between client and server types where practical.
- Keep regression tests for every operation type: upsert, link, unlink, and delete.
- Batch database operations for bulk mutations while retaining authorization filters.
- Add runtime observability for queue size, operation type counts, processed IDs, and request duration.
- Test mixed operation sequences with multiple separated blocks.
- Test realistic operation counts, including 173-entry link and unlink scenarios.
- Preserve explicit tests for missing, duplicate, already-applied, and unauthorized operations.
- Treat operation ordering as a separate design concern and add a sequence mechanism when that follow-up is scheduled.

## 16. Timeline

1. Initial sync timeout was observed.
2. The sync architecture was traced from the UI through IndexedDB, Axios, Express, the service, MongoDB, and canonical response handling.
3. The 500/506-operation discrepancy was discovered, including 327 unlinks, 173 links, four deletes, and two upserts.
4. The upsert identifier mismatch was discovered.
5. The `clientId` fix was implemented.
6. Link sync was verified with regression tests and runtime reproduction.
7. Bulk unlink timeout behavior was reproduced and isolated as a separate path.
8. Sequential N+1 unlink processing was identified.
9. Contiguous unlink batching was implemented.
10. Automated validation completed.
11. The real-world bulk unlink scenario was represented by and verified through the end-to-end 173-entry integration regression.

## 17. Final Status

- **Bug fixed.**
- The bulk unlink reproduction now succeeds through the validated integration path.
- Tests pass across focused and full backend suites.
- No timeout or configuration workaround was required.
- The separate IndexedDB operation-ordering issue remains a follow-up item.

## Related Commits

- `[commit hash]` — `[commit message for Fix #1: upsert clientId contract]`
- `[commit hash]` — `[commit message for Fix #2: batched unlink processing]`
