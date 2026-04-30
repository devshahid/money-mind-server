# Testing Infrastructure Guide

## Overview

This project uses **Jest** with **TypeScript** for comprehensive testing. The testing infrastructure is organized into:

- **Unit Tests**: Test individual functions and service methods in isolation
- **Integration Tests**: Test complete API endpoints with real database operations

## Test Structure

```
src/
├── __tests__/
│   ├── helpers/          # Test utilities
│   │   ├── app.helper.ts       # App initialization helpers
│   │   ├── database.helper.ts  # MongoDB Memory Server helpers
│   │   └── index.ts
│   ├── fixtures/         # Test data seeds
│   │   ├── users.fixture.ts
│   │   ├── transactions.fixture.ts
│   │   ├── debts.fixture.ts
│   │   ├── budgets.fixture.ts
│   │   ├── goals.fixture.ts
│   │   ├── members.fixture.ts
│   │   └── index.ts
│   └── setup.ts          # Global test setup
├── modules/
│   └── [module-name]/
│       ├── __tests__/
│       │   ├── [module].service.spec.ts      # Unit tests
│       │   └── [module].intg.spec.ts         # Integration tests
│       ├── controller.ts
│       ├── service.ts
│       └── routes.ts
└── tests/                # Legacy integration tests (to be migrated)
```

## Naming Conventions

- **Unit Tests**: `*.spec.ts` (e.g., `ai.service.spec.ts`)
- **Integration Tests**: `*.intg.spec.ts` (e.g., `ai.intg.spec.ts`)

## Running Tests

```bash
# Run all unit tests with coverage
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run tests in watch mode
npm run test:watch
```

## Jest Configurations

### Unit Tests (`jest.config.ts`)

- **Pattern**: `*.spec.ts` (excludes `*.intg.spec.ts`)
- **Timeout**: 10 seconds
- **Coverage**: Enabled by default
- **Database**: Uses mocks (no real database)

### Integration Tests (`jest.intg.config.ts`)

- **Pattern**: `*.intg.spec.ts`
- **Timeout**: 20 seconds
- **Max Workers**: 1 (sequential execution to avoid DB conflicts)
- **Database**: Uses MongoDB Memory Server (in-memory database)

## Writing Unit Tests

Unit tests focus on testing service methods in isolation with mocked dependencies.

### Example Unit Test

```typescript
import { AIService } from '../ai.service';
import { TransactionLogs } from '../../transactions/models/transaction-logs.model';

// Mock dependencies
jest.mock('../../transactions/models/transaction-logs.model');

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe('categorizeTransaction', () => {
    it('should categorize a transaction successfully', async () => {
      // Arrange
      const mockTransaction = {
        description: 'Starbucks coffee',
        amount: 5.5,
      };

      // Mock external calls
      jest.spyOn(aiService as any, 'callOpenAI').mockResolvedValue({
        category: 'Food',
        confidence: 0.95,
      });

      // Act
      const result = await aiService.categorizeTransaction(mockTransaction);

      // Assert
      expect(result.category).toBe('Food');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      jest.spyOn(aiService as any, 'callOpenAI').mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(aiService.categorizeTransaction({ description: 'Test' })).rejects.toThrow(
        'API Error'
      );
    });
  });
});
```

## Writing Integration Tests

Integration tests use real HTTP requests and in-memory database.

### Example Integration Test

```typescript
import request from 'supertest';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../__tests__/helpers';
import { testUsers, testTransactions } from '../../__tests__/fixtures';

// Mock auth middleware (before app import)
jest.mock('../../shared/middlewares/auth/authHandler', () => {
  const { Types } = jest.requireActual('mongoose');
  return {
    __esModule: true,
    default: {
      userAccess: jest.fn((req: any, _res: any, next: any) => {
        if (!req.get('accessToken')) {
          const { AuthError } = jest.requireActual('../../shared/core/ApiError');
          return next(new AuthError('Please provide AccessToken!!'));
        }
        req.user = {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          email: 'test@example.com',
          role: 'USER',
        };
        next();
      }),
    },
  };
});

import app from '../../app';
import { TransactionLogs } from '../models/transaction-logs.model';
import { User } from '../../modules/users/models/user.model';

describe('Transactions API (Integration)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Seed test data
    await User.insertMany(testUsers);
    await TransactionLogs.insertMany(testTransactions);
  });

  describe('GET /api/v1/transactions', () => {
    it('should return all transactions for authenticated user', async () => {
      const res = await request(app).get('/api/v1/transactions').set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toHaveLength(3);
      expect(res.body.output[0]).toHaveProperty('category');
    });

    it('should return 401 without access token', async () => {
      const res = await request(app).get('/api/v1/transactions');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a new transaction', async () => {
      const newTransaction = {
        amount: 75.5,
        category: 'Shopping',
        description: 'New shoes',
        date: new Date('2024-02-01'),
      };

      const res = await request(app)
        .post('/api/v1/transactions')
        .set('accessToken', 'valid-token')
        .send(newTransaction);

      expect(res.status).toBe(201);
      expect(res.body.output).toHaveProperty('_id');
      expect(res.body.output.category).toBe('Shopping');
    });
  });
});
```

## Test Helpers

### Database Helpers (`database.helper.ts`)

```typescript
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
  seedDatabase,
} from './__tests__/helpers';

// Connect to test database (in beforeAll)
await connectTestDatabase();

// Disconnect from test database (in afterAll)
await disconnectTestDatabase();

// Clear all collections (in beforeEach)
await clearDatabase();

// Seed specific data
await seedDatabase({
  User: testUsers,
  TransactionLogs: testTransactions,
});
```

### App Helpers (`app.helper.ts`)

```typescript
import { initApp, createMockUser } from './__tests__/helpers';

// Initialize app
const app = await initApp();

// Create mock user
const mockUser = createMockUser({ email: 'custom@example.com' });
```

## Test Fixtures

Pre-defined test data is available in `__tests__/fixtures/`:

```typescript
import {
  testUsers,
  testTransactions,
  testDebts,
  testBudgets,
  testGoals,
  testMembers,
} from './__tests__/fixtures';

// Use in tests
await User.insertMany(testUsers);
await TransactionLogs.insertMany(testTransactions);
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **AAA Pattern**: Arrange, Act, Assert
3. **Clear Naming**: Describe what the test does
4. **Clean Up**: Always clear database in `beforeEach` for integration tests
5. **Mock External Services**: Don't make real API calls (OpenAI, etc.)
6. **Coverage**: Aim for >80% code coverage
7. **Fast Tests**: Keep unit tests under 100ms
8. **Sequential Integration**: Run integration tests one at a time (`maxWorkers: 1`)

## Debugging Tests

```bash
# Run specific test file
npm test -- ai.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="categorize"

# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Coverage Reports

Coverage reports are generated in:

- `coverage/` - Unit test coverage
- `coverage-integration/` - Integration test coverage

View coverage in browser:

```bash
open coverage/lcov-report/index.html
```

## Migration TODO

- [ ] Migrate legacy tests from `src/tests/` to module `__tests__/` folders
- [ ] Add unit tests for all service methods
- [ ] Add integration tests for all API endpoints
- [ ] Achieve 80%+ code coverage
- [ ] Add E2E tests for critical user flows

## Resources

- [Jest Documentation](https://jestjs.io/)
- [SuperTest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)
