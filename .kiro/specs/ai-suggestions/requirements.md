# Requirements Document

## Introduction

AI-Powered Financial Suggestions integrates a large language model into the Money Mind personal finance API to provide intelligent categorization, grouping, debt strategy, goal advice, budget recommendations, and free-form financial chat. The feature introduces an LLM provider abstraction layer, per-user rate limiting on AI endpoints, and six new POST endpoints under the `/ai` route prefix. All AI endpoints require JWT authentication and log every request to the AIRequestLog collection.

## Glossary

- **API**: The Money Mind Express.js backend application that handles HTTP requests
- **AIService**: The service layer responsible for gathering user financial data, constructing prompts, calling the LLM_Provider, and returning structured AI responses
- **AIRequestLog**: A MongoDB document that records each AI endpoint invocation with userId, endpoint, timestamps, tokenCount, and status (success or error)
- **LLM_Provider**: An abstraction interface (`ILLMProvider`) with a `complete(prompt, systemPrompt)` method that sends a prompt to an external large language model and returns a text response
- **LLM_Provider_Factory**: A factory (`LLMProviderFactory.create(providerName, config)`) that instantiates the correct LLM_Provider implementation based on the `LLM_PROVIDER` environment variable
- **OpenAI_Provider**: A concrete LLM_Provider implementation that calls the OpenAI chat completions API using axios
- **LLM_Provider_Config**: A configuration object containing apiKey, model, maxTokens, and temperature fields, populated from environment variables
- **Rate_Limiter**: An in-memory middleware that tracks AI request counts per userId using a Map with TTL-based cleanup
- **User**: An authenticated user identified by a JWT access token and a userId (ObjectId)
- **TransactionLogs**: MongoDB collection storing individual financial transactions with transactionDate, narration, category, label, amount, isCredit, and userId fields
- **Debt**: MongoDB document containing debt details including debtName, totalAmount, remainingAmount, interestRate, monthlyExpectedEMI, and debtStatus for a User
- **Goal**: MongoDB document representing a financial goal with name, targetAmount, savedAmount, targetDate, priority, and status for a User
- **Income**: MongoDB document recording a User's income entries with month, year, type, sourceName, and amount
- **Budget**: MongoDB document representing a User's monthly budget with categories containing plannedAmount and actualAmount

## Requirements

### Requirement 1: LLM Provider Abstraction

**User Story:** As a developer, I want a provider-agnostic LLM integration layer, so that the AI service can switch between LLM providers without changing business logic.

#### Acceptance Criteria

1. THE LLM_Provider interface SHALL define a `complete(prompt: string, systemPrompt: string): Promise<string>` method
2. THE LLM_Provider_Config SHALL contain apiKey, model, maxTokens, and temperature fields
3. WHEN `LLM_Provider_Factory.create(providerName, config)` is called with providerName "openai", THE LLM_Provider_Factory SHALL return an OpenAI_Provider instance configured with the provided LLM_Provider_Config
4. IF `LLM_Provider_Factory.create` is called with an unsupported providerName, THEN THE LLM_Provider_Factory SHALL throw an error indicating the provider is not supported
5. THE OpenAI_Provider SHALL send the prompt and systemPrompt to the OpenAI chat completions API using axios and return the response text content
6. THE API SHALL read the provider name from the `LLM_PROVIDER` environment variable and the API key from the `LLM_API_KEY` environment variable

### Requirement 2: AI Rate Limiting

**User Story:** As a system operator, I want to limit the number of AI requests each user can make per minute, so that the system is protected from excessive LLM API usage.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL track the number of AI endpoint requests per userId using an in-memory Map
2. THE Rate_Limiter SHALL read the maximum allowed requests per minute from the `AI_RATE_LIMIT_PER_MINUTE` environment variable, defaulting to 10 when the variable is not set
3. WHEN a User sends a request to any `/ai` route and the User's request count within the current one-minute window is below the configured limit, THE Rate_Limiter SHALL allow the request to proceed and increment the User's request count
4. WHEN a User sends a request to any `/ai` route and the User's request count within the current one-minute window has reached the configured limit, THE Rate_Limiter SHALL reject the request with HTTP status 429 and a descriptive error message
5. WHEN a User is rate-limited, THE Rate_Limiter SHALL not affect request counts or access for other Users
6. THE Rate_Limiter SHALL remove expired entries from the in-memory Map using TTL-based cleanup to prevent memory leaks

### Requirement 3: AI Request Logging

**User Story:** As a system operator, I want every AI endpoint call to be logged, so that I can monitor usage, debug issues, and track token consumption.

#### Acceptance Criteria

1. WHEN an AI endpoint request is received, THE AIService SHALL create an AIRequestLog document with the authenticated User's userId, the endpoint path, requestTimestamp set to the current time, and status set to "success"
2. WHEN the LLM_Provider returns a response, THE AIService SHALL update the AIRequestLog document with responseTimestamp set to the current time and tokenCount set to the number of tokens reported by the LLM_Provider response
3. IF the LLM_Provider call fails, THEN THE AIService SHALL update the AIRequestLog document with status set to "error" and responseTimestamp set to the current time

### Requirement 4: Categorize Transactions

