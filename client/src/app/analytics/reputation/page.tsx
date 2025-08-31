'use client';

import { useState } from 'react';
import { useGetReputationReport } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, Bar, BarChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ReputationPage() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, error } = useGetReputationReport(period);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { overview, domainHealth, ipReputation, trends, recommendations } = data.data;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'good':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'moderate':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'good':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reputation Report</h1>
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

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Reputation</CardTitle>
            {getStatusIcon(overview.overallStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.reputationScore}/100</div>
            <Badge className={getStatusColor(overview.overallStatus)}>
              {overview.overallStatus}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            {getStatusIcon(overview.deliveryStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.deliveryTrend > 0 ? '+' : ''}{overview.deliveryTrend}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            {getStatusIcon(overview.bounceStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.bounceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.bounceTrend > 0 ? '+' : ''}{overview.bounceTrend}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaint Rate</CardTitle>
            {getStatusIcon(overview.complaintStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.complaintRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.complaintTrend > 0 ? '+' : ''}{overview.complaintTrend}% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reputation Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Reputation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <LineChart data={trends}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="reputationScore" stroke="var(--color-primary)" name="Reputation Score" />
              <Line type="monotone" dataKey="deliveryRate" stroke="var(--color-secondary)" name="Delivery Rate" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Domain Health */}
        <Card>
          <CardHeader>
            <CardTitle>Domain Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainHealth.map((domain: any) => (
              <div key={domain.domain} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{domain.domain}</div>
                  <div className="text-sm text-muted-foreground">
                    SPF: {domain.spf ? '✓' : '✗'} | DKIM: {domain.dkim ? '✓' : '✗'} | DMARC: {domain.dmarc ? '✓' : '✗'}
                  </div>
                </div>
                <Badge className={getStatusColor(domain.status)}>
                  {domain.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* IP Reputation */}
        <Card>
          <CardHeader>
            <CardTitle>IP Reputation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ipReputation.map((ip: any) => (
              <div key={ip.ipAddress} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ip.ipAddress}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {ip.score}/100
                  </div>
                </div>
                <Badge className={getStatusColor(ip.status)}>
                  {ip.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-1 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-100' : 
                  rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {rec.priority === 'high' ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : rec.priority === 'medium' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{rec.title}</div>
                  <div className="text-sm text-muted-foreground">{rec.description}</div>
                  {rec.action && (
                    <div className="text-sm text-primary mt-1">{rec.action}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
