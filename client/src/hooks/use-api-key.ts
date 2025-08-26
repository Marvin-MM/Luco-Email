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

export const useGetApiKeyUsage = (id: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['apiKeyUsage', id, page, limit],
    queryFn: () => axios.get(`/api-keys/${id}/usage?page=${page}&limit=${limit}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useGetApiKeyById = (id: string) => {
  return useQuery({
    queryKey: ['apiKey', id],
    queryFn: () => axios.get(`/api-keys/${id}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useUpdateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => axios.put(`/api-keys/${id}`, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['apiKey', variables.id] });
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
