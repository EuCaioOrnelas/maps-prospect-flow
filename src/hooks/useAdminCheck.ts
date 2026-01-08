import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook seguro para verificar se o usuário atual é admin
 * Usa verificação server-side via RPC para evitar manipulação
 */
export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        console.log('[useAdminCheck] No user, setting isAdmin=false');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('[useAdminCheck] Checking admin status for user:', user.id);
        // Verificação server-side segura
        const { data, error } = await supabase.rpc('is_current_user_admin');
        
        if (error) {
          console.error('[useAdminCheck] RPC error:', error);
          setIsAdmin(false);
        } else {
          console.log('[useAdminCheck] RPC result:', data);
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error('[useAdminCheck] Exception:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
};
