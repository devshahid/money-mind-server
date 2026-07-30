# Keyword Search & Filter Bugs — Bugfix Design

## Overview

The transaction filter system has 10 interacting bugs across the frontend (`TransactionControls.tsx`) and backend (`transaction.validation.ts`, `transaction.service.ts`). These bugs cause validation errors, missing pagination, query overwrites, and excessive API calls. The fix targets: (1) frontend `cleanUpFilters` enhancement to strip `'all'` values and empty dates, (2) adding debounce to `amount` and `bankName` fields, (3) including `page`/`limit` in keyword search dispatch, (4) backend Joi schema fix for `transactionType`, and (5) backend `$and` wrapping to prevent `$or` overwrites. All changes are backward-compatible and isolated to their respective layers.

## Glossary

- **Bug_Condition (C)**: Any filter request where: `'all'` values are sent to the API, empty date strings fail Joi validation, keyword search omits pagination, `$or` clauses overwrite each other, amount/bankName trigger per-keystroke API calls, or `transactionType` fails validation
- **Property (P)**: All filters dispatch correctly sanitized payloads, keyword search respects pagination, combined `$or` conditions use `$and`, and debounced fields only fire after 1s of inactivity
- **Preservation**: All existing non-buggy filtering, pagination, category-only queries, mouse interactions, and filter drawer behavior remain unchanged
- **fetchTransactionLogs**: The service method in `transaction.service.ts` that builds the MongoDB aggregation pipeline for listing transactions
- **pagination.add()**: The utility in `pagination.ts` that appends `$skip`, `$limit`, and `$count` stages to the aggregation pipeline
- **cleanUpFilters()**: Frontend utility in `TransactionControls.tsx` that strips empty filter values before dispatching to the API
- **listTransactions**: Redux thunk action that calls the backend `/transactions/list` endpoint
- **handleSearch**: Frontend function that dispatches keyword search via `listTransactions`
- **fetchTransactionsSchema**: Joi validation schema in `transaction.validation.ts` that validates the request body

## Bug Details

### Bug Condition

The bugs manifest across 10 distinct scenarios spanning frontend payload construction and backend validation/query logic. The frontend sends invalid or unnecessary values (`'all'`, empty dates, missing pagination), while the backend has schema mismatches and query construction issues.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type TransactionFilterRequest
  OUTPUT: boolean

  // Frontend bugs (payload construction)
  hasMissingPagination := input.keyword IS NOT EMPTY
                          AND (input.page IS UNDEFINED OR input.limit IS UNDEFINED)

  hasAllValue := input.transactionType == 'all'
                 OR input.type == 'all'

  hasEmptyDate := input.dateFrom == ''
                  OR input.dateTo == ''

  hasUndebouncedAmount := input.amount changed within last 1000ms
                          AND previous API call still pending

  hasUndebouncedBankName := input.bankName changed within last 1000ms
                            AND previous API call still pending

  hasStringLabels := typeof input.labels == 'string'
                     AND input.labels contains ','

  // Backend bugs (validation & query)
  hasSchemaTypeMismatch := input.transactionType IN ['online', 'cash']
                           AND Joi.valid('credit', 'debit') rejects it

  hasOrOverwrite := input.keyword IS NOT EMPTY
                    AND input.category INCLUDES 'Uncategorized'
                    AND backend builds category $or THEN keyword $or overwrites it

  hasTotalCountError := hasOrOverwrite
                        AND $count stage counts wrong document set

  RETURN hasMissingPagination OR hasAllValue OR hasEmptyDate
         OR hasUndebouncedAmount OR hasUndebouncedBankName
         OR hasStringLabels OR hasSchemaTypeMismatch
         OR hasOrOverwrite OR hasTotalCountError
