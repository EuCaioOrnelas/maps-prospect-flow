import { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function ExpiredSubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !profile || profile.plan !== 'free') return;

    const checkSuspension = async () => {
      const periodEnd = profile.subscription_current_period_end
        ? new Date(profile.subscription_current_period_end)
        : null;
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Check if there's a recent access_suspended event for this user
      const { data } = await supabase
        .from('pix_tracking_events')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('event_type', 'access_suspended')
        .order('created_at', { ascending: false })
        .limit(1);

      const latestEvent = data?.[0];
      const suspendedAt = latestEvent?.created_at ? new Date(latestEvent.created_at) : null;

      const hasRecentSuspensionEvent = !!(suspendedAt && suspendedAt >= sevenDaysAgo);
      const hasRecentExpiredSubscription = !!(
        periodEnd &&
        periodEnd < now &&
        periodEnd >= sevenDaysAgo
      );

      if (!hasRecentSuspensionEvent && !hasRecentExpiredSubscription) return;

      const popupIdentity = latestEvent?.id ?? `expired_${user.id}_${periodEnd?.toISOString() ?? 'unknown'}`;
      const dismissedKey = `expired_sub_dismissed_${popupIdentity}`;
      if (localStorage.getItem(dismissedKey)) return;

      setOpen(true);
      localStorage.setItem('_expired_sub_event_id', popupIdentity);
    };

    checkSuspension();
  }, [user, profile]);

  const handleDismiss = () => {
    const eventId = localStorage.getItem('_expired_sub_event_id');
    if (eventId) {
      localStorage.setItem(`expired_sub_dismissed_${eventId}`, 'true');
      localStorage.removeItem('_expired_sub_event_id');
    }
    setOpen(false);
  };

  const handleRenew = () => {
    handleDismiss();
    navigate('/upgrade');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Assinatura Expirada</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-yellow-500" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Sua assinatura expirou
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Seu plano foi alterado para gratuito por falta de pagamento
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                Seus dados e leads foram preservados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                Limite de buscas reduzido para o plano gratuito
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                Renove para restaurar todos os recursos imediatamente
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleRenew} size="lg" className="w-full gap-2">
              <CreditCard size={18} />
              Renovar Assinatura
            </Button>
            <Button onClick={handleDismiss} variant="ghost" size="sm" className="w-full text-muted-foreground">
              Continuar com plano gratuito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
