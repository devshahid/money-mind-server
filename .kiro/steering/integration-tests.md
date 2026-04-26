---
inclusion: fileMatch
fileMatchPattern: '**/*.intg.spec.ts'
---

# Integration Test Conventions

When creating or modifying `*.intg.spec.ts` files, you MUST follow these conventions exactly.

## File Naming & Location

- Integration tests: `*.intg.spec.ts` in `src/tests/`
- Unit tests: `*.spec.ts` (without `.intg.`)
- One test file per domain/feature (e.g., `transaction-groups.intg.spec.ts`, `members.intg.spec.ts`)

## Technology

- **supertest** for HTTP requests against the Express app
- **jest.mock()** for mocking auth, mongoose sessions, and service layer
- All mocks MUST be declared BEFORE the `import app from '../app'` statement

## Required Mocks (top of every integration test file)

Every `*.intg.spec.ts` file MUST start with these three mock blocks in this exact order:

### 1. Auth Middleware Mock

Mocks `authHandler` to check for `accessToken` header. If present, injects a fake user. If missing, throws `AuthError`.

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';

jest.mock('../middlewares/auth/authHandler', () => {
  const { Types } = jest.requireActual('mongoose');
  const testUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'test@test.com',
    role: 'USER',
  };
  return {
    __esModule: true,
    default: {
      userAccess: jest.fn((req: any, _res: any, next: any) => {
        if (!req.get('accessToken')) {
          const { AuthError } = jest.requireActual('../core/ApiError');
          return next(new AuthError('Please provide AccessToken!!'));
        }
        req.user = testUser;
        next();
      }),
      adminAccess: jest.fn((req: any, _res: any, next: any) => {
        req.user = testUser;
        next();
      }),
    },
  };
});
```

### 2. Mongoose Session Mock

Mocks `mongoose.startSession` because `asyncHandler` starts a transaction on every request.

```typescript
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    }),
  };
});
```

### 3. Service Layer Mock

Mock the service class under test. Replace `your-service` with the actual service file.

```typescript
jest.mock('../services/your-service');
```

### 4. Imports (AFTER mocks)

```typescript
import app from '../app';
import { YourService } from '../services/your-service';

const MockedService = YourService as jest.MockedClass<typeof YourService>;
```

## Describe Block Structure

Use nested `describe` blocks organized by HTTP endpoint. Each endpoint block contains:

1. Happy path test
2. Auth enforcement test (401 without token)
3. Error condition tests (400 validation, 404 not found)

```typescript
describe('Feature Name (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/resource/create ─────────────────────────────────────

  describe('POST /api/v1/resource/create', () => {
    it('should create a resource and return 200 with output', async () => {
      MockedService.prototype.createMethod.mockResolvedValue(mockData as any);

      const res = await request(app)
        .post('/api/v1/resource/create')
        .set('accessToken', 'valid-token')
        .send({
          /* request body */
        });

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockData);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).post('/api/v1/resource/create').send({
          /* request body */
        });

        expect(res.status).toBe(401);
      });
    });

    describe('when validation fails', () => {
      it('should return 400 when required field is missing', async () => {
        const { CustomError } = jest.requireActual('../core/ApiError');
        MockedService.prototype.createMethod.mockRejectedValue(
          new CustomError('Field is required', 400)
        );

        const res = await request(app)
          .post('/api/v1/resource/create')
          .set('accessToken', 'valid-token')
          .send({
            /* invalid body */
          });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Field is required');
      });
    });
  });

  // ─── GET /api/v1/resource/list ─────────────────────────────────────────

  describe('GET /api/v1/resource/list', () => {
    it('should return all resources for the authenticated user', async () => {
      MockedService.prototype.listMethod.mockResolvedValue(mockList as any);

      const res = await request(app).get('/api/v1/resource/list').set('accessToken', 'valid-token');

      expect(res.status).toBe(200);
      expect(res.body.output).toEqual(mockList);
    });

    describe('when accessToken is not provided', () => {
      it('should return 401', async () => {
        const res = await request(app).get('/api/v1/resource/list');
        expect(res.status).toBe(401);
      });
    });
  });
});
```

## Assertion Patterns

| Scenario         | Status | Assertion                                                               |
| ---------------- | ------ | ----------------------------------------------------------------------- |
| Success          | 200    | `expect(res.status).toBe(200)` + `expect(res.body.output).toEqual(...)` |
| Auth missing     | 401    | `expect(res.status).toBe(401)`                                          |
| Validation error | 400    | `expect(res.status).toBe(400)` + `expect(res.body.message).toBe(...)`   |
| Not found        | 404    | `expect(res.status).toBe(404)` + `expect(res.body.message).toBe(...)`   |

## Authenticated Requests

Always set the `accessToken` header:

```typescript
request(app).get('/api/v1/route').set('accessToken', 'valid-token');
```

Omit the header to test 401 enforcement:

```typescript
request(app).get('/api/v1/route'); // no .set('accessToken', ...)
```

## Simulating Service Errors

Use `jest.requireActual` to get the real error classes, then mock the service to reject:

```typescript
const { CustomError } = jest.requireActual('../core/ApiError');
MockedService.prototype.someMethod.mockRejectedValue(new CustomError('Error message', 400));
```

## Section Separators

Use comment separators between endpoint blocks for readability:

```typescript
// ─── POST /api/v1/resource/create ─────────────────────────────────────
```

## Jest Config

- Integration tests: `npm run test:integration` (uses `jest.intg.config.js`)
- Unit tests: `npm test` (uses `jest.config.js`, excludes `*.intg.spec.ts`)

## Reference Implementation

See `src/tests/transaction-groups.intg.spec.ts` for a complete example covering all patterns.
