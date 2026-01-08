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

  // Check subscription status with Stripe and update profile if needed
  const checkAndUpdateSubscription = async () => {
    try {
      console.log('[AuthContext] Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('[AuthContext] Error checking subscription:', error);
        return;
      }
      
      if (data) {
        console.log('[AuthContext] Subscription check result:', data);
        
        // If the subscription check returned a different plan, refresh the profile
        if (data.plan && profile && data.plan !== profile.plan) {
          console.log('[AuthContext] Plan changed from', profile.plan, 'to', data.plan, '- refreshing profile');
          await refreshProfile();
        } else if (data.plan && !profile) {
          // Profile not loaded yet, fetch it
          if (user) {
            const newProfile = await fetchProfile(user.id);
            setProfile(newProfile);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Subscription check failed:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
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
            
            // Check subscription after login or token refresh to ensure plan is up to date
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              console.log('[AuthContext] Triggering subscription check after', event);
              // Small delay to ensure profile is set
              setTimeout(() => {
                checkAndUpdateSubscription();
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
        
        // Check subscription on initial load
        setTimeout(() => {
          checkAndUpdateSubscription();
        }, 500);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    // Get device fingerprint and IP for fraud prevention
    const [fingerprint, clientIP] = await Promise.all([
      generateFingerprint(),
      getClientIP()
    ]);
    
    // Check for fraud before signup using strict validation
    const { data: fraudCheck, error: fraudError } = await supabase.rpc('check_signup_fraud', {
      p_fingerprint: fingerprint,
      p_ip: clientIP
    });
    
    if (fraudError) {
      console.error('Fraud check error:', fraudError);
    }
    
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
      console.warn('Signup blocked:', fraudResult.reason);
      return { 
        error: new Error(fraudResult.message || 'Não foi possível criar a conta. Entre em contato com o suporte.') 
      };
    }
    
    if (fraudResult?.is_suspicious) {
      console.warn('Suspicious signup detected:', fraudResult.reasons);
      return { 
        error: new Error('Detectamos atividade suspeita. Entre em contato com o suporte se acredita ser um erro.') 
      };
    }
    
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

    // Update profile with IP and fingerprint after signup
    if (!error && data.user) {
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({
            signup_ip: clientIP,
            device_fingerprint: fingerprint
          })
          .eq('id', data.user!.id);
      }, 1000);
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
