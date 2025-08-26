'use client';

import { useState, useEffect } from 'react';
import { useGetApiKeys, useCreateApiKey, useDeleteApiKey, useUpdateApiKey } from '@/hooks/use-api-key';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

export default function ApiKeysPage() {
  const { data, isLoading, isError, error } = useGetApiKeys();
  const { mutate: createApiKey, isPending: isCreating } = useCreateApiKey();
  const { mutate: deleteApiKey } = useDeleteApiKey();
  const { mutate: updateApiKey, isPending: isUpdating } = useUpdateApiKey();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [newKeyData, setNewKeyData] = useState<{ apiKey: string, keyInfo: any } | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (selectedKey) {
      setName(selectedKey.name);
    }
  }, [selectedKey]);

  const handleCreateApiKey = () => {
    createApiKey({ name }, {
      onSuccess: (data) => {
        setNewKeyData(data.data);
        setCreateDialogOpen(false);
        setName('');
      },
    });
  };

  const handleDeleteApiKey = (id: string) => {
    deleteApiKey(id);
  };

  const handleUpdateApiKey = () => {
    if (!selectedKey) return;
    updateApiKey({ id: selectedKey.id, data: { name } }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setSelectedKey(null);
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { apiKeys } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Enter a name for your new API key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreateDialogOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={handleCreateApiKey} disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key Prefix</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key: any) => (
            <TableRow key={key.id}>
              <TableCell>{key.name}</TableCell>
              <TableCell>{key.keyPrefix}</TableCell>
              <TableCell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</TableCell>
              <TableCell>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : 'Never'}</TableCell>
              <TableCell>{key.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell className="space-x-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/developer/api-keys/${key.id}/usage`}>Usage</Link>
                </Button>
                <Button size="sm" onClick={() => { setSelectedKey(key); setEditDialogOpen(true); }}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteApiKey(key.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleUpdateApiKey} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newKeyData && (
        <Dialog open={!!newKeyData} onOpenChange={() => setNewKeyData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Your new API key has been created. Please copy it now. You will not be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted rounded-md">
              <code>{newKeyData.apiKey}</code>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewKeyData(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
