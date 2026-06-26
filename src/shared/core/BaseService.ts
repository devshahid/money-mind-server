import { Logger } from '../utils/Logger';

/**
 * Base service class providing common functionality
 * All service classes should extend this for consistent error handling and logging
 */
export abstract class BaseService {
  protected logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Execute an operation with error handling and logging
   * @param operation - The async operation to execute
   * @param errorMessage - Error message to log if operation fails
   * @returns Result of the operation
   */
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

  /**
   * Log service method entry (useful for debugging)
   * @param methodName - Name of the method being called
   * @param params - Parameters passed to the method
   */
  protected logMethodEntry(methodName: string, params?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`${methodName} called`, params);
    }
  }

  /**
   * Log service method exit (useful for debugging)
   * @param methodName - Name of the method that completed
   */
  protected logMethodExit(methodName: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`${methodName} completed`);
    }
  }
}
