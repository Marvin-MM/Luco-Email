'use client';

import { useState } from 'react';
import { useGetSystemMetrics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, Bar, BarChart, Area, AreaChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Database, Server, Zap } from 'lucide-react';

export default function SystemMetricsPage() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, error } = useGetSystemMetrics(period);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { overview, performance, resources, apiUsage, errorRates, uptime } = data.data;

  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return { status: 'good', color: 'text-green-600' };
    if (value >= thresholds.warning) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'critical', color: 'text-red-600' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Metrics</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.uptimeDays} days continuous
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgResponseTime}ms</div>
            <p className={`text-xs ${getHealthStatus(overview.avgResponseTime, { good: 200, warning: 500 }).color}`}>
              {overview.responseTimeTrend > 0 ? '+' : ''}{overview.responseTimeTrend}ms from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.errorRate}%</div>
            <p className={`text-xs ${overview.errorRate < 1 ? 'text-green-600' : overview.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overview.errorTrend > 0 ? '+' : ''}{overview.errorTrend}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.dbHealth}%</div>
            <Badge variant={overview.dbHealth > 95 ? 'default' : overview.dbHealth > 85 ? 'secondary' : 'destructive'}>
              {overview.dbHealth > 95 ? 'Healthy' : overview.dbHealth > 85 ? 'Warning' : 'Critical'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <LineChart data={performance.responseTime}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="avg" stroke="var(--color-primary)" name="Average" />
                <Line type="monotone" dataKey="p95" stroke="var(--color-secondary)" name="95th Percentile" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Rate Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={errorRates}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="rate" stroke="var(--color-destructive)" fill="var(--color-destructive)" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{resources.cpu.current}%</span>
              </div>
              <Progress value={resources.cpu.current} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Peak: {resources.cpu.peak}% | Avg: {resources.cpu.average}%
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{resources.memory.current}%</span>
              </div>
              <Progress value={resources.memory.current} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Used: {resources.memory.used}GB / {resources.memory.total}GB
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disk Usage</span>
                <span>{resources.disk.current}%</span>
              </div>
              <Progress value={resources.disk.current} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Used: {resources.disk.used}GB / {resources.disk.total}GB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Endpoint Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={apiUsage.endpoints}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="endpoint" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="requests" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={apiUsage.volume}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="requests" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Uptime Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Uptime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {uptime.services.map((service: any) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground">{service.uptime}% uptime</div>
                </div>
                <Badge variant={service.status === 'healthy' ? 'default' : service.status === 'degraded' ? 'secondary' : 'destructive'}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
