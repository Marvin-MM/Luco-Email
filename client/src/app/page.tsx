'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useGetProfile } from '@/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isLoading } = useGetProfile(); // Trigger profile fetching

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        if (user.role === 'SUPERADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Render a loading state while checking auth status
  return <div>Loading...</div>;
}
