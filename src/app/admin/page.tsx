'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Shield, Map, Eye, EyeOff, Check, AlertCircle, Users, Loader2, Search, ShieldCheck, ShieldX, Activity, Play, RefreshCw } from 'lucide-react';

interface ApiKeyFieldProps {
  id: string;
  label: string;
  placeholder: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  configured?: boolean;
  onTest?: () => void;
  testing?: boolean;
}

function ApiKeyField({ id, label, placeholder, description, value, onChange, configured, onTest, testing }: ApiKeyFieldProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {configured !== undefined && (
          <Badge variant={configured ? 'default' : 'secondary'}>
            {configured ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
            {configured ? 'Configured' : 'Not Configured'}
          </Badge>
        )}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={showKey ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {onTest && (
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing || !value}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  analysisCount: number;
  vehicleCount: number;
}

interface SettingMeta {
  value: string;
  configured: boolean;
  category: string;
  label: string;
}

interface ProviderConfig {
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

interface ProviderEditState {
  apiKey?: string;
  secretKey?: string;
  awsRegion?: string;
  isEnabled?: boolean;
  isJudgeModel?: boolean;
  defaultModel?: string;
}

interface PayiStatus {
  enabled: boolean;
  useCases: Array<{ use_case_name: string; description?: string; properties?: Record<string, string> }>;
  kpis: Array<{ useCaseName: string; kpi_name: string; description?: string; value_type: string }>;
  limits: Array<{ limit_name: string; limit_id: string; max: number; threshold?: number }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'local' | 'kubernetes'>('local');

  // Settings state
  const [settings, setSettings] = useState<Record<string, SettingMeta>>({});
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  // AI Provider state
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>({});
  const [providerEdits, setProviderEdits] = useState<Record<string, ProviderEditState>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Pay-i state
  const [payiStatus, setPayiStatus] = useState<PayiStatus | null>(null);
  const [payiLoading, setPayiLoading] = useState(false);
  const [payiRunningSetup, setPayiRunningSetup] = useState(false);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 403) {
        setIsAdmin(false);
        setError('You do not have admin access.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch settings');

      const data = await res.json();
      setSettings(data.settings || {});
      setSettingsMode(data.mode || 'local');
      setIsAdmin(true);
    } catch (err) {
      setError('Failed to load settings. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      if (!res.ok) throw new Error('Failed to fetch users');

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch]);

  // Fetch AI provider configs
  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-providers');
      if (!res.ok) throw new Error('Failed to fetch provider configs');

      const data = await res.json();
      const configs: Record<string, ProviderConfig> = {};
      for (const provider of data.providers || []) {
        configs[provider.provider] = provider;
      }
      setProviderConfigs(configs);
    } catch (err) {
      console.error('Failed to load provider configs:', err);
    }
  }, []);

  // Fetch Pay-i status
  const fetchPayiStatus = useCallback(async () => {
    setPayiLoading(true);
    try {
      const res = await fetch('/api/admin/payi-setup');
      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes('not configured')) {
          setPayiStatus({ enabled: false, useCases: [], kpis: [], limits: [] });
          return;
        }
        throw new Error('Failed to fetch Pay-i status');
      }

      const data = await res.json();
      setPayiStatus({
        enabled: data.data?.enabled ?? false,
        useCases: data.data?.useCases || [],
        kpis: data.data?.kpis || [],
        limits: data.data?.limits || [],
      });
    } catch (err) {
      console.error('Failed to load Pay-i status:', err);
      setPayiStatus({ enabled: false, useCases: [], kpis: [], limits: [] });
    } finally {
      setPayiLoading(false);
    }
  }, []);

  // Run Pay-i setup
  const runPayiSetup = async () => {
    setPayiRunningSetup(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/admin/payi-setup', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to run Pay-i setup');
      }

      setSaveSuccess('Pay-i setup completed successfully. Use cases and KPIs have been created.');
      // Refresh status
      fetchPayiStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Pay-i setup');
    } finally {
      setPayiRunningSetup(false);
    }
  };

  // Save a single provider
  const saveProvider = async (provider: string) => {
    setSavingProvider(provider);
    setError(null);
    setSaveSuccess(null);

    try {
      const edits = providerEdits[provider] || {};
      const config = providerConfigs[provider];

      const body: Record<string, unknown> = { provider };

      // Include API key if edited
      if (edits.apiKey !== undefined) {
        body.apiKey = edits.apiKey;
      }

      // Include secret key for bedrock
      if (provider === 'bedrock' && edits.secretKey !== undefined) {
        body.secretKey = edits.secretKey;
      }

      // Include AWS region for bedrock
      if (provider === 'bedrock') {
        body.awsRegion = edits.awsRegion ?? config?.awsRegion ?? 'us-west-2';
      }

      // Include toggles and model selection
      body.isEnabled = edits.isEnabled ?? config?.isEnabled ?? false;
      body.isJudgeModel = edits.isJudgeModel ?? config?.isJudgeModel ?? false;
      body.defaultModel = edits.defaultModel ?? config?.defaultModel;

      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save provider');
      }

      // Update the config in state
      setProviderConfigs((prev) => ({
        ...prev,
        [provider]: data.provider,
      }));

      // Clear edits for this provider
      setProviderEdits((prev) => {
        const newEdits = { ...prev };
        delete newEdits[provider];
        return newEdits;
      });

      setSaveSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} settings saved successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSavingProvider(null);
    }
  };

  // Update provider edit state
  const updateProviderEdit = (provider: string, field: keyof ProviderEditState, value: string | boolean) => {
    setProviderEdits((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  // Get the effective value for a provider field (edit state or saved config)
  const getProviderValue = <K extends keyof ProviderEditState>(
    provider: string,
    field: K
  ): ProviderEditState[K] | undefined => {
    const edit = providerEdits[provider]?.[field];
    if (edit !== undefined) return edit;
    const config = providerConfigs[provider];
    if (!config) return undefined;
    if (field === 'isEnabled') return config.isEnabled as ProviderEditState[K];
    if (field === 'isJudgeModel') return config.isJudgeModel as ProviderEditState[K];
    if (field === 'defaultModel') return (config.defaultModel ?? undefined) as ProviderEditState[K];
    if (field === 'awsRegion') return (config.awsRegion ?? undefined) as ProviderEditState[K];
    return undefined;
  };

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
      fetchProviders();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, fetchSettings, fetchProviders, router]);

  // Update a setting value
  const updateSetting = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Get the display value for a setting
  const getSettingValue = (key: string): string => {
    if (key in editedSettings) return editedSettings[key];
    return settings[key]?.value || '';
  };

  // Save settings
  const handleSave = async (category: string) => {
    setSaving(true);
    setSaveSuccess(null);
    setError(null);

    try {
      // Filter edited settings by category
      const categoryKeys = Object.entries(settings)
        .filter(([, meta]) => meta.category === category)
        .map(([key]) => key);

      const updates: Record<string, string> = {};
      for (const key of categoryKeys) {
        if (key in editedSettings && editedSettings[key]) {
          updates[key] = editedSettings[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(data.message || 'Settings saved successfully.');
      // Clear edited settings for this category
      const newEdited = { ...editedSettings };
      for (const key of categoryKeys) {
        delete newEdited[key];
      }
      setEditedSettings(newEdited);
      // Refresh settings
      fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle user role
  const handleToggleRole = async (userId: string, currentRole: string) => {
    setUpdatingRole(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Refresh users list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administration</h1>
        <p className="text-muted-foreground">
          Configure API integrations and system settings for TrailBlazer AI.
        </p>
        {settingsMode === 'local' && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Running in local mode. Settings can only be viewed, not modified. Update .env.local to change values.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertDescription>{saveSuccess}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ai-models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ai-models" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Models</span>
          </TabsTrigger>
          <TabsTrigger value="payi" className="flex items-center gap-2" onClick={() => fetchPayiStatus()}>
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Pay-i</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="maps" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Maps</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2" onClick={() => fetchUsers()}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Models Tab */}
        <TabsContent value="ai-models" className="space-y-6">
          {/* Anthropic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Anthropic
                <Badge variant="outline">Claude</Badge>
                {providerConfigs.anthropic?.isEnabled && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure Anthropic Claude API for trail analysis and intelligent routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this provider to be used for analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('anthropic', 'isEnabled') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('anthropic', 'isEnabled', v)}
                />
              </div>
              <Separator />
              <ApiKeyField
                id="anthropic-key"
                label="API Key"
                placeholder="sk-ant-api03-..."
                description="Get your API key from console.anthropic.com"
                value={providerEdits.anthropic?.apiKey ?? ''}
                onChange={(v) => updateProviderEdit('anthropic', 'apiKey', v)}
                configured={providerConfigs.anthropic?.hasApiKey}
              />
              {providerConfigs.anthropic?.maskedKey && !providerEdits.anthropic?.apiKey && (
                <p className="text-sm text-muted-foreground">Current key: {providerConfigs.anthropic.maskedKey}</p>
              )}
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select
                  value={getProviderValue('anthropic', 'defaultModel') ?? 'claude-sonnet-4-20250514'}
                  onValueChange={(v) => updateProviderEdit('anthropic', 'defaultModel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                    <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet v2</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet v1</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use as Judge Model</Label>
                  <p className="text-sm text-muted-foreground">
                    Include in comparison mode analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('anthropic', 'isJudgeModel') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('anthropic', 'isJudgeModel', v)}
                />
              </div>
              <Separator />
              <Button onClick={() => saveProvider('anthropic')} disabled={savingProvider === 'anthropic'}>
                {savingProvider === 'anthropic' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                OpenAI
                <Badge variant="outline">GPT-4</Badge>
                {providerConfigs.openai?.isEnabled && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure OpenAI GPT models for alternative analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this provider to be used for analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('openai', 'isEnabled') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('openai', 'isEnabled', v)}
                />
              </div>
              <Separator />
              <ApiKeyField
                id="openai-key"
                label="API Key"
                placeholder="sk-..."
                description="Get your API key from platform.openai.com"
                value={providerEdits.openai?.apiKey ?? ''}
                onChange={(v) => updateProviderEdit('openai', 'apiKey', v)}
                configured={providerConfigs.openai?.hasApiKey}
              />
              {providerConfigs.openai?.maskedKey && !providerEdits.openai?.apiKey && (
                <p className="text-sm text-muted-foreground">Current key: {providerConfigs.openai.maskedKey}</p>
              )}
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select
                  value={getProviderValue('openai', 'defaultModel') ?? 'gpt-4o'}
                  onValueChange={(v) => updateProviderEdit('openai', 'defaultModel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o-2024-11-20">GPT-4o (Nov 2024)</SelectItem>
                    <SelectItem value="gpt-4o-2024-08-06">GPT-4o (Aug 2024)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                    <SelectItem value="gpt-4o-mini-2024-07-18">GPT-4o Mini (Jul 2024)</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-4-turbo-2024-04-09">GPT-4 Turbo (Apr 2024)</SelectItem>
                    <SelectItem value="gpt-4-0125-preview">GPT-4 Preview</SelectItem>
                    <SelectItem value="o1">o1 (Reasoning)</SelectItem>
                    <SelectItem value="o1-2024-12-17">o1 (Dec 2024)</SelectItem>
                    <SelectItem value="o1-mini">o1 Mini</SelectItem>
                    <SelectItem value="o1-mini-2024-09-12">o1 Mini (Sep 2024)</SelectItem>
                    <SelectItem value="o3-mini">o3 Mini (Latest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use as Judge Model</Label>
                  <p className="text-sm text-muted-foreground">
                    Include in comparison mode analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('openai', 'isJudgeModel') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('openai', 'isJudgeModel', v)}
                />
              </div>
              <Separator />
              <Button onClick={() => saveProvider('openai')} disabled={savingProvider === 'openai'}>
                {savingProvider === 'openai' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Google AI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google AI
                <Badge variant="outline">Gemini</Badge>
                {providerConfigs.google?.isEnabled && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure Google Gemini models for vision analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this provider to be used for analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('google', 'isEnabled') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('google', 'isEnabled', v)}
                />
              </div>
              <Separator />
              <ApiKeyField
                id="google-ai-key"
                label="API Key"
                placeholder="AIza..."
                description="Get your API key from makersuite.google.com"
                value={providerEdits.google?.apiKey ?? ''}
                onChange={(v) => updateProviderEdit('google', 'apiKey', v)}
                configured={providerConfigs.google?.hasApiKey}
              />
              {providerConfigs.google?.maskedKey && !providerEdits.google?.apiKey && (
                <p className="text-sm text-muted-foreground">Current key: {providerConfigs.google.maskedKey}</p>
              )}
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select
                  value={getProviderValue('google', 'defaultModel') ?? 'gemini-2.0-flash'}
                  onValueChange={(v) => updateProviderEdit('google', 'defaultModel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</SelectItem>
                    <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</SelectItem>
                    <SelectItem value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking</SelectItem>
                    <SelectItem value="gemini-exp-1206">Gemini Experimental (Dec 2024)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-1.5-pro-002">Gemini 1.5 Pro 002</SelectItem>
                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                    <SelectItem value="gemini-1.5-flash-002">Gemini 1.5 Flash 002</SelectItem>
                    <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use as Judge Model</Label>
                  <p className="text-sm text-muted-foreground">
                    Include in comparison mode analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('google', 'isJudgeModel') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('google', 'isJudgeModel', v)}
                />
              </div>
              <Separator />
              <Button onClick={() => saveProvider('google')} disabled={savingProvider === 'google'}>
                {savingProvider === 'google' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* xAI / Grok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                xAI
                <Badge variant="outline">Grok</Badge>
                {providerConfigs.xai?.isEnabled && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure xAI Grok models for alternative analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this provider to be used for analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('xai', 'isEnabled') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('xai', 'isEnabled', v)}
                />
              </div>
              <Separator />
              <ApiKeyField
                id="xai-key"
                label="API Key"
                placeholder="xai-..."
                description="Get your API key from x.ai"
                value={providerEdits.xai?.apiKey ?? ''}
                onChange={(v) => updateProviderEdit('xai', 'apiKey', v)}
                configured={providerConfigs.xai?.hasApiKey}
              />
              {providerConfigs.xai?.maskedKey && !providerEdits.xai?.apiKey && (
                <p className="text-sm text-muted-foreground">Current key: {providerConfigs.xai.maskedKey}</p>
              )}
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select
                  value={getProviderValue('xai', 'defaultModel') ?? 'grok-2-vision-1212'}
                  onValueChange={(v) => updateProviderEdit('xai', 'defaultModel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grok-2-vision-1212">Grok 2 Vision (Recommended)</SelectItem>
                    <SelectItem value="grok-2-1212">Grok 2 (Dec 2024)</SelectItem>
                    <SelectItem value="grok-vision-beta">Grok Vision Beta</SelectItem>
                    <SelectItem value="grok-beta">Grok Beta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use as Judge Model</Label>
                  <p className="text-sm text-muted-foreground">
                    Include in comparison mode analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('xai', 'isJudgeModel') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('xai', 'isJudgeModel', v)}
                />
              </div>
              <Separator />
              <Button onClick={() => saveProvider('xai')} disabled={savingProvider === 'xai'}>
                {savingProvider === 'xai' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* AWS Bedrock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AWS Bedrock
                <Badge variant="outline">Claude on AWS</Badge>
                {providerConfigs.bedrock?.isEnabled && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure AWS Bedrock for enterprise Claude access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this provider to be used for analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('bedrock', 'isEnabled') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('bedrock', 'isEnabled', v)}
                />
              </div>
              <Separator />
              <ApiKeyField
                id="aws-access-key"
                label="Access Key ID"
                placeholder="AKIA..."
                value={providerEdits.bedrock?.apiKey ?? ''}
                onChange={(v) => updateProviderEdit('bedrock', 'apiKey', v)}
                configured={providerConfigs.bedrock?.hasApiKey}
              />
              {providerConfigs.bedrock?.maskedKey && !providerEdits.bedrock?.apiKey && (
                <p className="text-sm text-muted-foreground">Current key: {providerConfigs.bedrock.maskedKey}</p>
              )}
              <ApiKeyField
                id="aws-secret-key"
                label="Secret Access Key"
                placeholder="..."
                value={providerEdits.bedrock?.secretKey ?? ''}
                onChange={(v) => updateProviderEdit('bedrock', 'secretKey', v)}
                configured={providerConfigs.bedrock?.hasSecretKey}
              />
              {providerConfigs.bedrock?.maskedSecretKey && !providerEdits.bedrock?.secretKey && (
                <p className="text-sm text-muted-foreground">Current secret: {providerConfigs.bedrock.maskedSecretKey}</p>
              )}
              <div className="space-y-2">
                <Label>AWS Region</Label>
                <Select
                  value={getProviderValue('bedrock', 'awsRegion') ?? 'us-west-2'}
                  onValueChange={(v) => updateProviderEdit('bedrock', 'awsRegion', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                    <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use as Judge Model</Label>
                  <p className="text-sm text-muted-foreground">
                    Include in comparison mode analysis
                  </p>
                </div>
                <Switch
                  checked={getProviderValue('bedrock', 'isJudgeModel') ?? false}
                  onCheckedChange={(v) => updateProviderEdit('bedrock', 'isJudgeModel', v)}
                />
              </div>
              <Separator />
              <Button onClick={() => saveProvider('bedrock')} disabled={savingProvider === 'bedrock'}>
                {savingProvider === 'bedrock' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pay-i Integration Tab */}
        <TabsContent value="payi" className="space-y-6">
          {/* Pay-i Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pay-i Integration
                {payiStatus?.enabled ? (
                  <Badge variant="default">Connected</Badge>
                ) : (
                  <Badge variant="secondary">Not Configured</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Pay-i provides AI usage tracking, cost monitoring, and spend limits for your AI integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {payiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payiStatus?.enabled ? (
                <>
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Pay-i is connected and tracking AI usage. Configure environment variables <code>PAYI_BASE_URL</code> and <code>PAYI_API_KEY</code> in your deployment.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">Use Cases</div>
                      <div className="text-2xl font-bold">{payiStatus.useCases.length}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">KPIs</div>
                      <div className="text-2xl font-bold">{payiStatus.kpis.length}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">Limits</div>
                      <div className="text-2xl font-bold">{payiStatus.limits.length}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Use Cases */}
                  {payiStatus.useCases.length > 0 && (
                    <div className="space-y-2">
                      <Label>Configured Use Cases</Label>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Features</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payiStatus.useCases.map((uc) => (
                              <TableRow key={uc.use_case_name}>
                                <TableCell className="font-mono text-sm font-medium">{uc.use_case_name}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs">{uc.description || '-'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {uc.properties?.features?.split(',').map((f, i) => (
                                    <Badge key={i} variant="outline" className="mr-1 mb-1">{f.trim()}</Badge>
                                  )) || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* KPIs */}
                  {payiStatus.kpis.length > 0 && (
                    <div className="space-y-2">
                      <Label>KPIs by Use Case</Label>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Use Case</TableHead>
                              <TableHead>KPI Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payiStatus.kpis.map((kpi, idx) => (
                              <TableRow key={`${kpi.useCaseName}-${kpi.kpi_name}-${idx}`}>
                                <TableCell className="font-mono text-xs">{kpi.useCaseName}</TableCell>
                                <TableCell className="font-mono text-sm">{kpi.kpi_name}</TableCell>
                                <TableCell>
                                  <Badge variant={kpi.value_type === 'boolean' ? 'secondary' : 'outline'}>
                                    {kpi.value_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{kpi.description || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Limits */}
                  {payiStatus.limits.length > 0 && (
                    <div className="space-y-2">
                      <Label>Spending Limits</Label>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>ID</TableHead>
                              <TableHead className="text-right">Max</TableHead>
                              <TableHead className="text-right">Threshold</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payiStatus.limits.map((limit) => (
                              <TableRow key={limit.limit_id}>
                                <TableCell>{limit.limit_name}</TableCell>
                                <TableCell className="font-mono text-sm">{limit.limit_id}</TableCell>
                                <TableCell className="text-right">${limit.max.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{limit.threshold ? `$${limit.threshold.toFixed(2)}` : '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    <Button onClick={runPayiSetup} disabled={payiRunningSetup}>
                      {payiRunningSetup ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Setup
                    </Button>
                    <Button variant="outline" onClick={fetchPayiStatus} disabled={payiLoading}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Run Setup creates use case definitions, KPIs, and default spending limits. Safe to run multiple times.
                  </p>
                </>
              ) : (
                <>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Pay-i is not configured. Add the following environment variables to enable AI usage tracking:
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
                    <code className="block text-sm">PAYI_BASE_URL=https://api.pay-i.com</code>
                    <code className="block text-sm">PAYI_API_KEY=sk-payi-app-xxx</code>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Get your API credentials from the <a href="https://pay-i.com" target="_blank" rel="noopener noreferrer" className="underline">Pay-i dashboard</a>.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Google OAuth */}
          <Card>
            <CardHeader>
              <CardTitle>Google OAuth</CardTitle>
              <CardDescription>
                Enable Sign in with Google for user authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="google-client-id"
                label="Client ID"
                placeholder="xxx.apps.googleusercontent.com"
                description="From Google Cloud Console OAuth credentials"
                value={getSettingValue('GOOGLE_CLIENT_ID')}
                onChange={(v) => updateSetting('GOOGLE_CLIENT_ID', v)}
                configured={settings['GOOGLE_CLIENT_ID']?.configured}
              />
              <ApiKeyField
                id="google-client-secret"
                label="Client Secret"
                placeholder="GOCSPX-..."
                value={getSettingValue('GOOGLE_CLIENT_SECRET')}
                onChange={(v) => updateSetting('GOOGLE_CLIENT_SECRET', v)}
                configured={settings['GOOGLE_CLIENT_SECRET']?.configured}
              />
              <Separator />
              <Button onClick={() => handleSave('auth')} disabled={saving || settingsMode === 'local'}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Auth Settings
              </Button>
            </CardContent>
          </Card>

          {/* Apple OAuth */}
          <Card>
            <CardHeader>
              <CardTitle>Apple Sign In</CardTitle>
              <CardDescription>
                Enable Sign in with Apple for user authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="apple-client-id"
                label="Service ID"
                placeholder="com.example.app"
                description="From Apple Developer Portal"
                value={getSettingValue('APPLE_CLIENT_ID')}
                onChange={(v) => updateSetting('APPLE_CLIENT_ID', v)}
                configured={settings['APPLE_CLIENT_ID']?.configured}
              />
              <ApiKeyField
                id="apple-client-secret"
                label="Client Secret (JWT)"
                placeholder="eyJ..."
                value={getSettingValue('APPLE_CLIENT_SECRET')}
                onChange={(v) => updateSetting('APPLE_CLIENT_SECRET', v)}
                configured={settings['APPLE_CLIENT_SECRET']?.configured}
              />
            </CardContent>
          </Card>

          {/* Session Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Session Settings</CardTitle>
              <CardDescription>
                Configure authentication session behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WebAuthn / Passkeys</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to sign in with biometrics or security keys
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Session Duration</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days (Default)</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maps Tab */}
        <TabsContent value="maps" className="space-y-6">
          {/* Mapbox */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Mapbox
                <Badge variant="default">Primary</Badge>
              </CardTitle>
              <CardDescription>
                Configure Mapbox for interactive trail maps and routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="mapbox-token"
                label="Access Token"
                placeholder="pk.eyJ..."
                description="Get your token from account.mapbox.com"
                value={getSettingValue('MAPBOX_ACCESS_TOKEN')}
                onChange={(v) => updateSetting('MAPBOX_ACCESS_TOKEN', v)}
                configured={settings['MAPBOX_ACCESS_TOKEN']?.configured}
              />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Satellite Imagery</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable satellite view for trail analysis
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>3D Terrain</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable 3D terrain visualization
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <Button onClick={() => handleSave('maps')} disabled={saving || settingsMode === 'local'}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Maps Settings
              </Button>
            </CardContent>
          </Card>

          {/* Google Maps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google Maps
                <Badge variant="outline">Alternative</Badge>
              </CardTitle>
              <CardDescription>
                Configure Google Maps as an alternative map provider.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="google-maps-key"
                label="API Key"
                placeholder="AIza..."
                description="Get your key from Google Cloud Console"
                value={getSettingValue('GOOGLE_MAPS_API_KEY')}
                onChange={(v) => updateSetting('GOOGLE_MAPS_API_KEY', v)}
                configured={settings['GOOGLE_MAPS_API_KEY']?.configured}
              />
              <div className="space-y-2">
                <Label>Enabled APIs</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Switch id="maps-js" defaultChecked />
                    <Label htmlFor="maps-js" className="font-normal">Maps JavaScript API</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="places" />
                    <Label htmlFor="places" className="font-normal">Places API</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="directions" />
                    <Label htmlFor="directions" className="font-normal">Directions API</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="elevation" />
                    <Label htmlFor="elevation" className="font-normal">Elevation API</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions. Admins can access this settings page and manage other users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by email or name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={fetchUsers} disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Analyses</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users found. Click Search to load users.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name || 'No name'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : (
                                <ShieldX className="h-3 w-3 mr-1" />
                              )}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{user.analysisCount}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={user.role === 'admin' ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() => handleToggleRole(user.id, user.role)}
                              disabled={updatingRole === user.id || user.email === session?.user?.email}
                            >
                              {updatingRole === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.role === 'admin' ? (
                                'Revoke Admin'
                              ) : (
                                'Make Admin'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
