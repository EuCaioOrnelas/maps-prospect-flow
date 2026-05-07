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
// MobileBlockOverlay removed - CRM now works on mobile
import { type ColumnWidth } from '@/components/crm/KanbanColumn';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { BackgroundGlow } from '@/components/layout/BackgroundGlow';
import { SEO } from '@/components/SEO';
import { Users, Plus, Trash2, FlaskConical, MessageCircle, Settings2, Eye, EyeOff, Smartphone } from 'lucide-react';
import { NumbersManager } from '@/components/whatsapp/NumbersManager';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { usePhonePrivacy } from '@/hooks/usePhonePrivacy';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoScoreTracking } from '@/hooks/useAutoScoreTracking';
import { usePagePopupDismiss } from '@/hooks/usePagePopupDismiss';
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
  const { showPopup: showBetaWarning, dismiss: dismissBetaWarning, canClose: canCloseBeta, countdown: betaCountdown } = usePagePopupDismiss("crm_beta_warning");
  useAutoScoreTracking("crm");
  const { hidden: phoneHidden, toggle: togglePhonePrivacy } = usePhonePrivacy();
  const { numbers: waNumbers, setNumbers: setWaNumbers, maxNumbers: waMaxNumbers, fetchNumbers: refetchWaNumbers } = useWhatsAppNumbers();

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
  const [addLeadDefaultStageId, setAddLeadDefaultStageId] = useState<string | undefined>();
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const [numbersManagerOpen, setNumbersManagerOpen] = useState(false);
  const columnWidth: ColumnWidth = 'medium';

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

  // Fetch agent-silenced stage names (columns where agents won't respond)
  // Só conta stages referenciadas por agentes ativos/pausados; se o agente foi
  // excluído ou trocou de stage, a coluna volta ao normal automaticamente.
  const { data: agentSilencedStages = new Set<string>(), refetch: refetchSilencedStages } = useQuery({
    queryKey: ['agent-silenced-stages', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase
        .from('ai_agents')
        .select('crm_stage_on_end, crm_stage_on_unknown')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused']);
      const stageNames = new Set<string>();
      data?.forEach(agent => {
        if (agent.crm_stage_on_end) stageNames.add(agent.crm_stage_on_end);
        if (agent.crm_stage_on_unknown) stageNames.add(agent.crm_stage_on_unknown);
      });
      return stageNames;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  // Realtime: refetch sempre que ai_agents mudar (insert/update/delete)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`crm-ai-agents-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_agents', filter: `user_id=eq.${user.id}` },
        () => { refetchSilencedStages(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetchSilencedStages]);

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

  const toggleColumnSelection = useCallback((stageId: string, leadIds: string[]) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      const allSelected = leadIds.every(id => newSet.has(id));
      if (allSelected) {
        leadIds.forEach(id => newSet.delete(id));
      } else {
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

  // ═══════════════════════════════════════════════════════
  // EARLY RETURNS AFTER ALL HOOKS
  // ═══════════════════════════════════════════════════════

  // Mobile is now supported - no block overlay

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter leads
  const filteredLeads = leads.filter(lead => {
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
    if (filters.stage && lead.pipeline_stage_id !== filters.stage) return false;
    if (filters.whatsappStatus && lead.whatsapp_status !== filters.whatsappStatus) return false;
    if (filters.origin && lead.origin !== filters.origin) return false;
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => lead.tags?.includes(tag));
      if (!hasMatchingTag) return false;
    }
    if (filters.whatsappNumberId && lead.whatsapp_number_id !== filters.whatsappNumberId) return false;
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

  const selectAllLeads = () => {
    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      
      <SEO 
        title="CRM - Wiize"
        description="Gerencie seus leads e vendas com o CRM integrado ao WhatsApp"
      />
      
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/50 relative z-10">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">CRM</h1>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs font-semibold gap-1">
                        <FlaskConical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        BETA
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {filteredLeads.filter(l => l.pipeline_stage_id != null).length} leads no funil
                    </p>
                  </div>
                </div>
              </div>

              <CRMMetrics stages={stages} leads={filteredLeads} />

              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <CRMFilters 
                    stages={stages}
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableTags={availableTags}
                    whatsappNumbers={whatsappNumbers}
                    availableOrigins={availableOrigins}
                  />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={phoneHidden ? "secondary" : "outline"}
                        size="icon"
                        onClick={togglePhonePrivacy}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        aria-label={phoneHidden ? "Mostrar finais dos telefones" : "Ocultar finais dos telefones"}
                      >
                        {phoneHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {phoneHidden ? "Mostrar finais dos telefones" : "Ocultar finais dos telefones"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNumbersManagerOpen(true)}
                        className="h-8 sm:h-9 gap-2"
                      >
                        <Smartphone className="w-4 h-4 sm:mr-0" />
                        <span className="hidden sm:inline">Gerenciar números</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Visualizar e conectar números de WhatsApp</TooltipContent>
                  </Tooltip>
                  <NumbersManager
                    numbers={waNumbers}
                    onNumbersChange={setWaNumbers}
                    maxNumbers={waMaxNumbers}
                    onConnect={() => { refetchWaNumbers(); }}
                    hideButtons
                    forceOpen={numbersManagerOpen}
                    onClose={() => setNumbersManagerOpen(false)}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageStagesOpen(true)}
                        className="h-8 sm:h-9"
                      >
                        <Settings2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Configurações</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configurações gerais do CRM</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={bulkSelectMode ? "secondary" : "outline"}
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
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
                      <Button size="sm" onClick={() => { setAddLeadDefaultStageId(undefined); setAddLeadOpen(true); }} className="h-8 sm:h-9">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Adicionar Lead</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar novo lead manualmente</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-hidden p-2 sm:p-4 lg:p-6">
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
                agentSilencedStages={agentSilencedStages}
                onAddLead={(stageId) => {
                  setAddLeadDefaultStageId(stageId);
                  setAddLeadOpen(true);
                }}
              />
            )}
          </div>
        </div>
      </main>

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

      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        stages={stages}
        origins={availableOrigins}
        defaultStageId={addLeadDefaultStageId}
        onAddLead={createLead}
        onAddOrigin={handleAddOrigin}
        checkLeadExists={checkLeadExists}
      />

      <BulkActionsBar
        selectedCount={selectedLeadIds.size}
        totalCount={filteredLeads.length}
        onSelectAll={selectAllLeads}
        onClearSelection={clearSelection}
        onDelete={handleBulkDelete}
        isAllSelected={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
      />

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
      <Dialog open={showBetaWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-lg max-h-[90vh] overflow-y-auto" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
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
              onClick={() => dismissBetaWarning()}
              disabled={!canCloseBeta}
              className="w-full sm:w-auto"
            >
              {canCloseBeta ? "Entendi, continuar" : `Aguarde ${betaCountdown}s`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
