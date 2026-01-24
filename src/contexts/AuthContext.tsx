// Auth context - provides authentication state and methods
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { generateFingerprint, getClientIP } from '@/lib/fingerprint';

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
  trial_messages_sent?: number;
  is_blocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
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
  const calculateTrialStatus = (trialStartAt?: string, plan?: string) => {
    if (plan && plan !== 'free') {
      return { isExpired: false, daysRemaining: 0 };
    }
    
    if (!trialStartAt) {
      return { isExpired: false, daysRemaining: 30 };
    }
    
    const trialStart = new Date(trialStartAt);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysPassed);
    const isExpired = daysPassed >= 30;
    
    return { isExpired, daysRemaining };
  };

  const trialStatus = calculateTrialStatus(profile?.trial_start_at, profile?.plan);
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

  // Sincroniza estado da conta (assinatura + reset mensal de buscas) e atualiza o profile.
  const syncAccountState = async (userId: string, reason: string) => {
    try {
      console.log(`[AuthContext] Sync account state (${reason})...`);

      const [subResult, resetResult] = await Promise.all([
        supabase.functions.invoke('check-subscription'),
        supabase.rpc('check_and_reset_monthly_searches', { user_id: userId }),
      ]);

      if (subResult?.error) {
        console.error('[AuthContext] Error checking subscription:', subResult.error);
      }

      if (resetResult?.error) {
        console.error('[AuthContext] Error resetting monthly searches:', resetResult.error);
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
          syncAccountState(session.user.id, 'refocus');
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
                syncAccountState(session.user.id, event);
              }, 500);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const data = await fetchProfile(session.user.id);
        setProfile(data);
        setLoading(false);

        // Sync on initial load
        setTimeout(() => {
          syncAccountState(session.user.id, 'initial');
        }, 500);
      } else {
        setLoading(false);
      }
    });

    // Periodic sync (keeps monthly reset working even if user stays logged-in for long time)
    const intervalId = window.setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        syncAccountState(session.user.id, 'interval');
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
    const signupStartTime = Date.now();
    const signupLogs: string[] = [];
    
    const log = (step: string, data?: any) => {
      const elapsed = Date.now() - signupStartTime;
      const message = `[SIGNUP ${elapsed}ms] ${step}`;
      signupLogs.push(message);
      console.log(message, data || '');
    };
    
    log('START', { email, name: name.substring(0, 3) + '***' });
    
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    // Get device fingerprint and IP for fraud prevention
    let fingerprint = '';
    let clientIP = '';
    
    try {
      log('STEP 1: Getting fingerprint and IP...');
      const fpStartTime = Date.now();
      
      [fingerprint, clientIP] = await Promise.all([
        generateFingerprint(),
        getClientIP()
      ]);
      
      log('STEP 1 COMPLETE: Fingerprint and IP obtained', { 
        fingerprint: fingerprint.substring(0, 8) + '...', 
        ip: clientIP,
        duration: Date.now() - fpStartTime + 'ms'
      });
    } catch (fpError) {
      log('STEP 1 ERROR: Error getting fingerprint/IP', { 
        error: fpError instanceof Error ? fpError.message : String(fpError),
        stack: fpError instanceof Error ? fpError.stack : undefined
      });
      // Continue with empty values - fraud check will skip validation
    }
    
    // Check for fraud before signup using strict validation (only if we have fingerprint/IP)
    if (fingerprint && clientIP && clientIP !== 'unknown') {
      try {
        log('STEP 2: Running fraud check...', { fingerprint: fingerprint.substring(0, 8), ip: clientIP });
        const fraudStartTime = Date.now();
        
        const { data: fraudCheck, error: fraudError } = await supabase.rpc('check_signup_fraud', {
          p_fingerprint: fingerprint,
          p_ip: clientIP
        });
        
        if (fraudError) {
          log('STEP 2 ERROR: Fraud check RPC error', { 
            error: fraudError.message,
            code: fraudError.code,
            details: fraudError.details,
            hint: fraudError.hint,
            duration: Date.now() - fraudStartTime + 'ms'
          });
          // Don't block signup on fraud check error - allow creation
        } else {
          log('STEP 2 COMPLETE: Fraud check result', { 
            result: fraudCheck,
            duration: Date.now() - fraudStartTime + 'ms'
          });
          
          // Handle both old and new fraud check formats
          const fraudResult = fraudCheck as { 
            allowed?: boolean; 
            is_suspicious?: boolean; 
            message?: string;
            reason?: string;
            reasons?: string[] 
          } | null;
          
          // Block signup if not allowed (new format) or suspicious (old format)
          if (fraudResult?.allowed === false) {
            log('BLOCKED: Signup blocked by fraud check', { reason: fraudResult.reason, message: fraudResult.message });
            console.error('[SIGNUP BLOCKED]', signupLogs.join('\n'));
            return { 
              error: new Error(fraudResult.message || 'Não foi possível criar a conta. Entre em contato com o suporte.') 
            };
          }
          
          if (fraudResult?.is_suspicious) {
            log('BLOCKED: Suspicious signup detected', { reasons: fraudResult.reasons });
            console.error('[SIGNUP BLOCKED]', signupLogs.join('\n'));
            return { 
              error: new Error('Detectamos atividade suspeita. Entre em contato com o suporte se acredita ser um erro.') 
            };
          }
        }
      } catch (fraudCatchError) {
        log('STEP 2 EXCEPTION: Unexpected error in fraud check', { 
          error: fraudCatchError instanceof Error ? fraudCatchError.message : String(fraudCatchError),
          stack: fraudCatchError instanceof Error ? fraudCatchError.stack : undefined
        });
      }
    } else {
      log('STEP 2 SKIPPED: No fingerprint/IP available', { fingerprint: !!fingerprint, clientIP });
    }
    
    // Proceed with Supabase signup
    log('STEP 3: Creating user in Supabase Auth...', { email });
    const authStartTime = Date.now();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          name,
          signup_ip: clientIP,
          device_fingerprint: fingerprint
        }
      }
    });

    if (error) {
      log('STEP 3 ERROR: Supabase Auth signup failed', { 
        error: error.message,
        code: error.status,
        name: error.name,
        duration: Date.now() - authStartTime + 'ms'
      });
      console.error('[SIGNUP FAILED]', signupLogs.join('\n'));
      return { error };
    }
    
    log('STEP 3 COMPLETE: User created in Auth', { 
      userId: data.user?.id,
      email: data.user?.email,
      confirmationSentAt: data.user?.confirmation_sent_at,
      duration: Date.now() - authStartTime + 'ms'
    });

    // Update profile with IP, fingerprint and terms acceptance IMMEDIATELY after signup
    // We await this to ensure data is saved before the function returns
    if (data.user) {
      log('STEP 4: Updating profile with fraud prevention data...');
      
      // Retry logic for profile update
      const updateProfile = async (retries = 3): Promise<boolean> => {
        for (let i = 0; i < retries; i++) {
          const attemptStart = Date.now();
          // Small delay to allow profile trigger to create the row
          const delay = 500 * (i + 1);
          log(`STEP 4.${i + 1}: Waiting ${delay}ms before attempt ${i + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              signup_ip: clientIP || 'unknown',
              device_fingerprint: fingerprint || 'unknown',
              terms_accepted_at: new Date().toISOString()
            })
            .eq('id', data.user!.id);
          
          if (!updateError) {
            log(`STEP 4.${i + 1} COMPLETE: Profile updated successfully`, { 
              attempt: i + 1,
              duration: Date.now() - attemptStart + 'ms'
            });
            return true;
          }
          
          log(`STEP 4.${i + 1} ERROR: Profile update failed`, { 
            attempt: i + 1,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            duration: Date.now() - attemptStart + 'ms'
          });
        }
        log('STEP 4 FAILED: All profile update attempts failed');
        return false;
      };
      
      // AWAIT the update to ensure it completes before signup flow continues
      const profileUpdated = await updateProfile();
      
      if (!profileUpdated) {
        log('WARNING: Profile not updated, but signup will continue');
      }
    }

    log('SIGNUP COMPLETE', { 
      totalDuration: Date.now() - signupStartTime + 'ms',
      userId: data.user?.id
    });
    
    // Log full signup trace for debugging
    console.log('[SIGNUP SUCCESS TRACE]', signupLogs.join('\n'));

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
