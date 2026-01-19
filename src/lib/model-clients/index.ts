// lib/model-clients/index.ts

export * from './base';
export { AnthropicClient } from './anthropic';
export { OpenAIClient } from './openai';
export { GoogleClient } from './google';
export { XAIClient } from './xai';
export { BedrockClient } from './bedrock';

import { prisma } from '../db';
import { decrypt, EncryptionProvider, hasEncryptionKey } from '../encryption';
import { ModelProvider, ModelError } from './base';
import { AnthropicClient } from './anthropic';
import { OpenAIClient } from './openai';
import { GoogleClient } from './google';
import { XAIClient } from './xai';
import { BedrockClient } from './bedrock';

export type ProviderName = 'anthropic' | 'openai' | 'google' | 'xai' | 'bedrock';

interface ProviderConfig {
  provider: string;
  isEnabled: boolean;
  encryptedApiKey: string | null;
  keyIv: string | null;
  keyAuthTag: string | null;
  encryptedSecretKey: string | null;
  secretKeyIv: string | null;
  secretKeyAuthTag: string | null;
  awsRegion: string | null;
  defaultModel: string | null;
}

/**
 * Get the first enabled AI provider from the database
 * @returns The provider name and its client, or null if none enabled
 */
export async function getEnabledProvider(): Promise<{
  name: ProviderName;
  client: ModelProvider;
} | null> {
  // Get all enabled providers ordered by priority
  const configs = await prisma.aIProviderConfig.findMany({
    where: { isEnabled: true },
    orderBy: { updatedAt: 'desc' },
  });

  for (const config of configs) {
    const client = await createClientFromConfig(config);
    if (client) {
      return {
        name: config.provider as ProviderName,
        client,
      };
    }
  }

  // Fallback to env-based Anthropic if no DB config
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      client: new AnthropicClient(),
    };
  }

  return null;
}

/**
 * Get a specific provider client by name
 * @param provider - The provider name
 * @returns The provider client, or null if not configured
 */
export async function getProviderClient(
  provider: ProviderName
): Promise<ModelProvider | null> {
  const config = await prisma.aIProviderConfig.findUnique({
    where: { provider },
  });

  if (config) {
    return createClientFromConfig(config);
  }

  // Fallback to env-based config
  return createClientFromEnv(provider);
}

/**
 * Get all enabled providers
 * @returns Array of enabled provider names and clients
 */
export async function getAllEnabledProviders(): Promise<
  Array<{ name: ProviderName; client: ModelProvider }>
> {
  const configs = await prisma.aIProviderConfig.findMany({
    where: { isEnabled: true },
  });

  const providers: Array<{ name: ProviderName; client: ModelProvider }> = [];

  for (const config of configs) {
    const client = await createClientFromConfig(config);
    if (client) {
      providers.push({
        name: config.provider as ProviderName,
        client,
      });
    }
  }

  return providers;
}

/**
 * Create a client from database config
 */
async function createClientFromConfig(
  config: ProviderConfig
): Promise<ModelProvider | null> {
  const provider = config.provider as ProviderName;

  // Check if we have the encryption key for this provider
  if (!hasEncryptionKey(provider as EncryptionProvider)) {
    console.warn(`[model-clients] No encryption key for provider: ${provider}`);
    return null;
  }

  // Decrypt the API key
  let apiKey: string | null = null;
  if (config.encryptedApiKey && config.keyIv && config.keyAuthTag) {
    try {
      apiKey = decrypt(
        {
          ciphertext: config.encryptedApiKey,
          iv: config.keyIv,
          authTag: config.keyAuthTag,
        },
        provider as EncryptionProvider
      );
    } catch (error) {
      console.error(`[model-clients] Failed to decrypt API key for ${provider}:`, error);
      return null;
    }
  }

  if (!apiKey) {
    return null;
  }

  try {
    switch (provider) {
      case 'anthropic':
        return new AnthropicClient(apiKey);

      case 'openai':
        return new OpenAIClient(apiKey, config.defaultModel || undefined);

      case 'google':
        return new GoogleClient(apiKey, config.defaultModel || undefined);

      case 'xai':
        return new XAIClient(apiKey, config.defaultModel || undefined);

      case 'bedrock': {
        // Decrypt secret key for Bedrock
        let secretKey: string | null = null;
        if (config.encryptedSecretKey && config.secretKeyIv && config.secretKeyAuthTag) {
          try {
            secretKey = decrypt(
              {
                ciphertext: config.encryptedSecretKey,
                iv: config.secretKeyIv,
                authTag: config.secretKeyAuthTag,
              },
              provider as EncryptionProvider
            );
          } catch {
            console.error('[model-clients] Failed to decrypt Bedrock secret key');
            return null;
          }
        }

        if (!secretKey) {
          return null;
        }

        return new BedrockClient(
          apiKey,
          secretKey,
          config.awsRegion || undefined,
          config.defaultModel || undefined
        );
      }

      default:
        return null;
    }
  } catch (error) {
    if (error instanceof ModelError) {
      console.error(`[model-clients] Failed to create ${provider} client:`, error.message);
    }
    return null;
  }
}

/**
 * Create a client from environment variables (fallback)
 */
function createClientFromEnv(provider: ProviderName): ModelProvider | null {
  try {
    switch (provider) {
      case 'anthropic':
        if (process.env.ANTHROPIC_API_KEY) {
          return new AnthropicClient();
        }
        break;

      case 'openai':
        if (process.env.OPENAI_API_KEY) {
          return new OpenAIClient();
        }
        break;

      case 'google':
        if (process.env.GOOGLE_AI_API_KEY) {
          return new GoogleClient();
        }
        break;

      case 'xai':
        if (process.env.XAI_API_KEY) {
          return new XAIClient();
        }
        break;

      case 'bedrock':
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
          return new BedrockClient();
        }
        break;
    }
  } catch (error) {
    if (error instanceof ModelError) {
      console.error(`[model-clients] Failed to create ${provider} client from env:`, error.message);
    }
  }

  return null;
}
