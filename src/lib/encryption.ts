// lib/encryption.ts
// AES-256-GCM encryption for storing API keys in the database

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Get encryption key from environment variable.
 * Key must be 32 bytes (256 bits) encoded as base64.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OPENAI_ENCRYPTED_KEY;
  if (!key) {
    throw new Error('OPENAI_ENCRYPTED_KEY environment variable is required');
  }
  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error('OPENAI_ENCRYPTED_KEY must be 32 bytes (256 bits) base64 encoded');
  }
  return buffer;
}

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96 bits for GCM

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 */
export function decrypt(encrypted: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Mask an API key for display (e.g., "sk-ant-****xyz")
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '****';
  }
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Generate a new encryption key (for initial setup).
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
