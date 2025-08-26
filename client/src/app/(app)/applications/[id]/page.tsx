'use client';

import { useGetApplicationById, useUpdateApplication } from '@/hooks/use-application';
import { useGetIdentities, useCreateIdentity, useDeleteIdentity, useVerifyIdentity } from '@/hooks/use-identity';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

export default function ApplicationDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: appData, isLoading: appIsLoading, isError: appIsError, error: appError } = useGetApplicationById(id);
  const { mutate: updateApplication, isPending: isUpdating } = useUpdateApplication();

  const { data: identitiesData, isLoading: identitiesIsLoading, isError: identitiesIsError, error: identitiesError } = useGetIdentities(id);
  const { mutate: createIdentity, isPending: isCreating } = useCreateIdentity();
  const { mutate: deleteIdentity } = useDeleteIdentity();
  const { mutate: verifyIdentity } = useVerifyIdentity();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [identityType, setIdentityType] = useState('EMAIL');
  const [identityValue, setIdentityValue] = useState('');

  useEffect(() => {
    if (appData) {
      setName(appData.data.application.name);
      setDescription(appData.data.application.description || '');
    }
  }, [appData]);

  const handleUpdate = () => {
    updateApplication({ id, data: { name, description } });
  };

  const handleCreateIdentity = () => {
    createIdentity({ applicationId: id, type: identityType, value: identityValue });
  };

  const handleDeleteIdentity = (identityId: string) => {
    deleteIdentity({ id: identityId, applicationId: id });
  };

  if (appIsLoading || identitiesIsLoading) return <div>Loading...</div>;
  if (appIsError) return <div>Error: {appError.message}</div>;
  if (identitiesIsError) return <div>Error: {identitiesError.message}</div>;

  const { application } = appData.data;
  const { identities } = identitiesData.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{application.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>Update your application's details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identities</CardTitle>
          <CardDescription>Manage your sending identities for this application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={identityType} onValueChange={setIdentityType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="DOMAIN">Domain</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Enter value" value={identityValue} onChange={(e) => setIdentityValue(e.target.value)} />
            <Button onClick={handleCreateIdentity} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Identity'}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {identities.map((identity: any) => (
                <TableRow key={identity.id}>
                  <TableCell>{identity.value}</TableCell>
                  <TableCell>{identity.type}</TableCell>
                  <TableCell>{identity.status}</TableCell>
                  <TableCell className="space-x-2">
                    {identity.status !== 'VERIFIED' && <Button size="sm" onClick={() => verifyIdentity(identity.id)}>Verify</Button>}
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteIdentity(identity.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
