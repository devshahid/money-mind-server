# Requirements Document

## Introduction

This document defines requirements for the Debt Management Enhancement feature of the Money Mind personal finance backend API. The existing debt module provides basic CRUD operations for debt records. This enhancement adds payment recording with transaction linking, payment history retrieval, amortization-based payoff projection, and an aggregate debt summary endpoint. All new endpoints follow the existing Controller → Service → Model pattern, use `asyncHandler` for MongoDB session management, `ResponseHandler` for consistent responses, and the `ApiError` hierarchy for error handling. Authentication is enforced via `authHandler.userAccess` on all routes.

## Glossary

- **API**: The Money Mind Express.js REST API served under `/api/v1`
- **AuthHandler**: Middleware that validates JWT tokens from the `accessToken` header and attaches the authenticated `User` to the request
- **AsyncHandler**: Wrapper that starts a MongoDB session/transaction for each request, commits on success, and aborts on error
- **ResponseHandler**: Base class providing `sendResponse()` for consistent JSON response formatting
- **ApiError**: Abstract error class hierarchy (`AuthError`, `CustomError`, `ClientError`) for structured error responses
- **Debt**: A tracked debt/loan record stored in the `debts` collection with a `debtDetails` subdocument containing fields: debtName, startDate, expectedEndDate, totalAmount, remainingAmount, interestRate, debtStatus, monthlyExpectedEMI, monthlyActualEMI, partPayment, paymentDate, lender
- **DebtPayment**: A payment record stored in the `debt_payments` collection with fields: userId, debtId, amount, paymentDate, transactionId (optional), notes (optional)
- **DebtService**: The service class responsible for all debt business logic
- **DebtController**: The controller class that handles HTTP requests for debt endpoints
- **TransactionLog**: A financial transaction record stored in the `TransactionLogs` collection, linked to a User
- **EMI**: Equated Monthly Installment — the fixed monthly payment amount for a debt
- **Amortization Formula**: `n = -log(1 - (r * P / M)) / log(1 + r)` where `r` = interestRate/12/100, `P` = remainingAmount, `M` = monthlyExpectedEMI

## Requirements

### Requirement 1: Record Debt Payment

**User Story:** As a user, I want to record a payment against a debt so that my remaining balance is updated and my payment history is tracked.

#### Acceptance Criteria

1. WHEN a POST request is made to `/debt/:debtId/record-payment` with a positive amount and a paymentDate, THE DebtService SHALL create a new DebtPayment record with the provided amount, paymentDate, and optional notes, and reduce the Debt's `remainingAmount` by the payment amount
2. WHEN a transactionId is provided in the record-payment request body, THE DebtService SHALL verify the TransactionLog with that transactionId belongs to the authenticated User and link the DebtPayment record to that transactionId
3. WHEN recording a payment causes the Debt's `remainingAmount` to drop to 0 or below, THE DebtService SHALL set `debtDetails.debtStatus` to "PAID" and clamp `debtDetails.remainingAmount` to 0
4. IF the payment amount is 0 or negative, THEN THE API SHALL return a 400 status with a descriptive error message
5. IF the debtId does not match any Debt owned by the authenticated User, THEN THE API SHALL return a 404 status with the message "Debt not exist"
6. IF a transactionId is provided but the referenced TransactionLog does not belong to the authenticated User, THEN THE API SHALL return a 400 status with a descriptive error message

### Requirement 2: Payment History

**User Story:** As a user, I want to view all payments I have made against a debt so that I can audit my repayment history.

#### Acceptance Criteria

1. WHEN a GET request is made to `/debt/:debtId/payment-history`, THE DebtService SHALL return all DebtPayment records for the specified Debt belonging to the authenticated User, including amount, paymentDate, transactionId, and notes for each record
2. IF the debtId does not match any Debt owned by the authenticated User, THEN THE API SHALL return a 404 status with the message "Debt not exist"
3. WHILE a Debt has recorded payments, THE DebtService SHALL return the payment history such that the sum of all DebtPayment amounts for that Debt equals `debtDetails.totalAmount` minus `debtDetails.remainingAmount`

