'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetTemplateById, useUpdateTemplate } from '@/hooks/use-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TiptapEditor from '@/components/tiptap-editor';

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useGetTemplateById(id);
  const { mutate: updateTemplate, isPending } = useUpdateTemplate();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (data) {
      const { template } = data.data;
      setName(template.name);
      setSubject(template.subject);
      setHtmlContent(template.htmlContent);
    }
  }, [data]);

  const handleUpdateTemplate = () => {
    updateTemplate({
      id,
      data: {
        name,
        subject,
        htmlContent,
      },
    }, {
      onSuccess: () => {
        router.push('/templates');
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Template</h1>

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
        <Button onClick={handleUpdateTemplate} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
