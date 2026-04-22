// Auth context - provides authentication state and methods
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { generateFingerprint, getClientIP } from '@/lib/fingerprint';
import { trackSignupCompleted, getLandingPageSlug } from '@/hooks/useLandingPageTracking';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  searches_used: number;
  searches_limit: number;
  plan: string;
  last_searches_reset?: string;
  subscription_current_period_end?: string;
  created_at?: string;
  avatar_url?: string;
  trial_start_at?: string;
  trial_end_at?: string;
  trial_will_charge_at?: string;
  trial_auto_charge_cancelled?: boolean;
  trial_plan_chosen?: string;
  trial_asaas_subscription_id?: string;
  trial_messages_sent?: number;
  trial_leads_used?: number;
  trial_flows_used?: number;
  trial_campaigns_used?: number;
  is_blocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  isTrialing: boolean;
  isBlocked: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate trial status
  // Trial pode rodar tanto em plano "free" quanto nos planos pagos (start/growth/scale)
  // durante a janela de 7 dias com cobrança agendada via trial_will_charge_at.
  const calculateTrialStatus = (profile?: Profile | null) => {
    if (!profile) return { isExpired: false, daysRemaining: 0, isTrialing: false };
    const willCharge = profile.trial_will_charge_at;

    // Caso 1: trial pago com cartão (Stripe) — usa trial_will_charge_at como fonte da verdade
    if (willCharge) {
      const endDate = new Date(willCharge);
      const now = new Date();
      const msRemaining = endDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      const isExpired = msRemaining <= 0;
      // Continua exibindo o teste até o fim do período, mesmo se a cobrança automática já foi cancelada.
      const isTrialing = !isExpired;
      return { isExpired, daysRemaining, isTrialing };
    }

    // Caso 2: plano pago já efetivado (sem trial pendente) — não está em trial
    if (profile.plan && profile.plan !== 'free') {
      return { isExpired: false, daysRemaining: 0, isTrialing: false };
    }

    // Caso 3: trial legado via trial_end_at (free)
    if (profile.trial_end_at) {
      const endDate = new Date(profile.trial_end_at);
      const now = new Date();
      const msRemaining = endDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      return { isExpired: msRemaining <= 0, daysRemaining, isTrialing: msRemaining > 0 };
    }

    // Caso 4: free sem trial registrado — assume 7 dias
    if (!profile.trial_start_at) {
      return { isExpired: false, daysRemaining: 7, isTrialing: true };
    }

    const trialStart = new Date(profile.trial_start_at);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 7 - daysPassed);
    const isExpired = daysPassed >= 7;
    return { isExpired, daysRemaining, isTrialing: !isExpired };
  };

  const trialStatus = calculateTrialStatus(profile);
  const isTrialExpired = trialStatus.isExpired;
  const trialDaysRemaining = trialStatus.daysRemaining;
  const isBlocked = profile?.is_blocked === true;

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const reconcilePendingAsaasCheckout = async (userId: string, email?: string | null) => {
    try {
      const pendingQueries = [
        supabase
          .from('checkout_leads')
          .select('stripe_session_id, email, user_id, created_at')
          .eq('checkout_completed', false)
          .eq('user_id', userId)
          .like('stripe_session_id', 'asaas_pixauto_%')
          .order('created_at', { ascending: false })
          .limit(3),
      ];

      if (email) {
        pendingQueries.push(
          supabase
            .from('checkout_leads')
            .select('stripe_session_id, email, user_id, created_at')
            .eq('checkout_completed', false)
            .eq('email', email)
            .like('stripe_session_id', 'asaas_pixauto_%')
            .order('created_at', { ascending: false })
            .limit(3)
        );
      }

      const results = await Promise.allSettled(pendingQueries);
      const pendingPixIds = Array.from(
        new Set(
          results.flatMap((result) => {
            if (result.status !== 'fulfilled') {
              return [];
            }

            return (result.value.data ?? [])
              .map((lead) => lead.stripe_session_id)
              .filter((sessionId): sessionId is string => !!sessionId)
              .map((sessionId) => sessionId.replace('asaas_pixauto_', ''));
          })
        )
      ).slice(0, 3);

      if (pendingPixIds.length === 0) {
        return false;
      }

      console.log('[AuthContext] Reconciling pending Asaas checkouts', { userId, pendingPixIds });

      const paymentChecks = await Promise.allSettled(
        pendingPixIds.map((pixId) =>
          supabase.functions.invoke('check-asaas-payment', {
            body: { pixId },
          })
        )
      );

      const hasConfirmedPayment = paymentChecks.some(
        (result) =>
          result.status === 'fulfilled' &&
          !result.value.error &&
          ['PAID', 'CONFIRMED', 'RECEIVED'].includes(result.value.data?.status)
      );

      if (!hasConfirmedPayment) {
        return false;
      }

      console.log('[AuthContext] Pending Asaas checkout confirmed during account sync', { userId });
      return true;
    } catch (err) {
      console.error('[AuthContext] Pending Asaas reconciliation failed:', err);
      return false;
    }
  };

  // Sincroniza estado da conta (assinatura + reset mensal de buscas) e atualiza o profile.
  const syncAccountState = async (userId: string, reason: string, email?: string | null) => {
    try {
      console.log(`[AuthContext] Sync account state (${reason})...`);

      const results = await Promise.allSettled([
        supabase.functions.invoke('check-subscription'),
        supabase.rpc('check_and_reset_monthly_searches', { user_id: userId }),
        reconcilePendingAsaasCheckout(userId, email),
      ]);

      if (results[0].status === 'rejected') {
        console.error('[AuthContext] Error checking subscription:', results[0].reason);
      } else if (results[0].value?.error) {
        console.error('[AuthContext] Error checking subscription:', results[0].value.error);
      }

      if (results[1].status === 'rejected') {
        console.error('[AuthContext] Error resetting monthly searches:', results[1].reason);
      } else if (results[1].value?.error) {
        console.error('[AuthContext] Error resetting monthly searches:', results[1].value.error);
      }

      if (results[2].status === 'rejected') {
        console.error('[AuthContext] Error reconciling pending Asaas checkout:', results[2].reason);
      }

      const updatedProfile = await fetchProfile(userId);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('[AuthContext] Account sync failed:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const handleRefocus = async () => {
      try {
        // Only run when page becomes visible / focused
        if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') {
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          syncAccountState(session.user.id, 'refocus', session.user.email);
        }
      } catch (e) {
        console.error('[AuthContext] Refocus sync failed:', e);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile after auth state change using setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);

            // Sync account after login or token refresh to ensure plan/searches are up to date
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setTimeout(() => {
                syncAccountState(session.user.id, event, session.user.email);
              }, 500);
            }

            // Track signup completion for landing page analytics on first SIGNED_IN
            // This fires after email verification when the user actually becomes authenticated
            if (event === 'SIGNED_IN') {
              const trackingKey = `signup_tracked_${session.user.id}`;
              if (!sessionStorage.getItem(trackingKey)) {
                sessionStorage.setItem(trackingKey, 'true');
                
                // Check database to avoid cross-session duplicates
                const { data: existingSource } = await supabase
                  .from('user_landing_source')
                  .select('id')
                  .eq('user_id', session.user.id)
                  .maybeSingle();
                
                if (!existingSource) {
                  // Use slug from user metadata (works across devices) with localStorage fallback
                  const metaSlug = session.user.user_metadata?.landing_page_slug;
                  await trackSignupCompleted(session.user.id, metaSlug).catch(console.error);
                  
                  // Track for trial automation system
                  await supabase.from('trial_product_events').insert({
                    user_id: session.user.id,
                    event_name: 'user_signed_up',
                    event_source: 'frontend',
                    metadata: { method: 'email' },
                  }).then(({ error }) => {
                    if (error) console.error('[AuthContext] Error tracking trial event:', error);
                  });
                  
                  console.log('[AuthContext] Signup tracked for landing page:', metaSlug || 'index');
                } else {
                  console.log('[AuthContext] Signup already tracked (db check) - skipping');
                }
              }
            }
          }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const data = await fetchProfile(session.user.id);
          setProfile(data);

          // Sync on initial load
          setTimeout(() => {
            syncAccountState(session.user.id, 'initial', session.user.email);
          }, 500);
        }
      } catch (error) {
        console.error('[AuthContext] Initial session load failed:', error);
      } finally {
        setLoading(false);
      }
    })();

    // Periodic sync (keeps monthly reset working even if user stays logged-in for long time)
    const intervalId = window.setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        syncAccountState(session.user.id, 'interval', session.user.email);
      }
    }, 1000 * 60 * 60 * 6); // 6h

    // When user comes back, re-sync automatically
    window.addEventListener('focus', handleRefocus);
    document.addEventListener('visibilitychange', handleRefocus);

    return () => {
      window.clearInterval(intervalId);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleRefocus);
      document.removeEventListener('visibilitychange', handleRefocus);
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    // STEP 1+2: Run whitelist check AND fingerprint/IP collection IN PARALLEL
    let isWhitelisted = false;
    let fingerprint = '';
    let clientIP = '';
    
    try {
      console.log('[AuthContext] Starting parallel whitelist + fingerprint check for:', email);
      
      const [whitelistResult, fpResult, ipResult] = await Promise.allSettled([
        supabase.functions.invoke('check-stripe-whitelist', { body: { email } }),
        generateFingerprint(),
        getClientIP()
      ]);
      
      // Process whitelist result
      if (whitelistResult.status === 'fulfilled') {
        const { data: whitelistData, error: whitelistError } = whitelistResult.value;
        if (!whitelistError && whitelistData?.whitelisted) {
          isWhitelisted = true;
          console.log('[AuthContext] Email is whitelisted - Stripe paying customer:', whitelistData.reason);
        } else {
          console.log('[AuthContext] Email not whitelisted:', whitelistData?.reason || whitelistError?.message);
        }
      } else {
        console.error('[AuthContext] Whitelist check failed (continuing):', whitelistResult.reason);
      }
      
      // Process fingerprint/IP results
      fingerprint = fpResult.status === 'fulfilled' ? fpResult.value : '';
      clientIP = ipResult.status === 'fulfilled' ? ipResult.value : 'unknown';
      
      console.log('[AuthContext] Parallel checks done:', { 
        whitelisted: isWhitelisted,
        fingerprint: fingerprint ? fingerprint.substring(0, 8) + '...' : 'none', 
        ip: clientIP 
      });
    } catch (e) {
      console.error('[AuthContext] Parallel checks error (continuing):', e);
    }
    
    // STEP 3: FRAUD CHECK - Skip entirely if whitelisted
    let fraudCheckSkipped = false;
    
    if (isWhitelisted) {
      fraudCheckSkipped = true;
      console.log('[AuthContext] Fraud check SKIPPED - user is Stripe paying customer (whitelisted)');
    } else if (fingerprint && clientIP && clientIP !== 'unknown') {
      try {
        const { data: fraudCheck, error: fraudError } = await supabase.rpc('check_signup_fraud', {
          p_fingerprint: fingerprint,
          p_ip: clientIP
        });
        
        if (fraudError) {
          // Log but DON'T block signup on fraud check error
          console.error('[AuthContext] Fraud check error (allowing signup):', fraudError);
          fraudCheckSkipped = true;
        } else if (fraudCheck) {
          // Handle fraud check result
          const fraudResult = fraudCheck as { 
            allowed?: boolean; 
            is_suspicious?: boolean; 
            message?: string;
            reason?: string;
            reasons?: string[] 
          };
          
          // Only block if explicitly not allowed AND reason is severe
          // Don't block for minor suspicions
          if (fraudResult.allowed === false && fraudResult.reason === 'blocked_fingerprint') {
            console.warn('[AuthContext] Signup blocked - fingerprint blocked:', fraudResult.reason);
            return { 
              error: new Error(fraudResult.message || 'Não foi possível criar a conta. Entre em contato com o suporte.') 
            };
          }
          
          // Log suspicious activity but ALLOW signup
          // Most "suspicious" flags are false positives
          if (fraudResult.is_suspicious) {
            console.warn('[AuthContext] Suspicious signup detected (allowing anyway):', fraudResult.reasons);
            // Continue with signup - don't block
          }
        }
      } catch (rpcError) {
        // Any error in fraud check should NOT block signup
        console.error('[AuthContext] Fraud check exception (allowing signup):', rpcError);
        fraudCheckSkipped = true;
      }
    } else {
      fraudCheckSkipped = true;
      console.log('[AuthContext] Fraud check skipped - missing fingerprint or IP');
    }
    
    // STEP 4: Proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { 
            name,
            signup_ip: clientIP || 'unknown',
            device_fingerprint: fingerprint || 'unknown',
            fraud_check_skipped: fraudCheckSkipped,
            stripe_whitelisted: isWhitelisted,
            terms_accepted: 'true',
            landing_page_slug: getLandingPageSlug()
          }
      }
    });


    // Profile data (IP, fingerprint, terms) is now set by the handle_new_user trigger
    // via user metadata, so no separate update is needed.

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isTrialExpired,
        trialDaysRemaining,
        isTrialing: trialStatus.isTrialing,
        isBlocked,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
