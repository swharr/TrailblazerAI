import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as k8s from '@kubernetes/client-node';

// Settings that can be managed via this API
const MANAGED_SETTINGS = {
  // AI Models
  ANTHROPIC_API_KEY: { category: 'ai', label: 'Anthropic API Key' },
  OPENAI_API_KEY: { category: 'ai', label: 'OpenAI API Key' },
  GOOGLE_AI_API_KEY: { category: 'ai', label: 'Google AI API Key' },
  XAI_API_KEY: { category: 'ai', label: 'xAI (Grok) API Key' },
  AWS_ACCESS_KEY_ID: { category: 'ai', label: 'AWS Access Key ID' },
  AWS_SECRET_ACCESS_KEY: { category: 'ai', label: 'AWS Secret Access Key' },
  AWS_REGION: { category: 'ai', label: 'AWS Region' },
  // Maps
  MAPBOX_ACCESS_TOKEN: { category: 'maps', label: 'Mapbox Access Token' },
  GOOGLE_MAPS_API_KEY: { category: 'maps', label: 'Google Maps API Key' },
  // Auth
  GOOGLE_CLIENT_ID: { category: 'auth', label: 'Google Client ID' },
  GOOGLE_CLIENT_SECRET: { category: 'auth', label: 'Google Client Secret' },
  APPLE_CLIENT_ID: { category: 'auth', label: 'Apple Client ID' },
  APPLE_CLIENT_SECRET: { category: 'auth', label: 'Apple Client Secret' },
} as const;

type SettingKey = keyof typeof MANAGED_SETTINGS;

// Get Kubernetes client - works both in-cluster and locally
function getK8sClient() {
  const kc = new k8s.KubeConfig();

  // Try in-cluster config first, fall back to default config
  try {
    kc.loadFromCluster();
  } catch {
    kc.loadFromDefault();
  }

  return kc.makeApiClient(k8s.CoreV1Api);
}

const NAMESPACE = process.env.K8S_NAMESPACE || 'trailblazer-ai';
const SECRET_NAME = 'trailblazer-ai-secrets';

// Check if user is admin
async function isAdmin(session: { user?: { email?: string | null } } | null): Promise<boolean> {
  if (!session?.user?.email) return false;

  // Import prisma dynamically to avoid edge runtime issues
  const { prisma } = await import('@/lib/db');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { role: true },
  });

  return user?.role === 'admin';
}

// GET - Retrieve current settings (masked)
export async function GET() {
  try {
    const session = await auth();

    if (!await isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Check if we're running in Kubernetes
    const inK8s = process.env.KUBERNETES_SERVICE_HOST !== undefined;

    if (!inK8s) {
      // Return current environment variables (masked) for local dev
      const settings: Record<string, { value: string; configured: boolean; category: string; label: string }> = {};

      for (const [key, meta] of Object.entries(MANAGED_SETTINGS)) {
        const value = process.env[key];
        settings[key] = {
          value: value ? maskValue(value) : '',
          configured: !!value,
          category: meta.category,
          label: meta.label,
        };
      }

      return NextResponse.json({
        success: true,
        mode: 'local',
        message: 'Running locally - settings from environment variables',
        settings,
      });
    }

    // Running in Kubernetes - read from secret
    const k8sApi = getK8sClient();

    try {
      const secret = await k8sApi.readNamespacedSecret({
        name: SECRET_NAME,
        namespace: NAMESPACE,
      });

      const settings: Record<string, { value: string; configured: boolean; category: string; label: string }> = {};
      const secretData = secret.data || {};

      for (const [key, meta] of Object.entries(MANAGED_SETTINGS)) {
        const encodedValue = secretData[key];
        const value = encodedValue ? Buffer.from(encodedValue, 'base64').toString('utf-8') : '';
        settings[key] = {
          value: value ? maskValue(value) : '',
          configured: !!value,
          category: meta.category,
          label: meta.label,
        };
      }

      return NextResponse.json({
        success: true,
        mode: 'kubernetes',
        settings,
      });
    } catch (err) {
      console.error('[admin/settings] Error reading secret:', err);
      return NextResponse.json(
        { error: 'Failed to read settings from Kubernetes' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[admin/settings] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update specific settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!await isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Partial<Record<SettingKey, string>> = body.settings;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body - expected { settings: { KEY: value } }' },
        { status: 400 }
      );
    }

    // Validate keys
    for (const key of Object.keys(updates)) {
      if (!(key in MANAGED_SETTINGS)) {
        return NextResponse.json(
          { error: `Invalid setting key: ${key}` },
          { status: 400 }
        );
      }
    }

    // Check if we're running in Kubernetes
    const inK8s = process.env.KUBERNETES_SERVICE_HOST !== undefined;

    if (!inK8s) {
      return NextResponse.json({
        success: false,
        mode: 'local',
        message: 'Cannot update settings in local mode. Please update .env.local file directly.',
      }, { status: 400 });
    }

    // Running in Kubernetes - update secret
    const k8sApi = getK8sClient();

    try {
      // Read current secret
      const secret = await k8sApi.readNamespacedSecret({
        name: SECRET_NAME,
        namespace: NAMESPACE,
      });

      const secretData = secret.data || {};

      // Update with new values (base64 encoded)
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          secretData[key] = Buffer.from(value).toString('base64');
        }
      }

      // Patch the secret
      await k8sApi.patchNamespacedSecret({
        name: SECRET_NAME,
        namespace: NAMESPACE,
        body: {
          data: secretData,
        },
      });

      // Log the update for audit
      console.log(`[admin/settings] Settings updated by ${session?.user?.email}:`, Object.keys(updates));

      return NextResponse.json({
        success: true,
        mode: 'kubernetes',
        message: 'Settings updated successfully. Note: Application may need to be restarted to pick up changes.',
        updatedKeys: Object.keys(updates),
      });
    } catch (err) {
      console.error('[admin/settings] Error updating secret:', err);
      return NextResponse.json(
        { error: 'Failed to update settings in Kubernetes' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[admin/settings] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mask sensitive values for display
function maskValue(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, 4) + '*'.repeat(Math.min(value.length - 8, 20)) + value.substring(value.length - 4);
}
