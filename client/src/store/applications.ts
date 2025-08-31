// // store/applications.ts
// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';

// export interface Application {
//   id: string;
//   name: string;
//   description?: string | null;
//   isActive?: boolean;
//   defaultIdentityId?: string | null;
//   settings?: Record<string, any>;
//   createdAt?: string;
//   updatedAt?: string;
//   tenantId?: string;
//   userId?: string;
//   user?: any;
//   defaultIdentity?: any | null;
//   _count?: {
//     identities: number;
//     templates: number;
//     emailLogs: number;
//   };
// }

// interface ApplicationsState {
//   // Application management
//   currentApplication: Application | null;
//   applications: Application[];
  
//   // Actions
//   setCurrentApplication: (application: Application | null) => void;
//   setApplications: (applications: Application[]) => void;
//   addApplication: (application: Application) => void;
//   updateApplication: (id: string, updates: Partial<Application>) => void;
//   removeApplication: (id: string) => void;
//   clearApplications: () => void;
// }

// export const useApplicationsStore = create<ApplicationsState>()(
//   persist(
//     (set, get) => ({
//       // Initial state
//       currentApplication: null,
//       applications: [],

//       // Application management actions
//       setCurrentApplication: (application) => set({ 
//         currentApplication: application 
//       }),
      
//       setApplications: (applications) => {
//         const state = get();
//         set({ 
//           applications,
//           // Update current application if it exists in the new list
//           currentApplication: state.currentApplication 
//             ? applications.find(app => app.id === state.currentApplication?.id) || applications[0] || null
//             : applications[0] || null
//         });
//       },
      
//       addApplication: (application) => {
//         const state = get();
//         set({ 
//           applications: [...state.applications, application],
//           // Set as current if it's the first application
//           currentApplication: state.applications.length === 0 ? application : state.currentApplication
//         });
//       },
      
//       updateApplication: (id, updates) => {
//         const state = get();
//         const updatedApplications = state.applications.map(app => 
//           app.id === id ? { ...app, ...updates } : app
//         );
        
//         set({
//           applications: updatedApplications,
//           // Update current application if it's the one being updated
//           currentApplication: state.currentApplication?.id === id 
//             ? { ...state.currentApplication, ...updates }
//             : state.currentApplication
//         });
//       },
      
//       removeApplication: (id) => {
//         const state = get();
//         const filteredApplications = state.applications.filter(app => app.id !== id);
        
//         set({
//           applications: filteredApplications,
//           // Clear current application if it's the one being removed
//           currentApplication: state.currentApplication?.id === id 
//             ? filteredApplications[0] || null 
//             : state.currentApplication
//         });
//       },

//       // Clear all applications
//       clearApplications: () => set({
//         currentApplication: null,
//         applications: [],
//       }),
//     }),
//     {
//       name: 'applications-storage',
//       partialize: (state) => ({
//         currentApplication: state.currentApplication,
//         applications: state.applications,
//       }),
//     }
//   )
// );

// store/applications.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Application {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  defaultIdentityId?: string | null;
  settings?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string;
  userId?: string;
  tenant?: {
    id: string;
    organizationName: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  identities?: Identity[];
  defaultIdentity?: Identity | null;
  _count?: {
    identities?: number;
    templates: number;
    emailLogs: number;
  };
}

export interface Identity {
  id: string;
  type: 'EMAIL' | 'DOMAIN';
  value: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  sesIdentityArn?: string | null;
  verificationToken?: string | null;
  dkimTokens?: string[];
  verifiedAt?: string | null;
  lastVerificationCheck?: string | null;
  dkimRecords?: any;
  spfRecord?: string | null;
  dmarcRecord?: string | null;
  reputationMetrics?: any;
  createdAt?: string;
  updatedAt?: string;
  applicationId?: string;
  tenantId?: string;
  application?: {
    id: string;
    name: string;
  };
}

export interface ApplicationStats {
  period: string;
  emails: {
    total: number;
    delivered: number;
    bounced: number;
    complained: number;
  };
  rates: {
    delivery: number;
    bounce: number;
    complaint: number;
  };
  resources: {
    identities: number;
    templates: number;
  };
}

interface ApplicationsState {
  // Application management
  currentApplication: Application | null;
  applications: Application[];
  
  // Identity management
  selectedIdentity: Identity | null;
  
  // Stats
  applicationStats: ApplicationStats | null;
  
  // UI State
  isIdentityModalOpen: boolean;
  isCreateIdentityModalOpen: boolean;
  isDeleteConfirmOpen: boolean;
  
  // Actions
  setCurrentApplication: (application: Application | null) => void;
  setApplications: (applications: Application[]) => void;
  addApplication: (application: Application) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  removeApplication: (id: string) => void;
  clearApplications: () => void;
  
