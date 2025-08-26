import { useMutation } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useSendEmail = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/email/send', data).then(res => res.data),
  });
};
