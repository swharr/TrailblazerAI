// lib/encryption.ts
// AES-256-GCM encryption for storing API keys in the database

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Supported providers and their encryption key environment variables
const PROVIDER_ENCRYPTION_KEYS: Record<string, string> = {
  anthropic: 'ANTHROPIC_ENCRYPTED_KEY',
  openai: 'OPENAI_ENCRYPTED_KEY',
  google: 'GOOGLE_ENCRYPTED_KEY',
  xai: 'XAI_ENCRYPTED_KEY',
  bedrock: 'BEDROCK_ENCRYPTED_KEY',
};

export type EncryptionProvider = keyof typeof PROVIDER_ENCRYPTION_KEYS;

/**
 * Get encryption key for a specific provider from environment variable.
 * Key must be 32 bytes (256 bits) encoded as base64.
 */
function getEncryptionKey(provider: EncryptionProvider): Buffer {
  const envVar = PROVIDER_ENCRYPTION_KEYS[provider];
  if (!envVar) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const key = process.env[envVar];
  if (!key) {
    throw new Error(`${envVar} environment variable is required`);
  }

  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error(`${envVar} must be 32 bytes (256 bits) base64 encoded`);
  }

  return buffer;
}

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
}

/**
 * Encrypt a plaintext string using AES-256-GCM with provider-specific key.
 */
export function encrypt(plaintext: string, provider: EncryptionProvider): EncryptedData {
  const key = getEncryptionKey(provider);
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
 * Decrypt ciphertext using AES-256-GCM with provider-specific key.
 */
export function decrypt(encrypted: EncryptedData, provider: EncryptionProvider): string {
  const key = getEncryptionKey(provider);
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

/**
 * Get the list of supported providers
 */
export function getSupportedProviders(): EncryptionProvider[] {
  return Object.keys(PROVIDER_ENCRYPTION_KEYS) as EncryptionProvider[];
}

/**
 * Check if an encryption key is configured for a provider
 */
export function hasEncryptionKey(provider: EncryptionProvider): boolean {
  const envVar = PROVIDER_ENCRYPTION_KEYS[provider];
  return !!process.env[envVar];
}
