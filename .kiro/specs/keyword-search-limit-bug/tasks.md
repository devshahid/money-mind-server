# Implementation Plan

## Overview

Fix 10 interacting bugs across the transaction filter system. The bugs span backend Joi validation schema mismatches, MongoDB `$or` query overwrites, frontend payload sanitization gaps, missing pagination in keyword search, and undebounced text inputs. Implementation follows the exploratory bugfix workflow: write tests to confirm bugs exist, write preservation tests, then implement fixes in dependency order (backend schema → backend query → frontend sanitization → frontend dispatch → frontend debounce).

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Transaction Filter Validation & Query Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the 10 bugs exist across backend validation and query logic
  - **Scoped PBT Approach**: Focus on concrete failing scenarios:
    - Backend Joi schema rejects `transactionType: 'online'` and `transactionType: 'cash'`
    - Backend `$or` overwrite: keyword search combined with "Uncategorized" category loses category filter
    - Backend totalCount reflects wrong document set when `$or` is overwritten
  - **Test file**: `money-mind-server/src/modules/transactions/__tests__/transaction.filter.spec.ts` (extend existing)
  - **Test cases**:
    - Call `fetchTransactionsSchema.validate({ transactionType: 'online' })` → expect pass (will FAIL on unfixed code)
    - Call `fetchTransactionsSchema.validate({ transactionType: 'cash' })` → expect pass (will FAIL on unfixed code)
    - Call `fetchTransactionLogs(1, 10, ..., category=['Uncategorized'], keyword='Rachna')` → assert `matchQuery` uses `$and` with nested `$or` arrays (will FAIL on unfixed code — currently keyword `$or` overwrites category `$or`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this proves the bugs exist)
  - Document counterexamples: Joi rejects 'online'/'cash', category $or is overwritten by keyword $or
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.3, 1.4, 2.3, 2.4, 2.10_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Filter Queries Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `money-mind-server/src/modules/transactions/__tests__/transaction.filter.spec.ts` (extend existing)
  - Observe on UNFIXED code:
    - `fetchTransactionLogs(2, 50)` with no keyword/category → pagination works correctly with `$skip`/`$limit`
    - `fetchTransactionLogs(1, 10, ..., category=['Uncategorized'])` without keyword → `$or` has 4 uncategorized conditions
    - `fetchTransactionLogs(1, 10, ..., category=['Food', 'Fuel'])` without keyword → uses `$in` correctly
    - `fetchTransactionsSchema.validate({ transactionType: 'credit' })` → passes validation
    - `fetchTransactionsSchema.validate({ transactionType: 'debit' })` → passes validation
    - `fetchTransactionLogs(1, 10)` with no filters → defaults work, no `$or` or `$and` in matchQuery
  - Write property-based tests (Jest) capturing observed behavior:
    - For all valid `transactionType` in `['credit', 'debit']`, Joi validation passes (already works)
    - For all category-only queries (no keyword), `$or` structure remains a flat array on `matchQuery.$or`
    - For all requests without keyword and without "Uncategorized" category, `matchQuery.$or` is undefined
    - For pagination-only requests (no keyword, no category), matchQuery only contains `userId` and `status`
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix backend Joi validation schema for transactionType
  - [ ] 3.1 Update `fetchTransactionsSchema` to accept 'online' and 'cash'
    - File: `money-mind-server/src/modules/transactions/validators/transaction.validation.ts`
    - Change: `transactionType: Joi.string().valid('credit', 'debit').optional()` → `transactionType: Joi.string().valid('online', 'cash', 'credit', 'debit').optional()`
    - This unblocks frontend testing since the backend will no longer reject valid `transactionType` values
    - _Bug_Condition: isBugCondition(input) where input.transactionType IN ['online', 'cash'] AND Joi rejects_
    - _Expected_Behavior: Joi validation passes for 'online', 'cash', 'credit', 'debit'_
    - _Preservation: 'credit' and 'debit' continue to pass; invalid values like 'all' or 'invalid' are still rejected_
    - _Requirements: 2.4, 2.10_

