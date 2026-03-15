# Requirements Document

## Introduction

Money Mind is a personal finance management backend API built with Express.js, TypeScript, and Mongoose (MongoDB). The API serves a frontend application that helps users track bank transactions, manage debts, set savings goals, plan budgets, and gain financial insights. This document defines backend requirements for upgrading the existing API (`/api/v1`) with enhanced transaction handling, new transaction grouping, full savings goal and budget management endpoints, financial analytics aggregations, and AI-powered suggestion capabilities. All endpoints require JWT authentication via the `accessToken` header, follow the Controller → Service → Model pattern, use `asyncHandler` for MongoDB transactions, `ResponseHandler` for consistent responses, and the `ApiError` hierarchy for error handling.

## Glossary

- **API**: The Money Mind Express.js REST API served under `/api/v1`
- **AuthHandler**: Middleware that validates JWT tokens from the `accessToken` header and attaches the authenticated `User` to the request
- **AsyncHandler**: Wrapper that starts a MongoDB session/transaction for each request, commits on success, and aborts on error
- **ResponseHandler**: Base class providing `sendResponse()` for consistent JSON response formatting via `SuccessMsgResponse`
- **ApiError**: Abstract error class hierarchy (`AuthError`, `CustomError`, `ClientError`) for structured error responses
- **TransactionLog**: A financial transaction record (credit or debit) stored in the `TransactionLogs` collection, linked to a User
- **TransactionGroup**: A new entity that groups related TransactionLogs together (e.g., "Groceries this week", "Trip expenses")
- **Category**: A user-defined classification tag stored in the `categories` collection, referenced by name on TransactionLogs
- **Label**: A user-defined tag with color stored in the `labels` collection, referenced by name array on TransactionLogs
- **Debt**: A tracked debt/loan record with EMI details stored in the `debts` collection under `debtDetails` subdocument
- **Goal**: A savings goal with target amount, saved amount, and deadline stored in the `goals` collection
- **Budget**: A monthly budget plan with category-level planned vs actual amounts stored in the `budgets` collection
- **Income**: A recorded income entry with source, type, month, and year stored in the `incomes` collection
- **UploadKey**: A UUID assigned to a batch of TransactionLogs uploaded together from a bank statement file
- **HashMap**: A deterministic hash of transaction fields (date, narration, amounts, ref) used for duplicate detection during upload
- **Pagination**: Utility that applies `$skip`, `$limit`, and `$count` stages to MongoDB aggregation pipelines

## Requirements

### Requirement 1: Bank Statement Upload and Duplicate Detection [ENHANCEMENT]

**User Story:** As a user, I want to upload parsed bank statement rows to the API so that my transactions are stored with duplicate detection and batch tracking.

**Status:** Partially implemented. The `POST /api/v1/transaction-logs/upload-data-from-file` endpoint exists with HashMap-based duplicate detection. Enhancements needed for preview support and improved duplicate reporting.

#### Acceptance Criteria

1. WHEN the API receives a POST request to `/transaction-logs/upload-data-from-file` with an array of parsed transaction rows and a bankName, THE TransactionLogsService SHALL compute a HashMap for each row, filter out rows whose HashMap already exists for the authenticated User, and insert only unique rows with a new UploadKey
2. WHEN duplicate transactions are detected during upload, THE API SHALL return a response containing the count of inserted records, the count of skipped duplicates, and the UploadKey assigned to the inserted batch
3. WHEN a POST request is made to a new `/transaction-logs/preview-upload` endpoint with parsed rows and a bankName, THE TransactionLogsService SHALL return the list of rows that would be inserted and the list of rows that would be skipped as duplicates without persisting any data
4. IF the `rows` array is empty or missing from the upload request body, THEN THE API SHALL return a 400 status with a descriptive error message
5. IF the `bankName` field is empty or missing from the upload request body, THEN THE API SHALL return a 400 status with a descriptive error message
6. THE API SHALL assign a single UUID-based UploadKey to all TransactionLogs inserted within one upload request
7. WHEN a GET request is made to `/transaction-logs/list-upload-keys`, THE API SHALL return all distinct UploadKeys for the authenticated User along with the count of TransactionLogs per UploadKey

### Requirement 2: Transaction Annotation and Sync [ENHANCEMENT]

