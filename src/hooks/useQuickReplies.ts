import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QuickReply {
  id: string;
  user_id: string;
  tag: string;
  name: string;
  text_content: string | null;
  audio_url: string | null;
  image_url: string | null;
  delay_seconds: number;
  created_at: string;
  updated_at: string;
}

export const useQuickReplies = () => {
  const { user } = useAuth();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuickReplies = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching quick replies:', error);
      return;
    }

    setQuickReplies((data as QuickReply[]) || []);
    setIsLoading(false);
  }, [user]);

  const createQuickReply = useCallback(async (quickReply: Omit<QuickReply, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('quick_replies')
      .insert({
        user_id: user.id,
        tag: quickReply.tag,
        name: quickReply.name,
        text_content: quickReply.text_content,
        audio_url: quickReply.audio_url,
        image_url: quickReply.image_url,
        delay_seconds: quickReply.delay_seconds || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quick reply:', error);
      throw error;
    }

    await fetchQuickReplies();
    return data as QuickReply;
  }, [user, fetchQuickReplies]);

  const updateQuickReply = useCallback(async (id: string, updates: Partial<Omit<QuickReply, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('quick_replies')
      .update({
        tag: updates.tag,
        name: updates.name,
        text_content: updates.text_content,
        audio_url: updates.audio_url,
        image_url: updates.image_url,
        delay_seconds: updates.delay_seconds,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quick reply:', error);
      throw error;
    }

    await fetchQuickReplies();
    return data as QuickReply;
  }, [user, fetchQuickReplies]);

  const deleteQuickReply = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('quick_replies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting quick reply:', error);
      throw error;
    }

    await fetchQuickReplies();
  }, [user, fetchQuickReplies]);

  const getQuickReplyByTag = useCallback((tag: string) => {
    return quickReplies.find(qr => qr.tag.toLowerCase() === tag.toLowerCase());
  }, [quickReplies]);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  return {
    quickReplies,
    isLoading,
    fetchQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    getQuickReplyByTag,
  };
};
