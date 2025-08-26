'use client';

import { useGetQueueStats, usePauseQueue, useResumeQueue } from '@/hooks/use-queue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function QueueManagementPage() {
  const { data, isLoading, isError, error } = useGetQueueStats();
  const { mutate: pauseQueue, isPending: isPausing } = usePauseQueue();
  const { mutate: resumeQueue, isPending: isResuming } = useResumeQueue();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { stats } = data.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Queue Management</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Queue Name</TableHead>
            <TableHead>Waiting</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Delayed</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(stats).map(([queueName, queueStats]: [string, any]) => (
            <TableRow key={queueName}>
              <TableCell className="font-medium">{queueName}</TableCell>
              <TableCell>{queueStats.waiting}</TableCell>
              <TableCell>{queueStats.active}</TableCell>
              <TableCell>{queueStats.completed}</TableCell>
              <TableCell>{queueStats.failed}</TableCell>
              <TableCell>{queueStats.delayed}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" onClick={() => pauseQueue(queueName)} disabled={isPausing}>
                  Pause
                </Button>
                <Button size="sm" onClick={() => resumeQueue(queueName)} disabled={isResuming}>
                  Resume
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
