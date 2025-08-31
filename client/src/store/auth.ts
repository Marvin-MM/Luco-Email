// store/auth.ts 
import { create } from 'zustand';

// Based on prisma schema and authController responses
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profilePicture: string | null;
}

interface Tenant {
  id: string;
  organizationName: string;
  status: string;
  subscriptionPlan: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  setUser: (user: User | null, tenant: Tenant | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  setUser: (user, tenant) => set({ user, tenant, isAuthenticated: !!user }),
  logout: () => set({ user: null, tenant: null, isAuthenticated: false }),
}));