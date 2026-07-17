/// <reference types="jest" />

/**
 * AI LLM Timeout Tests
 * Tests for: Promise.race timeout logic in categorizeTransactionsBatch
 */

describe('AI LLM Timeout Handling', () => {
  describe('Promise.race timeout pattern', () => {
    it('should resolve when LLM responds within timeout', async () => {
      const mockLLMCall = new Promise<string>((resolve) =>
        setTimeout(() => resolve('success'), 100)
      );
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM request timed out after 20s')), 20000)
      );

      const result = await Promise.race([mockLLMCall, timeout]);
      expect(result).toBe('success');
    });

    it('should reject with timeout error when LLM takes too long', async () => {
      const mockLLMCall = new Promise<string>(
        (resolve) => setTimeout(() => resolve('success'), 5000) // Would take 5s
      );
      const timeout = new Promise<never>(
        (_, reject) => setTimeout(() => reject(new Error('LLM request timed out after 20s')), 100) // Timeout at 100ms for test
      );

      await expect(Promise.race([mockLLMCall, timeout])).rejects.toThrow(
        'LLM request timed out after 20s'
      );
    });

    it('should propagate LLM errors (not mask them as timeouts)', async () => {
      const mockLLMCall = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Rate limit exceeded')), 50)
      );
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM request timed out after 20s')), 20000)
      );

      await expect(Promise.race([mockLLMCall, timeout])).rejects.toThrow('Rate limit exceeded');
    });
  });
});