**User Story:** As a user, I want to annotate my transactions with notes, categories, and labels so that I can organize and classify my financial data.

**Status:** Partially implemented. Single update, bulk update, and sync endpoints exist. Enhancements needed for input validation, category/label auto-creation consistency, and proper error responses.

#### Acceptance Criteria

1. WHEN a PUT request is made to `/transaction-logs/update/:id` with notes, category, or label fields, THE TransactionLogsService SHALL update only the provided fields on the matching TransactionLog owned by the authenticated User
2. WHEN a category is set on a TransactionLog via single update, THE TransactionLogsService SHALL create the Category in the `categories` collection if it does not already exist for the authenticated User
3. WHEN labels are set on a TransactionLog via single update, THE TransactionLogsService SHALL create any new Labels in the `labels` collection if they do not already exist for the authenticated User
4. WHEN a PUT request is made to `/transaction-logs/bulk-update` with an array of transactions and an uploadKey, THE TransactionLogsService SHALL update notes, label, and category fields for all matching TransactionLogs belonging to the authenticated User and the specified UploadKey
5. WHEN a PUT request is made to `/transaction-logs/sync-transactions` with an array of transactions, THE TransactionLogsService SHALL upsert each transaction, auto-create any new Labels, and return the updated paginated transaction list
6. IF the transaction ID in a single update request does not match any TransactionLog for the authenticated User, THEN THE API SHALL return a 404 status with the message "Transaction log not found."
7. IF the transactions array in a bulk update or sync request is empty, THEN THE API SHALL return a 400 status with a descriptive error message
8. WHEN a POST request is made to `/transaction-logs/add-cashmemo` with transaction details, THE TransactionLogsService SHALL create a new cash TransactionLog with `isCash` set to true for the authenticated User
9. THE API SHALL support listing all Labels via `GET /transaction-logs/list-labels` for the authenticated User
10. THE API SHALL support listing all Categories via `GET /transaction-logs/list-categories` for the authenticated User

### Requirement 3: Transaction Querying and Data Consistency [ENHANCEMENT]

**User Story:** As a user, I want to query my transactions with flexible filters so that I can find and review specific financial records.

**Status:** Partially implemented. The `POST /transaction-logs/list-transactions` endpoint exists with filtering. Enhancements needed for consistent error responses and additional filter options.

#### Acceptance Criteria

1. WHEN a POST request is made to `/transaction-logs/list-transactions`, THE TransactionLogsService SHALL return paginated TransactionLogs for the authenticated User filtered by the provided query parameters
2. THE TransactionLogsService SHALL support filtering by: uploadKey, amount, bankName (case-insensitive regex), transactionType (cash/online), type (credit/debit), labels (array match), category (array match), dateFrom, dateTo, and keyword (searches narration, notes, category, bankName, and amount)
3. THE API SHALL return paginated results with `totalCount` and `result` array, using the Pagination utility with default page=1 and limit=10
4. WHEN a DELETE request is made to `/transaction-logs/delete-all-transactions`, THE TransactionLogsService SHALL delete all TransactionLogs, Categories, and Labels belonging to the authenticated User
5. IF a database operation fails during any transaction-logs endpoint, THEN THE AsyncHandler SHALL abort the MongoDB transaction and pass the error to the error handling middleware
6. THE API SHALL return all error responses in the standard ApiError format containing `message`, `time`, `type`, and `status` fields

### Requirement 4: Transaction Grouping [NEW]

**User Story:** As a user, I want to group related transactions together so that I can track spending on specific activities, trips, or recurring expense categories.

**Status:** No backend support exists. Requires a new TransactionGroup model, new route file, controller, and service.

#### Acceptance Criteria

