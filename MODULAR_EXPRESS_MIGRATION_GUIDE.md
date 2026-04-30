# Modular Express Architecture - Implementation Guide

## Overview

This guide provides step-by-step instructions to migrate your current flat Express structure to a modular, scalable architecture **without changing the framework**.

**Goal:** Better organization, testability, and maintainability while keeping all existing functionality.

**Timeline:** 4 weeks (can be done incrementally while shipping features)

---

## Current vs Target Structure

### Before (Current)

```
src/
├── controllers/        # 12 controllers (flat)
│   ├── ai.controller.ts
│   ├── transaction-logs.controller.ts
│   ├── debt.controller.ts
│   └── ...
├── models/             # 16 models (flat)
│   ├── transaction-logs.model.ts
│   ├── ai-chat-history.model.ts
│   └── ...
├── routes/             # 12 route files (flat)
│   ├── ai.route.ts
│   ├── transaction-logs.route.ts
│   └── ...
├── services/           # Only 1 service
│   └── ai.service.ts
├── config/
│   └── ai.config.ts
├── core/
│   ├── ApiError.ts
│   ├── ApiResponse.ts
│   └── jwtHandler.ts
├── middlewares/
│   └── auth/
├── helpers/
├── utils/
├── db/
├── app.ts
├── index.ts
└── handler.ts
```

### After (Target)

```
src/
├── modules/
│   ├── ai/
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts
│   │   ├── ai.routes.ts
│   │   ├── ai.types.ts
│   │   ├── models/
│   │   │   ├── ai-chat-history.model.ts
│   │   │   └── ai-request-log.model.ts
│   │   ├── config/
│   │   │   └── ai.config.ts
│   │   ├── validators/
│   │   │   └── ai.validation.ts
│   │   └── __tests__/
│   │       ├── ai.service.spec.ts
│   │       └── ai.intg.spec.ts
│   ├── transactions/
│   │   ├── transaction.controller.ts
│   │   ├── transaction.service.ts        # NEW
│   │   ├── transaction.routes.ts
│   │   ├── transaction.types.ts          # NEW
│   │   ├── models/
│   │   │   ├── transaction-logs.model.ts
│   │   │   ├── transaction-group.model.ts
│   │   │   └── category.model.ts
│   │   ├── validators/
│   │   │   └── transaction.validation.ts  # NEW
│   │   └── __tests__/
│   ├── debts/
│   │   ├── debt.controller.ts
│   │   ├── debt.service.ts               # NEW
│   │   ├── debt.routes.ts
│   │   ├── models/
│   │   │   ├── debts.model.ts
│   │   │   └── debt-payment.model.ts
│   │   └── __tests__/
│   ├── budgets/
│   ├── analytics/
│   ├── goals/
│   ├── income/
│   ├── expenses/
│   ├── members/
│   └── users/
│       ├── user.controller.ts
│       ├── user.service.ts               # NEW
│       ├── user.routes.ts
│       ├── models/
│       │   ├── user.model.ts
│       │   └── user-logins.model.ts
│       └── __tests__/
├── shared/
│   ├── core/
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   └── jwtHandler.ts
│   ├── middlewares/
│   │   ├── auth/
│   │   ├── errorHandler.ts
│   │   └── validation.ts                 # NEW
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   └── responseHandler.ts
│   ├── types/
│   │   └── common.types.ts               # NEW
│   └── constants/
│       └── categories.ts                  # NEW (from config)
├── config/
│   ├── database.ts
│   ├── swagger.ts                         # NEW
│   └── environment.ts
├── db/
│   └── index.ts
├── app.ts
├── index.ts
└── handler.ts                             # Serverless
```

---

## Phase 1: Setup & Infrastructure (Week 1)

### Step 1.1: Install Dependencies

```bash
cd money-mind-server

# Documentation
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express

# Validation
npm install joi
npm install -D @types/joi

# Testing enhancements
npm install -D supertest @types/supertest

# Optional: Dependency Injection
npm install awilix
npm install -D @types/awilix
```

### Step 1.2: Create Folder Structure

```bash
# Create modules directory
mkdir -p src/modules

# Create shared directory structure
mkdir -p src/shared/{core,middlewares,utils,types,constants}

# Move existing shared code
mv src/core/* src/shared/core/
mv src/helpers/* src/shared/utils/
mv src/middlewares/* src/shared/middlewares/

# Create config directory
mkdir -p src/config
```

### Step 1.3: Create Base Service Class

