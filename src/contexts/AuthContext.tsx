// Auth context - provides authentication state and methods
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { generateFingerprint, getClientIP } from '@/lib/fingerprint';
import { trackSignupCompleted, getLandingPageSlug } from '@/hooks/useLandingPageTracking';
import { attributePartnerLeadOnSignup, getPartnerReferralMetadata } from '@/hooks/usePartnerTracking';

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
  admin_assigned_plan?: boolean;
  is_custom_subscription?: boolean;
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
  /** ID do dono efetivo da conta (parent_owner_id || user.id). Usar como filtro `owner_user_id` em queries de dados compartilhados. */
  accountOwnerId: string | null;
  /** true se o usuário logado é um sub-usuário criado por um owner. */
  isSubUser: boolean;
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

    // Caso 2: plano pago já efetivado. Para planos comerciais comuns, a data
    // persistida também funciona como proteção caso o cron de expiração atrase.
    if (profile.plan && profile.plan !== 'free') {
      if (
        !profile.admin_assigned_plan &&
        !profile.is_custom_subscription &&
        profile.subscription_current_period_end
      ) {
        const periodEnd = new Date(profile.subscription_current_period_end).getTime();
        const graceEnd = periodEnd + 7 * 24 * 60 * 60 * 1000;
        if (Number.isFinite(periodEnd) && graceEnd <= Date.now()) {
          return { isExpired: true, daysRemaining: 0, isTrialing: false };
        }
      }
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

    // Sub-users (created by an owner) inherit owner's billing/plan/trial/block state.
    // They share the same account/subscription as the owner — funcionam como um segundo login da mesma conta.
    if (data && (data as any).parent_owner_id) {
      const { data: ownerData, error: ownerErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (data as any).parent_owner_id)
        .maybeSingle();
      if (!ownerErr && ownerData) {
        const inheritedKeys = [
          'plan', 'is_blocked', 'trial_start_at', 'trial_end_at',
          'trial_will_charge_at', 'subscription_status', 'subscription_id',
          'subscription_provider', 'subscription_current_period_end',
          'subscription_cancel_at', 'subscription_canceled_at',
          'stripe_customer_id', 'asaas_customer_id', 'features',
          'plan_features', 'custom_features', 'billing_cycle',
          // Limites/uso compartilhados com o owner — sub-usuários consomem da mesma cota
          'searches_used', 'searches_limit', 'extra_opportunities_packs',
          'bonus_searches', 'last_searches_reset',
        ];


        for (const k of inheritedKeys) {
          if (k in (ownerData as any)) (data as any)[k] = (ownerData as any)[k];
        }
      }
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

  // Shallow-compare profile to avoid re-renders when nothing meaningful changed.
  // Re-renders on every focus were causing unsaved drawer state (e.g. AI agent
  // prompt being typed) to be lost across the app.
  const profilesEqual = (a: Profile | null, b: Profile | null) => {
    if (a === b) return true;
    if (!a || !b) return false;
    const keys = Object.keys({ ...a, ...b }) as (keyof Profile)[];
    for (const k of keys) {
      if ((a as any)[k] !== (b as any)[k]) return false;
    }
    return true;
  };

  // Throttle: never run the full account sync more than once per 5 minutes
  // from focus/visibility events. Login / token refresh still sync immediately.
  const lastSyncAtRef = useRef<number>(0);
  const SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

  // Sincroniza estado da conta (assinatura + reset mensal de buscas) e atualiza o profile.
  const syncAccountState = async (userId: string, reason: string, email?: string | null) => {
    try {
      console.log(`[AuthContext] Sync account state (${reason})...`);
      lastSyncAtRef.current = Date.now();

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
      setProfile((prev) => (profilesEqual(prev, updatedProfile) ? prev : updatedProfile));
    } catch (err) {
      console.error('[AuthContext] Account sync failed:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile((prev) => (profilesEqual(prev, profileData) ? prev : profileData));
    }
  };

  useEffect(() => {
    const handleRefocus = async () => {
      try {
        // Only run when page becomes visible / focused
        if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') {
          return;
        }

        // Throttle: avoid hammering check-subscription on every tab switch /
        // focus, which was causing the whole app to re-render mid-typing and
        // losing unsaved state in flow editor drawers.
        if (Date.now() - lastSyncAtRef.current < SYNC_MIN_INTERVAL_MS) {
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
      (event, newSession) => {
        console.log('[AuthContext] Auth state changed:', event);

        // Atualiza session/user de forma estável: só troca a referência se o
        // user.id realmente mudou. Caso contrário, qualquer TOKEN_REFRESHED
        // (que ocorre periodicamente) re-renderizaria todos os consumidores
        // de useAuth e disparava efeitos que limpavam estado não-salvo
        // (ex.: prompt do agente de IA sendo digitado no drawer).
        setSession((prev) => {
          if (prev?.access_token === newSession?.access_token) return prev;
          return newSession;
        });
        setUser((prev) => {
          const nextId = newSession?.user?.id ?? null;
          const prevId = prev?.id ?? null;
          if (prevId === nextId) return prev;
          return newSession?.user ?? null;
        });

        // Só buscamos profile / sincronizamos em eventos que realmente exigem.
        // TOKEN_REFRESHED é silencioso para a UI.
        const isMeaningful = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED';

        if (newSession?.user && isMeaningful) {
          setTimeout(async () => {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile((prev) => (profilesEqual(prev, profileData) ? prev : profileData));

            if (event === 'SIGNED_IN') {
              setTimeout(() => {
                syncAccountState(newSession.user.id, event, newSession.user.email);
              }, 500);
            }

            if (event === 'SIGNED_IN') {
              supabase
                .rpc('account_mark_member_login')
                .then(({ error }) => {
                  if (error) console.debug('[AuthContext] last_login_at:', error.message);
                });
            }

            if (event === 'SIGNED_IN') {
              const trackingKey = `signup_tracked_${newSession.user.id}`;
              if (!sessionStorage.getItem(trackingKey)) {
                sessionStorage.setItem(trackingKey, 'true');

                const { data: existingSource } = await supabase
                  .from('user_landing_source')
                  .select('id')
                  .eq('user_id', newSession.user.id)
                  .maybeSingle();

                if (!existingSource) {
                  const metaSlug = newSession.user.user_metadata?.landing_page_slug;
                  await trackSignupCompleted(newSession.user.id, metaSlug).catch(console.error);

                  await supabase.from('trial_product_events').insert({
                    user_id: newSession.user.id,
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

                try {
                  await attributePartnerLeadOnSignup(
                    newSession.user.id,
                    newSession.user.email || '',
                    (newSession.user.user_metadata?.name as string) || undefined
                  );
                } catch (e) {
                  console.error('[AuthContext] Partner attribution failed:', e);
                }
              }
            }
          }, 0);
        } else if (!newSession?.user) {
          setProfile(null);
        }

        // loading só pode ir de true → false, nunca voltar a true.
        setLoading((prev) => (prev ? false : prev));
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

          supabase
            .rpc('account_mark_member_login')
            .then(({ error }) => {
              if (error) console.debug('[AuthContext] initial last_login_at:', error.message);
            });

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
    const redirectUrl = `${window.location.origin}/login?email_confirmed=true`;
    
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
            landing_page_slug: getLandingPageSlug(),
            ...getPartnerReferralMetadata()
          }
      }
    });


    // Profile data (IP, fingerprint, terms) is now set by the handle_new_user trigger
    // via user metadata, so no separate update is needed.

    if (!error && data?.user?.id) {
      try {
        const { markBlogAttribution } = await import("@/lib/blogAttribution");
        markBlogAttribution("trial_started", data.user.id);
      } catch (e) { console.debug("blog attr err", e); }
    }

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
        accountOwnerId: ((profile as any)?.parent_owner_id as string) || user?.id || null,
        isSubUser: Boolean((profile as any)?.parent_owner_id),
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
