# Requirements Document

## Introduction

The Savings Goals module provides a complete CRUD API for managing personal savings goals within the Money Mind personal finance backend. Users can create goals with target amounts and dates, track contributions toward those goals, and monitor progress with automatic status transitions upon completion or cancellation. The module follows the existing Controller → Service → Model architecture and requires JWT authentication for all endpoints.

## Glossary

- **Goal**: A Mongoose document representing a user's savings target, containing name, category, targetAmount, savedAmount, targetDate, priority, description, and status fields.
- **GoalService**: The service layer responsible for all Goal business logic, including creation, updates, contributions, and status transitions.
- **GoalController**: The controller layer that handles HTTP request/response mapping and delegates to GoalService.
- **API**: The Express.js REST API that exposes Goal endpoints under the `/goals` path.
- **User**: An authenticated user identified by a JWT access token, whose `_id` is extracted from the token by the auth middleware.
- **Contribution**: A positive monetary amount added to a Goal's savedAmount, optionally linked to a transactionId.

## Requirements

### Requirement 1: Create a Goal

**User Story:** As a user, I want to create a new savings goal with a name, category, target amount, and target date, so that I can start tracking my progress toward a financial objective.

#### Acceptance Criteria

1. WHEN a POST request is made to `/goals/create` with name, category, targetAmount, and targetDate, THE GoalService SHALL create a new Goal for the authenticated User with savedAmount set to 0 and status set to "active"
2. WHEN a POST request is made to `/goals/create` with optional priority and description fields, THE GoalService SHALL store the provided values on the new Goal
3. WHEN a POST request is made to `/goals/create` without a priority field, THE GoalService SHALL default the priority to "medium"
4. IF any required field (name, category, targetAmount, targetDate) is missing from a create request, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 2: Update a Goal

**User Story:** As a user, I want to update the details of an existing goal, so that I can adjust my savings plan as my circumstances change.

#### Acceptance Criteria

1. WHEN a PUT request is made to `/goals/:goalId` with any updatable fields (name, category, targetAmount, targetDate, priority, description), THE GoalService SHALL update only the provided fields on the matching Goal owned by the authenticated User
2. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"

### Requirement 3: List All Goals

**User Story:** As a user, I want to see all my savings goals, so that I can get an overview of my financial objectives.

#### Acceptance Criteria

1. WHEN a GET request is made to `/goals/list`, THE GoalService SHALL return all Goals belonging to the authenticated User

### Requirement 4: Get a Single Goal

**User Story:** As a user, I want to view the details of a specific goal, so that I can check its current progress.

#### Acceptance Criteria

1. WHEN a GET request is made to `/goals/:goalId`, THE GoalService SHALL return the specified Goal owned by the authenticated User
2. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"

### Requirement 5: Delete a Goal

**User Story:** As a user, I want to delete a goal I no longer need, so that I can keep my goals list clean and relevant.

#### Acceptance Criteria

1. WHEN a DELETE request is made to `/goals/:goalId`, THE GoalService SHALL delete the specified Goal owned by the authenticated User
2. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"

### Requirement 6: Contribute to a Goal

**User Story:** As a user, I want to add a contribution to a goal, so that I can track how much I have saved and see automatic completion when I reach my target.

#### Acceptance Criteria

1. WHEN a POST request is made to `/goals/:goalId/contribute` with a positive amount, THE GoalService SHALL increase the savedAmount on the Goal by exactly the contribution amount
2. WHEN a POST request is made to `/goals/:goalId/contribute` with an optional transactionId, THE GoalService SHALL accept and process the contribution with the linked transaction reference
3. WHEN a contribution causes the savedAmount to equal or exceed the targetAmount, THE GoalService SHALL set the Goal status to "completed"
4. IF the contribution amount is zero or negative, THEN THE API SHALL return a 400 status with a descriptive error message
5. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"

### Requirement 7: Cancel a Goal

**User Story:** As a user, I want to cancel a goal I no longer wish to pursue, so that I can mark it as abandoned without deleting its history.

#### Acceptance Criteria

1. WHEN a PUT request is made to `/goals/:goalId/cancel`, THE GoalService SHALL set the Goal status to "cancelled"
2. IF the goalId does not match any Goal for the authenticated User, THEN THE API SHALL return a 404 status with the message "Goal not found"

### Requirement 8: Authentication Enforcement

**User Story:** As a system operator, I want all goal endpoints to require JWT authentication, so that only authorized users can access and modify their goals.

#### Acceptance Criteria

1. THE API SHALL require a valid JWT access token in the `accessToken` header for all Goal endpoints
2. THE API SHALL scope all Goal queries to the authenticated User's `_id`, ensuring a User can only access Goals belonging to that User

### Requirement 9: Goal Creation Defaults (Correctness Property)

**User Story:** As a developer, I want to verify that goal creation always applies correct defaults, so that no goal enters the system in an inconsistent state.

#### Acceptance Criteria

1. FOR ALL valid creation inputs, THE GoalService SHALL produce a Goal where savedAmount equals 0
2. FOR ALL valid creation inputs, THE GoalService SHALL produce a Goal where status equals "active"

### Requirement 10: Contribution Correctness (Correctness Property)

**User Story:** As a developer, I want to verify that contributions are applied accurately and trigger auto-completion correctly, so that goal progress tracking is reliable.

#### Acceptance Criteria

1. FOR ALL active Goals and positive contribution amounts, THE GoalService SHALL increase savedAmount by exactly the contribution amount
2. FOR ALL active Goals where the new savedAmount equals or exceeds targetAmount after a contribution, THE GoalService SHALL set the status to "completed"
3. FOR ALL active Goals where the new savedAmount is less than targetAmount after a contribution, THE GoalService SHALL keep the status as "active"

### Requirement 11: Cancellation Correctness (Correctness Property)

**User Story:** As a developer, I want to verify that cancellation always transitions the goal to the correct status, so that goal lifecycle management is predictable.

#### Acceptance Criteria

1. FOR ALL active Goals, WHEN a cancellation request is processed, THE GoalService SHALL set the status to "cancelled"
