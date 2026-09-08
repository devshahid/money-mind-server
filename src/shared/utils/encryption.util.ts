import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Application-level AES-256-GCM encryption for secrets (e.g. user-supplied API keys).
 *
 * ENCRYPTION_MASTER_KEY must be a base64-encoded string that decodes to exactly 32 bytes
 * (AES-256). Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 *
 * This is intentionally NOT a KMS/envelope-encryption scheme - it is a minimal, single
 * static-key implementation suitable for V1. Key rotation is out of scope.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // recommended IV length for GCM
const KEY_LENGTH_BYTES = 32; // AES-256

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

let cachedMasterKey: Buffer | undefined;

function loadMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY is not set. Provide a base64-encoded 32-byte key (see encryption.util.ts docs).'
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('ENCRYPTION_MASTER_KEY is not valid base64.');
  }

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `ENCRYPTION_MASTER_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes, got ${key.length}.`
    );
  }

  cachedMasterKey = key;
  return cachedMasterKey;
}

/** Encrypts a plaintext string. Never logs the input. */
export function encrypt(plaintext: string): EncryptedPayload {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encrypt() requires a non-empty string');
  }

  const key = loadMasterKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/** Decrypts a payload produced by encrypt(). Throws if the key, IV, or tag are invalid/tampered. */
export function decrypt(payload: EncryptedPayload): string {
  if (
    !payload ||
    typeof payload.ciphertext !== 'string' ||
    typeof payload.iv !== 'string' ||
    typeof payload.authTag !== 'string' ||
    !payload.ciphertext ||
    !payload.iv ||
    !payload.authTag
  ) {
    throw new Error('decrypt() requires a complete EncryptedPayload (ciphertext, iv, authTag)');
  }

  const key = loadMasterKey();
  const iv = Buffer.from(payload.iv, 'base64');
  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH_BYTES} bytes`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  try {
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    // Do not leak crypto internals; auth tag/ciphertext mismatch means tampering or wrong key.
    throw new Error(
      'Failed to decrypt payload: data may be corrupted, tampered, or the key is wrong'
    );
  }
}
