'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import PrivateRoute from '@/components/auth/private-route';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { useGetApplications } from '@/hooks/use-application';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {isAuthPage ? (
            children
          ) : (
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
          )}
        </Providers>
      </body>
    </html>
  );
}
