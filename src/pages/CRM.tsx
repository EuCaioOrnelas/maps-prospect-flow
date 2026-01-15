import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM, type Lead } from '@/hooks/useCRM';
import { KanbanBoardWithScroll } from '@/components/crm/KanbanBoardWithScroll';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';
import { ExportLeadsButton } from '@/components/crm/ExportLeadsButton';
import { BulkActionsBar } from '@/components/crm/BulkActionsBar';
import { CRMFilters, type CRMFiltersState } from '@/components/crm/CRMFilters';
import { CRMMetrics } from '@/components/crm/CRMMetrics';
import { ManageStagesDialog } from '@/components/crm/ManageStagesDialog';
import { MobileBlockOverlay } from '@/components/crm/MobileBlockOverlay';
import { type ColumnWidth } from '@/components/crm/KanbanColumn';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { BackgroundGlow } from '@/components/layout/BackgroundGlow';
import { SEO } from '@/components/SEO';
import { Users, Plus, Trash2, FlaskConical, MessageCircle, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CRM() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const isMobile = useIsMobile();
  const [showBetaWarning, setShowBetaWarning] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const {
    stages, 
    leads, 
    isLoading, 
    selectedLead, 
    setSelectedLead,
    moveLeadToStage,
    updateLead,
    deleteLead,
    deleteLeads,
    createLead,
    addNote,
    fetchNotes,
    fetchActivities,
    updateStage,
    createStage,
    deleteStage,
    moveStage,
  } = useCRM();

  const [filters, setFilters] = useState<CRMFiltersState>({
    search: '',
    stage: '',
    whatsappStatus: '',
    tags: [],
    origin: '',
    whatsappNumberId: '',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const columnWidth: ColumnWidth = 'medium';

  // Check if beta warning should be shown (every 30 days)
  useEffect(() => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const acceptedAt = localStorage.getItem('crm_beta_warning_accepted_at');
    
    if (!acceptedAt) {
      setShowBetaWarning(true);
      return;
    }
    
    const acceptedDate = new Date(acceptedAt).getTime();
    const now = Date.now();
    if (now - acceptedDate > THIRTY_DAYS_MS) {
      setShowBetaWarning(true);
    }
  }, []);

  const handleCloseBetaWarning = useCallback(() => {
    localStorage.setItem('crm_beta_warning_accepted_at', new Date().toISOString());
    setShowBetaWarning(false);
  }, []);

  // Fetch custom origins
  const { data: customOrigins = [], refetch: refetchOrigins } = useQuery({
    queryKey: ['lead-origins', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('lead_origins')
        .select('name')
        .eq('user_id', user.id)
        .order('name');
      return data?.map(o => o.name) || [];
    },
    enabled: !!user,
  });

  // Fetch WhatsApp numbers for filter
  const { data: whatsappNumbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('whatsapp_numbers')
        .select('id, name, phone_number')
        .eq('user_id', user.id)
        .order('name');
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user profile for sidebar
  const { data: sidebarProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Get all unique tags and origins from leads
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    leads.forEach(lead => {
      lead.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [leads]);

  const availableOrigins = useMemo(() => {
    const originsSet = new Set<string>(['Manual', 'Google Maps', 'Importação', 'Campanha', 'Indicação', 'Site', 'Rede Social']);
    leads.forEach(lead => {
      if (lead.origin) originsSet.add(lead.origin);
    });
    customOrigins.forEach(origin => originsSet.add(origin));
    return Array.from(originsSet).sort();
  }, [leads, customOrigins]);

  // EARLY RETURNS AFTER ALL HOOKS
  if (isMobile) {
    return <MobileBlockOverlay />;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        lead.company_name?.toLowerCase().includes(searchLower) ||
        lead.contact_name?.toLowerCase().includes(searchLower) ||
        lead.phone.includes(filters.search) ||
        lead.category?.toLowerCase().includes(searchLower) ||
        lead.city?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Stage filter
    if (filters.stage && lead.pipeline_stage_id !== filters.stage) {
      return false;
    }

    // WhatsApp status filter
    if (filters.whatsappStatus && lead.whatsapp_status !== filters.whatsappStatus) {
      return false;
    }

    // Origin filter
    if (filters.origin && lead.origin !== filters.origin) {
      return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => lead.tags?.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // WhatsApp number filter
    if (filters.whatsappNumberId && lead.whatsapp_number_id !== filters.whatsappNumberId) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const leadDate = new Date(lead.created_at);
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (leadDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const leadDate = new Date(lead.created_at);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (leadDate > toDate) return false;
    }

    return true;
  });

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const handleLeadMove = async (leadId: string, stageId: string) => {
    await moveLeadToStage(leadId, stageId);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedLead(null);
    }
  };

  const handleAddOrigin = useCallback(async (originName: string) => {
    if (!user) return;
    try {
      await supabase
        .from('lead_origins')
        .insert({ user_id: user.id, name: originName });
      refetchOrigins();
    } catch (error) {
      console.error('Error adding origin:', error);
    }
  }, [user, refetchOrigins]);

  const handleUpdateOrigin = useCallback(async (oldName: string, newName: string) => {
    if (!user) return;
    try {
      await supabase
        .from('lead_origins')
        .update({ name: newName })
        .eq('user_id', user.id)
        .eq('name', oldName);
      refetchOrigins();
    } catch (error) {
      console.error('Error updating origin:', error);
      throw error;
    }
  }, [user, refetchOrigins]);

  const handleDeleteOrigin = useCallback(async (name: string) => {
    if (!user) return;
    try {
      await supabase
        .from('lead_origins')
        .delete()
        .eq('user_id', user.id)
        .eq('name', name);
      refetchOrigins();
    } catch (error) {
      console.error('Error deleting origin:', error);
      throw error;
    }
  }, [user, refetchOrigins]);

  const checkLeadExists = useCallback(async (phone: string): Promise<boolean> => {
    if (!user) return false;
    const normalizedPhone = phone.replace(/\D/g, '');
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', normalizedPhone)
      .limit(1);
    return (data?.length || 0) > 0;
  }, [user]);

  // Bulk selection handlers
  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  const selectAllLeads = useCallback(() => {
    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
  }, [filteredLeads]);

  const toggleColumnSelection = useCallback((stageId: string, leadIds: string[]) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      const allSelected = leadIds.every(id => newSet.has(id));
      if (allSelected) {
        // Deselect all in column
        leadIds.forEach(id => newSet.delete(id));
      } else {
        // Select all in column
        leadIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
    setBulkSelectMode(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    await deleteLeads(Array.from(selectedLeadIds));
    clearSelection();
  }, [deleteLeads, selectedLeadIds, clearSelection]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Glows */}
      <BackgroundGlow />
      
      <SEO 
        title="CRM - WiizeProspect"
        description="Gerencie seus leads e vendas com o CRM integrado ao WhatsApp"
      />
      
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-14 pt-14 lg:pt-0 min-h-screen">
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/50 relative z-10">
            <div className="p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl lg:text-2xl font-bold text-foreground">CRM</h1>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs font-semibold">
                        BETA
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filteredLeads.filter(l => l.pipeline_stage_id != null).length} leads no funil
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <CRMMetrics stages={stages} leads={filteredLeads} />

              {/* Filters */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <CRMFilters 
                    stages={stages}
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableTags={availableTags}
                    whatsappNumbers={whatsappNumbers}
                    availableOrigins={availableOrigins}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setManageStagesOpen(true)}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Colunas
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gerenciar colunas do funil</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={bulkSelectMode ? "secondary" : "outline"}
                        size="icon"
                        onClick={() => {
                          setBulkSelectMode(!bulkSelectMode);
                          if (bulkSelectMode) clearSelection();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{bulkSelectMode ? 'Cancelar seleção' : 'Excluir em massa'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <ExportLeadsButton leads={filteredLeads} stages={stages} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Exportar leads para Excel</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="default" onClick={() => setAddLeadOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Lead
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar novo lead manualmente</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-hidden p-4 lg:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <KanbanBoardWithScroll
                stages={stages}
                leads={filteredLeads}
                onLeadClick={(lead) => {
                  if (bulkSelectMode) {
                    toggleLeadSelection(lead.id);
                  } else {
                    handleLeadClick(lead);
                  }
                }}
                onLeadMove={handleLeadMove}
                selectedLead={selectedLead}
                filteredStageId={filters.stage}
                bulkSelectMode={bulkSelectMode}
                selectedLeadIds={selectedLeadIds}
                onSelectAllInColumn={toggleColumnSelection}
                onUpdateLeadName={async (leadId, newName) => {
                  await updateLead(leadId, { contact_name: newName });
                }}
                columnWidth={columnWidth}
              />
            )}
          </div>
        </div>
      </main>

      {/* Lead Detail Dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        stages={stages}
        origins={customOrigins}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onUpdate={async (id, updates) => {
          const result = await updateLead(id, updates);
          return result as Lead | null;
        }}
        onDelete={deleteLead}
        onMoveToStage={moveLeadToStage}
        onAddNote={addNote}
        onFetchNotes={fetchNotes}
        onFetchActivities={async (leadId) => {
          const activities = await fetchActivities(leadId);
          return activities.map(a => ({
            ...a,
            metadata: (a.metadata || {}) as Record<string, unknown>,
          }));
        }}
        onAddOrigin={handleAddOrigin}
        onUpdateOrigin={handleUpdateOrigin}
        onDeleteOrigin={handleDeleteOrigin}
      />

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        stages={stages}
        origins={availableOrigins}
        onAddLead={createLead}
        onAddOrigin={handleAddOrigin}
        checkLeadExists={checkLeadExists}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedLeadIds.size}
        totalCount={filteredLeads.length}
        onSelectAll={selectAllLeads}
        onClearSelection={clearSelection}
        onDelete={handleBulkDelete}
        isAllSelected={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
      />

      {/* Manage Stages Dialog */}
      <ManageStagesDialog
        open={manageStagesOpen}
        onOpenChange={setManageStagesOpen}
        stages={stages}
        leads={leads}
        onCreateStage={createStage}
        onUpdateStage={updateStage}
        onDeleteStage={deleteStage}
        onMoveStage={moveStage}
      />

      {/* Beta Warning Dialog */}
      <Dialog open={showBetaWarning} onOpenChange={setShowBetaWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">CRM em Versão Beta</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                O <strong>CRM integrado</strong> está atualmente em versão <span className="text-amber-500 font-semibold">beta</span> e pode apresentar alguns bugs ou comportamentos inesperados.
              </p>
              <p>
                Estamos trabalhando constantemente para melhorar a experiência, adicionar novas funcionalidades e corrigir possíveis falhas.
              </p>
              <div className="bg-muted/50 p-3 rounded-lg border">
                <p className="text-sm">
                  <strong>Encontrou algum problema?</strong><br />
                  Entre em contato conosco pela página de <span className="text-primary font-medium">Contato</span> que vamos trabalhar para corrigir o mais rápido possível!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/contact')}
              className="w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ir para Contato
            </Button>
            <Button 
              onClick={handleCloseBetaWarning}
              className="w-full sm:w-auto"
            >
              Entendi, continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
