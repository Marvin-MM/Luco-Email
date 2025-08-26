'use client';

import { useGetSystemMetrics, useCleanupOldData } from '@/hooks/use-system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SystemManagementPage() {
  const { data, isLoading, isError, error } = useGetSystemMetrics();
  const { mutate: cleanup, isPending } = useCleanupOldData();

  const handleCleanup = () => {
    cleanup();
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const metrics = data.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-md overflow-x-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This action will clean up old data from the system. This process is irreversible.
          </p>
          <Button onClick={handleCleanup} disabled={isPending} variant="destructive">
            {isPending ? 'Cleaning up...' : 'Cleanup Old Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
