'use client';

import { useState, useEffect } from 'react';
import { useCompleteGoogleRegistration } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function CompleteGoogleRegistrationPage() {
  const [organizationName, setOrganizationName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { mutate: completeRegistration, isPending, isError, error } = useCompleteGoogleRegistration();

  // Check if user has a valid temporary token on mount
  useEffect(() => {
    // This will be handled by the backend when the request is made
    // If no valid token exists, the backend will return an appropriate error
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!organizationName.trim()) {
      setErrorMessage('Organization name is required');
      return;
    }

    completeRegistration({ organizationName: organizationName.trim() }, {
      onSuccess: (data) => {
        // Role-based redirect
        if (data.data.user.role === 'SUPERADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || 'Registration completion failed. Please try again.';
        setErrorMessage(message);
        
        // If token is invalid/expired, redirect to login
        if (message.includes('registration token') || message.includes('start the registration process again')) {
          setTimeout(() => {
            router.push('/auth/login?error=registration_expired');
          }, 3000);
        }
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
              <Input 
                id="organization" 
                placeholder="Acme Inc." 
                required 
                value={organizationName} 
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={isPending}
              />
            </div>
            {(isError || errorMessage) && (
              <p className="text-red-500 text-sm">
                {errorMessage || error?.response?.data?.message || 'An error occurred'}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending || !organizationName.trim()}>
              {isPending ? 'Completing...' : 'Complete Registration'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
