// // hooks/use-applications.ts - Extended version
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import axiosInstance from '@/lib/axios';
// import { toast } from 'sonner';

// export interface Application {
//   id: string;
//   name: string;
//   description: string | null;
//   isActive: boolean;
//   defaultIdentityId: string | null;
//   settings: Record<string, any>;
//   createdAt: string;
//   updatedAt: string;
//   tenantId: string;
//   userId: string;
//   tenant: {
//     id: string;
//     organizationName: string;
//   };
//   user: {
//     id: string;
//     email: string;
//     firstName: string;
//     lastName: string;
//   };
//   identities: Identity[];
//   defaultIdentity: any | null;
//   _count: {
//     identities: number;
//     templates: number;
//     emailLogs: number;
//   };
// }

// export interface Identity {
//   id: string;
//   type: 'EMAIL' | 'DOMAIN';
//   value: string;
//   status: 'PENDING' | 'VERIFIED' | 'FAILED';
//   sesIdentityArn: string | null;
//   verificationToken: string | null;
//   dkimTokens: string[];
//   verifiedAt: string | null;
//   lastVerificationCheck: string | null;
//   dkimRecords: any | null;
//   spfRecord: string | null;
//   dmarcRecord: string | null;
//   reputationMetrics: any | null;
//   createdAt: string;
//   updatedAt: string;
//   applicationId: string;
//   tenantId: string;
//   application: {
//     id: string;
//     name: string;
//   };
// }

// export interface ApplicationStats {
//   period: string;
//   emails: {
//     total: number;
//     delivered: number;
//     bounced: number;
//     complained: number;
//   };
//   rates: {
//     delivery: number;
//     bounce: number;
//     complaint: number;
//   };
//   resources: {
//     identities: number;
//     templates: number;
//   };
// }

// export interface ApplicationsResponse {
//   success: boolean;
//   data: {
//     applications: Application[];
//     pagination: {
//       total: number;
//       page: number;
//       limit: number;
//       pages: number;
//     };
//   };
// }

// export interface ApplicationResponse {
//   success: boolean;
//   data: {
//     application: Application;
//   };
// }

// export interface ApplicationStatsResponse {
//   success: boolean;
//   data: {
//     stats: ApplicationStats;
//   };
// }

// export interface CreateApplicationRequest {
//   name: string;
//   description?: string;
//   settings?: Record<string, any>;
// }

// export interface CreateIdentityRequest {
//   applicationId: string;
//   type: 'EMAIL' | 'DOMAIN';
//   value: string;
// }

// // Get Applications Hook
// export const useGetApplications = (page: number = 1, limit: number = 10, search?: string) => {
//   return useQuery({
//     queryKey: ['applications', page, limit, search],
//     queryFn: async (): Promise<ApplicationsResponse> => {
//       const params = new URLSearchParams({
//         page: page.toString(),
//         limit: limit.toString(),
//         ...(search && { search })
//       });
      
//       const response = await axiosInstance.get(`/applications?${params}`);
//       return response.data;
//     },
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Single Application Hook
// export const useGetApplicationById = (id: string) => {
//   return useQuery({
//     queryKey: ['application', id],
//     queryFn: async (): Promise<ApplicationResponse> => {
//       const response = await axiosInstance.get(`/applications/${id}`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Application Stats Hook
// export const useGetApplicationStats = (id: string) => {
//   return useQuery({
//     queryKey: ['application-stats', id],
//     queryFn: async (): Promise<ApplicationStatsResponse> => {
//       const response = await axiosInstance.get(`/applications/${id}/stats`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 2 * 60 * 1000, // 2 minutes for stats
//     refetchOnWindowFocus: false,
//   });
// };

