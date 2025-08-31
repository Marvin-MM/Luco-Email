// hooks/use-dashboard.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

// Dashboard Overview Hook
export const useGetDashboard = (period: string = '30d') => {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const response = await axiosInstance.get(`/analytics/dashboard?period=${period}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Usage Stats Hook
export const useGetUsageStats = () => {
  return useQuery({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/analytics/usage-stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Reputation Hook
export const useGetReputation = () => {
  return useQuery({
    queryKey: ['reputation'],
    queryFn: async () => {
      const response = await axiosInstance.get('/analytics/reputation');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for reputation data
    refetchOnWindowFocus: false,
  });
};

// Email Analytics Hook - NEW
export const useGetEmailAnalytics = (period: string = '30d', granularity: string = 'daily') => {
  return useQuery({
    queryKey: ['email-analytics', period, granularity],
    queryFn: async () => {
      const response = await axiosInstance.get(`/analytics/emails?period=${period}&granularity=${granularity}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};