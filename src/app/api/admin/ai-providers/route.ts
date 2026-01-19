import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'xai', 'bedrock'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

// Provider metadata for defaults
const PROVIDER_DEFAULTS: Record<Provider, { defaultModel: string }> = {
  anthropic: { defaultModel: 'claude-sonnet-4-20250514' },
  openai: { defaultModel: 'gpt-4o' },
  google: { defaultModel: 'gemini-2.0-flash' },
  xai: { defaultModel: 'grok-3' },
  bedrock: { defaultModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
};

// Check if user is admin
async function isAdmin(
  session: { user?: { email?: string | null } } | null
): Promise<boolean> {
  if (!session?.user?.email) return false;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { role: true },
  });

  return user?.role === 'admin';
}

export interface ProviderConfigResponse {
  provider: string;
  isEnabled: boolean;
  isJudgeModel: boolean;
  defaultModel: string | null;
  hasApiKey: boolean;
  maskedKey: string | null;
  hasSecretKey?: boolean;
  maskedSecretKey?: string | null;
  awsRegion?: string | null;
  updatedAt: string | null;
}

// GET - Retrieve all provider configurations
export async function GET() {
  try {
    const session = await auth();

    if (!(await isAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all provider configs from database
    const configs = await prisma.aIProviderConfig.findMany();

    // Build response with all providers (including those not yet configured)
    const providers: ProviderConfigResponse[] = VALID_PROVIDERS.map((provider) => {
      const config = configs.find((c) => c.provider === provider);

      if (!config) {
        return {
          provider,
          isEnabled: false,
          isJudgeModel: false,
          defaultModel: PROVIDER_DEFAULTS[provider].defaultModel,
          hasApiKey: false,
          maskedKey: null,
          ...(provider === 'bedrock' && {
            hasSecretKey: false,
            maskedSecretKey: null,
            awsRegion: null,
          }),
          updatedAt: null,
        };
      }

      // Decrypt and mask the API key for display
      let maskedKey: string | null = null;
      if (config.encryptedApiKey && config.keyIv && config.keyAuthTag) {
        try {
          const decrypted = decrypt({
            ciphertext: config.encryptedApiKey,
            iv: config.keyIv,
            authTag: config.keyAuthTag,
          });
          maskedKey = maskApiKey(decrypted);
        } catch {
          maskedKey = '****[decryption error]';
        }
      }

      // For Bedrock, also handle secret key
      let maskedSecretKey: string | null = null;
      if (provider === 'bedrock' && config.encryptedSecretKey && config.secretKeyIv && config.secretKeyAuthTag) {
        try {
          const decrypted = decrypt({
            ciphertext: config.encryptedSecretKey,
            iv: config.secretKeyIv,
            authTag: config.secretKeyAuthTag,
          });
          maskedSecretKey = maskApiKey(decrypted);
        } catch {
          maskedSecretKey = '****[decryption error]';
        }
      }

      return {
        provider: config.provider,
        isEnabled: config.isEnabled,
        isJudgeModel: config.isJudgeModel,
        defaultModel: config.defaultModel,
        hasApiKey: !!(config.encryptedApiKey && config.keyIv && config.keyAuthTag),
        maskedKey,
        ...(provider === 'bedrock' && {
          hasSecretKey: !!(config.encryptedSecretKey && config.secretKeyIv && config.secretKeyAuthTag),
          maskedSecretKey,
          awsRegion: config.awsRegion,
        }),
        updatedAt: config.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, providers });
  } catch (error) {
    console.error('Error fetching AI provider configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider configurations' },
      { status: 500 }
    );
  }
}

// POST - Update a single provider configuration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!(await isAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { provider, apiKey, secretKey, awsRegion, isEnabled, isJudgeModel, defaultModel } = body;

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be one of: ' + VALID_PROVIDERS.join(', ') },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      isEnabled?: boolean;
      isJudgeModel?: boolean;
      defaultModel?: string;
      encryptedApiKey?: string | null;
      keyIv?: string | null;
      keyAuthTag?: string | null;
      encryptedSecretKey?: string | null;
      secretKeyIv?: string | null;
      secretKeyAuthTag?: string | null;
      awsRegion?: string | null;
    } = {};

    // Handle API key update
    if (apiKey !== undefined) {
      if (apiKey === '' || apiKey === null) {
        // Clear the API key
        updateData.encryptedApiKey = null;
        updateData.keyIv = null;
        updateData.keyAuthTag = null;
      } else {
        // Encrypt and store the new key
        const encrypted = encrypt(apiKey);
        updateData.encryptedApiKey = encrypted.ciphertext;
        updateData.keyIv = encrypted.iv;
        updateData.keyAuthTag = encrypted.authTag;
      }
    }

    // Handle Bedrock secret key
    if (provider === 'bedrock' && secretKey !== undefined) {
      if (secretKey === '' || secretKey === null) {
        updateData.encryptedSecretKey = null;
        updateData.secretKeyIv = null;
        updateData.secretKeyAuthTag = null;
      } else {
        const encrypted = encrypt(secretKey);
        updateData.encryptedSecretKey = encrypted.ciphertext;
        updateData.secretKeyIv = encrypted.iv;
        updateData.secretKeyAuthTag = encrypted.authTag;
      }
    }

    // Handle AWS region
    if (provider === 'bedrock' && awsRegion !== undefined) {
      updateData.awsRegion = awsRegion || null;
    }

    // Handle boolean flags
    if (typeof isEnabled === 'boolean') {
      updateData.isEnabled = isEnabled;
    }
    if (typeof isJudgeModel === 'boolean') {
      updateData.isJudgeModel = isJudgeModel;
    }

    // Handle default model
    if (defaultModel !== undefined) {
      updateData.defaultModel = defaultModel || null;
    }

    // Upsert the provider config
    const config = await prisma.aIProviderConfig.upsert({
      where: { provider },
      create: {
        provider,
        ...updateData,
        isEnabled: updateData.isEnabled ?? false,
        isJudgeModel: updateData.isJudgeModel ?? false,
        defaultModel: updateData.defaultModel ?? PROVIDER_DEFAULTS[provider as Provider].defaultModel,
      },
      update: updateData,
    });

    // Build response (mask the keys)
    let maskedKey: string | null = null;
    if (config.encryptedApiKey && config.keyIv && config.keyAuthTag) {
      try {
        const decrypted = decrypt({
          ciphertext: config.encryptedApiKey,
          iv: config.keyIv,
          authTag: config.keyAuthTag,
        });
        maskedKey = maskApiKey(decrypted);
      } catch {
        maskedKey = '****[decryption error]';
      }
    }

    let maskedSecretKey: string | null = null;
    if (provider === 'bedrock' && config.encryptedSecretKey && config.secretKeyIv && config.secretKeyAuthTag) {
      try {
        const decrypted = decrypt({
          ciphertext: config.encryptedSecretKey,
          iv: config.secretKeyIv,
          authTag: config.secretKeyAuthTag,
        });
        maskedSecretKey = maskApiKey(decrypted);
      } catch {
        maskedSecretKey = '****[decryption error]';
      }
    }

    const response: ProviderConfigResponse = {
      provider: config.provider,
      isEnabled: config.isEnabled,
      isJudgeModel: config.isJudgeModel,
      defaultModel: config.defaultModel,
      hasApiKey: !!(config.encryptedApiKey && config.keyIv && config.keyAuthTag),
      maskedKey,
      ...(provider === 'bedrock' && {
        hasSecretKey: !!(config.encryptedSecretKey && config.secretKeyIv && config.secretKeyAuthTag),
        maskedSecretKey,
        awsRegion: config.awsRegion,
      }),
      updatedAt: config.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, provider: response });
  } catch (error) {
    console.error('Error updating AI provider config:', error);
    return NextResponse.json(
      { error: 'Failed to update provider configuration' },
      { status: 500 }
    );
  }
}