- [ ] 4. Fix backend `$or`/`$and` query construction
  - [ ] 4.1 Implement `$and` wrapping when keyword and category `$or` coexist
    - File: `money-mind-server/src/modules/transactions/transaction.service.ts`
    - Function: `fetchTransactionLogs`
    - Replace unconditional `matchQuery.$or = [keyword conditions]` with:
      ```typescript
      const keywordOr = [
        { narration: { $regex: keyword, $options: 'i' } },
        { notes: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
        { bankName: { $regex: keyword, $options: 'i' } },
        { amount: keyword },
      ];
      if (matchQuery.$or) {
        matchQuery.$and = [{ $or: matchQuery.$or }, { $or: keywordOr }];
        delete matchQuery.$or;
      } else {
        matchQuery.$or = keywordOr;
      }
      ```
    - This fixes both Bug 9 ($or overwrite) and Bug 10 (totalCount inflation) since `pagination.add()` uses the corrected `$match` stage
    - _Bug_Condition: isBugCondition(input) where keyword AND category includes 'Uncategorized' AND $or overwrites_
    - _Expected_Behavior: matchQuery.$and contains both $or arrays; totalCount reflects combined filter_
    - _Preservation: keyword-only queries still use simple $or; category-only queries unchanged_
    - _Requirements: 2.2, 2.3_

  - [ ] 4.2 Verify bug condition exploration test now passes (backend portion)
    - **Property 1: Expected Behavior** - Transaction Filter Validation & Query Bugs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior for schema validation and $and query construction
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms backend bugs are fixed)
    - _Requirements: 2.3, 2.4, 2.10_

  - [ ] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Filter Queries Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in backend query logic)
    - Confirm category-only $or, pagination defaults, and valid transactionType handling are all unchanged

- [ ] 5. Fix frontend `cleanUpFilters` to strip 'all' values and empty dates
  - [ ] 5.1 Enhance `cleanUpFilters` function
    - File: `money-mind-client/src/features/transactions/components/TransactionControls.tsx`
    - Add condition: if `typeof value === 'string'` and `value.toLowerCase() === 'all'`, skip the field
    - Ensure empty date strings (`dateFrom: ''`, `dateTo: ''`) are stripped (verify existing logic covers this)
    - Add defensive guard: if key is `'labels'` or `'category'` and value is a string, convert via `value.split(',')`
    - _Bug_Condition: isBugCondition(input) where input has 'all' values, empty dates, or string labels_
    - _Expected_Behavior: Output payload never contains 'all', empty dates, or string-typed labels/category_
    - _Preservation: Valid non-'all' string values (e.g., 'cash', 'credit') pass through unchanged_
    - _Requirements: 2.4, 2.5, 2.6, 2.9_

- [ ] 6. Fix frontend keyword search pagination
  - [ ] 6.1 Include `page` and `limit` in keyword search dispatch
    - File: `money-mind-client/src/features/transactions/components/TransactionControls.tsx`
    - Function: `handleSearch`
    - Change dispatch from: `listTransactions({ ...cleanUpFilters(), keyword: searchTerm })`
    - To: `listTransactions({ ...cleanUpFilters(), keyword: searchTerm, page: '1', limit: String(limit) })`
    - Get `limit` from Redux state (already available via selector)
    - Resets to page 1 on new search (standard UX pattern)
    - _Bug_Condition: isBugCondition(input) where keyword is present AND page/limit are undefined_
    - _Expected_Behavior: Dispatch always includes page='1' and limit from Redux state_
    - _Preservation: Existing handleApplyFilter behavior unchanged_
    - _Requirements: 2.1, 2.2_

- [ ] 7. Add debounce to frontend amount and bankName inputs
  - [ ] 7.1 Apply debounce to amount and bankName filter fields
    - File: `money-mind-client/src/features/transactions/components/TransactionControls.tsx`
    - Use existing `debounce` utility function (already defined in the component)
    - Create debounced handlers via `useMemo`/`useCallback`:
      - `debouncedAmountChange` — delays API dispatch by 1000ms after last keystroke
      - `debouncedBankNameChange` — delays API dispatch by 1000ms after last keystroke
    - Apply to corresponding TextField `onChange` handlers in the filter drawer
    - Dropdown selections (category, labels, type, transactionType) must NOT be debounced — they fire immediately
    - _Bug_Condition: isBugCondition(input) where amount/bankName changed within 1000ms AND API call pending_
    - _Expected_Behavior: Single API call after 1s of inactivity with final value_
    - _Preservation: Mouse clicks on dropdowns still fire immediately; filter drawer Apply button unchanged_
    - _Requirements: 2.7, 2.8_

