'use client';

import { useGetCampaigns, useDeleteCampaign } from '@/hooks/use-campaign';
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
import Link from 'next/link';

export default function CampaignsPage() {
  const { data, isLoading, isError, error } = useGetCampaigns();
  const { mutate: deleteCampaign } = useDeleteCampaign();

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { campaigns } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button asChild>
          <Link href="/campaigns/new">Create Campaign</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign: any) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <Link href={`/campaigns/${campaign.id}`} className="font-medium text-primary hover:underline">
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>{campaign.application.name}</TableCell>
              <TableCell>{campaign._count.recipients}</TableCell>
              <TableCell>{campaign.status}</TableCell>
              <TableCell>{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'Not sent'}</TableCell>
              <TableCell>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
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
