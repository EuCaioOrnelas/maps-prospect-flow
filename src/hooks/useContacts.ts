import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Contact } from './useChat';

export const useContacts = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      return;
    }

    setContacts(data || []);
    setIsLoading(false);
  }, [user]);

  const createContact = useCallback(async (contact: Partial<Contact>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        phone: contact.phone!,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        origin: contact.origin,
        notes: contact.notes,
        tags: contact.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      throw error;
    }

    await fetchContacts();
    return data;
  }, [user, fetchContacts]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: updates.name,
        email: updates.email,
        company: updates.company,
        origin: updates.origin,
        notes: updates.notes,
        tags: updates.tags,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      throw error;
    }

    await fetchContacts();
    return data;
  }, [user, fetchContacts]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }

    await fetchContacts();
  }, [user, fetchContacts]);

  const getContactByPhone = useCallback(async (phone: string) => {
    if (!user) return null;

    const cleanPhone = phone.replace(/\D/g, '');
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone', cleanPhone)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting contact:', error);
    }

    return data;
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    getContactByPhone,
  };
};