**User Story:** As a user, I want to send a list of transaction IDs and receive AI-suggested categories and labels for each transaction, so that I can organize my transactions efficiently.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/categorize-transactions` with a non-empty transactionIds array, THE AIService SHALL fetch the TransactionLogs matching the provided IDs and belonging to the authenticated User
2. IF any transactionId in the request does not belong to the authenticated User, THEN THE API SHALL return HTTP status 400 with a descriptive error message
3. IF the transactionIds array is empty or missing, THEN THE API SHALL return HTTP status 400 with a descriptive error message
4. WHEN valid TransactionLogs are fetched, THE AIService SHALL send each transaction's narration and amount to the LLM_Provider and return a response array containing exactly one entry per input transactionId
5. THE AIService SHALL ensure each entry in the categorization response contains a category field (string) and a labels field (array of strings)
6. IF the LLM_Provider call fails during categorization, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 5: Suggest Transaction Groups

**User Story:** As a user, I want the AI to analyze my transactions and suggest logical groupings, so that I can better understand my spending patterns.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/suggest-groups` with optional dateFrom and dateTo parameters, THE AIService SHALL fetch TransactionLogs belonging to the authenticated User within the specified date range
2. WHEN dateFrom and dateTo are not provided, THE AIService SHALL fetch all TransactionLogs belonging to the authenticated User
3. WHEN TransactionLogs are fetched, THE AIService SHALL send the transaction data to the LLM_Provider and return suggested grouping patterns
4. IF the LLM_Provider call fails during group suggestion, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 6: Debt Repayment Strategy

**User Story:** As a user, I want AI-generated debt repayment strategies, so that I can choose the most effective approach to pay off my debts.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/debt-strategy`, THE AIService SHALL fetch all Debt documents belonging to the authenticated User where debtStatus is active
2. WHEN active Debts are fetched, THE AIService SHALL send the debt details (debtName, totalAmount, remainingAmount, interestRate, monthlyExpectedEMI) to the LLM_Provider and return a repayment strategy recommendation
3. THE AIService SHALL ensure the debt strategy response includes analysis of avalanche, snowball, and hybrid repayment approaches
4. IF the authenticated User has no active Debts, THEN THE API SHALL return HTTP status 400 with a descriptive error message
5. IF the LLM_Provider call fails during debt strategy generation, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 7: Goal Contribution Advice

**User Story:** As a user, I want AI-powered advice on how to allocate money toward my financial goals, so that I can make progress on the goals that matter most.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/goal-advice`, THE AIService SHALL fetch all Goal documents belonging to the authenticated User where status is "active"
2. WHEN active Goals are fetched, THE AIService SHALL also fetch the authenticated User's Income documents and recent spending patterns from TransactionLogs
3. WHEN financial data is gathered, THE AIService SHALL send the goals (name, targetAmount, savedAmount, targetDate, priority), income data, and spending patterns to the LLM_Provider and return contribution recommendations for each active Goal
4. IF the authenticated User has no active Goals, THEN THE API SHALL return HTTP status 400 with a descriptive error message
5. IF the LLM_Provider call fails during goal advice generation, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 8: Budget Recommendations

**User Story:** As a user, I want AI-generated budget category allocations based on my historical spending, so that I can create a realistic budget for an upcoming month.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/budget-recommendations` with a targetMonth (YYYYMM format), THE AIService SHALL fetch the authenticated User's TransactionLogs from the preceding three months relative to the targetMonth
2. WHEN historical TransactionLogs are fetched, THE AIService SHALL send the spending data grouped by category to the LLM_Provider and return recommended category allocations for the target month
3. IF the targetMonth parameter is missing or not in YYYYMM format, THEN THE API SHALL return HTTP status 400 with a descriptive error message
4. IF the LLM_Provider call fails during budget recommendation generation, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 9: Financial Chat

**User Story:** As a user, I want to ask free-form financial questions and receive AI-generated answers grounded in my financial data, so that I can get personalized financial guidance.

#### Acceptance Criteria

1. WHEN a POST request is made to `/ai/chat` with a non-empty message string, THE AIService SHALL fetch a summary of the authenticated User's financial data including recent TransactionLogs, active Debts, active Goals, Income, and current Budget
2. WHEN the financial summary is gathered, THE AIService SHALL send the User's message along with the financial summary as context to the LLM_Provider and return the text response
3. IF the message field is empty or missing, THEN THE API SHALL return HTTP status 400 with a descriptive error message
4. IF the LLM_Provider call fails during chat, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"

### Requirement 10: AI Service Error Handling

**User Story:** As a user, I want clear and consistent error responses from AI endpoints, so that I understand when the AI service is unavailable or my request is invalid.

#### Acceptance Criteria

1. WHEN the LLM_Provider throws an error during any AI endpoint call, THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable"
2. WHEN a request to any AI endpoint is missing required fields, THE API SHALL return HTTP status 400 with a descriptive error message identifying the missing fields
3. THE AIService constructor SHALL accept a userId and an LLM_Provider instance as parameters
4. IF the `LLM_API_KEY` environment variable is not set, THEN THE API SHALL return HTTP status 503 with the message "AI service temporarily unavailable" for any AI endpoint call
