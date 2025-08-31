"use client"

import * as React from "react"
import {
  Home,
  BarChart,
  AppWindow,
  Send,
  LayoutTemplate,
  Mail,
  Code,
  Shield,
  Users,
  LineChart,
  HeartPulse,
  Cpu,
  Server,
  Settings,
  Building2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ApplicationSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from '@/store/auth'
import { useApplicationsStore } from '@/store/applications'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, tenant } = useAuthStore()
  const { applications, currentApplication } = useApplicationsStore()

  // Regular user navigation items
  const userNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart,
    },
    {
      title: "Applications",
      url: "/applications",
      icon: AppWindow,
    },
    {
      title: "Campaigns",
      url: "/campaigns",
      icon: Send,
    },
    {
      title: "Templates",
      url: "/templates", 
      icon: LayoutTemplate,
    },
    {
      title: "Send Email",
      url: "/send-email",
      icon: Mail,
    },
    {
      title: "Developer",
      url: "/developer",
      icon: Code,
      items: [
        {
          title: "API Keys",
          url: "/developer/api-keys",
        },
        {
          title: "Documentation",
          url: "/developer/docs",
        },
        {
          title: "Webhooks",
          url: "/developer/webhooks",
        },
      ],
    },
  ]

  // Admin navigation items
  const adminNavItems = [
    {
      title: "Admin Dashboard",
      url: "/admin/dashboard",
      icon: Shield,
      isActive: true,
    },
    {
      title: "Tenants",
      url: "/admin/tenants",
      icon: Users,
    },
    {
      title: "Reporting",
      url: "/admin/reporting",
      icon: LineChart,
    },
    {
      title: "System",
      url: "/admin/system",
      icon: Cpu,
      items: [
        {
          title: "Health",
          url: "/admin/health",
        },
        {
          title: "Queue",
          url: "/admin/queue",
        },
        {
          title: "Logs",
          url: "/admin/logs",
        },
      ],
    },
  ]

  // Settings for all users
  const settingsNavItems = [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "Profile",
          url: "/settings/profile",
        },
        {
          title: "Preferences", 
          url: "/settings/preferences",
        },
        {
          title: "Security",
          url: "/settings/security",
        },
      ],
    },
  ]

  // Determine navigation structure based on user role
  const getNavigationData = () => {
    const baseData = {
      user: {
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '',
        email: user?.email || '',
        avatar: user?.profilePicture || '/placeholder-avatar.jpg',
      },
      teams: applications.map((app) => ({
        name: app.name,
        logo: Building2,
        plan: tenant?.subscriptionPlan || 'Free',
      })),
    }

    if (user?.role === 'SUPERADMIN') {
      return {
        ...baseData,
        navSections: [
          {
            title: "Admin",
            items: adminNavItems,
          },
          // {
          //   title: "User Dashboard", 
          //   items: userNavItems,
          // },
          {
            title: "Configuration",
            items: settingsNavItems,
          },
        ],
      }
    } else {
      return {
        ...baseData,
        navSections: [
          {
            title: "Platform",
            items: userNavItems,
          },
          {
            title: "Configuration",
            items: settingsNavItems,
          },
        ],
      }
    }
  }

  const data = getNavigationData()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ApplicationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {data.navSections.map((section, index) => (
          <NavMain key={index} items={section.items} title={section.title} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}