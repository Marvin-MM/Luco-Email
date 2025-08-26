import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/auth';

// Register
export const useRegister = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/register', data).then(res => res.data),
  });
};

// Verify OTP
export const useVerifyOtp = () => {
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/verify-otp', data).then(res => res.data),
    onSuccess: (data) => {
      if (data.success) {
        setUser(data.data.user, data.data.tenant);
      }
    },
  });
};

// Login
export const useLogin = () => {
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/login', data).then(res => res.data),
    onSuccess: (data) => {
      if (data.success) {
        setUser(data.data.user, data.data.tenant);
      }
    },
  });
};

// Logout
export const useLogout = () => {
  const { logout } = useAuthStore();
  return useMutation({
    mutationFn: () => axios.post('/auth/logout').then(res => res.data),
    onSuccess: () => {
      logout();
    },
  });
};

// Resend OTP
export const useResendOtp = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/resend-otp', data).then(res => res.data),
  });
};

// Forgot Password
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/forgot-password', data).then(res => res.data),
  });
};

// Reset Password
export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/reset-password', data).then(res => res.data),
  });
};

// Get Profile
export const useGetProfile = () => {
  const { setUser } = useAuthStore();
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const response = await axios.get('/auth/profile');
        if (response.data.success) {
          setUser(response.data.data.user, response.data.data.tenant);
        }
        return response.data;
      } catch (error) {
        setUser(null, null);
        throw error;
      }
    },
    retry: false, // Don't retry on failure, as it's likely a 401
    refetchOnWindowFocus: false,
  });
};

// Get Dashboard Analytics
export const useGetDashboard = (period: string = '30d') => {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => axios.get(`/analytics/dashboard?period=${period}`).then(res => res.data),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => axios.put('/auth/profile', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/change-password', data).then(res => res.data),
  });
};

export const useCompleteGoogleRegistration = () => {
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: any) => axios.post('/auth/complete-google-registration', data).then(res => res.data),
    onSuccess: (data) => {
      if (data.success) {
        setUser(data.data.user, data.data.tenant);
      }
    },
  });
};
