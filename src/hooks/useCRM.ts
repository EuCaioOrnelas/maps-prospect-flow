import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PipelineStage {
  id: string;
  user_id: string;
  name: string;
  position: number;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  category: string | null;
  city: string | null;
  region: string | null;
  google_maps_link: string | null;
  website: string | null;
  origin: string;
  prospected_at: string;
  ai_score: number;
  pipeline_stage_id: string | null;
  tags: string[];
  estimated_value: number;
  last_message_sent: string | null;
  last_message_sent_at: string | null;
  last_response: string | null;
  last_response_at: string | null;
  whatsapp_status: WhatsAppStatus;
  contact_id: string | null;
  conversation_id: string | null;
  whatsapp_number_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  whatsapp_number?: {
    id: string;
    name: string;
    phone_number: string | null;
  } | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type WhatsAppStatus = 
  | 'never_contacted'
  | 'message_sent'
  | 'replied'
  | 'in_conversation'
  | 'no_response'
  | 'blocked';

export const WHATSAPP_STATUS_LABELS: Record<WhatsAppStatus, string> = {
  never_contacted: 'Nunca contatado',
  message_sent: 'Mensagem enviada',
  replied: 'Respondeu',
  in_conversation: 'Em conversa',
  no_response: 'Sem resposta',
  blocked: 'Bloqueado/Inválido',
};

export const WHATSAPP_STATUS_COLORS: Record<WhatsAppStatus, string> = {
  never_contacted: 'bg-gray-100 text-gray-700',
  message_sent: 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  in_conversation: 'bg-primary/10 text-primary',
  no_response: 'bg-orange-100 text-orange-700',
  blocked: 'bg-red-100 text-red-700',
};

// Colunas padrão travadas (não podem ser editadas/excluídas)
export const LOCKED_STAGE_NAMES = ['Prospectado', 'Fechado (Ganho)', 'Perdido'];

// Verifica se uma coluna é travada
export const isLockedStage = (stageName: string) => LOCKED_STAGE_NAMES.includes(stageName);

const DEFAULT_STAGES: Omit<PipelineStage, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Prospectado', position: 0, color: '#6B7280', is_default: true },
  { name: 'Mensagem Enviada', position: 1, color: '#3B82F6', is_default: true },
  { name: 'Qualificado', position: 2, color: '#8B5CF6', is_default: true },
  { name: 'Em Negociação', position: 3, color: '#F59E0B', is_default: true },
  { name: 'Proposta Enviada', position: 4, color: '#EC4899', is_default: true },
  { name: 'Fechado (Ganho)', position: 5, color: '#22C55E', is_default: true },
  { name: 'Perdido', position: 6, color: '#EF4444', is_default: true },
];

