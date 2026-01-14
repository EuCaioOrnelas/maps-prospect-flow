import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM, type Lead } from '@/hooks/useCRM';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { LeadDetailPanel } from '@/components/crm/LeadDetailPanel';
import { CRMFilters, type CRMFiltersState } from '@/components/crm/CRMFilters';
import { CRMMetrics } from '@/components/crm/CRMMetrics';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { BackgroundGlow } from '@/components/layout/BackgroundGlow';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import CRMComingSoon from './CRMComingSoon';

// Emails com acesso ao CRM
const CRM_ALLOWED_EMAILS = [
  'caiowiize@gmail.com'
];

export default function CRM() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  // Verificar se o usuário tem acesso ao CRM
  const hasCRMAccess = profile?.email && CRM_ALLOWED_EMAILS.includes(profile.email.toLowerCase());
  
  // Se não tem acesso, mostra a página "Em Breve"
  if (!hasCRMAccess) {
    return <CRMComingSoon />;
  }

  const {
    stages, 
    leads, 
    isLoading, 
    selectedLead, 
    setSelectedLead,
    moveLeadToStage,
    updateLead,
    deleteLead,
    createLead,
    addNote,
    fetchNotes,
    fetchActivities,
  } = useCRM();

  const [filters, setFilters] = useState<CRMFiltersState>({
    search: '',
    stage: '',
    whatsappStatus: '',
    tags: [],
    origin: '',
    whatsappNumberId: '',
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

  // Fetch user profile for sidebar (already available from useAuth)
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

  // Get all unique tags from leads
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    leads.forEach(lead => {
      lead.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [leads]);

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

    return true;
  });

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLeadMove = async (leadId: string, stageId: string) => {
    await moveLeadToStage(leadId, stageId);
  };

  const handleOpenChat = (conversationId: string) => {
    navigate(`/chat?conversation=${conversationId}`);
  };


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
          <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-foreground">CRM</h1>
                    <p className="text-sm text-muted-foreground">
                      {leads.length} leads no funil
                    </p>
                  </div>
                </div>

              </div>

              {/* Metrics */}
              <CRMMetrics stages={stages} leads={leads} />

              {/* Filters */}
              <div className="mt-4">
                <CRMFilters 
                  stages={stages}
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableTags={availableTags}
                  whatsappNumbers={whatsappNumbers}
                />
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
              <div className="h-full flex gap-4">
                <div className={`flex-1 overflow-hidden transition-all duration-300 ${selectedLead ? 'lg:mr-96' : ''}`}>
                  <KanbanBoard
                    stages={stages}
                    leads={filteredLeads}
                    onLeadClick={handleLeadClick}
                    onLeadMove={handleLeadMove}
                    selectedLead={selectedLead}
                  />
                </div>

                {/* Lead Detail Panel */}
                {selectedLead && (
                  <div className="fixed right-0 top-0 h-screen w-full lg:w-96 bg-background border-l border-border z-50 lg:z-30 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between p-4 border-b border-border lg:pt-4">
                      <h2 className="font-semibold text-foreground">Detalhes do Lead</h2>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedLead(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <LeadDetailPanel
                      lead={selectedLead}
                      stages={stages}
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
                      onClose={() => setSelectedLead(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
