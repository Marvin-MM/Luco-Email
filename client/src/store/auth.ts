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

interface Application {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  applications: Application[];
  currentApplication: Application | null;
  setUser: (user: User | null, tenant: Tenant | null) => void;
  logout: () => void;
  setApplications: (applications: Application[]) => void;
  setCurrentApplication: (application: Application | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  applications: [],
  currentApplication: null,
  setUser: (user, tenant) => set({ user, tenant, isAuthenticated: !!user }),
  logout: () => set({ user: null, tenant: null, isAuthenticated: false, applications: [], currentApplication: null }),
  setApplications: (applications) => set({ applications }),
  setCurrentApplication: (application) => set({ currentApplication: application }),
}));
