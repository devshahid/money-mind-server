# Implementation Plan: Money Mind Upgrade

## Overview

Incremental implementation of the Money Mind backend upgrade across 9 requirement areas. Each task follows the existing Controller → Service → Model pattern with Express.js, TypeScript, and Mongoose. Tasks are ordered so that foundational models are created first, then services, controllers, and routes, with each module wired in before moving to the next. Property-based tests use `fast-check` against the service layer.

## Tasks

- [ ] 1. Create new Mongoose models
  - [ ] 1.1 Create TransactionGroup model (`src/models/transaction-group.model.ts`)
    - Define `ITransactionGroup` interface with userId, groupName, description, transactionIds, totalAmount, isCredit
    - Create Mongoose schema with `{ timestamps: true, versionKey: false }`
    - Export model as `TransactionGroup`
    - _Requirements: 4.1_

  - [ ] 1.2 Create DebtPayment model (`src/models/debt-payment.model.ts`)
    - Define `IDebtPayment` interface with userId, debtId, amount, paymentDate, transactionId (optional), notes (optional)
    - Create Mongoose schema with `{ timestamps: true, versionKey: false }`
    - Export model as `DebtPayment`
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ] 1.3 Create AIRequestLog model (`src/models/ai-request-log.model.ts`)
    - Define `IAIRequestLog` interface with userId, endpoint, requestTimestamp, responseTimestamp, tokenCount, status
    - Create Mongoose schema with `{ timestamps: true, versionKey: false }`
    - Export model as `AIRequestLog`
    - _Requirements: 9.12_

- [ ] 2. Enhance Transaction Logs module (Req 1, 2, 3)
  - [ ] 2.1 Add `previewUploadFromFile` method to `TransactionLogsService`
    - Implement HashMap duplicate detection logic that returns `{ toInsert, toSkip }` without writing to DB
    - Validate `rows` is non-empty array and `bankName` is non-empty string; throw `ClientError(400)` if missing
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 2.2 Enhance `uploadLogsFromFile` in `TransactionLogsService`
    - Ensure response includes `{ inserted, skipped, uploadKey }` with counts and the UUID uploadKey
    - _Requirements: 1.1, 1.2, 1.6_

  - [ ] 2.3 Add `previewUpload` controller method and route
    - Add `previewUpload` method to `TransactionLogsController` — POST `/transaction-logs/preview-upload`
    - Register route in `src/routes/transaction-logs.route.ts`
    - _Requirements: 1.3_

  - [ ]\* 2.4 Write property tests for Transaction Logs upload (Properties 1–3)
    - **Property 1: Upload duplicate detection and batch consistency**
    - **Property 2: Preview upload is read-only**
    - **Property 3: Upload key listing matches actual data**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6, 1.7**

  - [ ]\* 2.5 Write property tests for Transaction Logs annotation (Properties 4–8)
    - **Property 4: Single transaction update is partial**
    - **Property 5: Auto-creation of categories and labels on update**
    - **Property 6: Bulk update applies to all matching transactions**
    - **Property 7: Sync upserts transactions and auto-creates labels**
    - **Property 8: Cash memo has isCash flag**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.8**

  - [ ]\* 2.6 Write property tests for Transaction Logs querying (Properties 9–12)
    - **Property 9: Transaction filtering correctness**
    - **Property 10: Pagination invariants**
    - **Property 11: Delete-all removes all user data**
    - **Property 12: Error response format consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

