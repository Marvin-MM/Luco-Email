"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, Plus, Activity, Loader2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { useApplicationsStore, type Application } from "@/store/applications"
import { useGetApplications, useCreateApplication } from "@/hooks/use-applications"

// Application Switcher Loading Component
const ApplicationSwitcherSkeleton = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg">
        <Skeleton className="size-8 rounded-lg" />
        <div className="grid flex-1 gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-4 ml-auto" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
)

// Create Application Dialog Component
const CreateApplicationDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: (application: Application) => void;
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  
  const createApplication = useCreateApplication()

  const handleSubmit = async () => {
    if (!name.trim()) return
  
    try {
      const result = await createApplication.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      
      // Reset form and close dialog
      setName('')
      setDescription('')
      onOpenChange(false)
      
      // Call success callback with the created application
      if (result?.data?.application) { // ← FIXED: Access result.data.application
        onSuccess(result.data.application)
      }
    } catch (error) {
      // Error is handled in the mutation
    }
  }

  const handleClose = () => {
    if (!createApplication.isPending) {
      setName('')
      setDescription('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Application</DialogTitle>
          <DialogDescription>
            Create a new application to organize your email campaigns and templates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-app-name">Application Name</Label>
            <Input
              id="create-app-name"
              placeholder="Enter application name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={createApplication.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-app-description">Description (Optional)</Label>
            <Textarea
              id="create-app-description"
              placeholder="Enter application description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={createApplication.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createApplication.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createApplication.isPending || !name.trim()}
          >
            {createApplication.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ApplicationSwitcher() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { currentApplication, setCurrentApplication, setApplications, addApplication } = useApplicationsStore()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  // Fetch applications only if user is authenticated
  const { 
    data: applicationsData, 
    isLoading,
    isError 
  } = useGetApplications(1, 50)

  // Update applications store when data is fetched
  React.useEffect(() => {
    if (applicationsData?.data?.applications) {
      setApplications(applicationsData.data.applications)
    }
  }, [applicationsData?.data?.applications, setApplications])

  // Find current application or use first available - MOVED BEFORE CONDITIONAL RETURNS
  const activeApplication = React.useMemo(() => {
    const applications = applicationsData?.data?.applications || [];
    if (currentApplication && applications.some(app => app.id === currentApplication.id)) {
      return currentApplication
    }
    return applications[0] || null
  }, [currentApplication, applicationsData?.data?.applications])

  // Loading state - MOVED AFTER ALL HOOKS
  if (isLoading) {
    return <ApplicationSwitcherSkeleton />
  }

  const applications = applicationsData?.data?.applications || []

  const handleApplicationSelect = (application: Application) => {
    setCurrentApplication(application)
    router.push(`/applications/${application.id}`)
  }

  const handleCreateSuccess = (newApplication: Application) => {
    addApplication(newApplication)
    setCurrentApplication(newApplication)
    router.push(`/applications/${newApplication.id}`)
  }

  // Error state
  if (isError) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Activity className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Luco Email</span>
              <span className="truncate text-xs text-red-500">Error loading</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // No applications state
  if (!activeApplication) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg"
              onClick={() => setCreateDialogOpen(true)}
              className="cursor-pointer"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Plus className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Create Application</span>
                <span className="truncate text-xs">Get started</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <CreateApplicationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Activity className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeApplication.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs">
                      {activeApplication._count?.emailLogs || 0} emails
                    </span>
                    <Badge 
                      variant={activeApplication.isActive ? "default" : "secondary"}
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {activeApplication.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Applications
              </DropdownMenuLabel>
              {applications.map((application, index) => (
                <DropdownMenuItem
                  key={application.id}
                  onClick={() => handleApplicationSelect(application)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Activity className="size-3.5 shrink-0" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{application.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {application._count?.emailLogs || 0} emails • {application._count?.templates || 0} templates
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      variant={application.isActive ? "default" : "secondary"}
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {application.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 p-2"
                onClick={() => setCreateDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">Add application</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateApplicationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  )
}