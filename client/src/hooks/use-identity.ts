import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetIdentities = (applicationId: string) => {
  return useQuery({
    queryKey: ['identities', applicationId],
    queryFn: () => axios.get(`/identities/application/${applicationId}`).then(res => res.data),
    enabled: !!applicationId,
  });
};

export const useCreateIdentity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.post('/identities', data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identities', variables.applicationId] });
    },
  });
};

export const useDeleteIdentity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, applicationId }: { id: string, applicationId: string }) => axios.delete(`/identities/${id}`).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identities', variables.applicationId] });
    },
  });
};

export const useVerifyIdentity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.post(`/identities/${id}/verify`).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identities'] });
    },
  });
};

export const useGetDnsRecords = (id: string) => {
  return useQuery({
    queryKey: ['dns-records', id],
    queryFn: () => axios.get(`/identities/${id}/dns-records`).then(res => res.data),
    enabled: !!id,
  });
};
