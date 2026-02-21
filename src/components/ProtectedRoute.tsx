import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { BlockedUserModal } from '@/components/BlockedUserModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isTrialExpired, profile, isBlocked, signOut } = useAuth();
  const { isAdmin, loading: isAdminLoading } = useAdminCheck();
  const location = useLocation();

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
  if (isTrialExpired && profile?.plan === 'free' && location.pathname !== '/upgrade' && location.pathname !== '/consultoria' && location.pathname !== '/whatsapp') {
    return <Navigate to="/upgrade?expired=true" replace />;
  }

  return <>{children}</>;
};