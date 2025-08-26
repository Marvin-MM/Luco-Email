'use client';

import { useGetTemplates } from '@/hooks/use-template';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

export default function TemplatesPage() {
  const { currentApplication } = useAuthStore();
  const { data, isLoading, isError, error } = useGetTemplates(currentApplication?.id || '');

  if (!currentApplication) {
    return <div>Please select an application first.</div>;
  }

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { templates } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Templates</h1>
        <Button asChild>
          <Link href="/templates/new">Create Template</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template: any) => (
            <TableRow key={template.id}>
              <TableCell>
                <Link href={`/templates/${template.id}`} className="font-medium text-primary hover:underline">
                  {template.name}
                </Link>
              </TableCell>
              <TableCell>{template.subject}</TableCell>
              <TableCell>{template.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell>{new Date(template.updatedAt).toLocaleString()}</TableCell>
              <TableCell>
                <Button asChild size="sm">
                  <Link href={`/templates/${template.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
