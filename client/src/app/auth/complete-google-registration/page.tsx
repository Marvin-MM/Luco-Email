'use client';

import { useState } from 'react';
import { useCompleteGoogleRegistration } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function CompleteGoogleRegistrationPage() {
  const [organizationName, setOrganizationName] = useState('');
  const router = useRouter();
  const { mutate: completeRegistration, isPending, isError, error } = useCompleteGoogleRegistration();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeRegistration({ organizationName }, {
      onSuccess: () => {
        router.push('/dashboard');
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Complete Registration</CardTitle>
            <CardDescription>
              Please enter your organization name to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization Name</Label>
              <Input id="organization" placeholder="Acme Inc." required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            </div>
            {isError && <p className="text-red-500 text-sm">{error?.message || 'An error occurred'}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Completing...' : 'Complete Registration'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
