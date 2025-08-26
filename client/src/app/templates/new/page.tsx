'use client';

import { useState } from 'react';
import { useCreateTemplate } from '@/hooks/use-template';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TiptapEditor from '@/components/tiptap-editor';
import { useRouter } from 'next/navigation';

export default function NewTemplatePage() {
  const { currentApplication } = useAuthStore();
  const { mutate: createTemplate, isPending } = useCreateTemplate();
  const router = useRouter();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  const handleCreateTemplate = () => {
    if (!currentApplication) {
      // Handle case where no application is selected
      return;
    }
    createTemplate({
      applicationId: currentApplication.id,
      name,
      subject,
      htmlContent,
    }, {
      onSuccess: () => {
        router.push('/templates');
      },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create Template</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>HTML Content</Label>
          <TiptapEditor content={htmlContent} onChange={setHtmlContent} />
        </div>
        <Button onClick={handleCreateTemplate} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
