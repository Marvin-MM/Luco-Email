'use client'

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

export default function Header() {
  const pathname = usePathname()

  // Generate breadcrumbs from the current path
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = []

    // Add home/dashboard as first item
    if (segments.length > 0) {
      if (segments[0] === 'admin') {
        breadcrumbs.push({
          label: 'Admin Dashboard',
          href: '/admin/dashboard',
          isCurrentPage: segments.length === 2 && segments[1] === 'dashboard'
        })
        
        if (segments.length > 2) {
          breadcrumbs.push({
            label: segments[2].charAt(0).toUpperCase() + segments[2].slice(1),
            href: `/${segments.slice(0, 3).join('/')}`,
            isCurrentPage: segments.length === 3
          })
        }
      } else {
        breadcrumbs.push({
          label: 'Dashboard',
          href: '/dashboard',
          isCurrentPage: segments.length === 1 && segments[0] === 'dashboard'
        })
        
        if (segments.length > 1 && segments[0] !== 'dashboard') {
          breadcrumbs.push({
            label: segments[segments.length - 1].charAt(0).toUpperCase() + 
                   segments[segments.length - 1].slice(1).replace('-', ' '),
            href: pathname,
            isCurrentPage: true
          })
        }
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center gap-2">
                  <BreadcrumbItem className="hidden md:block">
                    {breadcrumb.isCurrentPage ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  )
}