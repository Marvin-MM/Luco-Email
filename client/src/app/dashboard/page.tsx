'use client';

import * as React from "react";
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Mail, Users, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Target, Send, Archive } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Label } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import { useGetDashboard, useGetUsageStats, useGetReputation, useGetEmailAnalytics } from '@/hooks/use-dashboard';
import { useDashboardStore } from '@/store/dashboard';

const chartConfig = {
  emails: {
    label: "Emails",
    color: "var(--chart-1)",
  },
  delivery: {
    label: "Delivery Rate",
    color: "var(--chart-2)",
  },
  bounce: {
    label: "Bounce Rate",
    color: "var(--chart-3)",
  },
  complaint: {
    label: "Complaint Rate",
    color: "var(--chart-4)",
  },
  count: {
    label: "Count",
    color: "var(--chart-1)",
  },
  sending: {
    label: "Sending",
    color: "var(--chart-2)",
  },
  sent: {
    label: "Sent",
    color: "var(--chart-1)",
  },
  failed: {
    label: "Failed",
    color: "var(--chart-3)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-4)",
  },
  bounced: {
    label: "Bounced",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Loading Skeleton Component
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-48" />
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'number' 
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: any;
  format?: 'number' | 'percentage' | 'currency';
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (format === 'percentage') return `${val}%`;
    if (format === 'currency') return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {isPositive && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
            <span className={isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : ''}>
              {Math.abs(change)}% from last period
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Usage Progress Component
const UsageProgress = ({ current, limit, label }: { current: number; limit: number; label: string }) => {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress 
        value={Math.min(percentage, 100)} 
        className={`h-2 ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : ''}`}
      />
      <div className="text-xs text-muted-foreground">
        {percentage.toFixed(1)}% used
      </div>
    </div>
  );
};

// Reputation Score Component
const ReputationScore = ({ score, riskLevel }: { score: number; riskLevel: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'secondary';
      case 'medium': return 'outline';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</div>
        <div className="text-sm text-muted-foreground">Reputation Score</div>
      </div>
      <Badge variant={getRiskBadgeVariant(riskLevel)}>{riskLevel} Risk</Badge>
    </div>
  );
};

export default function DashboardPage() {
  const { filters, setPeriod } = useDashboardStore();
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>('count');
  const [emailTimeRange, setEmailTimeRange] = useState("30d");

  // Data fetching hooks
  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError } = useGetDashboard(filters.period);
  const { data: usageData, isLoading: isUsageLoading } = useGetUsageStats();
  const { data: reputationData, isLoading: isReputationLoading } = useGetReputation();
  const { data: emailAnalyticsData, isLoading: isEmailAnalyticsLoading } = useGetEmailAnalytics(emailTimeRange);

  // Prepare time series data for email analytics - MOVED BEFORE CONDITIONAL RETURNS
  const emailTimeSeriesData = useMemo(() => {
    if (!emailAnalyticsData?.data?.timeSeries) return [];
    
    const groupedData = emailAnalyticsData.data.timeSeries.reduce((acc: any, item: any) => {
      const date = new Date(item.period).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      if (!acc[date]) {
        acc[date] = { date, period: item.period };
      }
      
      acc[date][item.status.toLowerCase()] = item.count;
      
      return acc;
    }, {});
    
    return Object.values(groupedData).sort((a: any, b: any) => 
      new Date(a.period).getTime() - new Date(b.period).getTime()
    );
  }, [emailAnalyticsData?.data?.timeSeries]);

  // Loading state - MOVED AFTER ALL HOOKS
  if (isDashboardLoading || isUsageLoading || isReputationLoading || isEmailAnalyticsLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (isDashboardError) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const dashboard = dashboardData?.data;
  const usage = usageData?.data;
  const reputation = reputationData?.data;
  const emailAnalytics = emailAnalyticsData?.data;

  // Prepare chart data
  const chartData = dashboard?.dailyVolume?.map((item: any) => ({
    date: item.date,
    count: item.count,
    formattedDate: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  })) || [];

  // Prepare email stats for pie chart
  const emailStatsData = Object.entries(dashboard?.emailStats || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count as number,
    fill: COLORS[Object.keys(dashboard?.emailStats || {}).indexOf(status)],
  }));

  // Performance metrics for area chart
  const performanceData = [
    { name: 'Delivery Rate', value: dashboard?.performance?.deliveryRate || 0, fill: 'var(--chart-2)' },
    { name: 'Bounce Rate', value: dashboard?.performance?.bounceRate || 0, fill: 'var(--chart-3)' },
    { name: 'Complaint Rate', value: dashboard?.performance?.complaintRate || 0, fill: 'var(--chart-4)' },
  ];

  // Prepare Email Analytics Data
  const emailStatusData = emailAnalytics?.summary?.byStatus ? 
    Object.entries(emailAnalytics.summary.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number,
      fill: COLORS[Object.keys(emailAnalytics.summary.byStatus).indexOf(status)],
    })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your email analytics and performance
          </p>
        </div>
        <Select value={filters.period} onValueChange={setPeriod}>
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

      {/* Overview Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Emails Sent"
          value={dashboard?.overview?.totalEmailsSent || 0}
          icon={Mail}
          format="number"
        />
        <MetricCard
          title="Active Applications"
          value={dashboard?.overview?.activeApplications || 0}
          icon={Target}
          format="number"
        />
        <MetricCard
          title="Total Emails (Analytics)"
          value={emailAnalytics?.summary?.totalEmails || 0}
          icon={Send}
          format="number"
        />
        <MetricCard
          title="Delivery Rate"
          value={dashboard?.performance?.deliveryRate || 0}
          icon={CheckCircle}
          format="percentage"
        />
      </div>

      {/* Email Analytics Time Series Chart */}
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Email Status Over Time</CardTitle>
            <CardDescription>
              Daily breakdown of email status distribution
            </CardDescription>
          </div>
          <Select value={emailTimeRange} onValueChange={setEmailTimeRange}>
            <SelectTrigger
              className="w-[160px] rounded-lg sm:ml-auto"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={emailTimeSeriesData}>
              <defs>
                <linearGradient id="fillSending" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-sending)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-sending)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-sent)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-sent)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Date: ${value}`}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="sending"
                type="natural"
                fill="url(#fillSending)"
                stroke="var(--color-sending)"
                stackId="a"
              />
              <Area
                dataKey="sent"
                type="natural"
                fill="url(#fillSent)"
                stroke="var(--color-sent)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Usage and Reputation Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Usage</CardTitle>
            <CardDescription>Current usage against your limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usage && (
              <>
                <UsageProgress
                  current={dashboard?.overview?.monthlyUsage || 0}
                  limit={usage.limits?.monthlyEmails || 200}
                  label="Email Sends"
                />
                <UsageProgress
                  current={usage.usage?.templatesUsed || 0}
                  limit={usage.limits?.customTemplates || 5}
                  label="Custom Templates"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Email Status Breakdown</CardTitle>
            <CardDescription>Current distribution of email statuses</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={emailStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={2}
                >
                  {emailStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {emailAnalytics?.summary?.totalEmails || 0}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Total Emails
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics and Templates */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Performance Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key email performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceData.map((metric) => (
              <div key={metric.name} className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{metric.value}%</span>
                  <Progress value={metric.value} className="w-16 h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Top Templates</CardTitle>
            <CardDescription>Most used email templates</CardDescription>
          </CardHeader>
          <CardContent>
            {emailAnalytics?.topTemplates && emailAnalytics.topTemplates.length > 0 ? (
              <div className="space-y-3">
                {emailAnalytics.topTemplates.map((template: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Used {template.count} times
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {template.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No template data available</p>
                <p className="text-xs">Templates usage will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reputation and Issue Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Reputation Score */}
        <Card>
          <CardHeader>
            <CardTitle>Sender Reputation</CardTitle>
            <CardDescription>Your email sending reputation score</CardDescription>
          </CardHeader>
          <CardContent>
            {reputation ? (
              <div className="space-y-4">
                <ReputationScore score={reputation.score} riskLevel={reputation.riskLevel} />
                {reputation.recommendations && reputation.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommendations</h4>
                    {reputation.recommendations.slice(0, 2).map((rec: any, index: number) => (
                      <Alert key={index}>
                        <Activity className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>{rec.category}:</strong> {rec.action}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">No reputation data available</div>
            )}
          </CardContent>
        </Card>

        {/* Issue Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Analysis</CardTitle>
            <CardDescription>Bounce and complaint analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {emailAnalytics?.issueAnalysis ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Bounce Reasons</h4>
                  {emailAnalytics.issueAnalysis.bounceReasons.length > 0 ? (
                    <div className="space-y-2">
                      {emailAnalytics.issueAnalysis.bounceReasons.map((reason: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{reason.reason}</span>
                          <Badge variant="outline">{reason.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No bounce issues detected</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Complaint Reasons</h4>
                  {emailAnalytics.issueAnalysis.complaintReasons.length > 0 ? (
                    <div className="space-y-2">
                      {emailAnalytics.issueAnalysis.complaintReasons.map((reason: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{reason.reason}</span>
                          <Badge variant="outline">{reason.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No complaints reported</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                <p>No issues detected</p>
                <p className="text-xs">Your emails are performing well</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Volume Chart */}
        <Card>
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle>Email Volume</CardTitle>
              <CardDescription>Daily email sending volume over time</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      nameKey="count"
                      labelFormatter={(value) => `Date: ${value}`}
                    />
                  }
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Email Status Distribution */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Email Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of your emails</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={emailStatsData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={2}
                >
                  {emailStatsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card> */}
      </div>

      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest campaigns and activities</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard?.recentCampaigns && dashboard.recentCampaigns.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent campaigns</p>
              <p className="text-xs">Create your first campaign to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}