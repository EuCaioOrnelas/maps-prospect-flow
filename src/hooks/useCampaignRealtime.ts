import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Campaign, Lead } from "@/pages/WhatsAppCampaign";

export interface RealtimeCampaign extends Campaign {
  isRealtime?: boolean;
}

export const useCampaignRealtime = () => {
  const [campaigns, setCampaigns] = useState<RealtimeCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns((data || []).map(campaign => ({
        ...campaign,
        messages: Array.isArray(campaign.messages) ? campaign.messages as string[] : [],
        leads: Array.isArray(campaign.leads) ? campaign.leads as unknown as Lead[] : [],
        isRealtime: true
      })));
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for campaigns');
    
    const channel = supabase
      .channel('campaigns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_campaigns',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime campaign update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newCampaign = payload.new as any;
            setCampaigns(prev => [{
              ...newCampaign,
              messages: Array.isArray(newCampaign.messages) ? newCampaign.messages : [],
              leads: Array.isArray(newCampaign.leads) ? newCampaign.leads : [],
              isRealtime: true
            }, ...prev]);
          }
          
          if (payload.eventType === 'UPDATE') {
            const updatedCampaign = payload.new as any;
            setCampaigns(prev => prev.map(c => 
              c.id === updatedCampaign.id 
                ? {
                    ...c,
                    ...updatedCampaign,
                    messages: Array.isArray(updatedCampaign.messages) ? updatedCampaign.messages : c.messages,
                    leads: Array.isArray(updatedCampaign.leads) ? updatedCampaign.leads : c.leads,
                    isRealtime: true
                  }
                : c
            ));
          }
          
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setCampaigns(prev => prev.filter(c => c.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Removing realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getActiveCampaigns = useCallback(() => {
    return campaigns.filter(c => 
      c.status === 'running' || c.status === 'paused' || c.status === 'scheduled'
    );
  }, [campaigns]);

  const getRunningCampaigns = useCallback(() => {
    return campaigns.filter(c => c.status === 'running');
  }, [campaigns]);

  return {
    campaigns,
    setCampaigns,
    loading,
    fetchCampaigns,
    getActiveCampaigns,
    getRunningCampaigns
  };
};
