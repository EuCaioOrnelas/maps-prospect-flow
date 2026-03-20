import { useState, useEffect } from "react";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const RenewalBanner = () => {
  const { profile, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const periodEnd = profile?.subscription_current_period_end;
  const plan = profile?.plan;

  // Calculate days remaining
  const daysRemaining = periodEnd
    ? Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Only show for paid users with <= 7 days remaining
  const shouldShow = plan && plan !== "free" && daysRemaining !== null && daysRemaining <= 7 && !dismissed;

  useEffect(() => {
    if (!shouldShow || !user?.id) return;

    // Check if there's a pending renewal checkout URL
    const fetchRenewalUrl = async () => {
      const { data } = await supabase
        .from("checkout_leads")
        .select("stripe_session_id")
        .eq("user_id", user.id)
        .eq("checkout_completed", false)
        .like("stripe_session_id", "abacate_renewal_%")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        // The checkout URL isn't stored directly, but we can point to upgrade page
        setCheckoutUrl("/upgrade");
      }
    };

    fetchRenewalUrl();
  }, [shouldShow, user?.id]);

  if (!shouldShow) return null;

  const expiryDate = new Date(periodEnd!).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const isUrgent = daysRemaining! <= 2;
  const isWarning = daysRemaining! <= 4;

  return (
    <div
      className={`relative rounded-xl border p-4 flex items-start gap-3 ${
        isUrgent
          ? "bg-destructive/10 border-destructive/30"
          : isWarning
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-primary/10 border-primary/30"
      }`}
    >
      <AlertTriangle
        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
          isUrgent ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">
          {isUrgent
            ? `⚠️ Sua assinatura vence ${daysRemaining === 0 ? "hoje" : daysRemaining === 1 ? "amanhã" : `em ${daysRemaining} dias`}!`
            : `Sua assinatura vence em ${daysRemaining} dias (${expiryDate})`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUrgent
            ? "Renove agora para não perder o acesso. Após 1 dia do vencimento sem pagamento, o plano será suspenso."
            : "Renove com antecedência — o pagamento antecipado não altera sua data de vigência, a renovação começa a partir do vencimento atual."}
        </p>
        <Button
          size="sm"
          variant={isUrgent ? "destructive" : "default"}
          className="mt-2 gap-1.5"
          onClick={() => window.open(checkoutUrl || "/upgrade", "_self")}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Renovar Assinatura
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