```typescript
// src/shared/core/BaseService.ts
import { Logger } from './Logger';

export abstract class BaseService {
  protected logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`${errorMessage}:`, error);
      throw error;
    }
  }
}
```

### Step 1.4: Setup Swagger

```typescript
// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Money Mind API',
      version: '1.0.0',
      description: 'Personal finance management API with AI-powered insights',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
      {
        url: process.env.API_BASE_URL || 'https://api.moneymind.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
    './src/shared/core/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
```

```typescript
// src/app.ts - Add Swagger setup
import { setupSwagger } from './config/swagger';

// ... existing code ...

if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}
```

---

## Phase 2: Migrate First Module (AI) - Week 1

### Step 2.1: Create AI Module Structure

```bash
mkdir -p src/modules/ai/{models,config,validators,__tests__}
```

### Step 2.2: Move Files

```bash
# Move AI-related files
mv src/controllers/ai.controller.ts src/modules/ai/
mv src/services/ai.service.ts src/modules/ai/
mv src/routes/ai.route.ts src/modules/ai/ai.routes.ts
mv src/config/ai.config.ts src/modules/ai/config/
mv src/models/ai-chat-history.model.ts src/modules/ai/models/
mv src/models/ai-request-log.model.ts src/modules/ai/models/
```

### Step 2.3: Create Types File

```typescript
// src/modules/ai/ai.types.ts
import { z } from 'zod';

export interface CategorySuggestion {
  transactionId: string;
  narration: string;
  amount: number;
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface DebtStrategyInput {
  monthlyIncome?: number;
  userId: string;
}

export interface BudgetRecommendationInput {
  monthlyIncome?: number;
  userId: string;
}

// Zod schemas for validation
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().uuid().optional(),
});

export const SuggestCategoriesSchema = z.object({
  transactionIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export const ApplySuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      transactionId: z.string(),
      suggestedCategory: z.string(),
    })
  ),
});
```

### Step 2.4: Add Validation Middleware

```typescript
// src/modules/ai/validators/ai.validation.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../../../shared/core/ApiError';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Validation error: ${error.message}`);
      }
      throw new ApiError(400, 'Invalid request data');
    }
  };
};
```

### Step 2.5: Update AI Routes with Documentation

```typescript
// src/modules/ai/ai.routes.ts
import express from 'express';
import {
  suggestCategories,
  applySuggestions,
  rejectSuggestions,
  chat,
  getChatHistory,
  clearChatHistory,
  debtStrategy,
  budgetRecommendations,
} from './ai.controller';
import { validateRequest } from './validators/ai.validation';
import { ChatRequestSchema, SuggestCategoriesSchema, ApplySuggestionsSchema } from './ai.types';

const router = express.Router();

/**
 * @openapi
 * /api/ai/suggest-categories:
 *   post:
 *     tags:
 *       - AI
 *     summary: Get AI-powered category suggestions for transactions
 *     description: Analyzes transaction narrations and amounts to suggest appropriate categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific transaction IDs to categorize
 *               all:
 *                 type: boolean
 *                 description: Categorize all uncategorized transactions
 *     responses:
 *       200:
 *         description: Category suggestions generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                 output:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategorySuggestion'
 */
router.post('/suggest-categories', validateRequest(SuggestCategoriesSchema), suggestCategories);

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     tags:
 *       - AI
 *     summary: Chat with AI financial assistant
 *     description: Conversational AI with memory and financial context awareness
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: AI response generated
 */
router.post('/chat', validateRequest(ChatRequestSchema), chat);

// ... other routes ...

export default router;

/**
 * @openapi
 * components:
 *   schemas:
 *     CategorySuggestion:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *         narration:
 *           type: string
 *         amount:
 *           type: number
 *         suggestedCategory:
 *           type: string
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         reasoning:
 *           type: string
 */
```

### Step 2.6: Update Import Paths

```typescript
// src/modules/ai/ai.controller.ts
// Update imports
import { ApiError } from '../../shared/core/ApiError';
import { ApiResponse } from '../../shared/core/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AIService } from './ai.service';
import { AIChatHistory } from './models/ai-chat-history.model';
import TransactionLog from '../transactions/models/transaction-logs.model'; // Will create later

// ... rest of controller code ...
```

### Step 2.7: Update Main App Router

```typescript
// src/app.ts
import aiRoutes from './modules/ai/ai.routes';

// ... existing code ...

