'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useForgotPassword } from "@/hooks/use-auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { mutate: forgotPassword, isPending, isSuccess, isError, error } = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword({ email });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {isSuccess && <p className="text-green-500 text-sm">If an account with that email exists, a password reset link has been sent.</p>}
            {isError && <p className="text-red-500 text-sm">{error?.message || 'An error occurred'}</p>}
          </CardContent>
          <CardFooter>
            <div className="grid gap-4 w-full">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Sending...' : 'Send reset link'}
              </Button>
              <div className="mt-4 text-center text-sm">
                <Link href="/auth/login" prefetch={false} className="underline">
                  Back to login
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