1. THE API SHALL provide a new Mongoose model `TransactionGroup` with fields: userId (ObjectId, required, ref User), groupName (string, required), description (string, optional), transactionIds (array of ObjectId refs to TransactionLogs), totalAmount (number, default 0), isCredit (boolean), and timestamps
2. WHEN a POST request is made to `/transaction-groups/create` with groupName and an optional description, THE TransactionGroupService SHALL create a new TransactionGroup for the authenticated User with an empty transactionIds array and totalAmount of 0
3. WHEN a PUT request is made to `/transaction-groups/:id/add-transactions` with an array of transactionIds, THE TransactionGroupService SHALL add the specified TransactionLog IDs to the group, verify each TransactionLog belongs to the authenticated User, and recalculate the totalAmount as the sum of all linked TransactionLog amounts
4. WHEN a PUT request is made to `/transaction-groups/:id/remove-transactions` with an array of transactionIds, THE TransactionGroupService SHALL remove the specified TransactionLog IDs from the group and recalculate the totalAmount
5. WHEN a GET request is made to `/transaction-groups/list`, THE TransactionGroupService SHALL return all TransactionGroups for the authenticated User with totalAmount and transaction count
6. WHEN a GET request is made to `/transaction-groups/:id`, THE TransactionGroupService SHALL return the TransactionGroup with its full list of populated TransactionLog details
7. WHEN a PUT request is made to `/transaction-groups/:id` with groupName or description, THE TransactionGroupService SHALL update the specified fields on the matching TransactionGroup owned by the authenticated User
8. WHEN a DELETE request is made to `/transaction-groups/:id`, THE TransactionGroupService SHALL delete the TransactionGroup without deleting the underlying TransactionLogs
9. IF any transactionId in an add-transactions request does not belong to the authenticated User, THEN THE API SHALL return a 400 status with a descriptive error identifying the invalid transaction IDs
10. IF the group ID does not match any TransactionGroup for the authenticated User, THEN THE API SHALL return a 404 status with the message "Transaction group not found"

### Requirement 5: Debt Management [ENHANCEMENT]

**User Story:** As a user, I want to manage my debts with EMI tracking, payment recording linked to transactions, and payoff projections so that I can plan my debt repayment strategy.

**Status:** Partially implemented. CRUD endpoints exist at `/api/v1/debt`. Enhancements needed for EMI payment recording, transaction linking, payoff projection calculations, and payment history.

#### Acceptance Criteria

1. THE API SHALL continue to support existing debt CRUD operations: `POST /debt/add-debt`, `PUT /debt/update-debt`, `GET /debt/get-debt/:debtId`, `GET /debt/list-debts`, and `DELETE /debt/delete-debt/:debtId` for the authenticated User
2. WHEN a POST request is made to a new `/debt/:debtId/record-payment` endpoint with amount, paymentDate, and an optional transactionId, THE DebtService SHALL record the payment, reduce the remainingAmount on the Debt by the payment amount, and update the paymentDate
3. WHEN a transactionId is provided in a payment recording request, THE DebtService SHALL verify the TransactionLog belongs to the authenticated User and link the payment to that transaction
4. IF recording a payment would cause the remainingAmount to drop to 0 or below, THEN THE DebtService SHALL set the debtStatus to "PAID" and set remainingAmount to 0
5. WHEN a GET request is made to a new `/debt/:debtId/payment-history` endpoint, THE DebtService SHALL return the list of all recorded payments for the specified Debt including amount, date, and linked transactionId
6. WHEN a GET request is made to a new `/debt/:debtId/payoff-projection` endpoint, THE DebtService SHALL calculate and return the projected payoff date based on the current remainingAmount, interestRate, and monthlyExpectedEMI using standard amortization logic
7. WHEN a GET request is made to a new `/debt/summary` endpoint, THE DebtService SHALL return an aggregate summary of all debts for the authenticated User including total debt amount, total remaining amount, total monthly EMI, and count of active vs paid debts
8. IF the debtId in any request does not match a Debt owned by the authenticated User, THEN THE API SHALL return a 404 status with the message "Debt not exist"
9. IF the payment amount is zero or negative, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 6: Savings Goals [NEW ROUTES/SERVICE]

**User Story:** As a user, I want to manage savings goals with contribution tracking and transaction linking so that I can monitor progress toward my financial targets.

**Status:** The Goal model exists with fields (name, category, targetAmount, savedAmount, targetDate, priority, description, status) but no routes, controller, or service are implemented.

#### Acceptance Criteria