// // Create Application Hook
// export const useCreateApplication = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (data: CreateApplicationRequest) => {
//       const response = await axiosInstance.post('/applications', data);
//       return response.data;
//     },
//     onSuccess: (data) => {
//       // Invalidate and refetch applications list
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       toast.success('Application created successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to create application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Update Application Hook
// export const useUpdateApplication = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async ({ id, data }: { id: string; data: Partial<CreateApplicationRequest> }) => {
//       const response = await axiosInstance.patch(`/applications/${id}`, data);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       // Invalidate specific application and applications list
//       queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       queryClient.invalidateQueries({ queryKey: ['application-stats', variables.id] });
//       toast.success('Application updated successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to update application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Delete Application Hook
// export const useDeleteApplication = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const response = await axiosInstance.delete(`/applications/${id}`);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       // Remove specific application from cache
//       queryClient.removeQueries({ queryKey: ['application', variables] });
//       queryClient.removeQueries({ queryKey: ['application-stats', variables] });
//       toast.success('Application deleted successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to delete application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Identity Management Hooks

// // Create Identity Hook
// export const useCreateIdentity = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (data: CreateIdentityRequest) => {
//       const response = await axiosInstance.post('/identities', data);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       // Invalidate application data to refresh identities list
//       queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
//       queryClient.invalidateQueries({ queryKey: ['application-stats', variables.applicationId] });
//       toast.success('Identity created successfully. Verification process initiated.');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to create identity';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Delete Identity Hook
// export const useDeleteIdentity = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
//       const response = await axiosInstance.delete(`/identities/${id}`);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
//       queryClient.invalidateQueries({ queryKey: ['application-stats', variables.applicationId] });
//       toast.success('Identity deleted successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to delete identity';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Get Identity Details Hook
// export const useGetIdentityById = (id: string) => {
//   return useQuery({
//     queryKey: ['identity', id],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/identities/${id}`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 2 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Verify Identity Hook
// export const useVerifyIdentity = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
//       const response = await axiosInstance.get(`/identities/${id}/verify-status`);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
//       queryClient.invalidateQueries({ queryKey: ['identity', variables.id] });
//       toast.success('Identity verification status updated');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to verify identity';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Get DNS Records Hook (for domain identities)
// export const useGetDnsRecords = (identityId: string) => {
//   return useQuery({
//     queryKey: ['dns-records', identityId],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/identities/${identityId}`);
//       return {
//         data: {
//           dnsRecords: {
//             spfRecord: response.data.data.identity.spfRecord,
//             dmarcRecord: response.data.data.identity.dmarcRecord,
//             dkimRecords: response.data.data.identity.dkimRecords,
//             dkimTokens: response.data.data.identity.dkimTokens
//           }
//         }
//       };
//     },
//     enabled: !!identityId,
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // hooks/use-applications.ts
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import axiosInstance from '@/lib/axios';
// import { toast } from 'sonner';
// import { useApplicationsStore } from '@/store/applications';

// export interface Application {
//   id: string;
//   name: string;
//   description: string | null;
//   isActive: boolean;
//   defaultIdentityId: string | null;
//   settings: Record<string, any>;
//   createdAt: string;
//   updatedAt: string;
//   tenantId: string;
//   userId: string;
//   tenant: {
//     id: string;
//     organizationName: string;
//   };
//   user: {
//     id: string;
//     email: string;
//     firstName: string;
//     lastName: string;
//   };
//   identities: Identity[];
//   defaultIdentity: Identity | null;
//   _count: {
//     templates: number;
//     emailLogs: number;
//   };
// }

// export interface Identity {
//   id: string;
//   type: 'EMAIL' | 'DOMAIN';
//   value: string;
//   status: 'PENDING' | 'VERIFIED' | 'FAILED';
//   sesIdentityArn: string | null;
//   verificationToken: string | null;
//   dkimTokens: string[];
//   verifiedAt: string | null;
//   lastVerificationCheck: string | null;
//   dkimRecords: any;
//   spfRecord: string | null;
//   dmarcRecord: string | null;
//   reputationMetrics: any;
//   createdAt: string;
//   updatedAt: string;
//   applicationId: string;
//   tenantId: string;
//   application?: {
//     id: string;
//     name: string;
//   };
// }

// export interface ApplicationStats {
//   period: string;
//   emails: {
//     total: number;
//     delivered: number;
//     bounced: number;
//     complained: number;
//   };
//   rates: {
//     delivery: number;
//     bounce: number;
//     complaint: number;
//   };
//   resources: {
//     identities: number;
//     templates: number;
//   };
// }

// export interface ApplicationsResponse {
//   success: boolean;
//   data: {
//     applications: Application[];
//     pagination: {
//       total: number;
//       page: number;
//       limit: number;
//       pages: number;
//     };
//   };
// }

// export interface CreateApplicationRequest {
//   name: string;
//   description?: string;
//   settings?: Record<string, any>;
// }

// export interface CreateIdentityRequest {
//   applicationId: string;
//   type: 'EMAIL' | 'DOMAIN';
//   value: string;
// }

// // Get Applications Hook
// export const useGetApplications = (page: number = 1, limit: number = 10, search?: string) => {
//   const { setApplications } = useApplicationsStore();

//   return useQuery({
//     queryKey: ['applications', page, limit, search],
//     queryFn: async (): Promise<ApplicationsResponse> => {
//       const params = new URLSearchParams({
//         page: page.toString(),
//         limit: limit.toString(),
//         ...(search && { search })
//       });
      
//       const response = await axiosInstance.get(`/applications?${params}`);
//       setApplications(response.data.data.applications);
//       return response.data;
//     },
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Single Application by ID Hook
// export const useGetApplicationById = (id: string) => {
//   const { setCurrentApplication } = useApplicationsStore();

//   return useQuery({
//     queryKey: ['application', id],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/applications/${id}`);
//       setCurrentApplication(response.data.data.application);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Application Stats Hook
// export const useGetApplicationStats = (id: string) => {
//   return useQuery({
//     queryKey: ['application-stats', id],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/applications/${id}/stats`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 2 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Identity by ID Hook
// export const useGetIdentityById = (id: string) => {
//   return useQuery({
//     queryKey: ['identity', id],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/identities/${id}`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Get Identity Verify Status Hook
// export const useGetIdentityVerifyStatus = (id: string) => {
//   return useQuery({
//     queryKey: ['identity-verify-status', id],
//     queryFn: async () => {
//       const response = await axiosInstance.get(`/identities/${id}/verify-status`);
//       return response.data;
//     },
//     enabled: !!id,
//     staleTime: 1 * 60 * 1000,
//     refetchOnWindowFocus: false,
//   });
// };

// // Create Application Hook
// export const useCreateApplication = () => {
//   const queryClient = useQueryClient();
//   const { addApplication } = useApplicationsStore();
  
//   return useMutation({
//     mutationFn: async (data: CreateApplicationRequest) => {
//       const response = await axiosInstance.post('/applications', data);
//       return response.data;
//     },
//     onSuccess: (data) => {
//       addApplication(data.data.application);
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       toast.success('Application created successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to create application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Update Application Hook
// export const useUpdateApplication = () => {
//   const queryClient = useQueryClient();
//   const { updateApplication } = useApplicationsStore();
  
//   return useMutation({
//     mutationFn: async ({ id, data }: { id: string; data: Partial<CreateApplicationRequest> }) => {
//       const response = await axiosInstance.put(`/applications/${id}`, data);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       updateApplication(variables.id, data.data.application);
//       queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       toast.success('Application updated successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to update application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Delete Application Hook
// export const useDeleteApplication = () => {
//   const queryClient = useQueryClient();
//   const { removeApplication } = useApplicationsStore();
  
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const response = await axiosInstance.delete(`/applications/${id}`);
//       return response.data;
//     },
//     onSuccess: (_, id) => {
//       removeApplication(id);
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       toast.success('Application deleted successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to delete application';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Create Identity Hook
// export const useCreateIdentity = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (data: CreateIdentityRequest) => {
//       const response = await axiosInstance.post('/identities', data);
//       return response.data;
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
//       queryClient.invalidateQueries({ queryKey: ['application-stats', variables.applicationId] });
//       toast.success('Identity created successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to create identity';
//       toast.error(errorMessage);
//     },
//   });
// };

// // Delete Identity Hook
// export const useDeleteIdentity = () => {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const response = await axiosInstance.delete(`/identities/${id}`);
//       return response.data;
//     },
//     onSuccess: (_, id) => {
//       // Invalidate all related queries
//       queryClient.invalidateQueries({ queryKey: ['applications'] });
//       queryClient.invalidateQueries({ queryKey: ['application'] });
//       queryClient.invalidateQueries({ queryKey: ['application-stats'] });
//       toast.success('Identity deleted successfully');
//     },
//     onError: (error: any) => {
//       const errorMessage = error.response?.data?.message || 'Failed to delete identity';
//       toast.error(errorMessage);
//     },
//   });
// };

// hooks/use-applications.ts - Extended version with templates
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';
import { useApplicationsStore } from '@/store/applications';

export interface Application {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  defaultIdentityId: string | null;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  userId: string;
  tenant: {
    id: string;
    organizationName: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  identities: Identity[];
  defaultIdentity: Identity | null;
  _count: {
    templates: number;
    emailLogs: number;
  };
}

export interface Identity {
  id: string;
  type: 'EMAIL' | 'DOMAIN';
  value: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  sesIdentityArn: string | null;
  verificationToken: string | null;
  dkimTokens: string[];
  verifiedAt: string | null;
  lastVerificationCheck: string | null;
  dkimRecords: any;
  spfRecord: string | null;
  dmarcRecord: string | null;
  reputationMetrics: any;
  createdAt: string;
  updatedAt: string;
  applicationId: string;
  tenantId: string;
  application?: {
    id: string;
    name: string;
  };
}

export interface Template {
  id: string;
  name: string;
  type: 'CUSTOM';
  subject: string;
  htmlContent: string;
  textContent?: string;
  isActive: boolean;
  variables: TemplateVariable[];
  description?: string;
  category?: string;
  tags: string[];
  previewImage?: string;
  hasUnsubscribeLink: boolean;
  complianceNotes?: string;
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
  applicationId: string;
  tenantId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  application?: {
    id: string;
    name: string;
  };
  _count: {
    emailLogs: number;
  };
}

export interface TemplateVariable {
  name: string;
  type: 'STRING' | 'URL' | 'NUMBER' | 'BOOLEAN';
  required: boolean;
  defaultValue?: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
  scheduledAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  bouncedCount: number;
  complainedCount: number;
  variables: Record<string, any>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  applicationId: string;
  templateId: string;
  identityId: string;
  tenantId: string;
  userId: string;
  application: {
    id: string;
    name: string;
  };
  template: {
    id: string;
    name: string;
  };
  identity: {
    id: string;
    value: string;
    type: 'EMAIL' | 'DOMAIN';
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    recipients: number;
    emailLogs: number;
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

export interface ApplicationsResponse {
  success: boolean;
  data: {
    applications: Application[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface TemplatesResponse {
  success: boolean;
  data: {
    templates: Template[];
    application: {
      id: string;
      name: string;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface CampaignsResponse {
  success: boolean;
  data: {
    campaigns: Campaign[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateTemplateRequest {
  applicationId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: TemplateVariable[];
  description?: string;
  isActive?: boolean;
}

export interface CreateCampaignRequest {
  name: string;
  applicationId: string;
  templateId: string;
  identityId: string;
  subject?: string;
  scheduledAt?: string;
  recipients: Array<string | { email: string; variables?: Record<string, any> }>;
  variables?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface CreateIdentityRequest {
  applicationId: string;
  type: 'EMAIL' | 'DOMAIN';
  value: string;
}

// Get Applications Hook
export const useGetApplications = (page: number = 1, limit: number = 10, search?: string) => {
  const { setApplications } = useApplicationsStore();

  return useQuery({
    queryKey: ['applications', page, limit, search],
    queryFn: async (): Promise<ApplicationsResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response = await axiosInstance.get(`/applications?${params}`);
      setApplications(response.data.data.applications);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Single Application by ID Hook
export const useGetApplicationById = (id: string) => {
  const { setCurrentApplication } = useApplicationsStore();

  return useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/applications/${id}`);
      setCurrentApplication(response.data.data.application);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Templates by Application ID Hook
export const useGetTemplatesByApplicationId = (applicationId: string, page: number = 1, limit: number = 10, search?: string) => {
  const { setTemplates } = useApplicationsStore();

  return useQuery({
    queryKey: ['templates', applicationId, page, limit, search],
    queryFn: async (): Promise<TemplatesResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response = await axiosInstance.get(`/templates/application/${applicationId}?${params}`);
      setTemplates(response.data.data.templates);
      return response.data;
    },
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Single Template Hook
export const useGetTemplateById = (id: string) => {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/templates/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Campaigns Hook
export const useGetCampaigns = (page: number = 1, limit: number = 10, search?: string, status?: string, applicationId?: string) => {
  const { setCampaigns } = useApplicationsStore();

  return useQuery({
    queryKey: ['campaigns', page, limit, search, status, applicationId],
    queryFn: async (): Promise<CampaignsResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status && { status }),
        ...(applicationId && { applicationId })
      });
      
      const response = await axiosInstance.get(`/campaigns?${params}`);
      setCampaigns(response.data.data.campaigns);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Application Stats Hook
export const useGetApplicationStats = (id: string) => {
  return useQuery({
    queryKey: ['application-stats', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/applications/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Identity by ID Hook
export const useGetIdentityById = (id: string) => {
  return useQuery({
    queryKey: ['identity', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/identities/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Get Identity Verify Status Hook
export const useGetIdentityVerifyStatus = (id: string) => {
  return useQuery({
    queryKey: ['identity-verify-status', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/identities/${id}/verify-status`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Create Application Hook
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  const { addApplication } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async (data: CreateApplicationRequest) => {
      const response = await axiosInstance.post('/applications', data);
      return response.data;
    },
    onSuccess: (data) => {
      addApplication(data.data.application);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create application';
      toast.error(errorMessage);
    },
  });
};

// Create Template Hook
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { addTemplate } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const response = await axiosInstance.post('/templates', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      addTemplate(data.data.template);
      queryClient.invalidateQueries({ queryKey: ['templates', variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create template';
      toast.error(errorMessage);
    },
  });
};

// Update Template Hook
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const { updateTemplate } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTemplateRequest> }) => {
      const response = await axiosInstance.put(`/templates/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      updateTemplate(variables.id, data.data.template);
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update template';
      toast.error(errorMessage);
    },
  });
};

// Delete Template Hook
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { removeTemplate } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/templates/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      removeTemplate(id);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete template';
      toast.error(errorMessage);
    },
  });
};

// Create Campaign Hook
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const { addCampaign } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async (data: CreateCampaignRequest) => {
      const response = await axiosInstance.post('/campaigns', data);
      return response.data;
    },
    onSuccess: (data) => {
      addCampaign(data.data.campaign);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create campaign';
      toast.error(errorMessage);
    },
  });
};

// Update Application Hook
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  const { updateApplication } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateApplicationRequest> }) => {
      const response = await axiosInstance.put(`/applications/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      updateApplication(variables.id, data.data.application);
      queryClient.invalidateQueries({ queryKey: ['application', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update application';
      toast.error(errorMessage);
    },
  });
};

// Delete Application Hook
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  const { removeApplication } = useApplicationsStore();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/applications/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      removeApplication(id);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete application';
      toast.error(errorMessage);
    },
  });
};

// Create Identity Hook
export const useCreateIdentity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateIdentityRequest) => {
      const response = await axiosInstance.post('/identities', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['application-stats', variables.applicationId] });
      toast.success('Identity created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create identity';
      toast.error(errorMessage);
    },
  });
};

// Delete Identity Hook
export const useDeleteIdentity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/identities/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: ['application-stats'] });
      toast.success('Identity deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete identity';
      toast.error(errorMessage);
    },
  });
};