import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DAILY_LIMIT_PER_NUMBER = 200;

interface BalanceInfo {
  available: number;
  dailyLimit: number;
  used: number;
  reserved: number;
  canSend: boolean;
  shortfall: number;
}

interface ReservationDetail {
  campaignId: string;
  campaignName: string;
  reservedCount: number;
  scheduledAt: string;
}

export const useCampaignBalance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get balance for a number on a specific date
  const getBalanceForDate = useCallback(async (
    numberId: string,
    targetDate: Date,
    leadsCount: number = 0
  ): Promise<BalanceInfo> => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = targetDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const isToday = dateStr === today;

      let usedToday = 0;

      if (isToday) {
        // Get actual daily_sent_count for today
        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('daily_sent_count, last_sent_at')
          .eq('id', numberId)
          .single();

        if (numberData) {
          const todayDate = new Date().toDateString();
          const lastSentDate = numberData.last_sent_at 
            ? new Date(numberData.last_sent_at).toDateString() 
            : null;
          usedToday = lastSentDate === todayDate ? (numberData.daily_sent_count || 0) : 0;
        }
      }

      // Get reservations for this date (from scheduled campaigns)
      const { data: reservations } = await supabase
        .from('campaign_daily_reservations')
        .select('reserved_count')
        .eq('whatsapp_number_id', numberId)
        .eq('reserved_date', dateStr);

      const totalReserved = (reservations || []).reduce(
        (sum, r) => sum + (r.reserved_count || 0), 
        0
      );

      const available = Math.max(0, DAILY_LIMIT_PER_NUMBER - usedToday - totalReserved);
      const canSend = leadsCount <= available;
      const shortfall = leadsCount > available ? leadsCount - available : 0;

      return {
        available,
        dailyLimit: DAILY_LIMIT_PER_NUMBER,
        used: usedToday,
        reserved: totalReserved,
        canSend,
        shortfall
      };
    } catch (err) {
      console.error('Error getting balance:', err);
      setError('Erro ao verificar saldo');
      return {
        available: 0,
        dailyLimit: DAILY_LIMIT_PER_NUMBER,
        used: 0,
        reserved: 0,
        canSend: false,
        shortfall: 0
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get detailed reservations for a number on a date
  const getReservationsForDate = useCallback(async (
    numberId: string,
    targetDate: Date
  ): Promise<ReservationDetail[]> => {
    const dateStr = targetDate.toISOString().split('T')[0];

    const { data: reservations } = await supabase
      .from('campaign_daily_reservations')
      .select(`
        reserved_count,
        campaign_id,
        whatsapp_campaigns!inner (
          name,
          scheduled_at
        )
      `)
      .eq('whatsapp_number_id', numberId)
      .eq('reserved_date', dateStr);

    return (reservations || []).map((r: any) => ({
      campaignId: r.campaign_id,
      campaignName: r.whatsapp_campaigns?.name || 'Campanha',
      reservedCount: r.reserved_count,
      scheduledAt: r.whatsapp_campaigns?.scheduled_at || ''
    }));
  }, []);

  // Create a reservation for a scheduled campaign
  const createReservation = useCallback(async (
    campaignId: string,
    numberId: string,
    scheduledDate: Date,
    leadsCount: number
  ): Promise<boolean> => {
    const dateStr = scheduledDate.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('campaign_daily_reservations')
        .upsert({
          campaign_id: campaignId,
          whatsapp_number_id: numberId,
          reserved_date: dateStr,
          reserved_count: leadsCount
        }, {
          onConflict: 'campaign_id,whatsapp_number_id,reserved_date'
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error creating reservation:', err);
      return false;
    }
  }, []);

  // Remove reservation when campaign is cancelled or completed
  const removeReservation = useCallback(async (campaignId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('campaign_daily_reservations')
        .delete()
        .eq('campaign_id', campaignId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error removing reservation:', err);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    getBalanceForDate,
    getReservationsForDate,
    createReservation,
    removeReservation,
    DAILY_LIMIT_PER_NUMBER
  };
};
