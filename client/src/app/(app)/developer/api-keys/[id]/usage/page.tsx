'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useGetApiKeyUsage } from '@/hooks/use-api-key';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ApiKeyUsagePage() {
  const params = useParams();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useGetApiKeyUsage(id, page);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { usageLogs, pagination } = data.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">API Key Usage</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Endpoint</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status Code</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usageLogs.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell>{log.endpoint}</TableCell>
              <TableCell>{log.method}</TableCell>
              <TableCell>{log.statusCode}</TableCell>
              <TableCell>{log.ipAddress}</TableCell>
              <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end space-x-2">
        <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}>
          Previous
        </Button>
        <Button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
