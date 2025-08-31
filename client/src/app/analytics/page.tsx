'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/analytics/emails">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View detailed analytics for your emails including delivery rates, bounces, and performance metrics.</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/analytics/campaigns">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Analyze campaign performance, open rates, click rates, and conversion metrics.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/reputation">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Reputation Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Monitor your sender reputation, domain health, and deliverability status.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/system">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View system performance, API usage, and infrastructure metrics.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/usage">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Track your usage against limits, billing information, and resource consumption.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/top-content">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Top Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Discover your best performing templates, subjects, and content strategies.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
