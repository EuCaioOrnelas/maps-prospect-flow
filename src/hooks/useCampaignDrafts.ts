import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lead } from '@/pages/WhatsAppCampaign';

export interface CampaignDraft {
  id: string;
  user_id: string;
  name: string;
  step: 'leads' | 'message_type' | 'messages' | 'settings' | 'summary';
  selected_leads: Lead[];
  messages: string[];
  campaign_name: string;
  delay_seconds_min: number;
  delay_seconds_max: number;
  pause_after_contacts: number;
  pause_minutes: number;
  enable_smart_pause: boolean;
  is_scheduled: boolean;
  scheduled_date: string | null;
  scheduled_time: string;
  selected_number_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useCampaignDrafts = () => {
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDrafts = useCallback(async () => {
    if (!user) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    try {
      // Use type assertion since campaign_drafts may not be in generated types yet
      const { data, error } = await (supabase
        .from('campaign_drafts' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }) as any);

      if (error) throw error;
      
      // Parse the data properly
      const parsedDrafts = (data || []).map((draft: any) => ({
        ...draft,
        selected_leads: Array.isArray(draft.selected_leads) 
          ? draft.selected_leads 
          : JSON.parse(draft.selected_leads || '[]'),
        messages: Array.isArray(draft.messages)
          ? draft.messages
          : JSON.parse(draft.messages || '["","","","",""]'),
      })) as CampaignDraft[];
      
      setDrafts(parsedDrafts);
    } catch (err) {
      console.error('Error fetching drafts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const MAX_DRAFTS = 3;

  const saveDraft = useCallback(async (draftData: {
    step: 'leads' | 'messages' | 'settings' | 'summary';
    selectedLeads: Lead[];
    messages: string[];
    campaignName: string;
    delaySecondsMin: number;
    delaySecondsMax: number;
    pauseAfterContacts: number;
    pauseMinutes: number;
    enableSmartPause: boolean;
    isScheduled: boolean;
    scheduledDate: Date | undefined;
    scheduledTime: string;
    selectedNumberId: string | null;
  }): Promise<string | null> => {
    if (!user) return null;

    // Only save if there's meaningful data
    const hasData = draftData.selectedLeads.length > 0 || 
                    draftData.messages.some(m => m.trim()) ||
                    draftData.campaignName.trim();
    
    if (!hasData && !currentDraftId) return null;

    // If creating a new draft and already at max, delete the oldest
    if (!currentDraftId && drafts.length >= MAX_DRAFTS) {
      const oldestDraft = drafts[drafts.length - 1]; // Last in list is oldest (ordered by updated_at desc)
      await (supabase
        .from('campaign_drafts' as any)
        .delete()
        .eq('id', oldestDraft.id) as any);
      
      setDrafts(prev => prev.filter(d => d.id !== oldestDraft.id));
    }

    const draftPayload = {
      user_id: user.id,
      name: draftData.campaignName || `Rascunho ${new Date().toLocaleDateString('pt-BR')}`,
      step: draftData.step,
      selected_leads: draftData.selectedLeads,
      messages: draftData.messages,
      campaign_name: draftData.campaignName,
      delay_seconds_min: draftData.delaySecondsMin,
      delay_seconds_max: draftData.delaySecondsMax,
      pause_after_contacts: draftData.pauseAfterContacts,
      pause_minutes: draftData.pauseMinutes,
      enable_smart_pause: draftData.enableSmartPause,
      is_scheduled: draftData.isScheduled,
      scheduled_date: draftData.scheduledDate?.toISOString() || null,
      scheduled_time: draftData.scheduledTime,
      selected_number_id: draftData.selectedNumberId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (currentDraftId) {
        // Update existing draft
        const { error } = await (supabase
          .from('campaign_drafts' as any)
          .update(draftPayload)
          .eq('id', currentDraftId) as any);

        if (error) throw error;
        
        setDrafts(prev => prev.map(d => 
          d.id === currentDraftId 
            ? { ...d, ...draftPayload, selected_leads: draftData.selectedLeads, messages: draftData.messages } as CampaignDraft
            : d
        ));
        
        return currentDraftId;
      } else {
        // Create new draft
        const { data, error } = await (supabase
          .from('campaign_drafts' as any)
          .insert(draftPayload)
          .select()
          .single() as any);

        if (error) throw error;
        
        const newDraft = {
          ...data,
          selected_leads: draftData.selectedLeads,
          messages: draftData.messages,
        } as CampaignDraft;
        
        setDrafts(prev => [newDraft, ...prev]);
        setCurrentDraftId(data.id);
        
        return data.id;
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      return null;
    }
  }, [user, currentDraftId]);

  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const { error } = await (supabase
        .from('campaign_drafts' as any)
        .delete()
        .eq('id', draftId) as any);

      if (error) throw error;
      
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting draft:', err);
      return false;
    }
  }, [currentDraftId]);

  const loadDraft = useCallback((draft: CampaignDraft) => {
    setCurrentDraftId(draft.id);
    return draft;
  }, []);

  const clearCurrentDraft = useCallback(async () => {
    if (currentDraftId) {
      await deleteDraft(currentDraftId);
    }
    setCurrentDraftId(null);
  }, [currentDraftId, deleteDraft]);

  const resetDraftState = useCallback(() => {
    setCurrentDraftId(null);
  }, []);

  return {
    drafts,
    loading,
    currentDraftId,
    saveDraft,
    deleteDraft,
    loadDraft,
    clearCurrentDraft,
    resetDraftState,
    fetchDrafts,
  };
};
