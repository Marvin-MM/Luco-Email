'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Link from "next/link";
import { useState } from "react";
import { useVerifyOtp, useResendOtp } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { mutate: verifyOtp, isPending, isError, error } = useVerifyOtp();
  const { mutate: resendOtp, isPending: isResending } = useResendOtp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    verifyOtp({ email, otpCode: otp }, {
      onSuccess: () => {
        router.push('/dashboard');
      }
    });
  };

  const handleResend = () => {
    if (!email) return;
    resendOtp({ email });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a 6-digit code to {email}. Please enter it below to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {isError && <p className="text-red-500 text-sm">{error?.message || 'An error occurred'}</p>}
          </CardContent>
          <CardFooter>
            <div className="grid gap-4 w-full">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Verifying...' : 'Verify'}
              </Button>
              <div className="mt-4 text-center text-sm">
                Didn&apos;t receive the code?{" "}
                <Button variant="link" type="button" onClick={handleResend} disabled={isResending} className="underline">
                  {isResending ? 'Resending...' : 'Resend'}
                </Button>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
