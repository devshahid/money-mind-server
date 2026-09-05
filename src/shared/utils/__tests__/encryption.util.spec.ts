import { encrypt, decrypt, type EncryptedPayload } from '../encryption.util';

// 32 bytes, base64-encoded — matches expected ENCRYPTION_MASTER_KEY format.
const VALID_KEY = Buffer.alloc(32, 7).toString('base64');

describe('encryption.util', () => {
  const originalEnv = process.env.ENCRYPTION_MASTER_KEY;

  afterEach(() => {
    jest.resetModules();
    process.env.ENCRYPTION_MASTER_KEY = originalEnv;
  });

  describe('with a valid master key', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = VALID_KEY;
    });

    it('encrypts and decrypts back to the original plaintext', () => {
      const plaintext = 'my-super-secret-gemini-api-key';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('produces a different IV (and ciphertext) for repeated encryptions of the same value', () => {
      const plaintext = 'same-plaintext-value';
      const first = encrypt(plaintext);
      const second = encrypt(plaintext);

      expect(first.iv).not.toBe(second.iv);
      expect(first.ciphertext).not.toBe(second.ciphertext);
    });

    it('never includes the plaintext in the encrypted payload', () => {
      const plaintext = 'do-not-leak-me';
      const encrypted = encrypt(plaintext);

      expect(encrypted.ciphertext).not.toContain(plaintext);
      expect(JSON.stringify(encrypted)).not.toContain(plaintext);
    });

    it('throws when ciphertext has been tampered with', () => {
      const encrypted = encrypt('tamper-test');
      const tampered: EncryptedPayload = {
        ...encrypted,
        ciphertext: Buffer.from('tampered-ciphertext-bytes').toString('base64'),
      };

      expect(() => decrypt(tampered)).toThrow(/Failed to decrypt/);
    });

    it('throws when the authTag has been tampered with', () => {
      const encrypted = encrypt('tamper-test-2');
      const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedTag[0] ^= 0xff; // flip bits to corrupt the tag

      const tampered: EncryptedPayload = {
        ...encrypted,
        authTag: tamperedTag.toString('base64'),
      };

      expect(() => decrypt(tampered)).toThrow(/Failed to decrypt/);
    });

    it('throws when the IV has been tampered with', () => {
      const encrypted = encrypt('tamper-test-3');
      const tamperedIv = Buffer.from(encrypted.iv, 'base64');
      tamperedIv[0] ^= 0xff;

      const tampered: EncryptedPayload = {
        ...encrypted,
        iv: tamperedIv.toString('base64'),
      };

      expect(() => decrypt(tampered)).toThrow();
    });

    it('rejects empty string input', () => {
      expect(() => encrypt('')).toThrow(/non-empty string/);
    });

    it('rejects an incomplete encrypted payload', () => {
      expect(() => decrypt({ ciphertext: '', iv: '', authTag: '' })).toThrow(
        /complete EncryptedPayload/
      );
      expect(() =>
        decrypt({ ciphertext: 'abc', iv: '', authTag: 'xyz' } as EncryptedPayload)
      ).toThrow(/complete EncryptedPayload/);
    });
  });

  describe('master key validation', () => {
    it('throws a clear error when ENCRYPTION_MASTER_KEY is missing', () => {
      delete process.env.ENCRYPTION_MASTER_KEY;
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('../encryption.util') as typeof import('../encryption.util');
      expect(() => fresh.encrypt('anything')).toThrow(/ENCRYPTION_MASTER_KEY is not set/);
    });

    it('throws a clear error when ENCRYPTION_MASTER_KEY is not valid base64 length (too short)', () => {
      process.env.ENCRYPTION_MASTER_KEY = Buffer.alloc(16, 1).toString('base64'); // 16 bytes, not 32
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('../encryption.util') as typeof import('../encryption.util');
      expect(() => fresh.encrypt('anything')).toThrow(/must decode to exactly 32 bytes/);
    });

    it('throws a clear error when ENCRYPTION_MASTER_KEY is malformed (not base64)', () => {
      // Contains characters outside the base64 alphabet in a way that still decodes to wrong length.
      process.env.ENCRYPTION_MASTER_KEY = 'not-a-32-byte-key';
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('../encryption.util') as typeof import('../encryption.util');
      expect(() => fresh.encrypt('anything')).toThrow(/must decode to exactly 32 bytes/);
    });
  });
});