app.use('/api/ai', aiRoutes);
```

---

## Phase 3: Migrate Transactions Module - Week 2

### Step 3.1: Create Transactions Module

```bash
mkdir -p src/modules/transactions/{models,validators,__tests__}
```

### Step 3.2: Move Files

```bash
mv src/controllers/transaction-logs.controller.ts src/modules/transactions/transaction.controller.ts
mv src/routes/transaction-logs.route.ts src/modules/transactions/transaction.routes.ts
mv src/models/transaction-logs.model.ts src/modules/transactions/models/
mv src/models/transaction-group.model.ts src/modules/transactions/models/
mv src/models/category.model.ts src/modules/transactions/models/
mv src/models/labels.model.ts src/modules/transactions/models/
```

### Step 3.3: Create Transaction Service (NEW)

```typescript
// src/modules/transactions/transaction.service.ts
import { BaseService } from '../../shared/core/BaseService';
import { ApiError } from '../../shared/core/ApiError';
import TransactionLog from './models/transaction-logs.model';
import {
  ITransactionLog,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from './transaction.types';

export class TransactionService extends BaseService {
  constructor() {
    super('TransactionService');
  }

  async create(input: CreateTransactionInput): Promise<ITransactionLog> {
    return this.executeWithErrorHandling(async () => {
      const transaction = new TransactionLog(input);
      return await transaction.save();
    }, 'Failed to create transaction');
  }

  async findById(id: string): Promise<ITransactionLog> {
    const transaction = await TransactionLog.findById(id);
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    return transaction;
  }

  async findByUserId(userId: string, filters?: TransactionFilters): Promise<ITransactionLog[]> {
    return this.executeWithErrorHandling(async () => {
      const query = TransactionLog.find({ userId });

      if (filters?.category) {
        query.where('category').equals(filters.category);
      }

      if (filters?.startDate || filters?.endDate) {
        const dateQuery: Record<string, unknown> = {};
        if (filters.startDate) dateQuery.$gte = filters.startDate;
        if (filters.endDate) dateQuery.$lte = filters.endDate;
        query.where('transactionDate').equals(dateQuery);
      }

      if (filters?.isCredit !== undefined) {
        query.where('isCredit').equals(filters.isCredit);
      }

      return await query.sort({ transactionDate: -1 }).exec();
    }, 'Failed to fetch transactions');
  }

  async updateCategory(
    id: string,
    category: string,
    aiConfirmed = false
  ): Promise<ITransactionLog> {
    return this.executeWithErrorHandling(async () => {
      const transaction = await this.findById(id);
      transaction.category = category;
      if (aiConfirmed) {
        transaction.aiConfirmed = true;
      }
      return await transaction.save();
    }, 'Failed to update transaction category');
  }

  async bulkUpdateCategories(
    updates: Array<{ id: string; category: string; aiConfirmed?: boolean }>
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.id },
          update: {
            $set: {
              category: update.category,
              aiConfirmed: update.aiConfirmed || false,
            },
          },
        },
      }));

      await TransactionLog.bulkWrite(bulkOps);
    }, 'Failed to bulk update categories');
  }

  async getUncategorized(userId: string): Promise<ITransactionLog[]> {
    return this.executeWithErrorHandling(async () => {
      return await TransactionLog.find({
        userId,
        $or: [{ category: { $exists: false } }, { category: null }],
      }).sort({ transactionDate: -1 });
    }, 'Failed to fetch uncategorized transactions');
  }

  async delete(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const result = await TransactionLog.findByIdAndDelete(id);
      if (!result) {
        throw new ApiError(404, 'Transaction not found');
      }
    }, 'Failed to delete transaction');
  }

  async getMonthlyStats(userId: string, year: number, month: number) {
    return this.executeWithErrorHandling(async () => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const transactions = await TransactionLog.find({
        userId,
        transactionDate: { $gte: startDate, $lte: endDate },
      });

      const totalIncome = transactions
        .filter((t) => t.isCredit)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter((t) => !t.isCredit)
        .reduce((sum, t) => sum + t.amount, 0);

      const categoryBreakdown = transactions.reduce(
        (acc, t) => {
          if (!t.isCredit && t.category) {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        categoryBreakdown,
        transactionCount: transactions.length,
      };
    }, 'Failed to calculate monthly stats');
  }
}
```

### Step 3.4: Create Types File

```typescript
// src/modules/transactions/transaction.types.ts
import { Document } from 'mongoose';

export interface ITransactionLog extends Document {
  userId: string;
  narration: string;
  amount: number;
  transactionDate: Date;
  category?: string;
  isCredit: boolean;
  aiSuggested?: boolean;
  aiConfidence?: number;
  aiConfirmed?: boolean;
  groupId?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  userId: string;
  narration: string;
  amount: number;
  transactionDate: Date;
  category?: string;
  isCredit: boolean;
  groupId?: string;
  labels?: string[];
}

