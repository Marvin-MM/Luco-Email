import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export const useGetEmailAnalytics = (period = '30d', applicationId = '', identityId = '', templateId = '') => {
  return useQuery({
    queryKey: ['emailAnalytics', period, applicationId, identityId, templateId],
    queryFn: () => axios.get(`/analytics/emails?period=${period}&applicationId=${applicationId}&identityId=${identityId}&templateId=${templateId}`).then(res => res.data),
  });
};

export const useGetCampaignAnalytics = (period = '30d', status = '', applicationId = '') => {
  return useQuery({
    queryKey: ['campaignAnalytics', period, status, applicationId],
    queryFn: () => axios.get(`/analytics/campaigns?period=${period}&status=${status}&applicationId=${applicationId}`).then(res => res.data),
  });
};
