'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useGetProfile } from '@/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoading } = useGetProfile(); // Trigger profile fetching

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  // Render a loading state while checking auth status
  return <div>Loading...</div>;
}