1. THE API SHALL provide a new route file, controller, and service for Goals at the `/goals` path, following the existing Controller → Service → Model pattern
2. WHEN a POST request is made to `/goals/create` with name, category, targetAmount, targetDate, and optional priority and description, THE GoalService SHALL create a new Goal for the authenticated User with savedAmount defaulting to 0 and status defaulting to "active"
3. WHEN a PUT request is made to `/goals/:goalId` with any updatable fields (name, category, targetAmount, targetDate, priority, description), THE GoalService SHALL update only the provided fields on the matching Goal owned by the authenticated User
4. WHEN a GET request is made to `/goals/list`, THE GoalService SHALL return all Goals for the authenticated User
5. WHEN a GET request is made to `/goals/:goalId`, THE GoalService SHALL return the specified Goal owned by the authenticated User
6. WHEN a DELETE request is made to `/goals/:goalId`, THE GoalService SHALL delete the specified Goal owned by the authenticated User
7. WHEN a POST request is made to a new `/goals/:goalId/contribute` endpoint with an amount and an optional transactionId, THE GoalService SHALL increase the savedAmount on the Goal by the contribution amount
8. WHEN a contribution causes the savedAmount to reach or exceed the targetAmount, THE GoalService SHALL set the Goal status to "completed"
9. WHEN a PUT request is made to `/goals/:goalId/cancel`, THE GoalService SHALL set the Goal status to "cancelled"
10. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"
11. IF the contribution amount is zero or negative, THEN THE API SHALL return a 400 status with a descriptive error message
12. IF required fields (name, category, targetAmount, targetDate) are missing from a create request, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 7: Budget Management [NEW ROUTES/SERVICE]

**User Story:** As a user, I want to create and manage monthly budgets with category-level tracking and automatic spending calculation from my transactions so that I can control my expenses.

**Status:** The Budget model exists with fields (month, totalPlanned, totalActual, totalRemaining, categories array, notes) but no routes, controller, or service are implemented.

#### Acceptance Criteria

1. THE API SHALL provide a new route file, controller, and service for Budgets at the `/budgets` path, following the existing Controller → Service → Model pattern
2. WHEN a POST request is made to `/budgets/create` with month (number representing YYYYMM), categories array (each with categoryName and plannedAmount), and optional notes, THE BudgetService SHALL create a new Budget for the authenticated User with totalPlanned calculated as the sum of all category plannedAmounts, totalActual defaulting to 0, and totalRemaining equal to totalPlanned
3. WHEN a PUT request is made to `/budgets/:budgetId` with updated categories or notes, THE BudgetService SHALL update the specified fields and recalculate totalPlanned and totalRemaining
4. WHEN a GET request is made to `/budgets/list`, THE BudgetService SHALL return all Budgets for the authenticated User sorted by month descending
5. WHEN a GET request is made to `/budgets/:budgetId`, THE BudgetService SHALL return the specified Budget owned by the authenticated User
6. WHEN a DELETE request is made to `/budgets/:budgetId`, THE BudgetService SHALL delete the specified Budget owned by the authenticated User
7. WHEN a POST request is made to a new `/budgets/:budgetId/calculate-actuals` endpoint, THE BudgetService SHALL query TransactionLogs for the authenticated User within the budget month, match transactions to budget categories by category name, update each category's actualAmount and remainingAmount, and update the budget's totalActual and totalRemaining
8. WHEN a POST request is made to a new `/budgets/copy-from-previous` endpoint with a target month, THE BudgetService SHALL find the most recent Budget for the authenticated User before the target month, create a new Budget for the target month with the same category structure and planned amounts, and reset all actual amounts to 0
9. IF a Budget already exists for the specified month for the authenticated User during creation, THEN THE API SHALL return a 400 status with the message "Budget already exists for this month"
10. IF the budgetId does not match any Budget for the authenticated User, THEN THE API SHALL return a 404 status with the message "Budget not found"
11. IF the categories array is empty or missing from a create request, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 8: Financial Analytics [NEW]

**User Story:** As a user, I want aggregated financial analytics endpoints so that I can understand my income vs expenses, category spending patterns, savings trends, and debt/goal progress over time.

**Status:** No backend support exists. Requires a new analytics route, controller, and service with MongoDB aggregation pipelines.

#### Acceptance Criteria

