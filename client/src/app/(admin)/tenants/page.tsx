'use client';

import { useState } from 'react';
import { useGetAllTenants } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useGetAllTenants(page, 10, search);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const { tenants, pagination } = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <div className="w-1/3">
          <Input placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant: any) => (
            <TableRow key={tenant.id}>
              <TableCell>
                <Link href={`/admin/tenants/${tenant.id}`} className="font-medium text-primary hover:underline">
                  {tenant.organizationName}
                </Link>
              </TableCell>
              <TableCell>{tenant.status}</TableCell>
              <TableCell>{tenant.subscriptionPlan}</TableCell>
              <TableCell>{tenant.users.length}</TableCell>
              <TableCell>{new Date(tenant.createdAt).toLocaleString()}</TableCell>
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
