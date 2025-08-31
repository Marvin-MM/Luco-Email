'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackRoute?: string;
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackRoute = '/dashboard' 
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!allowedRoles.includes(user.role)) {
        router.push(fallbackRoute);
      }
    }
  }, [user, isAuthenticated, allowedRoles, fallbackRoute, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
