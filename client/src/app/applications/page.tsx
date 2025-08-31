'use client';

import * as React from "react";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Settings, 
  Trash2, 
  Eye, 
  Users, 
  Mail, 
  FileText, 
  Activity,
  Calendar,
  User,
  AlertTriangle,
  Loader2
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  useGetApplications, 
  useCreateApplication, 
  useDeleteApplication,
  type Application 
} from '@/hooks/use-applications';

// Loading Skeleton Component
const ApplicationsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="flex items-center space-x-2">
      <Skeleton className="h-10 flex-1 max-w-sm" />
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto mt-1" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto mt-1" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-10 mx-auto mt-1" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Create Application Dialog Component
const CreateApplicationDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const createApplication = useCreateApplication();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      await createApplication.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      
      // Reset form and close dialog
      setName('');
      setDescription('');
      setOpen(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Application</DialogTitle>
          <DialogDescription>
            Create a new application to organize your email campaigns and templates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Application Name</Label>
            <Input
              id="name"
              placeholder="Enter application name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter application description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
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
  );
};

// Application Card Component
const ApplicationCard = ({ application }: { application: Application }) => {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteApplication = useDeleteApplication();

  const handleCardClick = () => {
    router.push(`/applications/${application.id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteApplication.mutateAsync(application.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <Card 
        className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] border-2 hover:border-primary/30"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {application.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={application.isActive ? 'default' : 'secondary'}>
                  {application.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/applications/${application.id}`);
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {application.description && (
            <CardDescription className="line-clamp-2">
              {application.description}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-lg font-semibold">{application._count.identities}</span>
              </div>
              <p className="text-xs text-muted-foreground">Identities</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <FileText className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-lg font-semibold">{application._count.templates}</span>
              </div>
              <p className="text-xs text-muted-foreground">Templates</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Mail className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-lg font-semibold">{application._count.emailLogs}</span>
              </div>
              <p className="text-xs text-muted-foreground">Emails</p>
            </div>
          </div>

          {/* Owner Info */}
          <div className="flex items-center justify-between text-sm">
            {/* <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {application.user.firstName} {application.user.lastName}
              </span>
            </div> */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">{formatDate(application.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the application
              "{application.name}" and all associated data including templates and email logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteApplication.isPending}
            >
              {deleteApplication.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Empty State Component
const EmptyState = () => (
  <Card className="col-span-full">
    <CardContent className="flex flex-col items-center justify-center py-16">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Activity className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No applications found</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Get started by creating your first application. Applications help you organize
        your email campaigns, templates, and identities.
      </p>
      <CreateApplicationDialog />
    </CardContent>
  </Card>
);

// Main Applications Page Component
export default function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { 
    data: applicationsData, 
    isLoading, 
    isError, 
    error 
  } = useGetApplications(page, 10, debouncedSearch || undefined);

  // Loading state
  if (isLoading) {
    return <ApplicationsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">
              Manage your email applications and campaigns
            </p>
          </div>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load applications. Please try refreshing the page.
            {error instanceof Error && `: ${error.message}`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const applications = applicationsData?.data?.applications || [];
  const pagination = applicationsData?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">
            Manage your email applications and campaigns
          </p>
        </div>
        <CreateApplicationDialog />
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Applications Grid */}
      {applications.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}