- [ ] 3. Implement Transaction Groups module (Req 4)
  - [ ] 3.1 Create `TransactionGroupsService` (`src/services/transaction-groups.service.ts`)
    - Constructor takes `userId: Types.ObjectId`
    - Implement `createGroup`, `addTransactions`, `removeTransactions`, `listGroups`, `getGroup`, `updateGroup`, `deleteGroup`
    - `addTransactions` validates each transaction belongs to user, recalculates `totalAmount`
    - `removeTransactions` removes IDs and recalculates `totalAmount`
    - `deleteGroup` deletes group only, not underlying transactions
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ] 3.2 Create `TransactionGroupsController` (`src/controllers/transaction-groups.controller.ts`)
    - Extend `ResponseHandler`
    - Implement `create`, `addTransactions`, `removeTransactions`, `list`, `getById`, `update`, `delete` methods
    - Each method wrapped in `asyncHandler`
    - _Requirements: 4.2–4.8_

  - [ ] 3.3 Create `transaction-groups.route.ts` and register in `src/routes/index.ts`
    - POST `/transaction-groups/create`, PUT `/:id/add-transactions`, PUT `/:id/remove-transactions`, GET `/list`, GET `/:id`, PUT `/:id`, DELETE `/:id`
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 4.2–4.8_

  - [ ]\* 3.4 Write property tests for Transaction Groups (Properties 13–16)
    - **Property 13: Transaction group creation defaults**
    - **Property 14: Transaction group totalAmount invariant**
    - **Property 15: Transaction group get returns populated details**
    - **Property 16: Deleting a group preserves transactions**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.6, 4.8**

- [ ] 4. Checkpoint — Verify models and first modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Enhance Debt Management module (Req 5)
  - [ ] 5.1 Add new service methods to `DebtService` (`src/services/debt.service.ts`)
    - Implement `recordPaymentService` — creates DebtPayment, reduces remainingAmount, sets status to "PAID" if remaining ≤ 0
    - Implement `paymentHistoryService` — returns all DebtPayment records for a debt
    - Implement `payoffProjectionService` — calculates projected payoff using `n = -log(1 - (r * P / M)) / log(1 + r)`
    - Implement `debtSummaryService` — aggregates total debt, total remaining, total monthly EMI, active vs paid counts
    - Validate payment amount > 0, verify transaction ownership when transactionId provided
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ] 5.2 Add new controller methods to `DebtController` (`src/controllers/debt.controller.ts`)
    - Add `recordPayment`, `paymentHistory`, `payoffProjection`, `debtSummary` methods
    - Each wrapped in `asyncHandler`
    - _Requirements: 5.2, 5.5, 5.6, 5.7_

  - [ ] 5.3 Register new debt routes in `src/routes/debt.route.ts`
    - POST `/:debtId/record-payment`, GET `/:debtId/payment-history`, GET `/:debtId/payoff-projection`, GET `/summary`
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 5.2, 5.5, 5.6, 5.7_

  - [ ]\* 5.4 Write property tests for Debt Management (Properties 17–21)
    - **Property 17: Debt payment reduces remaining amount**
    - **Property 18: Debt payment transaction linking**
    - **Property 19: Debt payment history completeness**
    - **Property 20: Debt payoff projection mathematical correctness**
    - **Property 21: Debt summary aggregation correctness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [ ] 6. Implement Goals module (Req 6)
  - [ ] 6.1 Create `GoalService` (`src/services/goals.service.ts`)
    - Constructor takes `userId: Types.ObjectId`
    - Implement `createGoal`, `updateGoal`, `listGoals`, `getGoal`, `deleteGoal`, `contributeToGoal`, `cancelGoal`
    - `contributeToGoal` increases savedAmount, sets status to "completed" if savedAmount >= targetAmount
    - `cancelGoal` sets status to "cancelled"
    - Validate required fields on create, positive amount on contribute
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [ ] 6.2 Create `GoalController` (`src/controllers/goals.controller.ts`)
    - Extend `ResponseHandler`
    - Implement `create`, `update`, `list`, `getById`, `delete`, `contribute`, `cancel` methods
    - Each wrapped in `asyncHandler`
    - _Requirements: 6.2–6.9_

  - [ ] 6.3 Create `goals.route.ts` and register in `src/routes/index.ts`
    - POST `/goals/create`, PUT `/:goalId`, GET `/list`, GET `/:goalId`, DELETE `/:goalId`, POST `/:goalId/contribute`, PUT `/:goalId/cancel`
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 6.2–6.9_

  - [ ]\* 6.4 Write property tests for Goals (Properties 22–24)
    - **Property 22: Goal creation defaults**
    - **Property 23: Goal contribution and auto-completion**
    - **Property 24: Goal cancellation sets status**
    - **Validates: Requirements 6.2, 6.7, 6.8, 6.9**

