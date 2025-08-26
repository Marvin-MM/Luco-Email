import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetTemplates = (applicationId: string, page = 1, limit = 10, search = '', isActive = '') => {
  return useQuery({
    queryKey: ['templates', applicationId, page, limit, search, isActive],
    queryFn: () => axios.get(`/templates/application/${applicationId}?page=${page}&limit=${limit}&search=${search}&isActive=${isActive}`).then(res => res.data),
    enabled: !!applicationId,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.post('/templates', data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates', variables.applicationId] });
    },
  });
};

export const usePreviewTemplate = () => {
  return useMutation({
    mutationFn: ({ id, variables }: { id: string, variables: any }) => axios.post(`/templates/${id}/preview`, { variables }).then(res => res.data),
  });
};

export const useCloneTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string, name: string }) => axios.post(`/templates/${id}/clone`, { name }).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates', data.data.template.applicationId] });
    },
  });
};

export const useGetTemplateById = (id: string) => {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => axios.get(`/templates/${id}`).then(res => res.data),
    enabled: !!id,
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => axios.put(`/templates/${id}`, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates', data.data.template.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] });
    },
  });
};

export const useDeleteTemplate = (applicationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/templates/${id}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', applicationId] });
    },
  });
};
