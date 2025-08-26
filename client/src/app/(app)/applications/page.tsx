'use client';

import { useState } from 'react';
import { useGetApplications, useCreateApplication, useDeleteApplication } from '@/hooks/use-application';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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
import Link from 'next/link';

export default function ApplicationsPage() {
  const { data, isLoading, isError, error } = useGetApplications();
  const { mutate: createApplication, isPending } = useCreateApplication();
  const { mutate: deleteApplication } = useDeleteApplication();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateApplication = () => {
    createApplication({ name, description }, {
      onSuccess: () => {
        setOpen(false);
        setName('');
        setDescription('');
      },
    });
  };

  const handleDeleteApplication = (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      deleteApplication(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { applications } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Applications</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Application</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Application</DialogTitle>
              <DialogDescription>
                Create a new application to start sending emails.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={handleCreateApplication} disabled={isPending}>
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
            <TableHead>Identities</TableHead>
            <TableHead>Templates</TableHead>
            <TableHead>Emails Sent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app: any) => (
            <TableRow key={app.id}>
              <TableCell>
                <Link href={`/applications/${app.id}`} className="font-medium text-primary hover:underline">
                  {app.name}
                </Link>
              </TableCell>
              <TableCell>{app._count.identities}</TableCell>
              <TableCell>{app._count.templates}</TableCell>
              <TableCell>{app._count.emailLogs}</TableCell>
              <TableCell>{app.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteApplication(app.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
