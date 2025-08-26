import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetApiKeys = () => {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => axios.get('/api-keys').then(res => res.data),
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.post('/api-keys', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api-keys/${id}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
};
