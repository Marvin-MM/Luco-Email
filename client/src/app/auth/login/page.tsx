// 'use client';

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useLogin } from "@/hooks/use-auth";
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useAuthStore } from '@/store/auth';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [errorMessage, setErrorMessage] = useState('');
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { user } = useAuthStore();
//   const { mutate: login, isPending, isError, error } = useLogin();

//   // Handle Google auth errors from URL params
//   useEffect(() => {
//     const googleError = searchParams.get('error');
//     if (googleError === 'google_auth_failed') {
//       setErrorMessage('Google authentication failed. Please try again.');
//     }
//   }, [searchParams]);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setErrorMessage('');
//     login({ email, password }, {
//       onSuccess: (data) => {
//         // Role-based redirect
//         if (data.data.user.role === 'SUPERADMIN') {
//           router.push('/admin/dashboard');
//         } else {
//           router.push('/dashboard');
//         }
//       },
//       onError: (error: any) => {
//         setErrorMessage(error?.response?.data?.message || 'Login failed. Please try again.');
//       }
//     });
//   };

//   const handleGoogleAuth = () => {
//     setErrorMessage('');
//     window.location.href = '/api/auth/google';
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
//       <Card className="w-full max-w-sm">
//         <form onSubmit={handleSubmit}>
//           <CardHeader>
//             <CardTitle className="text-2xl">Login</CardTitle>
//             <CardDescription>
//               Enter your email below to login to your account.
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="grid gap-4">
//             <div className="grid gap-2">
//               <Label htmlFor="email">Email</Label>
//               <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
//             </div>
//             <div className="grid gap-2">
//               <div className="flex items-center">
//                 <Label htmlFor="password">Password</Label>
//                 <Link href="/auth/forgot-password" prefetch={false} className="ml-auto inline-block text-sm underline">
//                   Forgot your password?
//                 </Link>
//               </div>
//               <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
//             </div>
//             {(isError || errorMessage) && (
//               <p className="text-red-500 text-sm">
//                 {errorMessage || error?.response?.data?.message || 'An error occurred'}
//               </p>
//             )}
//           </CardContent>
//           <CardFooter>
//             <div className="grid gap-4 w-full">
//               <Button type="submit" className="w-full" disabled={isPending}>
//                 {isPending ? 'Signing in...' : 'Sign in'}
//               </Button>
//               <Button variant="outline" className="w-full" type="button" onClick={handleGoogleAuth}>
//                 Sign in with Google
//               </Button>
//               <div className="mt-4 text-center text-sm">
//                 Don&apos;t have an account?{" "}
//                 <Link href="/auth/register" prefetch={false} className="underline">
//                   Sign up
//                 </Link>
//               </div>
//             </div>
//           </CardFooter>
//         </form>
//       </Card>
//     </div>
//   );
// }


'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { mutate: login, isPending, isError, error } = useLogin();

  // Handle Google auth errors from URL params
  useEffect(() => {
    const googleError = searchParams.get('error');
    if (googleError === 'google_auth_failed') {
      setErrorMessage('Google authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    login({ email, password }, {
      onSuccess: (data) => {
        // Role-based redirect
        if (data.data.user.role === 'SUPERADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      },
      onError: (error: any) => {
        setErrorMessage(error?.response?.data?.message || 'Login failed. Please try again.');
      }
    });
  };

  const handleGoogleAuth = () => {
    setErrorMessage('');
    window.location.href = '/api/auth/google';
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to sign into your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link 
              href="/auth/forgot-password" 
              prefetch={false}
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        {(isError || errorMessage) && (
          <p className="text-red-500 text-sm">
            {errorMessage || error?.response?.data?.message || 'An error occurred'}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
        
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        
        <Button variant="outline" className="w-full" type="button" onClick={handleGoogleAuth}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" />
          </svg>
          Sign in with Google
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" prefetch={false} className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking sign in, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            LucoEmail
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img 
          src="/auth.png" 
          alt="Sign in illustration" 
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale" 
        />
      </div>
    </div>
  );
}