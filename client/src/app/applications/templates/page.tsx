"use client"

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  Send, 
  Calendar, 
  Users, 
  Mail, 
  Search, 
  Filter,
  MoreVertical,
  FileText,
  Settings,
  Activity,
  Clock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  useGetTemplatesByApplicationId, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate,
  useGetCampaigns,
  useCreateCampaign,
  Template,
  TemplateVariable,
  CreateTemplateRequest,
  CreateCampaignRequest
} from '@/hooks/use-applications';
import { useApplicationsStore } from '@/store/applications';

const TemplatesPage = () => {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  
  // Store state
  const { 
    currentApplication, 
    isTemplateBuilderOpen, 
    setIsTemplateBuilderOpen,
    isCampaignModalOpen,
    setIsCampaignModalOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    deleteTarget,
    setDeleteTarget
  } = useApplicationsStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [templateFormData, setTemplateFormData] = useState<CreateTemplateRequest>({
    applicationId: applicationId as string,
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: [],
    description: '',
    isActive: true
  });
  const [campaignFormData, setCampaignFormData] = useState<CreateCampaignRequest>({
    name: '',
    applicationId: applicationId as string,
    templateId: '',
    identityId: '',
    recipients: [],
    variables: {},
    settings: {}
  });
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    type: 'STRING',
    required: true,
    defaultValue: ''
  });
  const [recipientEmails, setRecipientEmails] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  // API hooks
  const { data: templatesData, isLoading: templatesLoading } = useGetTemplatesByApplicationId(
    applicationId as string, 1, 50, searchTerm
  );
  const { data: campaignsData, isLoading: campaignsLoading } = useGetCampaigns(
    1, 50, '', '', applicationId as string
  );
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const createCampaignMutation = useCreateCampaign();

  const templates = templatesData?.data?.templates || [];
  const campaigns = campaignsData?.data?.campaigns || [];

  // Reset form when modal closes
  useEffect(() => {
    if (!isTemplateBuilderOpen) {
      setTemplateFormData({
        applicationId: applicationId as string,
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        variables: [],
        description: '',
        isActive: true
      });
      setSelectedTemplate(null);
      setIsEditMode(false);
    }
  }, [isTemplateBuilderOpen, applicationId]);

  // Handle template form submission
  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && selectedTemplate) {
        await updateTemplateMutation.mutateAsync({
          id: selectedTemplate.id,
          data: templateFormData
        });
      } else {
        await createTemplateMutation.mutateAsync(templateFormData);
      }
      setIsTemplateBuilderOpen(false);
    } catch (error) {
      console.error('Template operation failed:', error);
    }
  };

  // Handle campaign form submission
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailList = recipientEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    try {
      await createCampaignMutation.mutateAsync({
        ...campaignFormData,
        recipients: emailList
      });
      setIsCampaignModalOpen(false);
      setCampaignFormData({
        name: '',
        applicationId: applicationId as string,
        templateId: '',
        identityId: '',
        recipients: [],
        variables: {},
        settings: {}
      });
      setRecipientEmails('');
    } catch (error) {
      console.error('Campaign creation failed:', error);
    }
  };

  // Add variable to template
  const addVariable = () => {
    if (newVariable.name.trim()) {
      setTemplateFormData({
        ...templateFormData,
        variables: [...(templateFormData.variables || []), newVariable]
      });
      setNewVariable({
        name: '',
        type: 'STRING',
        required: true,
        defaultValue: ''
      });
    }
  };

  // Remove variable from template
  const removeVariable = (index: number) => {
    const updatedVariables = templateFormData.variables?.filter((_, i) => i !== index) || [];
    setTemplateFormData({
      ...templateFormData,
      variables: updatedVariables
    });
  };

  // Open template for editing
  const openTemplateForEdit = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      applicationId: template.applicationId,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      variables: template.variables,
      description: template.description || '',
      isActive: template.isActive
    });
    setIsEditMode(true);
    setIsTemplateBuilderOpen(true);
  };

  // Open campaign modal for template
  const openCampaignModal = (template: Template) => {
    setSelectedTemplate(template);
    setCampaignFormData({
      ...campaignFormData,
      templateId: template.id,
      name: `${template.name} Campaign`
    });
    setIsCampaignModalOpen(true);
  };

  // Handle template deletion
  const handleDeleteTemplate = async () => {
    if (deleteTarget?.type === 'template' && deleteTarget.id) {
      try {
        await deleteTemplateMutation.mutateAsync(deleteTarget.id);
        setIsDeleteConfirmOpen(false);
        setDeleteTarget(null);
      } catch (error) {
        console.error('Template deletion failed:', error);
      }
    }
  };

  // Preview template
  const previewTemplateHtml = (template: Template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'SENDING': return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentApplication && applicationId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground">
              Manage templates and campaigns for {currentApplication?.name}
            </p>
          </div>
          <Button onClick={() => setIsTemplateBuilderOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-8">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Send className="h-4 w-4" />
              Campaigns ({campaigns.length})
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first email template to get started
                </p>
                <Button onClick={() => setIsTemplateBuilderOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => previewTemplateHtml(template)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTemplateForEdit(template)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCampaignModal(template)}>
                                <Send className="h-4 w-4 mr-2" />
                                Create Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setDeleteTarget({ type: 'template', id: template.id });
                                  setIsDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Subject:</p>
                        <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                      </div>
                      
                      {template.variables.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Variables ({template.variables.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable) => (
                              <Badge key={variable.name} variant="outline" className="text-xs">
                                {variable.name}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {template.timesUsed} uses
                          </span>
                        </div>
                        <span>{formatDate(template.updatedAt)}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => previewTemplateHtml(template)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => openCampaignModal(template)}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Campaign
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            {campaignsLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Send className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create a campaign from one of your templates
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription>
                            Template: {campaign.template.name}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Recipients</p>
                          <p className="text-muted-foreground">{campaign.totalRecipients}</p>
                        </div>
                        <div>
                          <p className="font-medium">Sent</p>
                          <p className="text-muted-foreground">{campaign.sentCount}</p>
                        </div>
                        <div>
                          <p className="font-medium">Delivered</p>
                          <p className="text-muted-foreground">{campaign.deliveredCount}</p>
                        </div>
                        <div>
                          <p className="font-medium">Created</p>
                          <p className="text-muted-foreground">{formatDate(campaign.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Builder Modal */}
      <Dialog open={isTemplateBuilderOpen} onOpenChange={setIsTemplateBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Design your email template with custom variables and content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTemplateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({...templateFormData, name: e.target.value})}
                  placeholder="Welcome Email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="template-subject">Email Subject *</Label>
                <Input
                  id="template-subject"
                  value={templateFormData.subject}
                  onChange={(e) => setTemplateFormData({...templateFormData, subject: e.target.value})}
                  placeholder="Welcome to {{organizationName}}"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({...templateFormData, description: e.target.value})}
                placeholder="Brief description of this template"
                rows={2}
              />
            </div>

            {/* Variables Section */}
            <div>
              <Label className="text-base font-semibold">Template Variables</Label>
              <p className="text-sm text-muted-foreground mb-4">
                {`Add variables that can be dynamically replaced in your template using {{variableName}} syntax.`}
              </p>
              
              <div className="space-y-4">
                {templateFormData.variables && templateFormData.variables.length > 0 && (
                  <div className="space-y-2">
                    {templateFormData.variables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <p className="text-sm font-medium">{variable.name}</p>
                          </div>
                          <div>
                            <Badge variant="outline">{variable.type}</Badge>
                          </div>
                          <div>
                            <Badge variant={variable.required ? "default" : "secondary"}>
                              {variable.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {variable.defaultValue || "No default"}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariable(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Variable name"
                    value={newVariable.name}
                    onChange={(e) => setNewVariable({...newVariable, name: e.target.value})}
                  />
                  <Select
                    value={newVariable.type}
                    onValueChange={(value: any) => setNewVariable({...newVariable, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRING">String</SelectItem>
                      <SelectItem value="URL">URL</SelectItem>
                      <SelectItem value="NUMBER">Number</SelectItem>
                      <SelectItem value="BOOLEAN">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Default value"
                    value={newVariable.defaultValue}
                    onChange={(e) => setNewVariable({...newVariable, defaultValue: e.target.value})}
                  />
                  <Button type="button" onClick={addVariable} size="sm">
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="template-html">HTML Content *</Label>
              <Textarea
                id="template-html"
                value={templateFormData.htmlContent}
                onChange={(e) => setTemplateFormData({...templateFormData, htmlContent: e.target.value})}
                placeholder="Enter your HTML email template content"
                rows={12}
                className="font-mono text-sm"
                required
              />
            </div>

            <div>
              <Label htmlFor="template-text">Plain Text Content (Optional)</Label>
              <Textarea
                id="template-text"
                value={templateFormData.textContent}
                onChange={(e) => setTemplateFormData({...templateFormData, textContent: e.target.value})}
                placeholder="Plain text version of your email"
                rows={8}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTemplateBuilderOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 
                  (isEditMode ? 'Updating...' : 'Creating...') : 
                  (isEditMode ? 'Update Template' : 'Create Template')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Creation Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Create a new email campaign using {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name *</Label>
              <Input
                id="campaign-name"
                value={campaignFormData.name}
                onChange={(e) => setCampaignFormData({...campaignFormData, name: e.target.value})}
                placeholder="Summer Newsletter"
                required
              />
            </div>

            <div>
              <Label htmlFor="campaign-identity">From Identity *</Label>
              <Select
                value={campaignFormData.identityId}
                onValueChange={(value) => setCampaignFormData({...campaignFormData, identityId: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sender identity" />
                </SelectTrigger>
                <SelectContent>
                  {currentApplication?.identities?.map((identity) => (
                    <SelectItem key={identity.id} value={identity.id}>
                      {identity.value} ({identity.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="campaign-recipients">Recipients (one email per line) *</Label>
              <Textarea
                id="campaign-recipients"
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                rows={6}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCampaignMutation.isPending}>
                {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              This is how your email template will appear to recipients
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] border rounded-lg">
            {previewTemplate && (
              <div className="p-4">
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium">Subject: {previewTemplate.subject}</p>
                </div>
                <div 
                  dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }}
                  className="prose max-w-none"
                />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              and remove it from all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;