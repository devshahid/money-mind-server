# Money Mind

Money Mind is a personal finance management REST API. It helps users track expenses, income, debts, budgets, financial goals, and transaction history. The platform includes AI-powered financial suggestions and an analytics module.

## Core Domains

- **Expenses**: Category-based expense tracking with recurring/one-time items
- **Income**: Income source management
- **Debts**: Debt tracking with payment schedules
- **Budgets**: Budget creation and monitoring
- **Goals**: Financial goal setting and progress tracking
- **Transaction Logs & Groups**: Detailed transaction recording and grouping
- **Analytics**: Financial data analysis and reporting
- **AI Suggestions**: AI-powered financial advice via logged requests

## Users & Auth

- Two roles: `ADMIN` and `USER`
- JWT-based authentication with access tokens passed via `accessToken` header
- All financial data is scoped to the authenticated user (`userId`)
