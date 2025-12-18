'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your TrailBlazer AI preferences and API connections.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
            <CardDescription>
              Select your preferred AI provider for trail analysis and route planning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">Primary Provider</Label>
              <Select defaultValue="anthropic">
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                  <SelectItem value="google">Google AI (Gemini)</SelectItem>
                  <SelectItem value="bedrock">AWS Bedrock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Smart Routing</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically select the best model for each task
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Map Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Map Settings</CardTitle>
            <CardDescription>Configure map display and data sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-provider">Map Provider</Label>
              <Select defaultValue="mapbox">
                <SelectTrigger id="map-provider">
                  <SelectValue placeholder="Select map provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mapbox">Mapbox</SelectItem>
                  <SelectItem value="google">Google Maps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Offline Maps</Label>
                <p className="text-sm text-muted-foreground">
                  Download maps for offline use
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Terrain Layer</Label>
                <p className="text-sm text-muted-foreground">Show elevation and terrain data</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Units & Display */}
        <Card>
          <CardHeader>
            <CardTitle>Units & Display</CardTitle>
            <CardDescription>Customize measurement units and display preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distance-unit">Distance Unit</Label>
              <Select defaultValue="miles">
                <SelectTrigger id="distance-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miles">Miles</SelectItem>
                  <SelectItem value="kilometers">Kilometers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevation-unit">Elevation Unit</Label>
              <Select defaultValue="feet">
                <SelectTrigger id="elevation-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="meters">Meters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for various services. Keys are stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input id="anthropic-key" type="password" placeholder="sk-ant-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input id="openai-key" type="password" placeholder="sk-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapbox-key">Mapbox Access Token</Label>
              <Input id="mapbox-key" type="password" placeholder="pk...." />
            </div>
            <Separator />
            <Button>Save API Keys</Button>
          </CardContent>
        </Card>

        {/* Cost Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Tracking</CardTitle>
            <CardDescription>Monitor and limit your AI API usage costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Cost Tracking</Label>
                <p className="text-sm text-muted-foreground">Track API costs in real-time</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-limit">Monthly Budget Limit ($)</Label>
              <Input id="budget-limit" type="number" placeholder="50.00" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when approaching budget limit
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
