'use client';

import { useState } from 'react';
import { useGetUsageStats } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, Bar, BarChart, Pie, PieChart, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, CreditCard, Database } from 'lucide-react';

export default function UsageStatsPage() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, error } = useGetUsageStats(period);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { overview, limits, billing, usage, trends, breakdown } = data.data;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageVariant = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Usage Statistics</h1>
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
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.emailsSent.toLocaleString()}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{((overview.emailsSent / limits.monthlyEmailLimit) * 100).toFixed(1)}% of limit</span>
            </div>
            <Progress 
              value={(overview.emailsSent / limits.monthlyEmailLimit) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeUsers}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{((overview.activeUsers / limits.userLimit) * 100).toFixed(1)}% of limit</span>
            </div>
            <Progress 
              value={(overview.activeUsers / limits.userLimit) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.storageUsed}GB</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{((overview.storageUsed / limits.storageLimit) * 100).toFixed(1)}% of {limits.storageLimit}GB</span>
            </div>
            <Progress 
              value={(overview.storageUsed / limits.storageLimit) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billing.currentCost}</div>
            <div className="text-xs text-muted-foreground">
              Plan: {billing.plan} (${billing.baseCost}/month)
            </div>
            {billing.overage > 0 && (
              <Badge variant="secondary" className="mt-1">
                +${billing.overage} overage
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage vs Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Monthly Email Limit</span>
                <span className={`text-sm font-bold ${getUsageColor((usage.emails.used / usage.emails.limit) * 100)}`}>
                  {usage.emails.used.toLocaleString()} / {usage.emails.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={(usage.emails.used / usage.emails.limit) * 100} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Resets in {usage.emails.resetDays} days</span>
                <Badge variant={getUsageVariant((usage.emails.used / usage.emails.limit) * 100)}>
                  {((usage.emails.used / usage.emails.limit) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Custom Templates</span>
                <span className={`text-sm font-bold ${getUsageColor((usage.templates.used / usage.templates.limit) * 100)}`}>
                  {usage.templates.used} / {usage.templates.limit}
                </span>
              </div>
              <Progress value={(usage.templates.used / usage.templates.limit) * 100} className="h-3" />
              <Badge variant={getUsageVariant((usage.templates.used / usage.templates.limit) * 100)} className="mt-1">
                {((usage.templates.used / usage.templates.limit) * 100).toFixed(1)}%
              </Badge>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">API Calls (Daily)</span>
                <span className={`text-sm font-bold ${getUsageColor((usage.apiCalls.used / usage.apiCalls.limit) * 100)}`}>
                  {usage.apiCalls.used.toLocaleString()} / {usage.apiCalls.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={(usage.apiCalls.used / usage.apiCalls.limit) * 100} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Resets daily at midnight</span>
                <Badge variant={getUsageVariant((usage.apiCalls.used / usage.apiCalls.limit) * 100)}>
                  {((usage.apiCalls.used / usage.apiCalls.limit) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <LineChart data={trends.emails}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="sent" stroke="var(--color-primary)" name="Emails Sent" />
                <Line type="monotone" dataKey="limit" stroke="var(--color-muted)" strokeDasharray="5 5" name="Limit" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={trends.apiCalls}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Usage by Application</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={breakdown.byApplication}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {breakdown.byApplication.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Base Plan ({billing.plan})</span>
              <span className="font-bold">${billing.baseCost}</span>
            </div>
            
            {billing.additionalCosts.map((cost: any) => (
              <div key={cost.type} className="flex justify-between items-center">
                <span>{cost.description}</span>
                <span className="font-bold">${cost.amount}</span>
              </div>
            ))}
            
            <hr />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>${billing.totalCost}</span>
            </div>
            
            {billing.nextBillDate && (
              <p className="text-sm text-muted-foreground">
                Next billing date: {new Date(billing.nextBillDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
