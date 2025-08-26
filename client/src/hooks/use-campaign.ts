import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetCampaigns = (page = 1, limit = 10, search = '', status = '', applicationId = '') => {
  return useQuery({
    queryKey: ['campaigns', page, limit, search, status, applicationId],
    queryFn: () => axios.get(`/campaigns?page=${page}&limit=${limit}&search=${search}&status=${status}&applicationId=${applicationId}`).then(res => res.data),
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.post('/campaigns', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

export const useGetCampaignAnalytics = (id: string) => {
  return useQuery({
    queryKey: ['campaignAnalytics', id],
    queryFn: () => axios.get(`/campaigns/${id}/analytics`).then(res => res.data),
    enabled: !!id,
  });
};

export const useGetCampaignById = (id: string) => {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => axios.get(`/campaigns/${id}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useSendCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.post(`/campaigns/${id}/send`).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables] });
    },
  });
};

export const useCancelCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.post(`/campaigns/${id}/cancel`).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables] });
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/campaigns/${id}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};
