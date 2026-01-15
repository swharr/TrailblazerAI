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
import { Bot, Shield, Map, Eye, EyeOff, Check, AlertCircle, Users, Loader2, Search, ShieldCheck, ShieldX } from 'lucide-react';

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

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

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

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, fetchSettings, router]);

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-models" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Models</span>
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
              </CardTitle>
              <CardDescription>
                Configure Anthropic Claude API for trail analysis and intelligent routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="anthropic-key"
                label="API Key"
                placeholder="sk-ant-api03-..."
                description="Get your API key from console.anthropic.com"
                value={getSettingValue('ANTHROPIC_API_KEY')}
                onChange={(v) => updateSetting('ANTHROPIC_API_KEY', v)}
                configured={settings['ANTHROPIC_API_KEY']?.configured}
              />
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select defaultValue="claude-sonnet-4-20250514">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button onClick={() => handleSave('ai')} disabled={saving || settingsMode === 'local'}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save AI Settings
              </Button>
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                OpenAI
                <Badge variant="outline">GPT-4</Badge>
              </CardTitle>
              <CardDescription>
                Configure OpenAI GPT models for alternative analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="openai-key"
                label="API Key"
                placeholder="sk-..."
                description="Get your API key from platform.openai.com"
                value={getSettingValue('OPENAI_API_KEY')}
                onChange={(v) => updateSetting('OPENAI_API_KEY', v)}
                configured={settings['OPENAI_API_KEY']?.configured}
              />
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select defaultValue="gpt-4o">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="o1">o1 (Reasoning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Google AI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google AI
                <Badge variant="outline">Gemini</Badge>
              </CardTitle>
              <CardDescription>
                Configure Google Gemini models for vision analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="google-ai-key"
                label="API Key"
                placeholder="AIza..."
                description="Get your API key from makersuite.google.com"
                value={getSettingValue('GOOGLE_AI_API_KEY')}
                onChange={(v) => updateSetting('GOOGLE_AI_API_KEY', v)}
                configured={settings['GOOGLE_AI_API_KEY']?.configured}
              />
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select defaultValue="gemini-2.0-flash">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* xAI / Grok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                xAI
                <Badge variant="outline">Grok</Badge>
              </CardTitle>
              <CardDescription>
                Configure xAI Grok models for alternative analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="xai-key"
                label="API Key"
                placeholder="xai-..."
                description="Get your API key from x.ai"
                value={getSettingValue('XAI_API_KEY')}
                onChange={(v) => updateSetting('XAI_API_KEY', v)}
                configured={settings['XAI_API_KEY']?.configured}
              />
            </CardContent>
          </Card>

          {/* AWS Bedrock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AWS Bedrock
                <Badge variant="outline">Claude on AWS</Badge>
              </CardTitle>
              <CardDescription>
                Configure AWS Bedrock for enterprise Claude access and Judge Model evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="aws-access-key"
                label="Access Key ID"
                placeholder="AKIA..."
                value={getSettingValue('AWS_ACCESS_KEY_ID')}
                onChange={(v) => updateSetting('AWS_ACCESS_KEY_ID', v)}
                configured={settings['AWS_ACCESS_KEY_ID']?.configured}
              />
              <ApiKeyField
                id="aws-secret-key"
                label="Secret Access Key"
                placeholder="..."
                value={getSettingValue('AWS_SECRET_ACCESS_KEY')}
                onChange={(v) => updateSetting('AWS_SECRET_ACCESS_KEY', v)}
                configured={settings['AWS_SECRET_ACCESS_KEY']?.configured}
              />
              <div className="space-y-2">
                <Label>AWS Region</Label>
                <Select
                  value={getSettingValue('AWS_REGION') || 'us-west-2'}
                  onValueChange={(v) => updateSetting('AWS_REGION', v)}
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
                    Use Bedrock Claude to evaluate and score other model responses
                  </p>
                </div>
                <Switch />
              </div>
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
