import { useQuery, useMutation } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => axios.get('/admin/system/health').then(res => res.data),
  });
};

export const useGetSystemMetrics = () => {
  return useQuery({
    queryKey: ['systemMetrics'],
    queryFn: () => axios.get('/system/metrics').then(res => res.data),
  });
};

export const useCleanupOldData = () => {
  return useMutation({
    mutationFn: () => axios.post('/system/cleanup').then(res => res.data),
  });
};
