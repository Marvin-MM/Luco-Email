'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/analytics/emails">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View detailed analytics for your emails.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/analytics/campaigns">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View detailed analytics for your campaigns.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