- [ ] 7. Implement Budgets module (Req 7)
  - [ ] 7.1 Create `BudgetService` (`src/services/budgets.service.ts`)
    - Constructor takes `userId: Types.ObjectId`
    - Implement `createBudget`, `updateBudget`, `listBudgets`, `getBudget`, `deleteBudget`, `calculateActuals`, `copyFromPrevious`
    - `createBudget` validates no existing budget for month, calculates totalPlanned from sum of plannedAmounts
    - `calculateActuals` queries TransactionLogs for the budget month, matches by category name, updates actualAmount and remainingAmount
    - `copyFromPrevious` clones category structure with actualAmount reset to 0
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [ ] 7.2 Create `BudgetController` (`src/controllers/budgets.controller.ts`)
    - Extend `ResponseHandler`
    - Implement `create`, `update`, `list`, `getById`, `delete`, `calculateActuals`, `copyFromPrevious` methods
    - Each wrapped in `asyncHandler`
    - _Requirements: 7.2–7.8_

  - [ ] 7.3 Create `budgets.route.ts` and register in `src/routes/index.ts`
    - POST `/budgets/create`, PUT `/:budgetId`, GET `/list`, GET `/:budgetId`, DELETE `/:budgetId`, POST `/:budgetId/calculate-actuals`, POST `/copy-from-previous`
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 7.2–7.8_

  - [ ]\* 7.4 Write property tests for Budgets (Properties 25–28)
    - **Property 25: Budget creation totalPlanned invariant**
    - **Property 26: Budget list is sorted by month descending**
    - **Property 27: Budget calculate-actuals matches transaction data**
    - **Property 28: Budget copy-from-previous preserves structure**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.7, 7.8**

- [ ] 8. Checkpoint — Verify core modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Analytics module (Req 8)
  - [ ] 9.1 Create `AnalyticsService` (`src/services/analytics.service.ts`)
    - Constructor takes `userId: Types.ObjectId`
    - Implement `incomeVsExpense` — MongoDB aggregation pipeline on TransactionLogs, returns totalCredit, totalDebit, netAmount
    - Implement `categoryBreakdown` — groups by category, returns categoryName, totalAmount, transactionCount
    - Implement `monthlyTrend` — groups by month (YYYYMM), returns totalCredit, totalDebit, netAmount per month
    - Implement `savingsProgress` — queries active Goals, calculates percentComplete and daysRemaining
    - Implement `debtProgress` — queries active Debts, calculates percentPaid
    - Implement `budgetVsActual` — queries Budget for month, calculates percentUsed per category
    - Implement `topSpending` — queries top N debit transactions by amount
    - All methods return empty arrays/zero totals when no data exists
    - Validate dateFrom < dateTo when both provided; throw `ClientError(400)` otherwise
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ] 9.2 Create `AnalyticsController` (`src/controllers/analytics.controller.ts`)
    - Extend `ResponseHandler`
    - Implement `incomeVsExpense`, `categoryBreakdown`, `monthlyTrend`, `savingsProgress`, `debtProgress`, `budgetVsActual`, `topSpending` methods
    - Each wrapped in `asyncHandler`
    - _Requirements: 8.2–8.8_

  - [ ] 9.3 Create `analytics.route.ts` and register in `src/routes/index.ts`
    - GET `/analytics/income-vs-expense`, `/category-breakdown`, `/monthly-trend`, `/savings-progress`, `/debt-progress`, `/budget-vs-actual`, `/top-spending`
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 8.2–8.8_

  - [ ]\* 9.4 Write property tests for Analytics (Properties 29–35)
    - **Property 29: Income vs expense aggregation correctness**
    - **Property 30: Category breakdown aggregation correctness**
    - **Property 31: Monthly trend aggregation correctness**
    - **Property 32: Savings progress percentage calculation**
    - **Property 33: Debt progress percentage calculation**
    - **Property 34: Budget vs actual percentage calculation**
    - **Property 35: Top spending returns sorted debits**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**

