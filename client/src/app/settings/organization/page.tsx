'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useUpdateTenantSettings } from '@/hooks/use-tenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function OrganizationSettingsPage() {
  const { tenant } = useAuthStore();
  const { mutate: updateSettings, isPending } = useUpdateTenantSettings();

  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    if (tenant) {
      setOrganizationName(tenant.organizationName);
    }
  }, [tenant]);

  const handleUpdate = () => {
    updateSettings({ organizationName });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Organization Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Update your organization's name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input id="organizationName" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
          </div>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