1. THE API SHALL provide a new route file, controller, and service for Analytics at the `/analytics` path
2. WHEN a GET request is made to `/analytics/income-vs-expense` with optional query parameters dateFrom and dateTo, THE AnalyticsService SHALL return the total credit amount, total debit amount, and net amount (credits minus debits) from TransactionLogs for the authenticated User within the specified date range
3. WHEN a GET request is made to `/analytics/category-breakdown` with optional query parameters dateFrom, dateTo, and type (credit/debit), THE AnalyticsService SHALL return an array of objects each containing categoryName, totalAmount, and transactionCount, grouped by category from TransactionLogs for the authenticated User
4. WHEN a GET request is made to `/analytics/monthly-trend` with optional query parameters dateFrom and dateTo, THE AnalyticsService SHALL return an array of monthly aggregations each containing month (YYYYMM format), totalCredit, totalDebit, and netAmount from TransactionLogs for the authenticated User
5. WHEN a GET request is made to `/analytics/savings-progress`, THE AnalyticsService SHALL return an array of all active Goals for the authenticated User each containing goalName, targetAmount, savedAmount, percentComplete (savedAmount/targetAmount \* 100), and daysRemaining until targetDate
6. WHEN a GET request is made to `/analytics/debt-progress`, THE AnalyticsService SHALL return an array of all active Debts for the authenticated User each containing debtName, totalAmount, remainingAmount, percentPaid ((totalAmount - remainingAmount) / totalAmount \* 100), and monthlyEMI
7. WHEN a GET request is made to `/analytics/budget-vs-actual` with a month query parameter, THE AnalyticsService SHALL return the Budget for the specified month with each category showing plannedAmount, actualAmount, remainingAmount, and percentUsed (actualAmount/plannedAmount \* 100)
8. WHEN a GET request is made to `/analytics/top-spending` with optional query parameters dateFrom, dateTo, and limit (default 10), THE AnalyticsService SHALL return the top N debit TransactionLogs by amount for the authenticated User within the date range
9. IF no TransactionLogs exist for the authenticated User within the specified date range, THEN THE AnalyticsService SHALL return empty arrays or zero totals rather than an error
10. IF the dateFrom parameter is after the dateTo parameter, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 9: AI-Powered Financial Suggestions [NEW]

**User Story:** As a user, I want AI-powered suggestion endpoints so that I can receive intelligent categorization, grouping recommendations, debt repayment strategies, goal advice, and budget recommendations based on my financial data.

**Status:** No backend support exists. Requires a new AI route, controller, and service that integrates with an LLM provider and uses the user's financial data as context.

#### Acceptance Criteria

1. THE API SHALL provide a new route file, controller, and service for AI suggestions at the `/ai` path
2. WHEN a POST request is made to `/ai/categorize-transactions` with an array of transactionIds, THE AIService SHALL analyze the narration and amount of each TransactionLog and return suggested category and label assignments for each transaction
3. WHEN a POST request is made to `/ai/suggest-groups` with optional query parameters dateFrom and dateTo, THE AIService SHALL analyze the authenticated User's TransactionLogs within the date range and return suggested TransactionGroup groupings based on patterns in narration, amounts, and dates
4. WHEN a POST request is made to `/ai/debt-strategy`, THE AIService SHALL analyze all active Debts for the authenticated User and return a recommended repayment strategy (avalanche, snowball, or hybrid) with a prioritized list of debts and projected payoff timeline
5. WHEN a POST request is made to `/ai/goal-advice`, THE AIService SHALL analyze all active Goals and the authenticated User's income and spending patterns to return recommended monthly contribution amounts and feasibility assessments for each Goal
6. WHEN a POST request is made to `/ai/budget-recommendations` with a target month, THE AIService SHALL analyze the authenticated User's historical spending patterns and return recommended budget category allocations for the target month
7. WHEN a POST request is made to `/ai/chat` with a message string, THE AIService SHALL process the message in the context of the authenticated User's financial data and return a text response with relevant financial advice or data summaries
8. THE AIService SHALL use an abstracted LLM provider interface so that the underlying AI model can be swapped without changing the service logic
9. THE AIService SHALL include the authenticated User's relevant financial data (transactions, debts, goals, budgets, income) as context when making LLM requests, scoped to only the data needed for each endpoint
10. IF the LLM provider returns an error or is unavailable, THEN THE API SHALL return a 503 status with the message "AI service temporarily unavailable"
11. IF the transactionIds array in a categorize request contains IDs not belonging to the authenticated User, THEN THE API SHALL return a 400 status with a descriptive error message
12. THE API SHALL enforce a rate limit on AI endpoints to prevent excessive LLM API usage per User
