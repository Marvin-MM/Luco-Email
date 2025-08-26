'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useGetTenantById, useUpdateTenant } from '@/hooks/use-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TenantDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useGetTenantById(id);
  const { mutate: updateTenant, isPending } = useUpdateTenant();

  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    if (data) {
      setStatus(data.data.tenant.status);
      setPlan(data.data.tenant.subscriptionPlan);
    }
  }, [data]);

  const handleUpdate = () => {
    updateTenant({ id, data: { status, subscriptionPlan: plan } });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { tenant } = data.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tenant.organizationName}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
          <CardDescription>Update tenant settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subscription Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="ESSENTIAL">Essential</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
