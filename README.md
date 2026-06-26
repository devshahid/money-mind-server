# Money Mind Server

> A production-ready, modular Express.js backend for personal finance management with AI-powered insights.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-green)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208.9.2-brightgreen)](https://mongoosejs.com/)
[![Tests](https://img.shields.io/badge/Tests-125%20passing-success)](./TESTING.md)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

## 📋 Overview

Money Mind Server is a comprehensive personal finance management backend built with a modular architecture inspired by NestJS while maintaining the flexibility of Express.js. It features AI-powered transaction categorization, expense splitting, debt tracking, budget planning, and financial insights.

## ✨ Features

- 🤖 **AI-Powered Categorization** - LangChain + OpenAI integration for smart transaction categorization
- 🔐 **Secure Authentication** - JWT-based auth with bcrypt password hashing
- 💰 **Transaction Management** - Upload, categorize, and track financial transactions
- 📊 **Budget Planning** - Create and monitor budgets with AI recommendations
- 💳 **Debt Tracking** - Track debts with AI-powered payoff strategies
- 👥 **Expense Splitting** - Save members for recurring expense splits
- 🎯 **Financial Goals** - Set and track financial goals
- 📈 **Analytics** - Financial insights and reporting
- 📚 **API Documentation** - Auto-generated Swagger/OpenAPI docs
- 🧪 **Comprehensive Testing** - 108 unit tests + 17 integration tests

## 🏗️ Architecture

```
src/
├── modules/              # Feature modules
│   ├── ai/              # AI categorization & insights
│   ├── users/           # Authentication & user management
│   ├── members/         # Expense splitting members
│   ├── transactions/    # Transaction management
│   ├── debts/           # Debt tracking
│   ├── income/          # Income sources
│   ├── expenses/        # Expense categories
│   ├── budgets/         # Budget planning
│   ├── goals/           # Financial goals
│   └── analytics/       # Financial insights
├── shared/              # Shared utilities
│   ├── core/           # Core classes (ApiError, ApiResponse, JWT)
│   ├── middlewares/    # Auth, validation, error handling
│   ├── utils/          # Helper functions
│   └── constants/      # App constants
├── __tests__/           # Test infrastructure
│   ├── helpers/        # Test helpers
│   └── fixtures/       # Test data
├── config/              # Configuration
└── routes/              # Route aggregation
```

Each module follows a consistent structure:

```
module-name/
├── __tests__/
│   ├── service.spec.ts        # Unit tests
│   └── controller.intg.spec.ts # Integration tests
├── models/                    # Mongoose schemas
├── validators/                # Joi validation schemas
├── controller.ts              # HTTP handlers
├── service.ts                 # Business logic
├── routes.ts                  # API routes
└── types.ts                   # TypeScript interfaces
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- npm >= 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/money-mind-server.git
cd money-mind-server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev
```

### Environment Variables

```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/money-mind
JWT_SECRET_KEY=your-super-secret-jwt-key
GITHUB_TOKEN=your-github-token-for-ai
```

## 📡 API Endpoints

### Authentication

- `POST /api/v1/user/register` - Register new user
- `POST /api/v1/user/login` - Login user
- `POST /api/v1/user/logout` - Logout user

### AI Features

- `POST /api/v1/ai/suggest-categories` - Get AI category suggestions
- `POST /api/v1/ai/apply-suggestions` - Apply AI suggestions
- `POST /api/v1/ai/chat` - Financial chat assistant
- `POST /api/v1/ai/debt-strategy` - Debt payoff recommendations
- `POST /api/v1/ai/budget-recommendations` - Budget suggestions

### Transactions

- `POST /api/v1/transaction-logs/upload` - Upload transactions
- `GET /api/v1/transaction-logs` - Get transactions
- `PUT /api/v1/transaction-logs/:id` - Update transaction
- `DELETE /api/v1/transaction-logs` - Delete all transactions

### Members (Expense Splitting)

- `POST /api/v1/members` - Create member
- `GET /api/v1/members` - List members
- `DELETE /api/v1/members/:id` - Delete member

### Debts

- `POST /api/v1/debt/add-debt` - Add debt
- `GET /api/v1/debt/list-debts` - List debts
- `PUT /api/v1/debt/update-debt` - Update debt
- `DELETE /api/v1/debt/delete-debt/:id` - Delete debt

### Income

- `POST /api/v1/income/add` - Add income
- `GET /api/v1/income/list` - List income sources
- `PUT /api/v1/income/update` - Update income
- `DELETE /api/v1/income/delete/:id` - Delete income

### Expenses

- `POST /api/v1/expense/create-category` - Create category
- `GET /api/v1/expense/list-expense` - List expenses
- `PUT /api/v1/expense/update-category` - Update category
- `DELETE /api/v1/expense/delete-category` - Delete category

**Full API Documentation**: http://localhost:8000/api-docs (when running in development)

## 🧪 Testing

### Test Suite

- **108 Unit Tests** - All service logic covered
- **17 Integration Tests** - End-to-end API testing with MongoDB Memory Server

### Running Tests

```bash
# Run all tests
./run-tests.sh

# Run only unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run only integration tests
npm run test:integration

# Run specific test file
npm test -- member.service.spec.ts
npm run test:integration -- member.intg.spec.ts

# Run with coverage
npm run test:coverage
```

### Test Coverage

| Module       | Unit Tests | Integration Tests |
| ------------ | ---------- | ----------------- |
| AI           | 12 ✅      | Pending           |
| Transactions | 25 ✅      | Pending           |
| Debts        | 14 ✅      | Pending           |
| Income       | 14 ✅      | Pending           |
| Members      | 10 ✅      | 17 ✅             |
| Expenses     | 20 ✅      | Pending           |
| Users        | 13 ✅      | Pending           |
| **Total**    | **108 ✅** | **17 ✅**         |

## 📦 Scripts

```bash
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:integration  # Run integration tests
npm run test:coverage    # Run tests with coverage
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

## 🔐 Security

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with 10 rounds
- **Session Management** - UserLogin model tracks active sessions
- **Input Validation** - Joi schemas validate all inputs
- **Error Handling** - Sanitized error messages
- **CORS** - Configurable cross-origin requests
- **Helmet** - Security headers

## 🛠️ Technology Stack

| Category           | Technology                        |
| ------------------ | --------------------------------- |
| **Runtime**        | Node.js                           |
| **Framework**      | Express 4.21.2                    |
| **Language**       | TypeScript 5.7.3                  |
| **Database**       | MongoDB via Mongoose 8.9.2        |
| **Authentication** | JWT + bcrypt                      |
| **Validation**     | Joi 17.14.0                       |
| **AI**             | LangChain + OpenAI/GitHub Copilot |
| **Testing**        | Jest 29.7.0, SuperTest 7.0.0      |
| **Documentation**  | Swagger/OpenAPI 3.0               |
| **Deployment**     | Serverless Framework 4.14.3       |

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture overview
- [TESTING.md](./TESTING.md) - Comprehensive testing guide
- [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) - Project completion summary
- [API Documentation](http://localhost:8000/api-docs) - Swagger UI (development)

## 🚢 Deployment

### Serverless (AWS Lambda)

```bash
# Deploy to AWS
serverless deploy

# Deploy specific stage
serverless deploy --stage production

# View logs
serverless logs -f functionName -t
```

### Traditional Hosting

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass (`./run-tests.sh`)
4. Submit pull request

## 📊 Project Status

✅ **Phase 1-5**: Infrastructure & Module Migration - COMPLETE  
✅ **Phase 6**: Unit Tests (108 tests) - COMPLETE  
✅ **Phase 7**: Integration Tests Framework - COMPLETE  
✅ **Phase 8**: Documentation - COMPLETE

**Status**: 🚀 Production Ready

## 📝 License

Proprietary - All rights reserved

## 👥 Team

Developed by the Money Mind team

## 🙏 Acknowledgments

- Express.js team for the robust framework
- MongoDB team for the excellent database
- LangChain & OpenAI for AI capabilities
- Jest team for the testing framework

---

**Version**: 2.0.0 (Modular Architecture)  
**Last Updated**: April 30, 2026  
**Made with ❤️ for better financial management**
