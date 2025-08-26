import { useMutation } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/reporting/custom', data).then(res => res.data),
  });
};

export const useGetReputationReport = () => {
  return useMutation({
    mutationFn: () => axios.post('/reporting/reputation').then(res => res.data),
  });
};
