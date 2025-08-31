'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGetProfile } from '@/hooks/use-auth';

export default function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { data, isError, isLoading } = useGetProfile();

  useEffect(() => {
    if (!isLoading) {
      if (isError || !isAuthenticated || !user) {
        router.push('/auth/login');
        return;
      }

      if (adminOnly && user.role !== 'SUPERADMIN') {
        // Redirect non-admin users to their dashboard
        router.push('/dashboard');
        return;
      }

      // If user is SUPERADMIN but accessing regular routes, allow it
      // If user is regular USER but accessing admin routes, they'll be redirected above
    }
  }, [isAuthenticated, isLoading, isError, router, adminOnly, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isError || !isAuthenticated || !user) {
    return null;
  }

  if (adminOnly && user.role !== 'SUPERADMIN') {
    return null;
  }

  return <>{children}</>;
}
