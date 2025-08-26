'use client';

import { useParams } from 'next/navigation';
import { useGetCampaignById, useGetCampaignAnalytics, useSendCampaign, useCancelCampaign } from '@/hooks/use-campaign';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CampaignDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: campaignData, isLoading: campaignIsLoading, isError: campaignIsError, error: campaignError } = useGetCampaignById(id);
  const { data: analyticsData, isLoading: analyticsIsLoading, isError: analyticsIsError, error: analyticsError } = useGetCampaignAnalytics(id);
  const { mutate: sendCampaign, isPending: isSending } = useSendCampaign();
  const { mutate: cancelCampaign, isPending: isCanceling } = useCancelCampaign();

  if (campaignIsLoading || analyticsIsLoading) return <div>Loading...</div>;
  if (campaignIsError) return <div>Error: {campaignError.message}</div>;
  if (analyticsIsError) return <div>Error: {analyticsError.message}</div>;

  const { campaign } = campaignData.data;
  const { stats } = analyticsData.data;

  const handleSendCampaign = () => {
    sendCampaign(id);
  };

  const handleCancelCampaign = () => {
    cancelCampaign(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <div className="space-x-2">
          {['DRAFT', 'SCHEDULED'].includes(campaign.status) && (
            <Button onClick={handleSendCampaign} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          )}
          {['SCHEDULED', 'SENDING'].includes(campaign.status) && (
            <Button variant="outline" onClick={handleCancelCampaign} disabled={isCanceling}>
              {isCanceling ? 'Canceling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.status}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign._count.recipients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.delivered} ({stats.rates.delivery}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.opened} ({stats.rates.open}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clicked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.clicked} ({stats.rates.click}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bounced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.bounced} ({stats.rates.bounce}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Complained</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.complained} ({stats.rates.complaint}%)</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
