'use client';

import { useGetCampaigns } from '@/hooks/use-campaign';
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

export default function CampaignsPage() {
  const { data, isLoading, isError, error } = useGetCampaigns();

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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
