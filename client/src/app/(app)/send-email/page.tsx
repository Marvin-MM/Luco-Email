'use client';

import { useState } from 'react';
import { useSendEmail } from '@/hooks/use-email';
import { useGetTemplates } from '@/hooks/use-template';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TiptapEditor from '@/components/tiptap-editor';

export default function SendEmailPage() {
  const { currentApplication } = useAuthStore();
  const { data: templatesData } = useGetTemplates(currentApplication?.id || '');
  const { mutate: sendEmail, isPending } = useSendEmail();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleTemplateChange = (templateId: string) => {
    const template = templatesData?.data.templates.find((t: any) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSubject(template.subject);
      setHtmlContent(template.htmlContent);
    }
  };

  const handleSendEmail = () => {
    const recipients = to.split(',').map(email => email.trim());
    sendEmail({
      to: recipients,
      subject,
      html: htmlContent,
      templateId: selectedTemplate?.id,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Send Email</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="to">Recipients (comma-separated)</Label>
          <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Template</Label>
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templatesData?.data.templates.map((template: any) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Body</Label>
          <TiptapEditor content={htmlContent} onChange={setHtmlContent} />
        </div>
        <Button onClick={handleSendEmail} disabled={isPending}>
          {isPending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
}
