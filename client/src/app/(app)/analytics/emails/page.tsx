'use client';

import { useState } from 'react';
import { useGetEmailAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EmailAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, error } = useGetEmailAnalytics(period);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { summary, timeSeries, topTemplates, issueAnalysis } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Email Analytics</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="text-sm font-medium text-muted-foreground">{status.toUpperCase()}</div>
                <div className="text-3xl font-bold">{count as number}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <LineChart data={timeSeries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="count" stroke="var(--color-primary)" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {topTemplates.map((template: any) => (
                <li key={template.id} className="mb-2 flex justify-between">
                  <span>{template.name}</span>
                  <span>{template.totalSent} sent</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Issue Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold">Bounce Reasons</h3>
            <ul>
              {issueAnalysis.bounceReasons.map((reason: any) => (
                <li key={reason.reason} className="mb-1 flex justify-between">
                  <span>{reason.reason}</span>
                  <span>{reason.count}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 font-semibold">Complaint Reasons</h3>
            <ul>
              {issueAnalysis.complaintReasons.map((reason: any) => (
                <li key={reason.reason} className="mb-1 flex justify-between">
                  <span>{reason.reason}</span>
                  <span>{reason.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
