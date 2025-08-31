import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetAdminDashboard = (period = '30d') => {
  return useQuery({
    queryKey: ['adminDashboard', period],
    queryFn: () => axios.get(`/admin/dashboard?period=${period}`).then(res => res.data),
  });
};

export const useGetAllTenants = (page = 1, limit = 10, search = '', status = '', plan = '') => {
  return useQuery({
    queryKey: ['allTenants', page, limit, search, status, plan],
    queryFn: () => axios.get(`/admin/tenants?page=${page}&limit=${limit}&search=${search}&status=${status}&plan=${plan}`).then(res => res.data),
  });
};

export const useGetAllUsers = (page = 1, limit = 10, search = '', role = '', status = '', tenantId = '') => {
  return useQuery({
    queryKey: ['allUsers', page, limit, search, role, status, tenantId],
    queryFn: () => axios.get(`/admin/users?page=${page}&limit=${limit}&search=${search}&role=${role}&status=${status}&tenantId=${tenantId}`).then(res => res.data),
  });
};

export const useGetTenantById = (id: string) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => axios.get(`/admin/tenants/${id}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => axios.put(`/admin/tenants/${id}`, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allTenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] });
    },
  });
};

export const useGetUserById = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => axios.get(`/admin/users/${id}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => axios.put(`/admin/users/${id}`, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
  });
};

export const useGetSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => axios.get('/admin/system/health').then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useGetSystemLogs = (level = '', service = '', page = 1, limit = 50) => {
  return useQuery({
    queryKey: ['systemLogs', level, service, page, limit],
    queryFn: () => axios.get(`/admin/system/logs?level=${level}&service=${service}&page=${page}&limit=${limit}`).then(res => res.data),
  });
};

export const useGetTenantGrowth = (period = '30d') => {
  return useQuery({
    queryKey: ['tenantGrowth', period],
    queryFn: () => axios.get(`/admin/analytics/tenant-growth?period=${period}`).then(res => res.data),
  });
};

export const useGetRevenueGrowth = (period = '30d') => {
  return useQuery({
    queryKey: ['revenueGrowth', period],
    queryFn: () => axios.get(`/admin/analytics/revenue-growth?period=${period}`).then(res => res.data),
  });
};

export const useGetTopTenants = (period = '30d', limit = 10) => {
  return useQuery({
    queryKey: ['topTenants', period, limit],
    queryFn: () => axios.get(`/admin/analytics/top-tenants?period=${period}&limit=${limit}`).then(res => res.data),
  });
};

export const useCreateSuperadmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.post('/admin/create-superadmin', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
};
