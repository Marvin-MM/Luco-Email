import { useQuery } from '@tanstack/react-query';
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
