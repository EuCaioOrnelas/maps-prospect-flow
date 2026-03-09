import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { BlockedUserModal } from '@/components/BlockedUserModal';
import { supabase } from '@/integrations/supabase/client';

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
    }).then(() => {}).catch(() => {});
  }, [user?.id, profile, location.pathname]);

  if (loading || (requireAdmin && isAdminLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-primary animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block access for blocked users - show modal
  if (isBlocked) {
    return <BlockedUserModal onLogout={signOut} />;
  }

  // Show 404 for non-admin users on admin routes (hide existence of admin pages)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/404" replace />;
  }

  // Redirect trial expired users to upgrade page (except if already on upgrade page)
  if (isTrialExpired && profile?.plan === 'free' && location.pathname !== '/upgrade' && location.pathname !== '/consultoria') {
    return <Navigate to="/upgrade?expired=true" replace />;
  }

  return <>{children}</>;
};