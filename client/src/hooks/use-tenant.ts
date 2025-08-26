import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useUpdateTenantSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.put('/tenant/settings', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