export interface UpdateTransactionInput {
  narration?: string;
  amount?: number;
  transactionDate?: Date;
  category?: string;
  labels?: string[];
}

export interface TransactionFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  isCredit?: boolean;
  minAmount?: number;
  maxAmount?: number;
}
```

### Step 3.5: Refactor Controller

```typescript
// src/modules/transactions/transaction.controller.ts
import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/core/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { TransactionService } from './transaction.service';

const transactionService = new TransactionService();

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const filters = {
    category: req.query.category as string,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    isCredit:
      req.query.isCredit === 'true' ? true : req.query.isCredit === 'false' ? false : undefined,
  };

  const transactions = await transactionService.findByUserId(userId, filters);
  res.json(new ApiResponse(200, transactions));
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const transaction = await transactionService.create({
    ...req.body,
    userId,
  });
  res.status(201).json(new ApiResponse(201, transaction));
});

export const updateTransactionCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category } = req.body;

  const transaction = await transactionService.updateCategory(id, category);
  res.json(new ApiResponse(200, transaction));
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await transactionService.delete(id);
  res.json(new ApiResponse(200, { message: 'Transaction deleted successfully' }));
});

export const getMonthlyStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { year, month } = req.params;

  const stats = await transactionService.getMonthlyStats(userId, parseInt(year), parseInt(month));
  res.json(new ApiResponse(200, stats));
});

// ... other controller methods ...
```

### Step 3.6: Add Tests

```typescript
// src/modules/transactions/__tests__/transaction.service.spec.ts
import { TransactionService } from '../transaction.service';
import TransactionLog from '../models/transaction-logs.model';
import { ApiError } from '../../../shared/core/ApiError';

jest.mock('../models/transaction-logs.model');

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const mockTransaction = {
        userId: 'user123',
        narration: 'Coffee',
        amount: 150,
        transactionDate: new Date(),
        isCredit: false,
        save: jest.fn().mockResolvedValue(this),
      };

      (TransactionLog as unknown as jest.Mock).mockImplementation(() => mockTransaction);

      const result = await service.create(mockTransaction);

      expect(result).toBeDefined();
      expect(mockTransaction.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should throw ApiError if transaction not found', async () => {
      (TransactionLog.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(ApiError);
      await expect(service.findById('invalid-id')).rejects.toThrow('Transaction not found');
    });

    it('should return transaction if found', async () => {
      const mockTransaction = { _id: 'txn123', narration: 'Test' };
      (TransactionLog.findById as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await service.findById('txn123');

      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getUncategorized', () => {
    it('should return uncategorized transactions', async () => {
      const mockTransactions = [
        { narration: 'Uncategorized 1', category: null },
        { narration: 'Uncategorized 2', category: undefined },
      ];

      (TransactionLog.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions),
      });

      const result = await service.getUncategorized('user123');

      expect(result).toEqual(mockTransactions);
      expect(TransactionLog.find).toHaveBeenCalledWith({
        userId: 'user123',
        $or: [{ category: { $exists: false } }, { category: null }],
      });
    });
  });

  // Add more tests...
});
```

---

## Phase 4: Complete Migration - Week 3-4

### Step 4.1: Migrate Remaining Modules

Repeat the process for:

1. **Debts Module**
   - `debt.controller.ts`, `debt.service.ts` (NEW)
   - Models: `debts.model.ts`, `debt-payment.model.ts`

2. **Budgets Module**
   - `budget.controller.ts`, `budget.service.ts` (NEW)
   - Models: `budget.model.ts`

3. **Goals Module**
4. **Analytics Module**
5. **Income Module**
6. **Expenses Module**
7. **Members Module**
8. **Users Module**

### Step 4.2: Extract Constants

```typescript
// src/shared/constants/categories.ts
export const EXPENSE_CATEGORIES = [
  'Food',
  'Fruits',
  'Vegetables',
  'Groceries',
  'Fuel',
  'Travel',
  'Medical',
  'Entertainment',
  'Shopping',
  'Bills & Utilities',
  'Vehical Servicing',
  'Maintenance & Repairs',
  'Education',
  'EMI',
  'Rent',
  'Family',
  'Personal',
  'Recharge (Mobile, Fibre, TV..)',
  'Subscriptions',
  'Memberships (Gym, Club..)',
  'Income',
  'Lending',
  'Borrowed',
  'Insurance',
  'Taxes',
  'Salon & Spa Services',
  'Gifts & Donations',
  'Laundry & Dry Cleaning',
  'Cosmetics & Makeup',
  'Pet Care',
  'Purchase',
  'Payments',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function isValidCategory(category: string): category is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
}
```

### Step 4.3: Update AI Config to Use Shared Constants

```typescript
// src/modules/ai/config/ai.config.ts
import { EXPENSE_CATEGORIES } from '../../../shared/constants/categories';

