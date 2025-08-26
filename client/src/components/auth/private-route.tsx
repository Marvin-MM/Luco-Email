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
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }

    if (!isLoading && isAuthenticated && adminOnly && user?.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, adminOnly, user]);

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (isAuthenticated && (!adminOnly || (adminOnly && user?.role === 'SUPERADMIN'))) {
    return <>{children}</>;
  }

  return null;
}
