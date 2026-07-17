/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Transaction Filter Tests
 * Tests for: Uncategorized filter with $exists query, category array handling
 */

import { Types } from 'mongoose';
import { TransactionLogsService } from '../transaction.service';
import { TransactionLogs } from '../models/transaction-logs.model';

jest.mock('../models/transaction-logs.model');
jest.mock('../models/category.model');
jest.mock('../models/labels.model');
jest.mock('../../../utils/common');
jest.mock('../../../utils/pagination');

describe('Transaction Filter - Uncategorized Category', () => {
  let service: TransactionLogsService;
  const mockUserId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionLogsService(mockUserId);
  });

  describe('fetchTransactionLogs with category filter', () => {
    it('should handle Uncategorized filter with $exists query', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['Uncategorized'] as any
      );

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      const matchStage = callArgs[1].find((stage: any) => stage.$match);

      // Should use $or with $exists:false, null, empty string, and 'Others'
      expect(matchStage.$match.$or).toBeDefined();
      expect(matchStage.$match.$or).toEqual(
        expect.arrayContaining([
          { category: { $exists: false } },
          { category: null },
          { category: '' },
          { category: 'Others' },
        ])
      );
    });

    it('should handle Uncategorized combined with other categories', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['Uncategorized', 'Food', 'Travel'] as any
      );

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      const matchStage = callArgs[1].find((stage: any) => stage.$match);

      // Should use $or combining uncategorized conditions + selected categories
      expect(matchStage.$match.$or).toBeDefined();
      expect(matchStage.$match.$or).toEqual(
        expect.arrayContaining([
          { category: { $exists: false } },
          { category: null },
          { category: '' },
          { category: 'Others' },
          { category: { $in: ['Food', 'Travel'] } },
        ])
      );
    });

    it('should handle regular category filter without Uncategorized', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['Food', 'Fuel'] as any
      );

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      const matchStage = callArgs[1].find((stage: any) => stage.$match);

      expect(matchStage.$match.category).toEqual({ $in: ['Food', 'Fuel'] });
      expect(matchStage.$match.$or).toBeUndefined();
    });

    it('should not apply category filter when array is empty', async () => {
      const mockPagination = require('../../../utils/pagination');
      mockPagination.pagination = {
        add: jest.fn().mockResolvedValue({
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };

      await service.fetchTransactionLogs(1, 10);

      expect(mockPagination.pagination.add).toHaveBeenCalled();
      const callArgs = mockPagination.pagination.add.mock.calls[0];
      const matchStage = callArgs[1].find((stage: any) => stage.$match);

      expect(matchStage.$match.category).toBeUndefined();
      expect(matchStage.$match.$or).toBeUndefined();
    });
  });
});
