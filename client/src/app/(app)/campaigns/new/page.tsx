'use client';

import { useState } from 'react';
import { useCreateCampaign } from '@/hooks/use-campaign';
import { useGetTemplates } from '@/hooks/use-template';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const { currentApplication } = useAuthStore();
  const { data: templatesData } = useGetTemplates(currentApplication?.id || '');
  const { mutate: createCampaign, isPending } = useCreateCampaign();
  const router = useRouter();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState('');
  const [templateId, setTemplateId] = useState('');

  const handleCreateCampaign = () => {
    if (!currentApplication) return;

    const recipientList = recipients.split(',').map(email => email.trim());

    createCampaign({
      applicationId: currentApplication.id,
      name,
      subject,
      recipients: recipientList,
      templateId,
      identityId: 'cuid_from_somewhere', // This needs to be selected by the user
    }, {
      onSuccess: () => {
        router.push('/campaigns');
      },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create Campaign</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Template</Label>
          <Select onValueChange={setTemplateId}>
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
          <Label htmlFor="recipients">Recipients (comma-separated)</Label>
          <Textarea id="recipients" value={recipients} onChange={(e) => setRecipients(e.target.value)} />
        </div>
        <Button onClick={handleCreateCampaign} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Campaign'}
        </Button>
      </div>
    </div>
  );
}
