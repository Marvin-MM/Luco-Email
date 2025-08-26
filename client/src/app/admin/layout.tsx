'use client';

import PrivateRoute from '@/components/auth/private-route';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivateRoute adminOnly>
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
