'use client';

import { useGetSystemHealth } from '@/hooks/use-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HealthPage() {
  const { data, isLoading, isError, error } = useGetSystemHealth();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { database, queues, email, identities, overall } = data.data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
      case 'needs_attention':
      case 'warning':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Health</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Overall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getStatusColor(overall.status)}`}>
              {overall.status.charAt(0).toUpperCase() + overall.status.slice(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(database.status)}`}>
              {database.status}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Queues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(queues.status)}`}>
              {queues.status}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(email.status)}`}>
              {email.status}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(identities.status)}`}>
              {identities.status}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