END FUNCTION
```

### Examples

- **Bug 1 — Missing pagination**: User types "Rachna" in search → frontend dispatches `{ keyword: 'Rachna' }` without `page`/`limit` → controller defaults `limit=10` → user sees only 10 results instead of expected 50
- **Bug 2 — 'All' value sent**: User leaves "All Transactions" dropdown at default → frontend sends `{ transactionType: 'all' }` → Joi rejects with `"transactionType" must be one of [credit, debit]`
- **Bug 3 — Labels as string**: Frontend sends `{ labels: 'food,transport' }` → Joi expects `Joi.array()` → validation error
- **Bug 4 — Undebounced amount**: User types "1500" → API calls fire for "1", "15", "150", "1500" (4 calls in rapid succession)
- **Bug 5 — Undebounced bankName**: User types "HDFC" → API calls fire for "H", "HD", "HDF", "HDFC"
- **Bug 6 — Empty dates**: User clears date picker → `{ dateFrom: '' }` sent → `Joi.date()` rejects empty string
- **Bug 7 — cleanUpFilters gap**: `cleanUpFilters()` strips `''` and `[]` but passes through `'all'` since `'all'.trim().length > 0`
- **Bug 8 — Schema mismatch**: Frontend sends `transactionType: 'online'` → Joi schema only allows `'credit'`/`'debit'` → 400 error
- **Bug 9 — $or overwrite**: Category "Uncategorized" sets `matchQuery.$or = [{category: {$exists: false}}, ...]` → keyword then sets `matchQuery.$or = [{narration: {$regex: ...}}, ...]` → category filter lost
- **Bug 10 — totalCount inflation**: Due to $or overwrite, the `$match`stage matches more documents than intended →`$count` returns inflated number

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Pagination without keyword (page/limit with no search term) must continue to work exactly as before
- Category-only filtering (without keyword) must continue to produce correct `$or` queries for "Uncategorized"
- Date range, bankName, transactionType, type, and labels filters must remain unaffected when values are valid
- The `limit=10` default in the controller must remain for requests that genuinely omit `limit`
- The `handleApplyFilter` dispatch (filter drawer "Apply" button) must continue working unchanged
- The `pagination.add()` utility behavior must remain unchanged
- Mouse clicks on filter controls must continue to work immediately (no debounce on dropdowns)
- Multi-select behavior for category and labels dropdowns must remain unchanged
- Filter reset (`handleResetFilters`) must continue clearing all filters correctly

**Scope:**
All inputs that do NOT trigger any of the 10 bug conditions should be completely unaffected. This includes:

- Filter-only requests with valid non-'all' values
- Pagination-only requests (changing page without active keyword)
- Bulk operations (sync, categorize, upload)
- Dropdown selections (category, labels, type, transactionType) — these fire immediately, not debounced
- Filter drawer open/close interactions

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Frontend `handleSearch` missing pagination**: `handleSearch` dispatches `listTransactions({ ...cleanUpFilters(), keyword: searchTerm })` without including `page` and `limit` from Redux state. The controller defaults to `limit=10` per its signature `page = 1, limit = 10`.

2. **Frontend `cleanUpFilters` incomplete sanitization**: The function only checks `value.trim().length > 0` for strings, so `'all'` passes through. It also doesn't handle empty date strings being different from "no filter" — `''` has `trim().length === 0` so it IS stripped, but this inconsistency leads to bugs when date fields are set then cleared in certain UI flows.

3. **Frontend missing debounce on amount/bankName**: The existing `debounce` utility function is defined in the component but may not be applied to amount and bankName filter inputs in the filter drawer, causing per-keystroke dispatches.

4. **Frontend labels type issue**: While `handleMultiChange` correctly produces arrays via `typeof value === 'string' ? value.split(',') : value`, edge cases in the Select component or direct state manipulation could send strings.

5. **Backend Joi schema `transactionType` mismatch**: `fetchTransactionsSchema` has `transactionType: Joi.string().valid('credit', 'debit')` but the frontend sends `'online'`/`'cash'` for the transaction method (cash vs digital). The service already handles these correctly (`if transactionType === 'online' → isCash = false`).

6. **Backend `$or` overwrite**: In `fetchTransactionLogs`, the category block (line ~210) sets `matchQuery.$or = [...]` and later the keyword block (line ~249) unconditionally assigns `matchQuery.$or = [...]`, overwriting the first.

7. **Backend totalCount cascading error**: Because `pagination.add()` calls `recordCount()` using the (incorrect) match stage, the count reflects the wrong document set when `$or` is overwritten.

## Correctness Properties

Property 1: Bug Condition - Keyword Search Respects Pagination

_For any_ keyword search request where the user has a configured `limit` in the frontend state, the dispatched API call SHALL include `page: '1'` and `limit` parameters, and the backend SHALL return at most `limit` matching results with a `totalCount` reflecting only keyword-matching documents.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Combined Keyword and Category Filter

_For any_ request where both a keyword and a category filter (including "Uncategorized" which uses `$or`) are provided, the backend SHALL apply both conditions correctly using `$and` to combine multiple `$or` clauses, returning only documents that match BOTH the keyword AND the category.

**Validates: Requirements 2.3**

Property 3: Bug Condition - Frontend Payload Sanitization

_For any_ filter dispatch where dropdown values are `'all'`, date fields are empty strings `''`, or labels are incorrectly typed as strings, the enhanced `cleanUpFilters` function SHALL strip `'all'` values (not send that field), strip empty date strings, and ensure labels remain as arrays — producing a valid payload that passes Joi validation.

**Validates: Requirements 2.4, 2.5, 2.6, 2.9, 2.10**

Property 4: Bug Condition - Debounced Input Fields

_For any_ keystroke in the amount or bankName filter fields, the frontend SHALL NOT dispatch an API call until 1 second of inactivity has passed, collapsing rapid keystrokes into a single API call with the final value.

**Validates: Requirements 2.7, 2.8**

Property 5: Bug Condition - Backend Validation Schema Accepts Valid Types

_For any_ request with `transactionType` set to `'online'`, `'cash'`, `'credit'`, or `'debit'`, the Joi validation schema SHALL accept the value without error. Values of `'all'` SHALL be stripped by the frontend before reaching the backend.

**Validates: Requirements 2.4, 2.10**

Property 6: Preservation - Non-Buggy Queries Unchanged

_For any_ request that does NOT trigger any of the 10 bug conditions (valid filter values, no keyword, correct pagination, properly typed inputs), the system SHALL produce the exact same results as the original code, preserving all existing filtering, pagination, and counting behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

---

**File**: `money-mind-client/src/features/transactions/components/TransactionControls.tsx`

**Bug 1 — Include pagination in keyword dispatch**:

**Function**: `handleSearch`

- Before: `void dispatch(listTransactions({ ...cleanUpFilters(), keyword: searchTerm }))`
- After: `void dispatch(listTransactions({ ...cleanUpFilters(), keyword: searchTerm, page: '1', limit: String(limit) }))`
- Resets to page 1 on new search (standard UX), preserves configured `limit` from Redux state

---

**Bug 2 & 7 — Enhance `cleanUpFilters` to strip 'all' values**:

**Function**: `cleanUpFilters`

- Add condition: if `typeof value === 'string'` and `value.toLowerCase() === 'all'`, skip the field (don't include in output)
- This prevents `transactionType: 'all'` and `type: 'all'` from reaching the backend
- Preserves existing empty-string and empty-array stripping logic

---

**Bug 3 — Ensure labels sent as array**:

**Function**: `cleanUpFilters`

- Add type guard: if key is `'labels'` or `'category'` and value is a string, convert to array via `value.split(',')`
- This handles edge cases where MUI Select `onChange` might produce a string for multi-select
- Note: In normal flow, `handleMultiChange` already produces arrays, but this is defensive

---

**Bug 4 — Debounce amount input**:

**Approach**: Apply the existing `debounce` utility (already defined in the component) to the amount filter input's `onChange` handler in the filter drawer. Store the debounced handler via `useMemo` or `useCallback` to prevent re-creation on each render.

- Create: `const debouncedAmountChange = useMemo(() => debounce((value) => setFilters({...filters, amount: value})), [filters])`
- Apply to the amount `TextField` `onChange` prop

---

**Bug 5 — Debounce bankName input**:

**Approach**: Same pattern as amount — apply debounce to the bankName filter input.

- Create: `const debouncedBankNameChange = useMemo(() => debounce((value) => setFilters({...filters, bankName: value})), [filters])`
- Apply to the bankName `TextField` `onChange` prop

---

**Bug 6 — Strip empty dates**:

**Function**: `cleanUpFilters`

- The existing logic already strips empty strings (`value.trim().length > 0`). Verify this covers `dateFrom: ''` and `dateTo: ''`.
- If dates are set then cleared to `''` in UI, `cleanUpFilters` already handles this. Add explicit test coverage to confirm.
- Edge case: if a date value is `null` or `undefined`, the `value != null` check already handles it.

---

**File**: `money-mind-server/src/modules/transactions/validators/transaction.validation.ts`

**Bug 8 — Fix transactionType Joi schema**:

**Schema**: `fetchTransactionsSchema`

- Before: `transactionType: Joi.string().valid('credit', 'debit').optional()`
- After: `transactionType: Joi.string().valid('online', 'cash', 'credit', 'debit').optional()`
- This allows the frontend's actual values (`online`/`cash`) to pass validation
- The service already maps these correctly: `online` → `isCash: false`, `cash` → `isCash: true`
- `'credit'`/`'debit'` are kept for backward compatibility

---

**File**: `money-mind-server/src/modules/transactions/transaction.service.ts`

**Bug 9 — Use `$and` to combine `$or` conditions**:

**Function**: `fetchTransactionLogs`

- Before: `matchQuery.$or = [{ narration: ... }, { notes: ... }, ...]` (unconditional assignment)
- After:
  ```typescript
  const keywordOr = [
    { narration: { $regex: keyword, $options: 'i' } },
    { notes: { $regex: keyword, $options: 'i' } },
    { category: { $regex: keyword, $options: 'i' } },
    { bankName: { $regex: keyword, $options: 'i' } },
    { amount: keyword },
  ];
  if (matchQuery.$or) {
    // Category $or already exists — combine with $and
    matchQuery.$and = [{ $or: matchQuery.$or }, { $or: keywordOr }];
    delete matchQuery.$or;
  } else {
    matchQuery.$or = keywordOr;
  }
  ```
- This preserves category `$or` while adding keyword `$or` via `$and`

---

**Bug 10 — totalCount accuracy**:

**Resolution**: This is a cascading fix — once Bug 9 is fixed (no more `$or` overwrite), the `$match` stage will correctly constrain documents, and `pagination.recordCount()` will naturally return the correct count. No additional code change needed.

---

**No changes required to**:

- `pagination.ts` — works correctly once the pipeline is correct
- `transaction.controller.ts` — correctly defaults and casts parameters

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that exercise each bug scenario. Run on UNFIXED code to observe failures and confirm root cause.

**Test Cases**:

1. **Missing Pagination Test**: Call `handleSearch('Rachna')` and inspect dispatched action — verify `limit` is absent (will confirm bug 1)
2. **'All' Value Test**: Call `cleanUpFilters()` with `filters.transactionType = 'all'` — verify `'all'` is present in output (will confirm bug 2/7)
3. **Labels String Test**: Set labels to `'food,transport'` and call `cleanUpFilters()` — verify type remains string (will confirm bug 3)
4. **Amount Debounce Test**: Simulate rapid keystrokes in amount field — verify multiple API calls fire (will confirm bug 4)
5. **BankName Debounce Test**: Simulate rapid keystrokes in bankName field — verify multiple API calls fire (will confirm bug 5)
6. **Empty Date Test**: Send `{ dateFrom: '' }` to backend — verify Joi validation error (will confirm bug 6)
7. **Schema Mismatch Test**: Send `{ transactionType: 'online' }` to validation — verify rejection (will confirm bug 8)
8. **$or Overwrite Test**: Call `fetchTransactionLogs` with `category=['Uncategorized']` AND `keyword='Rachna'` — verify category `$or` is lost (will confirm bug 9)
9. **TotalCount Test**: Same as above — verify `totalCount` is inflated (will confirm bug 10)

**Expected Counterexamples**:

- Frontend dispatch payload missing `limit` when keyword is present
- `'all'` passes through `cleanUpFilters` unchanged
- Joi rejects `transactionType: 'online'` with 400 error
- `matchQuery.$or` contains only keyword conditions when both category and keyword are specified

### Fix Checking

**Goal**: Verify that for all inputs where any bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  // Bug 1: Pagination
  IF input.keyword AND dispatch called THEN
    ASSERT dispatchPayload.page == '1'
    ASSERT dispatchPayload.limit == configuredLimit
  END IF

  // Bug 2/7: 'all' stripping
  IF input.transactionType == 'all' OR input.type == 'all' THEN
    ASSERT cleanUpFilters(input) DOES NOT contain 'transactionType'/'type'
  END IF

  // Bug 3: Labels array
  IF input.labels is string THEN
    ASSERT cleanUpFilters(input).labels IS Array
  END IF

  // Bug 4/5: Debounce
  IF rapidKeystrokes in amount/bankName THEN
    ASSERT apiCallCount == 1 after 1s
  END IF

  // Bug 6: Empty dates
  IF input.dateFrom == '' OR input.dateTo == '' THEN
    ASSERT cleanUpFilters(input) DOES NOT contain 'dateFrom'/'dateTo'
  END IF

  // Bug 8: Schema
  IF input.transactionType IN ['online', 'cash'] THEN
    ASSERT joiValidation(input) PASSES
  END IF

  // Bug 9/10: $or + $and
  IF input.keyword AND input.category includes 'Uncategorized' THEN
    ASSERT matchQuery.$and contains both $or arrays
    ASSERT totalCount reflects combined filter
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where no bug condition holds, the fixed functions produce the same result as the original functions.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT cleanUpFilters_fixed(input) == cleanUpFilters_original(input)
  ASSERT fetchTransactionLogs_fixed(input) == fetchTransactionLogs_original(input)
  ASSERT joiValidation_fixed(input) == joiValidation_original(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many filter combinations automatically across the input domain
- It catches edge cases in `cleanUpFilters` sanitization that manual tests might miss
- It provides strong guarantees that non-buggy behavior is unchanged for all valid inputs

**Test Plan**: Observe behavior on UNFIXED code for valid (non-buggy) inputs, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Category-Only Preservation**: Verify filtering by "Uncategorized" without keyword continues to produce correct `$or` logic
2. **Pagination Preservation**: Verify `page=2, limit=50` without keyword returns correct offset and limit
3. **Multi-Filter Preservation**: Verify combining dateFrom+dateTo+bankName+type (valid values) produces same query
4. **Default Limit Preservation**: Verify requests genuinely missing `limit` still default to 10
5. **handleApplyFilter Preservation**: Verify the filter drawer "Apply" action continues to work without interference
6. **cleanUpFilters Valid Input Preservation**: Verify that valid non-'all' string values (e.g., `transactionType: 'cash'`) pass through unchanged
7. **Dropdown Immediate Dispatch Preservation**: Verify dropdown selections (category, labels) still fire immediately (not debounced)

### Unit Tests

**Frontend (Vitest)**:

- Test `cleanUpFilters` strips `'all'` values for `transactionType` and `type`
- Test `cleanUpFilters` strips empty string dates (`dateFrom: ''`, `dateTo: ''`)
- Test `cleanUpFilters` passes through valid values (`transactionType: 'cash'`, dates with actual values)
- Test `cleanUpFilters` converts string labels to array (defensive)
- Test `handleSearch` dispatches with `page: '1'` and `limit` from state
- Test debounced amount only fires API once after 1s pause
- Test debounced bankName only fires API once after 1s pause
- Test `handleApplyFilter` includes pagination from state

**Backend (Jest)**:

- Test `fetchTransactionsSchema` accepts `transactionType: 'online'` and `'cash'`
- Test `fetchTransactionsSchema` still accepts `'credit'` and `'debit'`
- Test `fetchTransactionsSchema` rejects invalid values like `'all'` or `'invalid'`
- Test `fetchTransactionLogs` with keyword only produces correct `$or`
- Test `fetchTransactionLogs` with keyword + "Uncategorized" category produces `$and` with nested `$or`
- Test `fetchTransactionLogs` with category only (no keyword) uses simple `$or` unchanged
- Test empty/null keyword does not add any `$or` clause

### Property-Based Tests

**Frontend (Vitest + fast-check)**:

- Generate random filter objects with mix of `'all'`, empty strings, valid values, arrays → verify `cleanUpFilters` output never contains `'all'` or empty strings, and labels/category are always arrays
- Generate random keystroke sequences for amount/bankName → verify debounce collapses to single call
- Generate random valid filter combinations → verify `cleanUpFilters` preserves all valid values unchanged

**Backend (Jest + fast-check or similar)**:

- Generate random `{keyword, category}` combinations → verify `$or`/`$and` structure is always correct
- Generate random filter sets without keyword → verify query matches original code output exactly
- Generate random `transactionType` from `['online', 'cash', 'credit', 'debit']` → verify all pass Joi validation

### Integration Tests

- Test full request flow: frontend dispatch with keyword → backend returns paginated results with correct `totalCount`
- Test combined keyword + "Uncategorized" category → returns intersection of both criteria
- Test that `transactionType: 'online'` passes through entire stack (validation → service → query)
- Test filter drawer "Apply" with mixed valid filters → correct results returned
- Test clearing all filters and re-applying → no stale `'all'` values sent
- Test rapid typing in amount field → single API call after 1s pause with final value
