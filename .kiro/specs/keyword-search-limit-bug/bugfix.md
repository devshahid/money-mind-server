# Bugfix Requirements Document

## Introduction

The transaction filter system has multiple bugs causing validation errors and incorrect API behavior. When users search, filter, or change dropdown values, the API returns validation errors or incorrect results due to mismatches between frontend-sent values and backend Joi validation schema expectations. Additionally, the keyword search ignores pagination parameters, and combined `$or` filters overwrite each other.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a keyword search is performed with `limit: 50` THEN the system returns only 10 results because the frontend dispatch omits `page` and `limit` parameters, causing the controller to default to `limit=10`

1.2 WHEN a keyword search is performed THEN the system returns a `totalCount` of 137 (all user transactions) instead of the count of transactions matching the keyword

1.3 WHEN a keyword search is combined with a category filter that uses `$or` (e.g., "Uncategorized") THEN the system overwrites the category `$or` with the keyword `$or`, producing incorrect filter results

1.4 WHEN the user selects "Cash" or "Online" in the "All Transactions" dropdown THEN the backend returns validation error: `"transactionType" must be one of [credit, debit]` because the Joi schema allows only `credit`/`debit` but the frontend sends `online`/`cash`/`all`

1.5 WHEN the user selects "Credit" or "Debit" in the "Transaction Flow" dropdown THEN the API may return a validation error because the frontend sends the `type` field with value `'all'` which is not stripped before sending

1.6 WHEN the user selects any label from the Labels filter THEN the backend returns a validation error because the frontend sends `labels` as a comma-separated string but the Joi schema expects an array

1.7 WHEN the user types in the "Amount" field THEN the API is called with each keystroke (e.g., `1`, `10`, `100`) causing unnecessary requests and potential validation errors for incomplete numeric values

1.8 WHEN the user enters a "Bank Name" filter THEN the API is called with each keystroke without debouncing, causing excessive API calls

1.9 WHEN the user applies a date filter with an empty value (e.g., clears the "From Date") THEN the API returns a validation error because empty string `''` is not a valid `Joi.date()` value

1.10 WHEN the user selects "All" in any dropdown filter THEN the value `'all'` is sent to the backend which may fail validation since the schema does not include `'all'` as a valid option

### Expected Behavior (Correct)

2.1 WHEN a keyword search is performed with a configured `limit` THEN the system SHALL include `page: '1'` and `limit` from the Redux state in the API dispatch, and the backend SHALL return up to `limit` matching results

2.2 WHEN a keyword search is performed THEN the system SHALL return a `totalCount` that reflects only the number of transactions matching the keyword filter

2.3 WHEN a keyword search is combined with a category filter THEN the system SHALL apply both filters correctly using `$and` to combine multiple `$or` conditions without one overwriting the other

2.4 WHEN the user selects "Cash" or "Online" in the "All Transactions" dropdown THEN the frontend SHALL send `transactionType` with values `online` or `cash`, and the backend validation schema SHALL accept `online`, `cash`, and `all` as valid values (or the frontend SHALL strip `'all'` before sending)

2.5 WHEN the user selects "All" in any dropdown filter THEN the frontend SHALL NOT send that field to the backend (strip it from the request payload) since "All" means "no filter applied"

2.6 WHEN the user selects labels THEN the frontend SHALL send `labels` as an array (not a comma-separated string) to match the backend Joi schema expectation

2.7 WHEN the user types in the "Amount" field THEN the frontend SHALL debounce the input by 1 second before dispatching the API call, only sending once the user stops typing

2.8 WHEN the user types in the "Bank Name" field THEN the frontend SHALL debounce the input by 1 second before dispatching the API call

2.9 WHEN a date filter field is empty or cleared THEN the frontend SHALL NOT include that field in the request payload (strip empty dates before sending)

2.10 WHEN the backend receives `transactionType` THEN the Joi schema SHALL accept `online`, `cash`, `credit`, `debit` as valid values (fixing the mismatch between frontend options and backend validation)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN no keyword is provided and `limit: 50` is set THEN the system SHALL CONTINUE TO return up to 50 transactions with correct pagination

3.2 WHEN a category filter is applied without a keyword THEN the system SHALL CONTINUE TO filter transactions by category correctly (including the Uncategorized `$or` logic)

3.3 WHEN pagination parameters `page` and `limit` are provided without any keyword or category filter THEN the system SHALL CONTINUE TO paginate results correctly with accurate totalCount

3.4 WHEN multiple filters (dateFrom, dateTo, bankName, type, labels) are applied without keyword THEN the system SHALL CONTINUE TO combine and apply all filters correctly

3.5 WHEN `limit` is not provided in the request THEN the system SHALL CONTINUE TO default to 10 results per page

3.6 WHEN the filter drawer "Apply Filters" button is clicked THEN the system SHALL CONTINUE TO dispatch all selected filters correctly to the API
