'use client';

import PrivateRoute from '@/components/auth/private-route';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { useGetApplications } from '@/hooks/use-application';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setApplications, setCurrentApplication, currentApplication } = useAuthStore();
  const { data, isSuccess } = useGetApplications();

  useEffect(() => {
    if (isSuccess && data) {
      const apps = data.data.applications;
      setApplications(apps);
      if (apps.length > 0 && !currentApplication) {
        setCurrentApplication(apps[0]);
      }
    }
  }, [isSuccess, data, setApplications, setCurrentApplication, currentApplication]);

  return (
    <PrivateRoute>
      <div className="flex h-screen bg-muted/40">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </PrivateRoute>
  );
}