export const AVAILABLE_CATEGORIES = [...EXPENSE_CATEGORIES];

// ... rest of config ...
```

---

## Phase 5: Testing & Documentation - Week 4

### Step 5.1: Add Integration Tests

```typescript
// src/modules/transactions/__tests__/transaction.intg.spec.ts
import request from 'supertest';
import app from '../../../app';
import connectDb from '../../../db';
import TransactionLog from '../models/transaction-logs.model';

describe('Transaction API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    await connectDb();

    // Get auth token (implement based on your auth flow)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'test123' });

    authToken = loginResponse.body.output.token;
  });

  afterEach(async () => {
    // Clean up test data
    await TransactionLog.deleteMany({ narration: /^TEST/ });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          narration: 'TEST Coffee Shop',
          amount: 150,
          transactionDate: new Date(),
          isCredit: false,
          category: 'Food',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(response.body.output.narration).toBe('TEST Coffee Shop');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          narration: 'TEST Invalid',
          amount: 100,
          transactionDate: new Date(),
          isCredit: false,
          category: 'InvalidCategory',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return user transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.output)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/transactions?category=Food')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.output.forEach((txn: { category: string }) => {
        expect(txn.category).toBe('Food');
      });
    });
  });
});
```

### Step 5.2: Update README

```markdown
# Money Mind Server - Modular Express Architecture

## Project Structure
```

src/
├── modules/ # Feature modules
│ ├── ai/ # AI & LangChain integration
│ ├── transactions/ # Transaction management
│ ├── debts/ # Debt tracking
│ ├── budgets/ # Budget planning
│ └── ...
├── shared/ # Shared utilities
│ ├── core/ # Core classes (ApiError, ApiResponse)
│ ├── middlewares/ # Express middlewares
│ ├── utils/ # Helper functions
│ ├── types/ # TypeScript types
│ └── constants/ # Application constants
├── config/ # Configuration files
├── db/ # Database connection
├── app.ts # Express application setup
├── index.ts # Application entry point
└── handler.ts # Serverless handler

````

## API Documentation

Swagger documentation is available at:
- Local: http://localhost:8000/api-docs
- JSON spec: http://localhost:8000/api-docs.json

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
````

## Module Structure

Each module follows this pattern:

```
module-name/
├── models/              # Mongoose models
├── module-name.controller.ts  # Route handlers
├── module-name.service.ts     # Business logic
├── module-name.routes.ts      # Route definitions
├── module-name.types.ts       # TypeScript interfaces
├── validators/          # Request validation
└── __tests__/          # Unit & integration tests
```

## Best Practices

1. **Business logic belongs in services, not controllers**
2. **Use TypeScript types for all interfaces**
3. **Validate requests with Zod schemas**
4. **Document APIs with JSDoc + OpenAPI comments**
5. **Write tests for all services**
6. **Use asyncHandler for all async routes**

## Adding a New Feature

1. Create module folder: `src/modules/my-feature/`
2. Create service: `my-feature.service.ts`
3. Create controller: `my-feature.controller.ts`
4. Create routes: `my-feature.routes.ts`
5. Create types: `my-feature.types.ts`
6. Add tests: `__tests__/my-feature.spec.ts`
7. Register routes in `app.ts`

---

## Rollback Plan

If issues arise during migration:

```bash
# The old structure is preserved in git history
git checkout <previous-commit>

# Or revert specific files
git checkout HEAD~1 -- src/controllers/
```

---

## Completion Checklist

- [ ] Phase 1: Infrastructure setup
- [ ] Phase 2: AI module migrated
- [ ] Phase 3: Transactions module migrated
- [ ] Phase 4: All modules migrated
- [ ] Phase 5: Tests passing
- [ ] Swagger documentation complete
- [ ] README updated
- [ ] Deployment successful

---

**Estimated Total Time:** 4 weeks (incremental, can be done while shipping features)

**Risk Level:** Low (incremental migration with fallback options)

**Benefits:**

- Better code organization
- Improved testability
- Easier onboarding
- Scalable architecture
- API documentation
