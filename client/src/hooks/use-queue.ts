import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetQueueStats = () => {
  return useQuery({
    queryKey: ['queueStats'],
    queryFn: () => axios.get('/queue/stats').then(res => res.data),
  });
};

export const usePauseQueue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => axios.post(`/queue/${queueName}/pause`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queueStats'] });
    },
  });
};

export const useResumeQueue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => axios.post(`/queue/${queueName}/resume`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queueStats'] });
    },
  });
};