  // Identity actions
  setSelectedIdentity: (identity: Identity | null) => void;
  addIdentityToApplication: (applicationId: string, identity: Identity) => void;
  removeIdentityFromApplication: (applicationId: string, identityId: string) => void;
  updateIdentityInApplication: (applicationId: string, identityId: string, updates: Partial<Identity>) => void;
  
  // Stats actions
  setApplicationStats: (stats: ApplicationStats | null) => void;
  
  // UI actions
  setIsIdentityModalOpen: (open: boolean) => void;
  setIsCreateIdentityModalOpen: (open: boolean) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
}

export const useApplicationsStore = create<ApplicationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentApplication: null,
      applications: [],
      selectedIdentity: null,
      applicationStats: null,
      isIdentityModalOpen: false,
      isCreateIdentityModalOpen: false,
      isDeleteConfirmOpen: false,

      // Application management actions
      setCurrentApplication: (application) => set({ 
        currentApplication: application 
      }),
      
      setApplications: (applications) => {
        const state = get();
        set({ 
          applications,
          currentApplication: state.currentApplication 
            ? applications.find(app => app.id === state.currentApplication?.id) || applications[0] || null
            : applications[0] || null
        });
      },
      
      addApplication: (application) => {
        const state = get();
        set({ 
          applications: [...state.applications, application],
          currentApplication: state.applications.length === 0 ? application : state.currentApplication
        });
      },
      
      updateApplication: (id, updates) => {
        const state = get();
        const updatedApplications = state.applications.map(app => 
          app.id === id ? { ...app, ...updates } : app
        );
        
        set({
          applications: updatedApplications,
          currentApplication: state.currentApplication?.id === id 
            ? { ...state.currentApplication, ...updates }
            : state.currentApplication
        });
      },
      
      removeApplication: (id) => {
        const state = get();
        const filteredApplications = state.applications.filter(app => app.id !== id);
        
        set({
          applications: filteredApplications,
          currentApplication: state.currentApplication?.id === id 
            ? filteredApplications[0] || null 
            : state.currentApplication
        });
      },

      clearApplications: () => set({
        currentApplication: null,
        applications: [],
        selectedIdentity: null,
        applicationStats: null,
      }),
      
      // Identity management actions
      setSelectedIdentity: (identity) => set({
        selectedIdentity: identity
      }),
      
      addIdentityToApplication: (applicationId, identity) => {
        const state = get();
        const updatedApplications = state.applications.map(app => {
          if (app.id === applicationId) {
            return {
              ...app,
              identities: [...(app.identities || []), identity],
              _count: {
                ...app._count,
                identities: (app._count?.identities || 0) + 1
              }
            };
          }
          return app;
        });
        
        set({
          applications: updatedApplications,
          currentApplication: state.currentApplication?.id === applicationId
            ? updatedApplications.find(app => app.id === applicationId) || state.currentApplication
            : state.currentApplication
        });
      },
      
      removeIdentityFromApplication: (applicationId, identityId) => {
        const state = get();
        const updatedApplications = state.applications.map(app => {
          if (app.id === applicationId) {
            return {
              ...app,
              identities: (app.identities || []).filter(identity => identity.id !== identityId),
              _count: {
                ...app._count,
                identities: Math.max((app._count?.identities || 0) - 1, 0)
              }
            };
          }
          return app;
        });
        
        set({
          applications: updatedApplications,
          currentApplication: state.currentApplication?.id === applicationId
            ? updatedApplications.find(app => app.id === applicationId) || state.currentApplication
            : state.currentApplication,
          selectedIdentity: state.selectedIdentity?.id === identityId ? null : state.selectedIdentity
        });
      },
      
      updateIdentityInApplication: (applicationId, identityId, updates) => {
        const state = get();
        const updatedApplications = state.applications.map(app => {
          if (app.id === applicationId) {
            return {
              ...app,
              identities: (app.identities || []).map(identity => 
                identity.id === identityId ? { ...identity, ...updates } : identity
              )
            };
          }
          return app;
        });
        
        set({
          applications: updatedApplications,
          currentApplication: state.currentApplication?.id === applicationId
            ? updatedApplications.find(app => app.id === applicationId) || state.currentApplication
            : state.currentApplication,
          selectedIdentity: state.selectedIdentity?.id === identityId 
            ? { ...state.selectedIdentity, ...updates }
            : state.selectedIdentity
        });
      },
      
      // Stats actions
      setApplicationStats: (stats) => set({
        applicationStats: stats
      }),
      
      // UI actions
      setIsIdentityModalOpen: (open) => set({
        isIdentityModalOpen: open,
        selectedIdentity: open ? get().selectedIdentity : null
      }),
      
      setIsCreateIdentityModalOpen: (open) => set({
        isCreateIdentityModalOpen: open
      }),
      
      setIsDeleteConfirmOpen: (open) => set({
        isDeleteConfirmOpen: open
      }),
    }),
    {
      name: 'applications-storage',
      partialize: (state) => ({
        currentApplication: state.currentApplication,
        applications: state.applications,
      }),
    }
  )
);