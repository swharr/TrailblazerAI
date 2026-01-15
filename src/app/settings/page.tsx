'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Plus, Star, Pencil, Trash2, Loader2, User, Shield, Check, X, Map, Share2, Copy } from 'lucide-react';
import { VEHICLE_MAKES_MODELS, VEHICLE_FEATURES, VEHICLE_YEARS, SUSPENSION_BRANDS, SUSPENSION_TRAVEL_TYPES, getModelsForMake } from '@/lib/vehicle-data';
import type { VehicleFeature, SuspensionBrand, SuspensionTravelType } from '@/lib/types';

interface Vehicle {
  id: string;
  name: string | null;
  make: string;
  model: string;
  year: number | null;
  features: string[];
  suspensionBrand: string | null;
  suspensionTravel: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface VehicleFormData {
  name: string;
  make: string;
  model: string;
  year: string;
  features: VehicleFeature[];
  suspensionBrand: SuspensionBrand | '';
  suspensionTravel: SuspensionTravelType | '';
  isDefault: boolean;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  hasPassword: boolean;
}

interface SavedRoute {
  id: string;
  name: string;
  status: string;
  totalDistance: number | null;
  estimatedTime: number | null;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
}

const emptyForm: VehicleFormData = {
  name: '',
  make: '',
  model: '',
  year: '',
  features: [],
  suspensionBrand: '',
  suspensionTravel: '',
  isDefault: false,
};

export default function SettingsPage() {
  const { status } = useSession();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vehicle state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormData>(emptyForm);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Routes state
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [sharingRouteId, setSharingRouteId] = useState<string | null>(null);
  const [copiedRouteId, setCopiedRouteId] = useState<string | null>(null);

  // Password validation
  const passwordRequirements = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    matches: newPassword === confirmPassword && newPassword.length > 0,
  };
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile(data.user);
          setProfileName(data.user.name || '');
          setProfileImage(data.user.image || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch routes
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes');
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
      fetchVehicles();
      fetchRoutes();
    } else if (status === 'unauthenticated') {
      setProfileLoading(false);
      setLoading(false);
      setRoutesLoading(false);
    }
  }, [status, fetchProfile, fetchVehicles, fetchRoutes]);

  // Update available models when make changes
  useEffect(() => {
    if (form.make) {
      setAvailableModels(getModelsForMake(form.make));
    } else {
      setAvailableModels([]);
    }
  }, [form.make]);

  // Save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim() || null,
          image: profileImage.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setProfile((prev) => prev ? { ...prev, name: data.user.name, image: data.user.image } : null);
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!isPasswordValid) return;

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  // Open dialog for new vehicle
  const handleNewVehicle = () => {
    setEditingVehicle(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      name: vehicle.name || '',
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      features: vehicle.features as VehicleFeature[],
      suspensionBrand: (vehicle.suspensionBrand as SuspensionBrand) || '',
      suspensionTravel: (vehicle.suspensionTravel as SuspensionTravelType) || '',
      isDefault: vehicle.isDefault,
    });
    setDialogOpen(true);
  };

  // Save vehicle (create or update)
  const handleSaveVehicle = async () => {
    if (!form.make || !form.model) return;

    setSaving(true);
    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const method = editingVehicle ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || null,
          make: form.make,
          model: form.model,
          year: form.year || null,
          features: form.features,
          suspensionBrand: form.suspensionBrand || null,
          suspensionTravel: form.suspensionTravel || null,
          isDefault: form.isDefault,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        fetchVehicles();
      }
    } catch (error) {
      console.error('Failed to save vehicle:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
      }
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  };

  // Set default vehicle
  const handleSetDefault = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        fetchVehicles();
      }
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  // Toggle feature
  const toggleFeature = (feature: VehicleFeature) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  // Share route
  const handleShareRoute = async (routeId: string) => {
    setSharingRouteId(routeId);
    try {
      const res = await fetch(`/api/routes/${routeId}/share`, { method: 'POST' });
      if (res.ok) {
        fetchRoutes();
      }
    } catch (error) {
      console.error('Failed to share route:', error);
    } finally {
      setSharingRouteId(null);
    }
  };

  // Unshare route
  const handleUnshareRoute = async (routeId: string) => {
    setSharingRouteId(routeId);
    try {
      const res = await fetch(`/api/routes/${routeId}/share`, { method: 'DELETE' });
      if (res.ok) {
        fetchRoutes();
      }
    } catch (error) {
      console.error('Failed to unshare route:', error);
    } finally {
      setSharingRouteId(null);
    }
  };

  // Copy share link
  const handleCopyShareLink = async (shareToken: string, routeId: string) => {
    const url = `${window.location.origin}/routes/shared/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRouteId(routeId);
      setTimeout(() => setCopiedRouteId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, security, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your display name and profile picture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status === 'unauthenticated' ? (
              <p className="text-muted-foreground text-center py-4">
                Sign in to manage your profile.
              </p>
            ) : profile ? (
              <div className="space-y-6">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl font-semibold text-muted-foreground ${profileImage ? 'hidden' : ''}`}>
                      {getInitials(profileName || profile.name, profile.email)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{profileName || profile.name || 'No name set'}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      placeholder="Enter your name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-image">Profile Image URL</Label>
                    <Input
                      id="profile-image"
                      placeholder="https://example.com/your-image.jpg"
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to an image. You can use services like Gravatar or social media profile images.
                    </p>
                  </div>
                </div>

                {profileMessage && (
                  <div className={`p-3 rounded-md text-sm ${
                    profileMessage.type === 'success'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Change your password and manage account security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status === 'unauthenticated' ? (
              <p className="text-muted-foreground text-center py-4">
                Sign in to manage your security settings.
              </p>
            ) : profile && !profile.hasPassword ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  You signed in with Google, Apple, or a passkey.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Password management is not available for OAuth accounts.
                </p>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Requirements */}
                {newPassword && (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Password requirements:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {passwordRequirements.minLength ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasUppercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasLowercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasNumber ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        One number
                      </div>
                      <div className={`flex items-center gap-2 ${passwordRequirements.matches ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {passwordRequirements.matches ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        Passwords match
                      </div>
                    </div>
                  </div>
                )}

                {passwordMessage && (
                  <div className={`p-3 rounded-md text-sm ${
                    passwordMessage.type === 'success'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !isPasswordValid || !currentPassword}
                >
                  {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* My Vehicles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  My Vehicles
                </CardTitle>
                <CardDescription>
                  Save your vehicle configurations for personalized trail analysis.
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewVehicle}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                    <DialogDescription>
                      Enter your vehicle details for personalized trail recommendations.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Nickname */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nickname (optional)</Label>
                      <Input
                        id="name"
                        placeholder="e.g., My Taco, Trail Rig"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    {/* Make & Model */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Make *</Label>
                        <Select
                          value={form.make}
                          onValueChange={(value) => setForm({ ...form, make: value, model: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select make" />
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLE_MAKES_MODELS.map((v) => (
                              <SelectItem key={v.make} value={v.make}>
                                {v.make}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Model *</Label>
                        <Select
                          value={form.model}
                          onValueChange={(value) => setForm({ ...form, model: value })}
                          disabled={!form.make}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select
                        value={form.year}
                        onValueChange={(value) => setForm({ ...form, year: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_YEARS.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Suspension */}
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Suspension Setup</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Suspension Brand</Label>
                          <Select
                            value={form.suspensionBrand}
                            onValueChange={(value) => setForm({ ...form, suspensionBrand: value as SuspensionBrand })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select suspension" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUSPENSION_BRANDS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Travel Type</Label>
                          <Select
                            value={form.suspensionTravel}
                            onValueChange={(value) => setForm({ ...form, suspensionTravel: value as SuspensionTravelType })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select travel" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUSPENSION_TRAVEL_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Vehicle Features</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {VEHICLE_FEATURES.map((feature) => (
                          <div key={feature.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={feature.value}
                              checked={form.features.includes(feature.value)}
                              onCheckedChange={() => toggleFeature(feature.value)}
                            />
                            <Label htmlFor={feature.value} className="text-sm font-normal cursor-pointer">
                              {feature.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Default */}
                    <Separator />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDefault"
                        checked={form.isDefault}
                        onCheckedChange={(checked) => setForm({ ...form, isDefault: !!checked })}
                      />
                      <Label htmlFor="isDefault" className="cursor-pointer">
                        Set as default vehicle for trail analysis
                      </Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveVehicle} disabled={saving || !form.make || !form.model}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status === 'unauthenticated' ? (
              <p className="text-muted-foreground text-center py-4">
                Sign in to save your vehicles.
              </p>
            ) : vehicles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No vehicles saved yet. Add your first vehicle to get personalized trail recommendations.
              </p>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Car className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {vehicle.name || `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim()}
                          </span>
                          {vehicle.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.name && `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim()}
                          {vehicle.suspensionBrand && ` - ${SUSPENSION_BRANDS.find(s => s.value === vehicle.suspensionBrand)?.label || vehicle.suspensionBrand}`}
                        </p>
                        {vehicle.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {vehicle.features.slice(0, 4).map((f) => (
                              <Badge key={f} variant="outline" className="text-xs">
                                {VEHICLE_FEATURES.find(vf => vf.value === f)?.label || f}
                              </Badge>
                            ))}
                            {vehicle.features.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{vehicle.features.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!vehicle.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(vehicle.id)}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVehicle(vehicle)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this vehicle? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Routes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              My Routes
            </CardTitle>
            <CardDescription>
              Manage your saved routes and share them with others.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {routesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status === 'unauthenticated' ? (
              <p className="text-muted-foreground text-center py-4">
                Sign in to manage your routes.
              </p>
            ) : routes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  No routes saved yet. Plan your first route to see it here.
                </p>
                <Button variant="outline" asChild>
                  <a href="/plan">
                    <Map className="h-4 w-4 mr-2" />
                    Plan a Route
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Map className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{route.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {route.status}
                          </Badge>
                          {route.isPublic && (
                            <Badge variant="secondary" className="text-xs">
                              <Share2 className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {route.totalDistance ? `${route.totalDistance.toFixed(1)} mi` : 'No distance'}
                          {route.estimatedTime && ` • ${formatDuration(route.estimatedTime)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {route.isPublic && route.shareToken ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyShareLink(route.shareToken!, route.id)}
                            title="Copy share link"
                          >
                            {copiedRouteId === route.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnshareRoute(route.id)}
                            disabled={sharingRouteId === route.id}
                            title="Stop sharing"
                          >
                            {sharingRouteId === route.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShareRoute(route.id)}
                          disabled={sharingRouteId === route.id}
                          title="Share route"
                        >
                          {sharingRouteId === route.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a href="/plan" title="Edit route">
                          <Pencil className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">Download maps for offline use</p>
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
