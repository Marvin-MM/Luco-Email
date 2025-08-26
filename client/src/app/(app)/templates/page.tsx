'use client';

import { useGetTemplates, useDeleteTemplate, usePreviewTemplate, useCloneTemplate } from '@/hooks/use-template';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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
import { useState } from 'react';
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
  const { mutate: deleteTemplate } = useDeleteTemplate(currentApplication?.id || '');
  const { mutate: previewTemplate, data: previewData } = usePreviewTemplate();
  const { mutate: cloneTemplate, isPending: isCloning } = useCloneTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const handlePreview = (templateId: string) => {
    previewTemplate({ id: templateId, variables: {} });
    setPreviewDialogOpen(true);
  };

  const handleClone = () => {
    if (!selectedTemplate) return;
    cloneTemplate({ id: selectedTemplate.id, name: newTemplateName }, {
      onSuccess: () => {
        setCloneDialogOpen(false);
        setNewTemplateName('');
      },
    });
  };

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
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => handlePreview(template.id)}>Preview</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelectedTemplate(template); setCloneDialogOpen(true); }}>Clone</Button>
                <Button asChild size="sm">
                  <Link href={`/templates/${template.id}/edit`}>Edit</Link>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: previewData?.data.preview.htmlContent || '' }} />
        </DialogContent>
      </Dialog>

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                New Name
              </Label>
              <Input id="name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCloneDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleClone} disabled={isCloning}>
              {isCloning ? 'Cloning...' : 'Clone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
