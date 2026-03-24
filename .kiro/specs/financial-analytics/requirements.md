# Requirements Document

## Introduction

Financial Analytics provides a set of read-only API endpoints under `/analytics` that aggregate and summarize a user's financial data across TransactionLogs, Goals, Debts, and Budgets. All endpoints require JWT authentication via the `accessToken` header and return computed summaries using MongoDB aggregation pipelines. The existing route stubs and controller skeleton are already in place and need to be implemented with an AnalyticsService layer.

## Glossary

- **API**: The Money Mind Express.js backend application
- **Analytics_Service**: The service layer responsible for executing MongoDB aggregation pipelines and computing analytics results
- **Analytics_Controller**: The controller layer that receives HTTP requests, validates query parameters, and delegates to the Analytics_Service
- **TransactionLog**: A MongoDB document representing a single financial transaction with fields including userId, transactionDate, narration, category, label, amount, isCredit, isCash, and bankName
- **Goal**: A MongoDB document representing a user's savings goal with fields including userId, name, category, targetAmount, savedAmount, targetDate, priority, and status (active/completed/cancelled)
- **Debt**: A MongoDB document representing a user's debt with nested debtDetails containing debtName, totalAmount, remainingAmount, interestRate, debtStatus, monthlyExpectedEMI, monthlyActualEMI, and lender
- **Budget**: A MongoDB document representing a user's monthly budget with fields including userId, month (YYYYMM as number), totalPlanned, totalActual, totalRemaining, and a categories array of { categoryName, plannedAmount, actualAmount, remainingAmount }
- **Authenticated_User**: A user whose identity has been verified via JWT token in the accessToken header, with the user object available on the request
- **Date_Range**: An optional filter defined by dateFrom and dateTo query parameters, both ISO 8601 date strings
- **Credit_Transaction**: A TransactionLog where isCredit is true
- **Debit_Transaction**: A TransactionLog where isCredit is false

## Requirements

### Requirement 1: Income vs Expense Summary

**User Story:** As an authenticated user, I want to see my total income versus total expenses for a given period, so that I can understand my net cash flow.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/income-vs-expense` without date parameters, THE Analytics_Service SHALL aggregate all TransactionLogs for the Authenticated_User and return totalCredit, totalDebit, and netAmount
2. WHEN a GET request is made to `/analytics/income-vs-expense` with dateFrom and dateTo query parameters, THE Analytics_Service SHALL aggregate only TransactionLogs with transactionDate within the specified Date_Range (inclusive)
3. THE Analytics_Service SHALL compute totalCredit as the sum of amount for all Credit_Transactions in the filtered set
4. THE Analytics_Service SHALL compute totalDebit as the sum of amount for all Debit_Transactions in the filtered set
5. THE Analytics_Service SHALL compute netAmount as totalCredit minus totalDebit
6. WHEN no TransactionLogs exist for the Authenticated_User within the Date_Range, THE Analytics_Service SHALL return totalCredit as 0, totalDebit as 0, and netAmount as 0
7. IF dateFrom is greater than dateTo, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 2: Category Breakdown

**User Story:** As an authenticated user, I want to see my spending or income broken down by category, so that I can identify where my money goes.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/category-breakdown`, THE Analytics_Service SHALL group TransactionLogs for the Authenticated_User by category and return an array of objects each containing categoryName, totalAmount, and transactionCount
2. WHEN the type query parameter is set to "credit", THE Analytics_Service SHALL include only Credit_Transactions in the aggregation
3. WHEN the type query parameter is set to "debit", THE Analytics_Service SHALL include only Debit_Transactions in the aggregation
4. WHEN the type query parameter is omitted, THE Analytics_Service SHALL include all TransactionLogs in the aggregation
5. WHEN dateFrom and dateTo query parameters are provided, THE Analytics_Service SHALL filter TransactionLogs to those with transactionDate within the specified Date_Range (inclusive)
6. THE Analytics_Service SHALL compute totalAmount as the sum of amount for each category group
7. THE Analytics_Service SHALL compute transactionCount as the count of TransactionLogs for each category group
8. WHEN no TransactionLogs match the filters, THE Analytics_Service SHALL return an empty array
9. IF dateFrom is greater than dateTo, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 3: Monthly Trend

