// 'use client';

// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import { Providers } from "@/components/providers";
// import PrivateRoute from '@/components/auth/private-route';
// import Header from '@/components/layout/header';
// import Sidebar from '@/components/layout/sidebar';
// import { useGetApplications } from '@/hooks/use-application';
// import { useAuthStore } from '@/store/auth';
// import { useEffect } from 'react';
// import { usePathname } from 'next/navigation';

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// function AppInitializer({ children }: { children: React.ReactNode }) {
//   const { setApplications, setCurrentApplication, currentApplication, user, isAuthenticated } = useAuthStore();
//   const { data, isSuccess, isError } = useGetApplications();
//   const pathname = usePathname();

//   useEffect(() => {
//     if (isSuccess && data) {
//       const apps = data.data.applications;
//       setApplications(apps);
//       if (apps.length > 0 && !currentApplication) {
//         setCurrentApplication(apps[0]);
//       }
//     }
//   }, [isSuccess, data, setApplications, setCurrentApplication, currentApplication]);

//   // Handle role-based access control
//   useEffect(() => {
//     if (isAuthenticated && user && !isError) {
//       const isAdminRoute = pathname.startsWith('/admin');
//       const isUserRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/auth');
      
//       // If regular user tries to access admin routes, redirect to dashboard
//       if (user.role !== 'SUPERADMIN' && isAdminRoute) {
//         window.location.href = '/dashboard';
//         return;
//       }
//     }
//   }, [isAuthenticated, user, pathname, isError]);

//   return <>{children}</>;
// }

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   const pathname = usePathname();
//   const isAuthPage = pathname.startsWith('/auth');

//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         <Providers>
//           <AppInitializer>
//             {isAuthPage ? (
//               children
//             ) : (
//               <PrivateRoute>
//                 <div className="flex h-screen bg-muted/40">
//                   <Sidebar />
//                   <div className="flex flex-1 flex-col">
//                     <Header />
//                     <main className="flex-1 overflow-y-auto p-6">
//                       {children}
//                     </main>
//                   </div>
//                 </div>
//               </PrivateRoute>
//             )}
//           </AppInitializer>
//         </Providers>
//       </body>
//     </html>
//   );
// }


'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import PrivateRoute from '@/components/auth/private-route';
import Header from '@/components/layout/header'; // Updated header component
import { AppSidebar } from '@/components/layout/sidebar'; // New sidebar component
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useGetApplications } from '@/hooks/use-application';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useApplicationsStore, type Application } from "@/store/applications"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const { currentApplication, setCurrentApplication, setApplications } = useApplicationsStore()
  const { data, isSuccess, isError } = useGetApplications();
  const pathname = usePathname();

  useEffect(() => {
    if (isSuccess && data) {
      const apps = data.data.applications;
      setApplications(apps);
      if (apps.length > 0 && !currentApplication) {
        setCurrentApplication(apps[0]);
      }
    }
  }, [isSuccess, data, setApplications, setCurrentApplication, currentApplication]);

  // Handle role-based access control
  useEffect(() => {
    if (isAuthenticated && user && !isError) {
      const isAdminRoute = pathname.startsWith('/admin');
      const isUserRoute = !pathname.startsWith('/admin') && !pathname.startsWith('/auth');
      
      // If regular user tries to access admin routes, redirect to dashboard
      if (user.role !== 'SUPERADMIN' && isAdminRoute) {
        window.location.href = '/dashboard';
        return;
      }
    }
  }, [isAuthenticated, user, pathname, isError]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AppInitializer>
            {isAuthPage ? (
              children
            ) : (
              <PrivateRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <Header />
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                      <main className="flex-1">
                        {children}
                      </main>
                    </div>
                  </SidebarInset>
                </SidebarProvider>
              </PrivateRoute>
            )}
          </AppInitializer>
        </Providers>
      </body>
    </html>
  );
}