- [ ] 8. Write backend tests for all fixes
  - [ ] 8.1 Add Joi schema validation tests
    - File: `money-mind-server/src/modules/transactions/__tests__/transaction.filter.spec.ts`
    - Test `fetchTransactionsSchema` accepts `'online'`, `'cash'`, `'credit'`, `'debit'`
    - Test `fetchTransactionsSchema` rejects `'all'`, `'invalid'`, `''`
    - Test `fetchTransactionsSchema` accepts `labels` as array of strings
    - Test `fetchTransactionsSchema` accepts valid date values and rejects empty strings
    - _Requirements: 2.4, 2.10_

  - [ ] 8.2 Add `$or`/`$and` query construction tests
    - File: `money-mind-server/src/modules/transactions/__tests__/transaction.filter.spec.ts`
    - Test keyword-only → `matchQuery.$or` contains keyword conditions
    - Test keyword + "Uncategorized" category → `matchQuery.$and` contains two `$or` arrays
    - Test keyword + "Uncategorized" + other categories → `$and` with both combined
    - Test category-only (no keyword) → simple `$or` on matchQuery (unchanged from original)
    - Test no keyword, no category → no `$or` or `$and` on matchQuery
    - _Requirements: 2.2, 2.3, 3.2_

  - [ ] 8.3 Add pagination and totalCount accuracy tests
    - Test keyword search with `limit=50` → pipeline uses correct `$skip`/`$limit` values
    - Test combined keyword + category → totalCount reflects only matching documents (not all)
    - Test no-filter request defaults to `limit=10`
    - _Requirements: 2.1, 2.2, 3.3, 3.5_

- [ ] 9. Write frontend tests
  - [ ] 9.1 Add `cleanUpFilters` unit tests (Vitest + fast-check)
    - File: `money-mind-client/src/features/transactions/__tests__/cleanUpFilters.spec.ts`
    - Test strips `'all'` from `transactionType` and `type` fields
    - Test strips empty string dates (`dateFrom: ''`, `dateTo: ''`)
    - Test passes through valid values (`transactionType: 'cash'`, `bankName: 'HDFC'`)
    - Test converts string labels to array (defensive)
    - Property-based test: for random filter objects with mix of 'all', empty strings, valid values → output never contains 'all' or empty strings, labels/category always arrays
    - _Requirements: 2.4, 2.5, 2.6, 2.9_

  - [ ] 9.2 Add keyword search dispatch test
    - Test `handleSearch` dispatches with `page: '1'` and `limit` from Redux state
    - Test `handleSearch` includes cleaned filters (no 'all' values)
    - _Requirements: 2.1_

  - [ ] 9.3 Add debounce behavior tests
    - Test rapid keystrokes in amount field → only one API call after 1s pause
    - Test rapid keystrokes in bankName field → only one API call after 1s pause
    - Test dropdown selections still fire immediately (not debounced)
    - _Requirements: 2.7, 2.8_

- [ ] 10. Integration verification checkpoint
  - Run full backend test suite: `cd money-mind-server && npm test`
  - Run full frontend test suite: `cd money-mind-client && npm run test`
  - Verify all property-based tests pass (exploration test + preservation test)
  - Verify no regressions in existing transaction filter tests
  - Ensure all 10 bug scenarios from bugfix.md are addressed:
    - Bug 1: Keyword search includes pagination ✓ (task 6)
    - Bug 2: totalCount accurate with $and fix ✓ (task 4)
    - Bug 3: $or/$and prevents overwrite ✓ (task 4)
    - Bug 4: Joi accepts 'online'/'cash' ✓ (task 3)
    - Bug 5: 'all' stripped by cleanUpFilters ✓ (task 5)
    - Bug 6: Labels sent as array ✓ (task 5)
    - Bug 7: Amount debounced ✓ (task 7)
    - Bug 8: BankName debounced ✓ (task 7)
    - Bug 9: Empty dates stripped ✓ (task 5)
    - Bug 10: transactionType schema fixed ✓ (task 3)
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [["1", "2"], ["3"], ["4"], ["5", "6", "7"], ["8", "9"], ["10"]]
}
```

- Wave 1: Tasks 1 and 2 are independent (both run on UNFIXED code)
- Wave 2: Task 3 unblocks frontend testing (schema must accept 'online'/'cash' first)
- Wave 3: Task 4 depends on task 3 (schema fix needed before query fix testing)
- Wave 4: Tasks 5, 6, 7 are frontend changes that can proceed after backend fixes
- Wave 5: Tasks 8 and 9 are comprehensive test suites written after implementation
- Wave 6: Task 10 is the final validation checkpoint

## Notes

- Backend tests use Jest with mocked models (follow existing pattern in `transaction.filter.spec.ts`)
- Frontend tests use Vitest + fast-check for property-based testing
- The `pagination.add()` utility is NOT modified — totalCount fix is a cascading effect of the `$or`/`$and` fix
- The controller `fetchTransactions` defaults (`page = 1, limit = 10`) remain unchanged
- Debounce should NOT apply to dropdown selections — only to free-text fields (amount, bankName)
- The existing `debounce` utility in `TransactionControls.tsx` should be reused
