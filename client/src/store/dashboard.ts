// store/dashboard.ts
import { create } from 'zustand';

interface DashboardFilters {
  period: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface DashboardState {
  filters: DashboardFilters;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  setPeriod: (period: string) => void;
  setDateRange: (dateRange: { from: Date; to: Date } | undefined) => void;
  selectedMetrics: string[];
  toggleMetric: (metric: string) => void;
  refreshTimestamp: number;
  triggerRefresh: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: {
    period: '30d',
  },
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  setPeriod: (period) =>
    set((state) => ({
      filters: { ...state.filters, period },
    })),
  setDateRange: (dateRange) =>
    set((state) => ({
      filters: { ...state.filters, dateRange },
    })),
  selectedMetrics: ['emails', 'delivery', 'bounce', 'complaint'],
  toggleMetric: (metric) =>
    set((state) => ({
      selectedMetrics: state.selectedMetrics.includes(metric)
        ? state.selectedMetrics.filter((m) => m !== metric)
        : [...state.selectedMetrics, metric],
    })),
  refreshTimestamp: Date.now(),
  triggerRefresh: () => set({ refreshTimestamp: Date.now() }),
}));