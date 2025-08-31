import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const useGetSystemMetrics = (period = '30d') => {
  return useQuery({
    queryKey: ['systemMetrics', period],
    queryFn: () => axios.get(`/analytics/system-metrics?period=${period}`).then(res => res.data),
  });
};

export const useGetTimeSeriesData = (metric: string, period = '30d', granularity = 'day') => {
  return useQuery({
    queryKey: ['timeSeriesData', metric, period, granularity],
    queryFn: () => axios.get(`/analytics/time-series?metric=${metric}&period=${period}&granularity=${granularity}`).then(res => res.data),
  });
};

export const useGetTopPerformingContent = (period = '30d', limit = 10, contentType = '') => {
  return useQuery({
    queryKey: ['topPerformingContent', period, limit, contentType],
    queryFn: () => axios.get(`/analytics/top-content?period=${period}&limit=${limit}&contentType=${contentType}`).then(res => res.data),
  });
};

export const useGetReputationReport = (period = '30d') => {
  return useQuery({
    queryKey: ['reputationReport', period],
    queryFn: () => axios.get(`/analytics/reputation?period=${period}`).then(res => res.data),
  });
};

export const useGetUsageStats = (period = '30d') => {
  return useQuery({
    queryKey: ['usageStats', period],
    queryFn: () => axios.get(`/analytics/usage?period=${period}`).then(res => res.data),
  });
};

export const useExportAnalytics = () => {
  return useMutation({
    mutationFn: ({ type, period, format }: { type: string, period: string, format: string }) => 
      axios.post(`/analytics/export`, { type, period, format }).then(res => res.data),
  });
};

export const useGetTenantDashboard = (period = '30d') => {
  return useQuery({
    queryKey: ['tenantDashboard', period],
    queryFn: () => axios.get(`/analytics/tenant-dashboard?period=${period}`).then(res => res.data),
  });
};

export const useGetEmailDeliverability = (period = '30d', applicationId = '') => {
  return useQuery({
    queryKey: ['emailDeliverability', period, applicationId],
    queryFn: () => axios.get(`/analytics/deliverability?period=${period}&applicationId=${applicationId}`).then(res => res.data),
  });
};

export const useGetBounceAnalysis = (period = '30d', bounceType = '') => {
  return useQuery({
    queryKey: ['bounceAnalysis', period, bounceType],
    queryFn: () => axios.get(`/analytics/bounces?period=${period}&bounceType=${bounceType}`).then(res => res.data),
  });
};

export const useGetComplaintAnalysis = (period = '30d') => {
  return useQuery({
    queryKey: ['complaintAnalysis', period],
    queryFn: () => axios.get(`/analytics/complaints?period=${period}`).then(res => res.data),
  });
};
