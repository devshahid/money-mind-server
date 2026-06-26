/**
 * Logger utility class for consistent logging across the application
 * Follows the pattern from digital-logbook-backend
 */
export class Logger {
  constructor(private readonly context: string) {}

  log(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: unknown): void {
    if (error instanceof Error) {
      console.error(`[${this.context}] ERROR: ${message}`, {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error(`[${this.context}] ERROR: ${message}`, error);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.context}] WARN: ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG: ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[${this.context}] INFO: ${message}`, ...args);
  }
}
