import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CancellationFeedbackDialog } from "@/components/CancellationFeedbackDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CreditCard, FileText, AlertTriangle, CheckCircle,
  Clock, XCircle, Banknote, Loader2,
  Receipt, Info, ArrowLeft, HelpCircle,
  ExternalLink, Shield, MessageCircle, RefreshCw,
  Calendar, Ban,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SubscriptionInfo {
  id: string;
  status: string;
  billingType: string;
  cycle: string;
  value: number;
  nextDueDate: string;
  description: string;
  dateCreated: string;
}

interface PaymentInfo {
  id: string;
  value: number;
  netValue: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate: string | null;
  description: string;
  invoiceUrl: string | null;
  installment: string | null;
  creditCard: { creditCardBrand: string; creditCardNumber: string } | null;
}

interface PaymentMethodInfo {
  type: string;
  brand: string;
  lastDigits: string;
}

interface CancellationInfo {
  id: string;
  provider: string;
  subscription_id: string | null;
  billing_type: string | null;
  cancelled_at: string;
  last_charge_date: string | null;
  active_until: string | null;
  notes: string | null;
}

const statusMap: Record<string, { label: string; variant: string; icon: any }> = {
  ACTIVE: { label: "Ativa", variant: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle },
  INACTIVE: { label: "Inativa", variant: "text-muted-foreground bg-muted border-border", icon: XCircle },
  EXPIRED: { label: "Expirada", variant: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25", icon: XCircle },
  PENDING: { label: "Pendente", variant: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25", icon: Clock },
  CONFIRMED: { label: "Confirmado", variant: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle },
  RECEIVED: { label: "Recebido", variant: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle },
  OVERDUE: { label: "Vencido", variant: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25", icon: AlertTriangle },
  REFUNDED: { label: "Estornado", variant: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25", icon: Info },
  RECEIVED_IN_CASH: { label: "Recebido", variant: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle },
};

const billingTypeMap: Record<string, string> = {
  CREDIT_CARD: "Cartão de Crédito",
  PIX: "PIX",
  BOLETO: "Boleto",
  UNDEFINED: "—",
};

const cycleMap: Record<string, string> = {
  YEARLY: "Anual",
  MONTHLY: "Mensal",
  WEEKLY: "Semanal",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function ManageSubscription() {
  const { user, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [asaasFound, setAsaasFound] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [provider, setProvider] = useState<string>("asaas");
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const [cancellations, setCancellations] = useState<CancellationInfo[]>([]);
  const [cancellationDetails, setCancellationDetails] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/minha-assinatura");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchInfo();
  }, [user]);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "get-info" },
      });
      if (error) throw error;
      setSubscriptions(data.subscriptions || []);
      setPayments(data.payments || []);
      setPaymentMethod(data.paymentMethod || null);
      setProfile(data.profile || null);
      setAsaasFound(data.asaasCustomerFound !== false);
      setProvider(data.provider || "asaas");
      setStripePortalUrl(data.stripePortalUrl || null);
      setCancellations(data.cancellations || []);
    } catch (err: any) {
      toast.error("Erro ao carregar dados", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subId?: string) => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "cancel-subscription", subscriptionId: subId },
      });
      if (error) throw error;

      if (provider === "stripe" && stripePortalUrl) {
        toast.success("Redirecionando...", { description: "Você será levado ao portal de pagamentos." });
        window.open(stripePortalUrl, "_blank");
      } else {
        toast.success("Renovação cancelada", { description: data.message });
      }

      if (data.cancellationDetails) {
        setCancellationDetails(data.cancellationDetails);
      }
      setCancelled(true);
      await fetchInfo();
    } catch (err: any) {
      toast.error("Erro ao cancelar", { description: err.message });
    } finally {
      setCancelling(false);
    }
  };

  const isPix = profile?.payment_provider === "asaas" && !paymentMethod;
  const isStripe = provider === "stripe";
  const activeSubscriptions = subscriptions.filter(s => s.status === "ACTIVE");
  const hasActiveSub = activeSubscriptions.length > 0;
  const hasCancellationHistory = cancellations.length > 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.06] rounded-full blur-[120px]" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-8 w-8 text-primary animate-spin relative z-10" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/[0.05] rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-primary/[0.03] rounded-full blur-[130px]" />
        <div className="absolute top-1/2 -left-20 w-[350px] h-[350px] bg-primary/[0.025] rounded-full blur-[110px]" />
      </div>

      {/* Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.08) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="fixed inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, hsl(var(--background)) 100%)` }} />

      {/* Header */}
      <div className="border-b border-border/60 bg-background/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" asLink={false} />
            <div className="h-5 w-px bg-border" />
            <span className="text-sm text-muted-foreground font-medium tracking-wide">Minha Assinatura</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchInfo} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar ao painel
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 relative z-10">
        {/* Plan Summary */}
        <motion.div {...fadeUp(0)}>
          <Card className="overflow-hidden relative border-border/50 shadow-lg shadow-primary/[0.03]">
            <div className="absolute top-0 right-0 w-56 h-56 bg-primary/[0.06] rounded-full blur-[90px]" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/[0.04] rounded-full blur-[70px]" />
            <CardContent className="p-8 relative z-10">
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Plano atual</p>
                  <h2 className="text-3xl font-bold text-foreground capitalize tracking-tight">
                    Wiize {profile?.plan || "Free"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">{profile?.email}</p>
                  {isStripe && (
                    <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25 mt-2">
                      Pagamento via Stripe
                    </Badge>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Ativo até</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "—"}
                  </p>
                  {hasActiveSub && (
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25 text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" /> Renovação ativa
                    </Badge>
                  )}
                  {cancelled && (
                    <Badge variant="outline" className="text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25 text-[10px]">
                      <Ban className="h-3 w-3 mr-1" /> Renovação cancelada
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method + Help */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div {...fadeUp(0.06)}>
            <Card className="h-full border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/[0.04] rounded-full blur-[60px]" />
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {isStripe ? (
                  <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 border border-border/50">
                    <div className="h-12 w-16 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider border border-blue-500/20">
                      Stripe
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Pagamento via Stripe</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Gerencie pelo portal de pagamentos</p>
                    </div>
                  </div>
                ) : paymentMethod ? (
                  <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 border border-border/50">
                    <div className="h-12 w-16 bg-gradient-to-br from-muted to-muted/80 rounded-lg flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border/50">
                      {paymentMethod.brand || "CARD"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground tracking-wide">•••• •••• •••• {paymentMethod.lastDigits}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cartão de crédito</p>
                    </div>
                  </div>
                ) : isPix ? (
                  <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 border border-border/50">
                    <div className="h-12 w-16 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                      <Banknote className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">PIX Automático</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pagamento recorrente via banco</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma forma de pagamento encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(0.09)}>
            <Card className="h-full border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/[0.04] rounded-full blur-[60px]" />
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Precisa de ajuda?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 relative z-10">
                <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-muted/40 hover:bg-muted/70 rounded-xl p-3.5 border border-border/40 transition-all group cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Falar com suporte</p>
                    <p className="text-[11px] text-muted-foreground">WhatsApp · Resposta rápida</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </a>
                <a href="/ajuda" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-muted/40 hover:bg-muted/70 rounded-xl p-3.5 border border-border/40 transition-all group cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/15 transition-colors">
                    <HelpCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Central de Ajuda</p>
                    <p className="text-[11px] text-muted-foreground">Dúvidas frequentes e tutoriais</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Subscriptions (Asaas only) */}
        {subscriptions.length > 0 && (
          <motion.div {...fadeUp(0.12)}>
            <Card className="border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-primary/[0.04] rounded-full blur-[60px]" />
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 relative z-10">
                {subscriptions.map((sub) => {
                  const st = statusMap[sub.status] || statusMap.PENDING;
                  const StIcon = st.icon;
                  return (
                    <div key={sub.id} className="bg-muted/30 rounded-xl p-5 border border-border/40">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                        <p className="font-semibold text-foreground text-sm">{sub.description || "Assinatura Wiize"}</p>
                        <Badge variant="outline" className={`text-[10px] ${st.variant}`}>
                          <StIcon className="h-3 w-3 mr-1" /> {st.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Valor", value: formatCurrency(sub.value) },
                          { label: "Ciclo", value: cycleMap[sub.cycle] || sub.cycle },
                          { label: "Pagamento", value: billingTypeMap[sub.billingType] || sub.billingType },
                          { label: "Próx. cobrança", value: formatDate(sub.nextDueDate) },
                        ].map((item) => (
                          <div key={item.label} className="bg-background/60 rounded-lg p-3 border border-border/30">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{item.label}</p>
                            <p className="text-sm text-foreground font-semibold">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payment History */}
        <motion.div {...fadeUp(0.15)}>
          <Card className="border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
            <div className="absolute -bottom-16 right-0 w-48 h-48 bg-primary/[0.03] rounded-full blur-[70px]" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Histórico de Cobranças
                </CardTitle>
                {payments.length > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/30">
                    {payments.length} {payments.length === 1 ? "registro" : "registros"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              {isStripe && payments.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground font-medium">Histórico disponível no portal Stripe</p>
                  {stripePortalUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(stripePortalUrl, "_blank")} className="text-xs">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ver no portal de pagamentos
                    </Button>
                  )}
                </div>
              ) : payments.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[1fr_100px_80px_60px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                    <span>Cobrança</span>
                    <span className="text-right">Valor</span>
                    <span className="text-center">Status</span>
                    <span className="text-right">Fatura</span>
                  </div>
                  {payments.map((p, i) => {
                    const st = statusMap[p.status] || statusMap.PENDING;
                    const StIcon = st.icon;
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className="grid grid-cols-[1fr_100px_80px_60px] gap-3 items-center bg-muted/20 hover:bg-muted/40 rounded-lg px-4 py-3 border border-border/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StIcon className={`h-3.5 w-3.5 shrink-0 ${st.variant.split(" ")[0]}`} />
                          <div className="min-w-0">
                            <p className="text-xs text-foreground/80 font-medium truncate">
                              {formatDate(p.dueDate)} · {billingTypeMap[p.billingType] || p.billingType}
                            </p>
                            {p.creditCard && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">•••{p.creditCard.creditCardNumber}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground font-semibold text-right tabular-nums">
                          {formatCurrency(p.value)}
                        </p>
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-[9px] ${st.variant}`}>{st.label}</Badge>
                        </div>
                        <div className="text-right">
                          {p.invoiceUrl ? (
                            <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5 inline" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhuma cobrança encontrada</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">As cobranças aparecerão aqui após o primeiro pagamento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation History */}
        {hasCancellationHistory && (
          <motion.div {...fadeUp(0.17)}>
            <Card className="border-border/50 shadow-md shadow-primary/[0.02] relative overflow-hidden">
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  </div>
                  Histórico de Cancelamentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 relative z-10">
                {cancellations.map((c) => (
                  <div key={c.id} className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Data do cancelamento</p>
                        <p className="text-sm text-foreground font-semibold">{formatDate(c.cancelled_at)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Última cobrança</p>
                        <p className="text-sm text-foreground font-semibold">{c.last_charge_date ? formatDate(c.last_charge_date) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Ativo até</p>
                        <p className="text-sm text-foreground font-semibold">{c.active_until ? formatDate(c.active_until) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Provedor</p>
                        <p className="text-sm text-foreground font-semibold capitalize">{c.provider === "stripe" ? "Stripe" : billingTypeMap[c.billing_type || ""] || c.provider}</p>
                      </div>
                    </div>
                    {c.notes && (
                      <p className="text-[11px] text-muted-foreground mt-3 border-t border-border/30 pt-2">{c.notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Cancellation Section */}
        <motion.div {...fadeUp(0.2)}>
          <Card className="border-border/50 border-t-red-500/10 shadow-md relative overflow-hidden">
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                </div>
                Cancelar Renovação Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              {cancelled ? (
                <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl p-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">Renovação cancelada com sucesso</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Seu plano continua ativo até <strong className="text-foreground">{cancellationDetails?.activeUntil ? formatDate(cancellationDetails.activeUntil) : profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "o final do período"}</strong>. Não haverá novas cobranças.
                  </p>
                  {cancellationDetails?.lastChargeDate && (
                    <div className="bg-muted/40 rounded-lg p-3 border border-border/30 max-w-sm mx-auto">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Última cobrança</p>
                          <p className="text-foreground font-semibold mt-0.5">{formatDate(cancellationDetails.lastChargeDate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Cancelado em</p>
                          <p className="text-foreground font-semibold mt-0.5">{formatDate(cancellationDetails.cancelledAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : isStripe ? (
                /* Stripe cancellation */
                <div className="space-y-4">
                  <div className="bg-blue-500/[0.06] border border-blue-500/15 rounded-xl p-4 flex gap-3">
                    <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Sua assinatura é gerenciada pelo <strong className="text-foreground">Stripe</strong>. Para cancelar a renovação automática, você será redirecionado ao portal seguro de pagamentos onde poderá gerenciar sua assinatura.
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-5 border border-border/40">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Como funciona
                    </h4>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex gap-3 items-start">
                        <span className="h-6 w-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">1</span>
                        <p className="pt-0.5">Clique no botão abaixo para abrir o <strong className="text-foreground">portal de pagamentos</strong></p>
                      </li>
                      <li className="flex gap-3 items-start">
                        <span className="h-6 w-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">2</span>
                        <p className="pt-0.5">No portal, clique em <strong className="text-foreground">"Cancelar plano"</strong></p>
                      </li>
                      <li className="flex gap-3 items-start">
                        <span className="h-6 w-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">3</span>
                        <p className="pt-0.5">Seu plano continua ativo até o <strong className="text-foreground">final do período pago</strong></p>
                      </li>
                    </ol>
                  </div>
                  {stripePortalUrl ? (
                    <Button
                      onClick={() => window.open(stripePortalUrl, "_blank")}
                      variant="outline"
                      className="w-full border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir portal de pagamentos (Stripe)
                    </Button>
                  ) : (
                    <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-lg p-3 flex gap-2.5 items-center">
                      <Info className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-xs text-muted-foreground">Não foi possível gerar o link do portal. Entre em contato com o suporte.</span>
                    </div>
                  )}
                </div>
              ) : isPix && !hasActiveSub ? (
                /* PIX cancellation */
                <div className="space-y-4">
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-4 flex gap-3">
                    <Info className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Como seu pagamento é via <strong className="text-foreground">PIX recorrente</strong>, o cancelamento deve ser feito diretamente no app do seu banco.
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-5 border border-border/40">
                    <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Passo a passo para cancelar
                    </h4>
                    <ol className="space-y-3">
                      {[
                        { text: "Abra o app do seu banco e vá em", bold: "PIX" },
                        { text: "Procure por", bold: "PIX Automático ou Autorizações" },
                        { text: "Encontre a cobrança da", bold: "Wiize / ASAAS" },
                        { text: "Toque em", bold: "Cancelar autorização" },
                        { text: "Confirme o cancelamento e pronto!", bold: "" },
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                            {step.text}{step.bold && <> <strong className="text-foreground">{step.bold}</strong></>}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <h4 className="text-xs font-semibold text-foreground mb-2">Informações do cancelamento via PIX</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Plano ativo até</p>
                        <p className="text-foreground font-semibold mt-0.5">{profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Forma de pagamento</p>
                        <p className="text-foreground font-semibold mt-0.5">PIX Recorrente</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    Após cancelar no banco, seu plano continua ativo até o final do período vigente.
                  </p>
                </div>
              ) : hasActiveSub ? (
                /* Card cancellation (Asaas) */
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ao cancelar, a renovação automática será desativada. Seu plano continua ativo até o fim do período atual — sem novas cobranças.
                  </p>
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-lg p-3 flex gap-2.5 items-center">
                    <Info className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span className="text-xs text-muted-foreground">Você não será cobrado novamente após o cancelamento.</span>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Última cobrança prevista</p>
                        <p className="text-foreground font-semibold mt-0.5">{activeSubscriptions[0]?.nextDueDate ? formatDate(activeSubscriptions[0].nextDueDate) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Ativo até</p>
                        <p className="text-foreground font-semibold mt-0.5">{profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Forma de pagamento</p>
                        <p className="text-foreground font-semibold mt-0.5">{paymentMethod ? `•••• ${paymentMethod.lastDigits}` : billingTypeMap[activeSubscriptions[0]?.billingType] || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                        disabled={cancelling}
                      >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Cancelar renovação automática
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar cancelamento da renovação</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <p>
                              Tem certeza que deseja cancelar a renovação automática? Após o cancelamento:
                            </p>
                            <ul className="text-xs space-y-1.5 text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Seu plano continua ativo até <strong className="text-foreground">{activeSubscriptions[0]?.nextDueDate ? formatDate(activeSubscriptions[0].nextDueDate) : "o fim do período"}</strong></span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Ban className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                <span>Não haverá novas cobranças no seu cartão</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span>Após o período, o plano será rebaixado para Free</span>
                              </li>
                            </ul>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancel(activeSubscriptions[0]?.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Sim, cancelar renovação
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhuma assinatura ativa para cancelar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div {...fadeUp(0.25)} className="text-center pb-10 space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Seus dados estão protegidos com criptografia de ponta</span>
          </div>
          <p className="text-[10px] text-muted-foreground/40">
            © {new Date().getFullYear()} Wiize. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
