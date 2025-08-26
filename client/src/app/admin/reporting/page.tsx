'use client';

import { useState } from 'react';
import { useGenerateReport } from '@/hooks/use-reporting';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportingPage() {
  const { mutate: generateReport, isPending, data: reportData } = useGenerateReport();
  const [reportType, setReportType] = useState('email_performance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = () => {
    generateReport({
      type: reportType,
      startDate,
      endDate,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reporting</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/admin/reporting/reputation">
          <Card className="hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Reputation Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>View your sender reputation report.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_performance">Email Performance</SelectItem>
                  <SelectItem value="campaign_summary">Campaign Summary</SelectItem>
                  <SelectItem value="usage_summary">Usage Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleGenerateReport} disabled={isPending}>
            {isPending ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
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
