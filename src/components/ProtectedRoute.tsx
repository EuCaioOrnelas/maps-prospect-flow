import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isTrialExpired, profile, isBlocked, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
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

  // Block access for blocked users
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX size={32} className="text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Conta Suspensa</h1>
            <p className="text-muted-foreground">
              Sua conta foi suspensa devido a atividades suspeitas ou violação dos termos de uso.
              Entre em contato com o suporte se acredita ser um erro.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  // Redirect trial expired users to upgrade page (except if already on upgrade page)
  if (isTrialExpired && profile?.plan === 'free' && location.pathname !== '/upgrade') {
    return <Navigate to="/upgrade?expired=true" replace />;
  }

  return <>{children}</>;
};