**User Story:** As an authenticated user, I want to see my income and expense trends month by month, so that I can track financial patterns over time.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/monthly-trend`, THE Analytics_Service SHALL group TransactionLogs for the Authenticated_User by month and return an array of objects each containing month (YYYYMM format), totalCredit, totalDebit, and netAmount
2. WHEN dateFrom and dateTo query parameters are provided, THE Analytics_Service SHALL filter TransactionLogs to those with transactionDate within the specified Date_Range (inclusive)
3. THE Analytics_Service SHALL compute totalCredit per month as the sum of amount for Credit_Transactions in that month
4. THE Analytics_Service SHALL compute totalDebit per month as the sum of amount for Debit_Transactions in that month
5. THE Analytics_Service SHALL compute netAmount per month as totalCredit minus totalDebit for that month
6. THE Analytics_Service SHALL sort the results by month in ascending order
7. WHEN no TransactionLogs exist within the Date_Range, THE Analytics_Service SHALL return an empty array
8. IF dateFrom is greater than dateTo, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 4: Savings Progress

**User Story:** As an authenticated user, I want to see the progress of my savings goals, so that I can track how close I am to achieving each goal.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/savings-progress`, THE Analytics_Service SHALL retrieve all Goals with status "active" for the Authenticated_User
2. THE Analytics_Service SHALL return an array of objects each containing goalName, targetAmount, savedAmount, percentComplete, and daysRemaining
3. THE Analytics_Service SHALL compute percentComplete as (savedAmount divided by targetAmount) multiplied by 100
4. THE Analytics_Service SHALL compute daysRemaining as the number of days from the current date to the targetDate of the Goal
5. IF targetAmount is 0, THEN THE Analytics_Service SHALL return percentComplete as 0
6. WHEN no active Goals exist for the Authenticated_User, THE Analytics_Service SHALL return an empty array

### Requirement 5: Debt Progress

**User Story:** As an authenticated user, I want to see the repayment progress of my debts, so that I can monitor how much I have paid off.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/debt-progress`, THE Analytics_Service SHALL retrieve all Debts with debtDetails.debtStatus "active" for the Authenticated_User
2. THE Analytics_Service SHALL return an array of objects each containing debtName, totalAmount, remainingAmount, percentPaid, and monthlyEMI
3. THE Analytics_Service SHALL compute percentPaid as ((totalAmount minus remainingAmount) divided by totalAmount) multiplied by 100
4. THE Analytics_Service SHALL set monthlyEMI to the value of debtDetails.monthlyExpectedEMI
5. IF totalAmount is 0, THEN THE Analytics_Service SHALL return percentPaid as 0
6. WHEN no active Debts exist for the Authenticated_User, THE Analytics_Service SHALL return an empty array

### Requirement 6: Budget vs Actual

**User Story:** As an authenticated user, I want to compare my planned budget against actual spending for a given month, so that I can see where I am over or under budget.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/budget-vs-actual` with a month query parameter (YYYYMM format), THE Analytics_Service SHALL retrieve the Budget for the Authenticated_User matching that month
2. THE Analytics_Service SHALL return the budget with each category containing categoryName, plannedAmount, actualAmount, remainingAmount, and percentUsed
3. THE Analytics_Service SHALL compute percentUsed as (actualAmount divided by plannedAmount) multiplied by 100
4. IF plannedAmount is 0 for a category, THEN THE Analytics_Service SHALL return percentUsed as 0 for that category
5. IF no Budget exists for the specified month, THEN THE Analytics_Service SHALL return an empty categories array with zero totals
6. IF the month query parameter is missing, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 7: Top Spending

**User Story:** As an authenticated user, I want to see my largest expenses, so that I can identify significant spending.

#### Acceptance Criteria

1. WHEN a GET request is made to `/analytics/top-spending`, THE Analytics_Service SHALL retrieve Debit_Transactions for the Authenticated_User sorted by amount in descending order
2. WHEN the limit query parameter is provided, THE Analytics_Service SHALL return at most that number of results
3. WHEN the limit query parameter is omitted, THE Analytics_Service SHALL default to returning at most 10 results
4. WHEN dateFrom and dateTo query parameters are provided, THE Analytics_Service SHALL filter TransactionLogs to those with transactionDate within the specified Date_Range (inclusive)
5. THE Analytics_Service SHALL return only Debit_Transactions (isCredit is false)
6. WHEN no Debit_Transactions match the filters, THE Analytics_Service SHALL return an empty array
7. IF dateFrom is greater than dateTo, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 8: Authentication and Authorization

**User Story:** As a system operator, I want all analytics endpoints to require authentication, so that users can only access their own financial data.

#### Acceptance Criteria

1. THE API SHALL require a valid JWT token in the accessToken header for all analytics endpoints
2. IF the accessToken header is missing or invalid, THEN THE API SHALL return a 401 status with an authentication error message
3. THE Analytics_Service SHALL scope all database queries to the Authenticated_User's userId, ensuring no cross-user data leakage

### Requirement 9: Analytics Service Layer

**User Story:** As a developer, I want analytics logic encapsulated in a dedicated service, so that the controller remains thin and the aggregation logic is testable.

#### Acceptance Criteria

1. THE API SHALL provide an Analytics_Service at `src/services/analytics.service.ts` that encapsulates all aggregation and computation logic
2. THE Analytics_Controller SHALL delegate all data retrieval and computation to the Analytics_Service
3. THE Analytics_Controller SHALL handle only request parsing, query parameter validation, and response formatting
