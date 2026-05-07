import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { BlockedUserModal } from '@/components/BlockedUserModal';
import { supabase } from '@/integrations/supabase/client';
import { DashboardThemeProvider } from '@/contexts/ThemeContext';
import { getFeatureForPath, profileHasFeature } from '@/lib/featurePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Maps routes to meaningful event names for trial tracking
const ROUTE_EVENTS: Record<string, string> = {
  '/dashboard': 'visited_dashboard',
  '/crm': 'visited_crm',
  '/upgrade': 'visited_pricing_page',
  '/whatsapp-campaign': 'visited_campaigns',
  '/ai-agents': 'visited_ai_agents',
  '/warming': 'visited_warming',
  '/reports': 'visited_reports',
  '/profile': 'visited_profile',
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isTrialExpired, profile, isBlocked, signOut } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdminCheck();
  const location = useLocation();
  const trackedPaths = useRef<Set<string>>(new Set());
  // null = ainda checando, true = precisa fazer onboarding, false = ok
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  // Verifica se o usuário já completou (ou pulou) o onboarding inicial
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setNeedsOnboarding(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('id, role, completed_at, skipped')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setNeedsOnboarding(false);
        return;
      }
      // Considera concluído apenas se tiver completed_at OU foi pulado explicitamente
      // com role preenchido (registros legados sem role devem refazer)
      const done =
        !!data && (!!data.completed_at || (data.skipped === true && !!data.role));
      setNeedsOnboarding(!done);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Capture email attribution UTM params from CTA clicks
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source');
    const tuid = params.get('tuid');
    const ttid = params.get('ttid');
    const taid = params.get('taid');

    if (utmSource === 'trial_email' && tuid && ttid) {
      // Store attribution data for checkout conversion tracking
      const attribution = {
        user_id: tuid,
        template_id: ttid,
        automation_id: taid || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        landed_at: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem('trial_email_attribution', JSON.stringify(attribution));
      } catch (_) {}
    }
  }, [location.search]);

  // Track page visits for free trial users
  useEffect(() => {
    if (!user?.id || !profile || profile.plan !== 'free') return;
    
    const eventName = ROUTE_EVENTS[location.pathname];
    if (!eventName) return;

    // Only track once per session per path
    const key = `${location.pathname}_${user.id}`;
    if (trackedPaths.current.has(key)) return;
    trackedPaths.current.add(key);

    supabase.from('trial_product_events').insert({
      user_id: user.id,
      event_name: eventName,
      event_source: 'frontend',
      metadata: { path: location.pathname },
    }).then(() => {});
  }, [user?.id, profile, location.pathname]);

  if (loading || (requireAdmin && isAdminLoading)) {
    return (
      <DashboardThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-primary animate-spin" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardThemeProvider>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Aguarda a checagem do onboarding antes de decidir o roteamento
  if (needsOnboarding === null) {
    return (
      <DashboardThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-primary animate-spin" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardThemeProvider>
    );
  }

  // Primeiro login: redireciona para o onboarding inicial (não-admins)
  if (needsOnboarding && !requireAdmin && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Block access for blocked users - show modal
  if (isBlocked) {
    return (
      <DashboardThemeProvider>
        <BlockedUserModal onLogout={signOut} />
      </DashboardThemeProvider>
    );
  }

  // Show 404 for non-admin users on admin routes (hide existence of admin pages)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/404" replace />;
  }

  // Check if free trial has expired — redirect to upgrade
  const isFreeTrial = profile?.plan === 'free';
  if (isFreeTrial && isTrialExpired && location.pathname !== '/trial-expired' && location.pathname !== '/upgrade' && location.pathname !== '/consultoria') {
    return <Navigate to="/trial-expired" replace />;
  }

  // Free users with active trial can access the platform
  // Free users without ANY trial marker also go to upgrade
  // (considers trial_will_charge_at for paid trials via Stripe/Asaas)
  if (
    isFreeTrial &&
    !profile?.trial_start_at &&
    !profile?.trial_end_at &&
    !(profile as any)?.trial_will_charge_at &&
    location.pathname !== '/trial-expired' &&
    location.pathname !== '/upgrade' &&
    location.pathname !== '/consultoria'
  ) {
    return <Navigate to="/trial-expired" replace />;
  }

  // Custom subscription feature gate: if the user is a custom-subscription user
  // and the requested route maps to a feature module they don't have access to,
  // pretend the page doesn't exist (404). Admins always pass through.
  if (!isAdmin && !requireAdmin) {
    const feat = getFeatureForPath(location.pathname);
    if (feat && !profileHasFeature(profile as any, feat)) {
      return <Navigate to="/404" replace />;
    }
  }

  return <DashboardThemeProvider>{children}</DashboardThemeProvider>;
};