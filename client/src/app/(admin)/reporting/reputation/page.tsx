'use client';

import { useGetReputationReport } from '@/hooks/use-reporting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReputationReportPage() {
  const { mutate: getReport, isPending, data: reportData } = useGetReputationReport();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reputation Report</h1>
        <Button onClick={() => getReport()} disabled={isPending}>
          {isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Reputation Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md overflow-x-auto">
              {JSON.stringify(reportData.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
