'use client';

import { useState } from 'react';
import { useGetTopPerformingContent } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TrendingUp, Mail, Eye, MousePointer } from 'lucide-react';

export default function TopContentPage() {
  const [period, setPeriod] = useState('30d');
  const [contentType, setContentType] = useState('');
  const { data, isLoading, isError, error } = useGetTopPerformingContent(period, 10, contentType);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { topTemplates, topSubjects, topCampaigns, insights, trends } = data.data;

  const getPerformanceColor = (rate: number, type: 'open' | 'click' | 'delivery') => {
    const thresholds = {
      open: { good: 25, warning: 15 },
      click: { good: 3, warning: 1.5 },
      delivery: { good: 95, warning: 90 }
    };
    
    const threshold = thresholds[type];
    if (rate >= threshold.good) return 'text-green-600';
    if (rate >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rate: number, type: 'open' | 'click' | 'delivery') => {
    const thresholds = {
      open: { good: 25, warning: 15 },
      click: { good: 3, warning: 1.5 },
      delivery: { good: 95, warning: 90 }
    };
    
    const threshold = thresholds[type];
    if (rate >= threshold.good) return 'default';
    if (rate >= threshold.warning) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Top Performing Content</h1>
        <div className="flex space-x-2">
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="campaign">Campaigns</SelectItem>
              <SelectItem value="subject">Subjects</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Key Insights */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.bestOpenRate}%</div>
            <p className="text-xs text-muted-foreground">
              {insights.bestOpenRateTemplate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.bestClickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {insights.bestClickRateTemplate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.mostUsedCount}</div>
            <p className="text-xs text-muted-foreground">
              {insights.mostUsedTemplate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending Up</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{insights.trendingGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              {insights.trendingTemplate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <BarChart data={trends}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="openRate" fill="var(--color-primary)" radius={4} name="Open Rate" />
              <Bar dataKey="clickRate" fill="var(--color-secondary)" radius={4} name="Click Rate" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Usage Count</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Delivery Rate</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topTemplates.map((template: any) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.usageCount.toLocaleString()}</TableCell>
                  <TableCell className={getPerformanceColor(template.openRate, 'open')}>
                    {template.openRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className={getPerformanceColor(template.clickRate, 'click')}>
                    {template.clickRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className={getPerformanceColor(template.deliveryRate, 'delivery')}>
                    {template.deliveryRate.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPerformanceBadge(template.overallScore, 'open')}>
                      {template.overallScore}/100
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Subject Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Top Subject Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSubjects.map((subject: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{subject.text}</div>
                    <div className="text-xs text-muted-foreground">
                      Used {subject.count} times
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getPerformanceColor(subject.openRate, 'open')}`}>
                      {subject.openRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">open rate</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.emailsSent.toLocaleString()} emails sent
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={getPerformanceBadge(campaign.openRate, 'open')} className="text-xs">
                      {campaign.openRate.toFixed(1)}% open
                    </Badge>
                    <Badge variant={getPerformanceBadge(campaign.clickRate, 'click')} className="text-xs">
                      {campaign.clickRate.toFixed(1)}% click
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