### Requirement 3: Payoff Projection

**User Story:** As a user, I want to see a projected payoff date for my debt so that I can plan my finances accordingly.

#### Acceptance Criteria

1. WHEN a GET request is made to `/debt/:debtId/payoff-projection`, THE DebtService SHALL calculate the projected number of months to payoff using the amortization formula `n = ceil(-log(1 - (r * P / M)) / log(1 + r))` where `r` = interestRate/12/100, `P` = remainingAmount, and `M` = monthlyExpectedEMI, and return both the projected month count and the projected payoff date
2. IF the debtId does not match any Debt owned by the authenticated User, THEN THE API SHALL return a 404 status with the message "Debt not exist"
3. IF the Debt's `debtDetails.interestRate` is 0, THEN THE DebtService SHALL calculate projected months as `ceil(remainingAmount / monthlyExpectedEMI)` instead of the standard amortization formula
4. IF the Debt's `debtDetails.monthlyExpectedEMI` is less than or equal to the monthly interest (`remainingAmount * interestRate / 12 / 100`), THEN THE API SHALL return a 400 status indicating the EMI is insufficient to cover interest

### Requirement 4: Debt Summary

**User Story:** As a user, I want an aggregate summary of all my debts so that I can understand my total debt burden at a glance.

#### Acceptance Criteria

1. WHEN a GET request is made to `/debt/summary`, THE DebtService SHALL return an aggregate summary for the authenticated User containing: `totalDebt` (sum of all `debtDetails.totalAmount`), `totalRemaining` (sum of all `debtDetails.remainingAmount`), `totalMonthlyEMI` (sum of all `debtDetails.monthlyExpectedEMI`), `activeCount` (count of Debts where `debtDetails.debtStatus` is not "PAID"), and `paidCount` (count of Debts where `debtDetails.debtStatus` is "PAID")
2. WHILE the authenticated User has no Debt records, THE DebtService SHALL return a summary with all numeric fields set to 0 and both counts set to 0

## Correctness Properties

### Property 1: Debt payment reduces remaining amount

_For any_ active Debt and positive payment amount, after recording the payment via `POST /debt/:debtId/record-payment`: (a) the Debt's `remainingAmount` decreases by the payment amount (clamped to 0), (b) if the new `remainingAmount` is 0 then `debtStatus` is "PAID", and (c) a DebtPayment record is created with the correct amount and paymentDate.

**Validates: Requirements 1.1, 1.3**

### Property 2: Debt payment transaction linking

_For any_ payment request that includes a transactionId, the resulting DebtPayment record references that transactionId, and the referenced TransactionLog must belong to the authenticated User.

**Validates: Requirement 1.2**

### Property 3: Debt payment history completeness

_For any_ Debt with one or more recorded payments, the payment history endpoint returns all DebtPayment records for that Debt, and the sum of all payment amounts equals `totalAmount - remainingAmount`.

**Validates: Requirements 2.1, 2.3**

### Property 4: Debt payoff projection mathematical correctness

_For any_ Debt with positive `remainingAmount`, positive `interestRate`, and `monthlyExpectedEMI` greater than the monthly interest charge, the projected months returned equals `ceil(-log(1 - (r * P / M)) / log(1 + r))` where `r` = interestRate/12/100, `P` = remainingAmount, `M` = monthlyExpectedEMI.

**Validates: Requirement 3.1**

### Property 5: Debt summary aggregation correctness

_For any_ set of Debts belonging to the authenticated User, the summary's `totalDebt` equals the sum of all `debtDetails.totalAmount`, `totalRemaining` equals the sum of all `debtDetails.remainingAmount`, `totalMonthlyEMI` equals the sum of all `debtDetails.monthlyExpectedEMI`, `activeCount` matches the count of Debts where `debtStatus` is not "PAID", and `paidCount` matches the count of Debts where `debtStatus` is "PAID".

**Validates: Requirement 4.1**
