'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  useGetApplicationById, 
  useGetApplicationStats,
  useUpdateApplication, 
  useDeleteApplication,
  useCreateIdentity,
  useDeleteIdentity,
  useGetIdentityById,
  useGetIdentityVerifyStatus 
} from '@/hooks/use-applications';
import { useApplicationsStore } from '@/store/applications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Trash2, 
  Plus, 
  Eye, 
  Mail, 
  Globe, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  // Hooks
  const { 
    data: appData, 
    isLoading: appIsLoading, 
    isError: appIsError, 
    error: appError 
  } = useGetApplicationById(id);
  
  const { 
    data: statsData, 
    isLoading: statsIsLoading 
  } = useGetApplicationStats(id);
  
  const { mutate: updateApplication, isPending: isUpdating } = useUpdateApplication();
  const { mutate: deleteApplication, isPending: isDeleting } = useDeleteApplication();
  const { mutate: createIdentity, isPending: isCreatingIdentity } = useCreateIdentity();
  const { mutate: deleteIdentity, isPending: isDeletingIdentity } = useDeleteIdentity();
  
  // Store
  const {
    selectedIdentity,
    isIdentityModalOpen,
    isCreateIdentityModalOpen,
    isDeleteConfirmOpen,
    setSelectedIdentity,
    setIsIdentityModalOpen,
    setIsCreateIdentityModalOpen,
    setIsDeleteConfirmOpen,
    removeApplication
  } = useApplicationsStore();

  // State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [identityType, setIdentityType] = useState<'EMAIL' | 'DOMAIN'>('EMAIL');
  const [identityValue, setIdentityValue] = useState('');
  const [identityToDelete, setIdentityToDelete] = useState<string | null>(null);
  const [isDeleteAppConfirmOpen, setIsDeleteAppConfirmOpen] = useState(false);

  // Identity details hook - only fetch when modal is open and identity is selected
  const { 
    data: identityData,
    isLoading: identityIsLoading
  } = useGetIdentityById(selectedIdentity?.id || '');

  const { 
    data: verifyStatusData,
    isLoading: verifyStatusIsLoading
  } = useGetIdentityVerifyStatus(selectedIdentity?.id || '');

  useEffect(() => {
    if (appData) {
      const app = appData.data.application;
      setName(app.name);
      setDescription(app.description || '');
    }
  }, [appData]);

  const handleUpdate = () => {
    updateApplication({ 
      id, 
      data: { name, description } 
    });
  };

  const handleDeleteApplication = () => {
    deleteApplication(id, {
      onSuccess: () => {
        // Remove application from store
        removeApplication(id);
        // Redirect to applications list
        router.push('/applications');
        toast.success('Application deleted successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete application');
      }
    });
  };

  const handleCreateIdentity = () => {
    if (!identityValue.trim()) {
      toast.error('Please enter a valid identity value');
      return;
    }

    createIdentity({ 
      applicationId: id, 
      type: identityType, 
      value: identityValue.trim() 
    }, {
      onSuccess: () => {
        setIdentityValue('');
        setIsCreateIdentityModalOpen(false);
      }
    });
  };

  const handleDeleteIdentity = (identityId: string) => {
    deleteIdentity(identityId, {
      onSuccess: () => {
        setIsDeleteConfirmOpen(false);
        setIdentityToDelete(null);
      }
    });
  };

  const handleViewIdentity = (identity: any) => {
    setSelectedIdentity(identity);
    setIsIdentityModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (appIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (appIsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error loading application</h3>
          <p className="text-red-700">{appError?.message || 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  const { application } = appData.data;
  const stats = statsData?.data.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{application.name}</h1>
          <p className="text-muted-foreground">
            Created on {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/applications/templates?applicationId=${id}`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Templates
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Logs
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => setIsDeleteAppConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Application
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Emails</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stats.emails.total.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendingUp className="h-3 w-3" />
                  Last {stats.period}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-2 font-medium">
                Sending identities configured
              </div>
              <div className="text-muted-foreground">
                Ready for email delivery
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Templates</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stats.resources.templates}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <FileText className="h-3 w-3" />
                  Available
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-2 font-medium">
                Email templates created
              </div>
              <div className="text-muted-foreground">
                Ready to use templates
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Delivery Rate</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {(stats.rates.delivery * 100).toFixed(1)}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className={stats.rates.delivery > 0.9 ? 'border-green-200 bg-green-50 text-green-800' : 'border-yellow-200 bg-yellow-50 text-yellow-800'}>
                  {stats.rates.delivery > 0.9 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.emails.delivered} delivered
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-2 font-medium">
                Email delivery performance
              </div>
              <div className="text-muted-foreground">
                Successfully delivered emails
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Active Identities</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stats.resources.identities}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <Users className="h-3 w-3" />
                  Verified
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
                Email activity overview
              </div>
              <div className="text-muted-foreground">
                Total emails processed
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Identities Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Identities</CardTitle>
              <CardDescription>Manage sending identities for this application.</CardDescription>
            </div>
            <Button 
              onClick={() => setIsCreateIdentityModalOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Identity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {application.identities && application.identities.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {application.identities.map((identity: any) => (
                    <TableRow key={identity.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {identity.type === 'EMAIL' ? (
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                          {identity.value}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {identity.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(identity.status)}
                          <Badge variant="outline" className={`text-xs ${getStatusColor(identity.status)}`}>
                            {identity.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {identity.verifiedAt ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(identity.verifiedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewIdentity(identity)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIdentityToDelete(identity.id);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No identities yet</h3>
              <p className="text-muted-foreground mb-4">Create your first identity to start sending emails.</p>
              <Button onClick={() => setIsCreateIdentityModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Identity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>Manage your application settings and information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Application Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter application name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <div className="flex items-center gap-2">
                {application.isActive ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Active</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter application description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="font-medium">{new Date(application.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Organization</Label>
              <p className="font-medium">{application.tenant?.organizationName || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Owner</Label>
              <p className="font-medium">{application.user?.firstName} {application.user?.lastName}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            {/* <Button variant="outline">Cancel</Button> */}
          </div>
        </CardContent>
      </Card>

      {/* Create Identity Modal */}
      <Dialog open={isCreateIdentityModalOpen} onOpenChange={setIsCreateIdentityModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Identity</DialogTitle>
            <DialogDescription>
              Add a new email address or domain to send emails from this application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identity-type">Identity Type</Label>
              <Select value={identityType} onValueChange={(value: 'EMAIL' | 'DOMAIN') => setIdentityType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select identity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                  </SelectItem>
                  <SelectItem value="DOMAIN">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Domain
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identity-value">
                {identityType === 'EMAIL' ? 'Email Address' : 'Domain Name'}
              </Label>
              <Input
                id="identity-value"
                value={identityValue}
                onChange={(e) => setIdentityValue(e.target.value)}
                placeholder={identityType === 'EMAIL' ? 'user@example.com' : 'example.com'}
                type={identityType === 'EMAIL' ? 'email' : 'text'}
              />
              {identityType === 'DOMAIN' && (
                <p className="text-xs text-muted-foreground">
                  Make sure you have access to configure DNS records for this domain.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateIdentityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateIdentity}
              disabled={isCreatingIdentity || !identityValue.trim()}
            >
              {isCreatingIdentity ? 'Creating...' : 'Create Identity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Identity Details Modal */}
      <Dialog open={isIdentityModalOpen} onOpenChange={setIsIdentityModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIdentity?.type === 'EMAIL' ? (
                <Mail className="h-5 w-5" />
              ) : (
                <Globe className="h-5 w-5" />
              )}
              {selectedIdentity?.value}
            </DialogTitle>
            <DialogDescription>
              Identity details and verification status
            </DialogDescription>
          </DialogHeader>
          
          {identityIsLoading || verifyStatusIsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedIdentity?.status || '')}
                    <Badge className={getStatusColor(selectedIdentity?.status || '')}>
                      {selectedIdentity?.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant="outline">
                    {selectedIdentity?.type}
                  </Badge>
                </div>
              </div>

              {/* Verification Details */}
              {verifyStatusData && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-medium">Verification Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Verified for Sending</Label>
                      <p className={`font-medium ${verifyStatusData.data.verification.verifiedForSending ? 'text-green-600' : 'text-red-600'}`}>
                        {verifyStatusData.data.verification.verifiedForSending ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">DKIM Status</Label>
                      <p className="font-medium">
                        {verifyStatusData.data.verification.dkimStatus || 'Not configured'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {identityData && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-medium">Technical Information</h4>
                  <div className="space-y-3 text-sm">
                    {identityData.data.identity.spfRecord && (
                      <div>
                        <Label className="text-muted-foreground">SPF Record</Label>
                        <div className="mt-1 p-2 bg-muted rounded-md font-mono text-xs">
                          {identityData.data.identity.spfRecord}
                        </div>
                      </div>
                    )}
                    
                    {identityData.data.identity.dmarcRecord && (
                      <div>
                        <Label className="text-muted-foreground">DMARC Record</Label>
                        <div className="mt-1 p-2 bg-muted rounded-md font-mono text-xs">
                          {identityData.data.identity.dmarcRecord}
                        </div>
                      </div>
                    )}

                    {identityData.data.identity.dkimTokens && identityData.data.identity.dkimTokens.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">DKIM Tokens</Label>
                        <div className="mt-1 space-y-1">
                          {identityData.data.identity.dkimTokens.map((token: string, index: number) => (
                            <div key={index} className="p-2 bg-muted rounded-md font-mono text-xs">
                              {token}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-4">
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {selectedIdentity?.createdAt ? new Date(selectedIdentity.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Verified</Label>
                    <p className="font-medium">
                      {selectedIdentity?.verifiedAt ? new Date(selectedIdentity.verifiedAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsIdentityModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Identity Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this identity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setIdentityToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => identityToDelete && handleDeleteIdentity(identityToDelete)}
              disabled={isDeletingIdentity}
            >
              {isDeletingIdentity ? 'Deleting...' : 'Delete Identity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Application Confirmation Modal */}
      
      <Dialog open={isDeleteAppConfirmOpen} onOpenChange={setIsDeleteAppConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Application</DialogTitle>
            <div className="text-sm text-muted-foreground">
              <p>
                Are you sure you want to delete the application "{application.name}"? 
                This action will permanently delete:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>All associated identities</li>
                <li>All email templates</li>
                <li>All email logs and analytics data</li>
              </ul>
              <p className="mt-2 font-medium text-destructive">This action cannot be undone.</p>
            </div>
          </DialogHeader>
    
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteAppConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApplication}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}