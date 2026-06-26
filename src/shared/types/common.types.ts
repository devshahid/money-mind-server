/**
 * Common TypeScript types used across the application
 */

/**
 * Standard API response wrapper
 */
export interface IApiResponse<T = unknown> {
  status: number;
  output: T;
  message?: string;
}

/**
 * Pagination query parameters
 */
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface IDateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * User info from JWT token
 */
export interface IUserInfo {
  id: string;
  email: string;
  name?: string;
}

/**
 * Generic filter options
 */
export interface IFilterOptions {
  search?: string;
  category?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Service method result with success flag
 */
export interface IServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * MongoDB document base interface
 */
export interface IBaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
