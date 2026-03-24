# Requirements Document

## Introduction

Budget Management provides full CRUD operations and smart automation for monthly budgets in the Money Mind personal finance API. Users can create budgets with categorized planned amounts, update them, list and retrieve them, delete them, calculate actual spending from transaction logs, and copy a previous month's budget structure into a new month. All endpoints require JWT authentication and operate on the authenticated user's data only.

## Glossary

- **API**: The Money Mind Express.js backend application that handles HTTP requests
- **Budget**: A MongoDB document representing a user's monthly financial plan, containing planned and actual amounts per category
- **BudgetService**: The service layer responsible for budget business logic and database operations
- **Budget_Category**: An entry within a Budget's categories array, containing categoryName, plannedAmount, actualAmount, and remainingAmount
- **TransactionLogs**: MongoDB collection storing individual financial transactions with transactionDate, category, amount, isCredit, and userId fields
- **User**: An authenticated user identified by a JWT access token and a userId (ObjectId)
- **Month_Identifier**: A number in YYYYMM format (e.g., 202506) representing a calendar month

## Requirements

### Requirement 1: Create Budget

**User Story:** As a user, I want to create a monthly budget with categorized planned amounts, so that I can plan my spending for a given month.

#### Acceptance Criteria

1. WHEN a POST request is made to `/budgets/create` with a valid month (YYYYMM format), a non-empty categories array (each containing categoryName and plannedAmount), and an optional notes field, THE BudgetService SHALL create a new Budget document for the authenticated User with totalPlanned equal to the sum of all category plannedAmounts, totalActual equal to 0, and totalRemaining equal to totalPlanned
2. WHEN a Budget is created, THE BudgetService SHALL set each Budget_Category's remainingAmount equal to that category's plannedAmount and actualAmount equal to 0
3. IF a Budget already exists for the authenticated User for the specified month, THEN THE API SHALL return a 400 status with the message "Budget already exists for this month"
4. IF the categories array is empty or missing in the create request, THEN THE API SHALL return a 400 status with a descriptive error message
5. WHEN a Budget is successfully created, THE API SHALL return the created Budget document in the response

### Requirement 2: Update Budget

**User Story:** As a user, I want to update my budget's categories or notes, so that I can adjust my financial plan as needed.

#### Acceptance Criteria

1. WHEN a PUT request is made to `/budgets/:budgetId` with an updated categories array, THE BudgetService SHALL replace the Budget's categories, recalculate totalPlanned as the sum of all new category plannedAmounts, and recalculate totalRemaining as totalPlanned minus totalActual
2. WHEN a PUT request is made to `/budgets/:budgetId` with an updated notes field, THE BudgetService SHALL update the Budget's notes field
3. WHEN categories are updated, THE BudgetService SHALL set each new Budget_Category's remainingAmount equal to that category's plannedAmount minus that category's actualAmount
4. IF the budgetId does not match any Budget belonging to the authenticated User, THEN THE API SHALL return a 404 status with the message "Budget not found"
5. WHEN a Budget is successfully updated, THE API SHALL return the updated Budget document in the response

### Requirement 3: List Budgets

**User Story:** As a user, I want to list all my budgets sorted by month descending, so that I can see my most recent budgets first.

#### Acceptance Criteria

1. WHEN a GET request is made to `/budgets/list`, THE BudgetService SHALL return all Budget documents belonging to the authenticated User sorted by month in descending order
2. THE BudgetService SHALL ensure that each Budget's month value in the returned list is greater than or equal to the next Budget's month value in the list

### Requirement 4: Get Budget by ID

**User Story:** As a user, I want to retrieve a single budget by its ID, so that I can view its full details.

#### Acceptance Criteria

1. WHEN a GET request is made to `/budgets/:budgetId`, THE BudgetService SHALL return the Budget document matching the budgetId and belonging to the authenticated User
2. IF the budgetId does not match any Budget belonging to the authenticated User, THEN THE API SHALL return a 404 status with the message "Budget not found"

### Requirement 5: Delete Budget

**User Story:** As a user, I want to delete a budget, so that I can remove budgets I no longer need.

#### Acceptance Criteria

1. WHEN a DELETE request is made to `/budgets/:budgetId`, THE BudgetService SHALL delete the Budget document matching the budgetId and belonging to the authenticated User
2. IF the budgetId does not match any Budget belonging to the authenticated User, THEN THE API SHALL return a 404 status with the message "Budget not found"
3. WHEN a Budget is successfully deleted, THE API SHALL return a success confirmation in the response

### Requirement 6: Calculate Actuals from Transaction Logs

**User Story:** As a user, I want to calculate actual spending for a budget from my transaction logs, so that I can see how my real spending compares to my plan.

#### Acceptance Criteria

1. WHEN a POST request is made to `/budgets/:budgetId/calculate-actuals`, THE BudgetService SHALL query TransactionLogs for the authenticated User where transactionDate falls within the Budget's month and isCredit is false (debit transactions only)
2. WHEN matching TransactionLogs are found, THE BudgetService SHALL set each Budget_Category's actualAmount equal to the sum of debit TransactionLogs amounts whose category matches that Budget_Category's categoryName
3. WHEN actuals are calculated, THE BudgetService SHALL set each Budget_Category's remainingAmount equal to that category's plannedAmount minus that category's actualAmount
4. WHEN actuals are calculated, THE BudgetService SHALL set the Budget's totalActual equal to the sum of all Budget_Category actualAmounts and totalRemaining equal to totalPlanned minus totalActual
5. IF the budgetId does not match any Budget belonging to the authenticated User, THEN THE API SHALL return a 404 status with the message "Budget not found"
6. WHEN actuals are successfully calculated, THE API SHALL return the updated Budget document in the response

### Requirement 7: Copy Budget from Previous Month

**User Story:** As a user, I want to copy a previous month's budget structure into a new month, so that I can quickly set up a new budget based on my prior plan.

#### Acceptance Criteria

1. WHEN a POST request is made to `/budgets/copy-from-previous` with a target month (YYYYMM format), THE BudgetService SHALL find the most recent Budget belonging to the authenticated User where the Budget's month is less than the target month
2. WHEN a source Budget is found, THE BudgetService SHALL create a new Budget for the target month with the same category names and plannedAmounts as the source Budget, all actualAmounts set to 0, each remainingAmount equal to its plannedAmount, totalPlanned equal to the source Budget's totalPlanned, totalActual equal to 0, and totalRemaining equal to totalPlanned
3. IF no Budget exists for the authenticated User with a month earlier than the target month, THEN THE API SHALL return a 404 status with a descriptive error message
4. IF a Budget already exists for the authenticated User for the target month, THEN THE API SHALL return a 400 status with the message "Budget already exists for this month"
5. WHEN a Budget is successfully copied, THE API SHALL return the newly created Budget document in the response
