'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Home, PanelLeft, Settings, Code, AppWindow, Send, LayoutTemplate, Mail, Shield, Users, LineChart, HeartPulse, Cpu, Server, BarChart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/analytics', icon: BarChart, label: 'Analytics' },
    { href: '/applications', icon: AppWindow, label: 'Applications' },
    { href: '/campaigns', icon: Send, label: 'Campaigns' },
    { href: '/templates', icon: LayoutTemplate, label: 'Templates' },
    { href: '/send-email', icon: Mail, label: 'Send Email' },
    { href: '/developer/api-keys', icon: Code, label: 'Developer' },
  ];

  const adminNavItems = [
    { href: '/admin/dashboard', icon: Shield, label: 'Admin' },
    { href: '/admin/tenants', icon: Users, label: 'Tenants' },
    { href: '/admin/reporting', icon: LineChart, label: 'Reporting' },
    { href: '/admin/health', icon: HeartPulse, label: 'Health' },
    { href: '/admin/system', icon: Cpu, label: 'System' },
    { href: '/admin/queue', icon: Server, label: 'Queue' },
  ];

  return (
    <TooltipProvider>
      <aside className={`relative flex h-screen flex-col border-r bg-background transition-all ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-between border-b p-4">
          <h1 className={`text-lg font-bold ${isCollapsed ? 'hidden' : 'block'}`}>Luco Email</h1>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <PanelLeft className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                  asChild
                  className={`justify-start ${isCollapsed ? 'w-full' : ''}`}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span className={isCollapsed ? 'hidden' : 'block'}>{item.label}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          ))}

          {user?.role === 'SUPERADMIN' && (
            <>
              <hr className="my-4" />
              <h2 className={`px-4 text-lg font-semibold tracking-tight ${isCollapsed ? 'hidden' : 'block'}`}>
                Admin
              </h2>
              {adminNavItems.map((item) => (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                      asChild
                      className={`justify-start ${isCollapsed ? 'w-full' : ''}`}
                    >
                      <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span className={isCollapsed ? 'hidden' : 'block'}>{item.label}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              ))}
            </>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pathname.startsWith('/settings') ? 'secondary' : 'ghost'}
                asChild
                className={`justify-start ${isCollapsed ? 'w-full' : ''}`}
              >
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span className={isCollapsed ? 'hidden' : 'block'}>Settings</span>
                </Link>
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
