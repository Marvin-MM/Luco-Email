// 'use client';

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Link from "next/link";
// import { useState } from "react";
// import { useRegister } from "@/hooks/use-auth";
// import { useRouter } from 'next/navigation';

// export default function RegisterPage() {
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [organizationName, setOrganizationName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const router = useRouter();
//   const { mutate: register, isPending, isError, error } = useRegister();

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     register({ firstName, lastName, organizationName, email, password }, {
//       onSuccess: () => {
//         router.push(`/auth/verify-otp?email=${email}`);
//       }
//     });
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
//       <Card className="w-full max-w-sm">
//         <form onSubmit={handleSubmit}>
//           <CardHeader>
//             <CardTitle className="text-2xl">Sign Up</CardTitle>
//             <CardDescription>
//               Enter your information to create an account.
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="grid gap-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div className="grid gap-2">
//                 <Label htmlFor="first-name">First name</Label>
//                 <Input id="first-name" placeholder="Max" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="last-name">Last name</Label>
//                 <Input id="last-name" placeholder="Robinson" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
//               </div>
//             </div>
//             <div className="grid gap-2">
//               <Label htmlFor="organization">Organization Name</Label>
//               <Input id="organization" placeholder="Acme Inc." required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
//             </div>
//             <div className="grid gap-2">
//               <Label htmlFor="email">Email</Label>
//               <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
//             </div>
//             <div className="grid gap-2">
//               <Label htmlFor="password">Password</Label>
//               <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
//             </div>
//             {isError && <p className="text-red-500 text-sm">{error?.message || 'An error occurred'}</p>}
//           </CardContent>
//           <CardFooter>
//             <div className="grid gap-4 w-full">
//               <Button type="submit" className="w-full" disabled={isPending}>
//                 {isPending ? 'Creating account...' : 'Create an account'}
//               </Button>
//               <Button variant="outline" className="w-full" onClick={() => window.location.href = '/api/auth/google'}>
//                 Sign up with Google
//               </Button>
//               <div className="mt-4 text-center text-sm">
//                 Already have an account?{" "}
//                 <Link href="/auth/login" prefetch={false} className="underline">
//                   Sign in
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
import { useState } from "react";
import { useRegister } from "@/hooks/use-auth";
import { useRouter } from 'next/navigation';

function RegisterForm({ className, ...props }: React.ComponentProps<"form">) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { mutate: register, isPending, isError, error } = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ firstName, lastName, organizationName, email, password }, {
      onSuccess: () => {
        router.push(`/auth/verify-otp?email=${email}`);
      }
    });
  };

  const handleGoogleAuth = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your information to create an account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-3">
            <Label htmlFor="first-name">First name</Label>
            <Input 
              id="first-name" 
              placeholder="Max" 
              required 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="last-name">Last name</Label>
            <Input 
              id="last-name" 
              placeholder="Robinson" 
              required 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="organization">Organization Name</Label>
          <Input 
            id="organization" 
            placeholder="Acme Inc." 
            required 
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>
        
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
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        {isError && (
          <p className="text-red-500 text-sm">
            {error?.message || 'An error occurred'}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account...' : 'Create account'}
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
          Sign up with Google
        </Button>
      </div>
      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" prefetch={false} className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking Create account, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </form>
  );
}

export default function RegisterPage() {
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
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img 
          src="/auth.png" 
          alt="Register illustration" 
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale" 
        />
      </div>
    </div>
  );
}