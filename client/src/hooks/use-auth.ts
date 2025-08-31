import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => axios.post('/auth/logout').then(res => res.data),
    onSuccess: () => {
      // Clear all queries and logout
      queryClient.clear();
      logout();
    },
    onError: () => {
      // Even if logout fails on server, clear client state
      queryClient.clear();
      logout();
    }
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

// Update Profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  
  return useMutation({
    mutationFn: (data: any) => axios.put('/auth/profile', data).then(res => res.data),
    onSuccess: (data) => {
      // Update the profile query cache
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // If the response includes updated user data, update the store
      if (data.user) {
        const currentStore = useAuthStore.getState();
        setUser(data.user, currentStore.tenant);
      }
    },
  });
};

// Change Password
export const useChangePassword = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      axios.post('/auth/change-password', data).then(res => res.data),
    onSuccess: () => {
      // Optionally clear sensitive queries after password change
      queryClient.removeQueries({ queryKey: ['profile'] });
    },
  });
};

// Complete Google Registration
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