- [ ] 10. Implement AI module (Req 9)
  - [ ] 10.1 Create LLM Provider abstraction (`src/services/llm-provider.ts`)
    - Define `ILLMProvider` interface with `complete(prompt, systemPrompt): Promise<string>`
    - Define `ILLMProviderConfig` interface with apiKey, model, maxTokens, temperature
    - Implement `LLMProviderFactory.create(providerName, config)` factory method
    - Implement `OpenAIProvider` using axios for chat completions API
    - Provider name from `LLM_PROVIDER` env, API key from `LLM_API_KEY` env
    - _Requirements: 9.8_

  - [ ] 10.2 Create AI rate limiter middleware
    - Implement in-memory rate limiter applied to all `/ai` routes
    - Track requests per userId using a Map with TTL cleanup
    - Configurable via `AI_RATE_LIMIT_PER_MINUTE` env variable (default: 10 requests/minute)
    - Return 429 Too Many Requests when limit exceeded
    - _Requirements: 9.12_

  - [ ] 10.3 Create `AIService` (`src/services/ai.service.ts`)
    - Constructor takes `userId: Types.ObjectId` and `llmProvider: ILLMProvider`
    - Implement `categorizeTransactions(transactionIds[])` — fetches transactions, sends narration+amount to LLM, returns `{ category, labels }` per transaction
    - Implement `suggestGroups(dateFrom?, dateTo?)` — fetches transactions in range, asks LLM for grouping patterns
    - Implement `debtStrategy()` — fetches active debts, asks LLM for repayment strategy
    - Implement `goalAdvice()` — fetches active goals + income + spending patterns
    - Implement `budgetRecommendations(targetMonth)` — fetches historical spending, asks LLM for allocations
    - Implement `chat(message)` — fetches financial summary, processes free-form question
    - Each method gathers only relevant financial data for context
    - Validate transactionIds belong to user; throw `ClientError(400)` for invalid IDs
    - Handle LLM errors with `CustomError(503)` "AI service temporarily unavailable"
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

  - [ ] 10.4 Create `AIController` (`src/controllers/ai.controller.ts`)
    - Extend `ResponseHandler`
    - Implement `categorizeTransactions`, `suggestGroups`, `debtStrategy`, `goalAdvice`, `budgetRecommendations`, `chat` methods
    - Each wrapped in `asyncHandler`
    - _Requirements: 9.2–9.7_

  - [ ] 10.5 Create `ai.route.ts` and register in `src/routes/index.ts`
    - POST `/ai/categorize-transactions`, `/suggest-groups`, `/debt-strategy`, `/goal-advice`, `/budget-recommendations`, `/chat`
    - Apply rate limiter middleware to all AI routes
    - All routes use `authHandler.userAccess` middleware
    - _Requirements: 9.1, 9.12_

  - [ ]\* 10.6 Write property tests for AI module (Properties 36–37)
    - **Property 36: AI categorize returns one suggestion per transaction**
    - **Property 37: AI rate limiting enforces per-user limits**
    - **Validates: Requirements 9.2, 9.12**

- [ ] 11. Final route registration and integration wiring
  - [ ] 11.1 Verify all new routes are registered in `src/routes/index.ts`
    - Ensure `/transaction-groups`, `/goals`, `/budgets`, `/analytics`, `/ai` are all mounted under `/api/v1`
    - Verify enhanced routes for `/transaction-logs` and `/debt` include new endpoints
    - _Requirements: 1.3, 4.1, 5.2, 6.1, 7.1, 8.1, 9.1_

- [ ] 12. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 37 correctness properties from the design document using `fast-check`
- All new modules follow the existing Controller → Service → Model pattern with `asyncHandler`, `ResponseHandler`, and `ApiError`
