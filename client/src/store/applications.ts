// store/applications.ts - Extended version with templates and campaigns
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

interface ApplicationsState {
  // Application management
  currentApplication: Application | null;
  applications: Application[];
  
  // Template management
  templates: Template[];
  currentTemplate: Template | null;
  
  // Campaign management
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  
  // Identity management
  selectedIdentity: Identity | null;
  
  // Stats
  applicationStats: ApplicationStats | null;
  
  // UI State
  isIdentityModalOpen: boolean;
  isCreateIdentityModalOpen: boolean;
  isTemplateBuilderOpen: boolean;
  isCampaignModalOpen: boolean;
  isDeleteConfirmOpen: boolean;
  deleteTarget: { type: 'application' | 'template' | 'campaign' | 'identity'; id: string } | null;
  
  // Actions - Application
  setCurrentApplication: (application: Application | null) => void;
  setApplications: (applications: Application[]) => void;
  addApplication: (application: Application) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  removeApplication: (id: string) => void;
  clearApplications: () => void;
  
  // Actions - Template
  setTemplates: (templates: Template[]) => void;
  setCurrentTemplate: (template: Template | null) => void;
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  removeTemplate: (id: string) => void;
  clearTemplates: () => void;
  
  // Actions - Campaign
  setCampaigns: (campaigns: Campaign[]) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  removeCampaign: (id: string) => void;
  clearCampaigns: () => void;
  
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
  setIsTemplateBuilderOpen: (open: boolean) => void;
  setIsCampaignModalOpen: (open: boolean) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  setDeleteTarget: (target: { type: 'application' | 'template' | 'campaign' | 'identity'; id: string } | null) => void;
}

export const useApplicationsStore = create<ApplicationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentApplication: null,
      applications: [],
      templates: [],
      currentTemplate: null,
      campaigns: [],
      currentCampaign: null,
      selectedIdentity: null,
      applicationStats: null,
      isIdentityModalOpen: false,
      isCreateIdentityModalOpen: false,
      isTemplateBuilderOpen: false,
      isCampaignModalOpen: false,
      isDeleteConfirmOpen: false,
      deleteTarget: null,

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
            : state.currentApplication,
          // Clear related data when application is removed
          templates: state.templates.filter(t => t.applicationId !== id),
          campaigns: state.campaigns.filter(c => c.applicationId !== id),
        });
      },

      clearApplications: () => set({
        currentApplication: null,
        applications: [],
        templates: [],
        campaigns: [],
        selectedIdentity: null,
        applicationStats: null,
      }),

      // Template management actions
      setTemplates: (templates) => set({ templates }),

      setCurrentTemplate: (template) => set({ currentTemplate: template }),

      addTemplate: (template) => {
        const state = get();
        set({ 
          templates: [...state.templates, template]
        });
      },

      updateTemplate: (id, updates) => {
        const state = get();
        const updatedTemplates = state.templates.map(template => 
          template.id === id ? { ...template, ...updates } : template
        );
        
        set({
          templates: updatedTemplates,
          currentTemplate: state.currentTemplate?.id === id 
            ? { ...state.currentTemplate, ...updates }
            : state.currentTemplate
        });
      },

      removeTemplate: (id) => {
        const state = get();
        set({
          templates: state.templates.filter(template => template.id !== id),
          currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
          // Remove campaigns that used this template
          campaigns: state.campaigns.filter(c => c.templateId !== id),
        });
      },

      clearTemplates: () => set({ 
        templates: [], 
        currentTemplate: null 
      }),

      // Campaign management actions
      setCampaigns: (campaigns) => set({ campaigns }),

      setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

      addCampaign: (campaign) => {
        const state = get();
        set({ 
          campaigns: [...state.campaigns, campaign]
        });
      },

      updateCampaign: (id, updates) => {
        const state = get();
        const updatedCampaigns = state.campaigns.map(campaign => 
          campaign.id === id ? { ...campaign, ...updates } : campaign
        );
        
        set({
          campaigns: updatedCampaigns,
          currentCampaign: state.currentCampaign?.id === id 
            ? { ...state.currentCampaign, ...updates }
            : state.currentCampaign
        });
      },

      removeCampaign: (id) => {
        const state = get();
        set({
          campaigns: state.campaigns.filter(campaign => campaign.id !== id),
          currentCampaign: state.currentCampaign?.id === id ? null : state.currentCampaign
        });
      },

      clearCampaigns: () => set({ 
        campaigns: [], 
        currentCampaign: null 
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
                templates: app._count?.templates || 0,
                emailLogs: app._count?.emailLogs || 0,
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
                templates: app._count?.templates || 0,
                emailLogs: app._count?.emailLogs || 0,
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

      setIsTemplateBuilderOpen: (open) => set({
        isTemplateBuilderOpen: open
      }),

      setIsCampaignModalOpen: (open) => set({
        isCampaignModalOpen: open
      }),
      
      setIsDeleteConfirmOpen: (open) => set({
        isDeleteConfirmOpen: open,
        deleteTarget: open ? get().deleteTarget : null
      }),

      setDeleteTarget: (target) => set({
        deleteTarget: target
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