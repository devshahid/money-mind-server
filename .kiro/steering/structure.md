# Project Structure

```
src/
├── index.ts              # App entry point — loads env, connects DB, starts Express
├── app.ts                # Express app setup — middleware, routes, error handling
├── handler.ts            # Serverless (AWS Lambda) entry point
├── constant/             # Shared constants (error messages, status codes)
├── core/                 # Core abstractions
│   ├── ApiError.ts       # Error class hierarchy (AuthError, CustomError, ClientError)
│   ├── ApiResponse.ts    # Standardized success response wrapper
│   └── jwtHandler.ts     # JWT token creation and verification
├── controllers/          # Route handlers — one file per domain (e.g. expense.controller.ts)
├── services/             # Business logic — one file per domain (e.g. expense.service.ts)
├── models/               # Mongoose schemas and TypeScript interfaces
├── routes/               # Express route definitions — one file per domain + index.ts aggregator
├── middlewares/
│   └── auth/             # Auth middleware (JWT validation, role-based access)
├── helpers/
│   ├── asyncHandler.ts   # Wraps async route handlers with Mongoose transactions
│   └── responseHandler.ts# Base class for sending standardized success responses
├── utils/
│   ├── common.ts         # Shared utilities (ObjectId conversion, date parsing)
│   └── pagination.ts     # Reusable aggregation-based pagination helper
└── tests/                # Jest test files
```

## Architecture Pattern

Three-layer architecture: **Route → Controller → Service → Model**

1. **Routes** (`routes/`): Define HTTP endpoints, apply auth middleware, delegate to controller methods
2. **Controllers** (`controllers/`): Extend `ResponseHandler`, extract request params, call service methods, send responses
3. **Services** (`services/`): Contain business logic, interact with Mongoose models, throw `CustomError`/`AuthError` on failure
4. **Models** (`models/`): Mongoose schemas with TypeScript interfaces (`I<Name>Model`)

## Conventions

- **File naming**: kebab-case with domain suffix — `expense.controller.ts`, `expense.service.ts`, `expense.model.ts`, `expense.route.ts`
- **Class-based**: Controllers, services, and handlers are classes (not plain functions)
- **Controllers extend `ResponseHandler`**: Use `this.sendResponse(result, res)` for all success responses
- **Route handlers wrapped in `asyncHandler`**: Provides automatic Mongoose session/transaction management and error forwarding
- **Auth middleware**: `authHandler.userAccess` or `authHandler.adminAccess` applied per-route
- **All routes mounted under `/api/v1`** via the route index
- **User scoping**: All data queries filter by `userId` from the authenticated request
- **Error handling**: Throw `CustomError` or `AuthError` — the global error handler in `app.ts` catches and formats them
- **Mongoose transactions**: `asyncHandler` starts a session and transaction for every request, commits on success, aborts on error
- **Model interfaces**: Export both the interface (`IExpenseModel`) and the model (`Expense`) from each model file