export const useCRM = () => {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Fetch pipeline stages
  const fetchStages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching pipeline stages:', error);
      return;
    }

    // If no stages exist, create default ones
    if (!data || data.length === 0) {
      await createDefaultStages();
      return;
    }

    setStages(data);
  }, [user]);

  // Create default pipeline stages
  const createDefaultStages = async () => {
    if (!user) return;

    const stagesToInsert = DEFAULT_STAGES.map(stage => ({
      ...stage,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert(stagesToInsert)
      .select();

    if (error) {
      console.error('Error creating default stages:', error);
      return;
    }

    setStages(data || []);
  };

  // Fetch leads with whatsapp_number info
  // Only fetch leads that have conversation OR were prospected (from campaigns/search)
  const fetchLeads = useCallback(async () => {
    if (!user) return;

    // First query: leads with conversation_id
    const { data: leadsWithConversation, error: error1 } = await supabase
      .from('leads')
      .select(`
        *,
        whatsapp_number:whatsapp_numbers(id, name, phone_number)
      `)
      .eq('user_id', user.id)
      .not('conversation_id', 'is', null)
      .order('created_at', { ascending: false });

    // Second query: leads with whatsapp_status != never_contacted (and no conversation)
    const { data: leadsProspected, error: error2 } = await supabase
      .from('leads')
      .select(`
        *,
        whatsapp_number:whatsapp_numbers(id, name, phone_number)
      `)
      .eq('user_id', user.id)
      .is('conversation_id', null)
      .neq('whatsapp_status', 'never_contacted')
      .order('created_at', { ascending: false });

    const error = error1 || error2;

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    // Combine and dedupe leads
    const allLeads = [...(leadsWithConversation || []), ...(leadsProspected || [])];
    const uniqueLeads = allLeads.filter((lead, index, self) => 
      index === self.findIndex((l) => l.id === lead.id)
    );

    setLeads(uniqueLeads as Lead[]);
    setIsLoading(false);
  }, [user]);

  // Create lead
  const createLead = async (lead: Partial<Lead>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        phone: lead.phone!,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        category: lead.category,
        city: lead.city,
        region: lead.region,
        google_maps_link: lead.google_maps_link,
        website: lead.website,
        origin: lead.origin || 'manual',
        pipeline_stage_id: lead.pipeline_stage_id || stages[0]?.id,
        tags: lead.tags || [],
        estimated_value: lead.estimated_value || 0,
        contact_id: lead.contact_id,
        conversation_id: lead.conversation_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      throw error;
    }

    // Log activity
    await logActivity(data.id, 'created', 'Lead criado');
    
    return data;
  };

  // Update lead
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      throw error;
    }

    return data;
  };

  // Move lead to stage
  const moveLeadToStage = async (leadId: string, stageId: string) => {
    const lead = leads.find(l => l.id === leadId);
    const newStage = stages.find(s => s.id === stageId);
    
    if (!lead || !newStage) return;

    await updateLead(leadId, { pipeline_stage_id: stageId });
    
    // Log activity
    await logActivity(leadId, 'stage_changed', `Movido para ${newStage.name}`);
  };

  // Delete lead
  const deleteLead = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  };

  // Delete multiple leads
  const deleteLeads = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting leads:', error);
      throw error;
    }
  };

  // Log activity
  const logActivity = async (leadId: string, activityType: string, description: string, metadata?: Record<string, unknown>) => {
    if (!user) return;

    await supabase.from('lead_activities').insert([{
      lead_id: leadId,
      user_id: user.id,
      activity_type: activityType,
      description,
      metadata: (metadata || {}) as Record<string, string | number | boolean | null>,
    }]);
  };

  // Add note
  const addNote = async (leadId: string, content: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      throw error;
    }

    return data;
  };

  // Fetch notes for a lead
  const fetchNotes = async (leadId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return data || [];
  };

  // Fetch activities for a lead
  const fetchActivities = async (leadId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  };

  // Get leads by stage
  const getLeadsByStage = useCallback((stageId: string) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  }, [leads]);

  // Get stage metrics
  const getStageMetrics = useCallback((stageId: string) => {
    const stageLeads = getLeadsByStage(stageId);
    const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
    return {
      count: stageLeads.length,
      totalValue,
    };
  }, [getLeadsByStage]);

  // Update stage
  const updateStage = async (id: string, updates: Partial<PipelineStage>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stage:', error);
      throw error;
    }

    await fetchStages();
    return data;
  };

  // Create new stage
  const createStage = async (name: string, color: string) => {
    if (!user) return null;

    // Pega a posição antes de "Fechado (Ganho)" e "Perdido"
    const sortedStages = [...stages].sort((a, b) => a.position - b.position);
    const lockedEndStages = sortedStages.filter(s => 
      s.name === 'Fechado (Ganho)' || s.name === 'Perdido'
    );
    const editableStages = sortedStages.filter(s => 
      s.name !== 'Fechado (Ganho)' && s.name !== 'Perdido'
    );
    
    // Nova posição = última posição editável + 1
    const newPosition = editableStages.length > 0 
      ? Math.max(...editableStages.map(s => s.position)) + 1 
      : 1;

    // Atualiza posições das colunas travadas no final
    for (let i = 0; i < lockedEndStages.length; i++) {
      await supabase
        .from('pipeline_stages')
        .update({ position: newPosition + 1 + i })
        .eq('id', lockedEndStages[i].id)
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        user_id: user.id,
        name,
        color,
        position: newPosition,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating stage:', error);
      throw error;
    }

    await fetchStages();
    return data;
  };

  // Delete stage and move leads to Prospectado
  const deleteStage = async (stageId: string) => {
    if (!user) return;

    const stageToDelete = stages.find(s => s.id === stageId);
    if (!stageToDelete || isLockedStage(stageToDelete.name)) {
      throw new Error('Não é possível excluir esta coluna');
    }

    // Encontra a coluna Prospectado
    const prospectadoStage = stages.find(s => s.name === 'Prospectado');
    if (!prospectadoStage) {
      throw new Error('Coluna Prospectado não encontrada');
    }

    // Move todos os leads para Prospectado
    const { error: moveError } = await supabase
      .from('leads')
      .update({ pipeline_stage_id: prospectadoStage.id })
      .eq('pipeline_stage_id', stageId)
      .eq('user_id', user.id);

    if (moveError) {
      console.error('Error moving leads:', moveError);
      throw moveError;
    }

    // Exclui a coluna
    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stageId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting stage:', error);
      throw error;
    }

    // Reordena as posições
    await reorderStages();
    await fetchStages();
    await fetchLeads();
  };

  // Move stage up or down
  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    if (!user) return;

    const stage = stages.find(s => s.id === stageId);
    if (!stage || isLockedStage(stage.name)) return;

    // Ordena stages
    const sortedStages = [...stages].sort((a, b) => a.position - b.position);
    
    // Encontra índices das colunas travadas
    const prospectadoIndex = sortedStages.findIndex(s => s.name === 'Prospectado');
    const fechadoIndex = sortedStages.findIndex(s => s.name === 'Fechado (Ganho)');
    const perdidoIndex = sortedStages.findIndex(s => s.name === 'Perdido');
    
    const currentIndex = sortedStages.findIndex(s => s.id === stageId);
    
    // Calcula limites para movimento
    const minIndex = prospectadoIndex + 1; // Não pode ir antes de Prospectado
    const maxIndex = Math.min(fechadoIndex, perdidoIndex) - 1; // Não pode ir depois de Fechado/Perdido
    
    let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Verifica se o movimento é válido
    if (targetIndex < minIndex || targetIndex > maxIndex) return;
    
    // Pula colunas travadas
    const targetStage = sortedStages[targetIndex];
    if (isLockedStage(targetStage.name)) return;

    // Troca posições
    const tempPosition = stage.position;
    
    await supabase
      .from('pipeline_stages')
      .update({ position: targetStage.position })
      .eq('id', stage.id)
      .eq('user_id', user.id);

    await supabase
      .from('pipeline_stages')
      .update({ position: tempPosition })
      .eq('id', targetStage.id)
      .eq('user_id', user.id);

    await fetchStages();
  };

  // Reorder stages to ensure consistent positions
  const reorderStages = async () => {
    if (!user) return;

    const sortedStages = [...stages].sort((a, b) => a.position - b.position);
    
    // Separa colunas por tipo
    const prospectado = sortedStages.find(s => s.name === 'Prospectado');
    const fechado = sortedStages.find(s => s.name === 'Fechado (Ganho)');
    const perdido = sortedStages.find(s => s.name === 'Perdido');
    const editableStages = sortedStages.filter(s => !isLockedStage(s.name));

    // Reordena: Prospectado (0), editáveis (1..n), Fechado (n+1), Perdido (n+2)
    const orderedStages = [
      prospectado,
      ...editableStages,
      fechado,
      perdido,
    ].filter(Boolean) as PipelineStage[];

    for (let i = 0; i < orderedStages.length; i++) {
      if (orderedStages[i].position !== i) {
        await supabase
          .from('pipeline_stages')
          .update({ position: i })
          .eq('id', orderedStages[i].id)
          .eq('user_id', user.id);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchStages();
      fetchLeads();
    }
  }, [user, fetchStages, fetchLeads]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const leadsChannel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    const stagesChannel = supabase
      .channel('stages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_stages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchStages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(stagesChannel);
    };
  }, [user, fetchLeads, fetchStages]);

  return {
    stages,
    leads,
    isLoading,
    selectedLead,
    setSelectedLead,
    fetchStages,
    fetchLeads,
    createLead,
    updateLead,
    moveLeadToStage,
    deleteLead,
    deleteLeads,
    addNote,
    fetchNotes,
    fetchActivities,
    getLeadsByStage,
    getStageMetrics,
    updateStage,
    createStage,
    deleteStage,
    moveStage,
    logActivity,
  };
};
