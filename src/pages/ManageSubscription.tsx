import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CreditCard, FileText, AlertTriangle, CheckCircle,
  Clock, XCircle, Banknote, Loader2,
  Receipt, Info, ArrowLeft, Headphones, HelpCircle,
  ExternalLink, Shield, MessageCircle, RefreshCw,
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

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Ativa", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  INACTIVE: { label: "Inativa", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30", icon: XCircle },
  EXPIRED: { label: "Expirada", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: XCircle },
  PENDING: { label: "Pendente", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
  CONFIRMED: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  RECEIVED: { label: "Recebido", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  OVERDUE: { label: "Vencido", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: AlertTriangle },
  REFUNDED: { label: "Estornado", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Info },
  RECEIVED_IN_CASH: { label: "Recebido", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
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
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function ManageSubscription() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [asaasFound, setAsaasFound] = useState(true);
  const [cancelled, setCancelled] = useState(false);

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
      toast.success("Renovação cancelada", { description: data.message });
      setCancelled(true);
      await fetchInfo();
    } catch (err: any) {
      toast.error("Erro ao cancelar", { description: err.message });
    } finally {
      setCancelling(false);
    }
  };

  const isPix = profile?.payment_provider === "asaas" && !paymentMethod;
  const activeSubscriptions = subscriptions.filter(s => s.status === "ACTIVE");
  const hasActiveSub = activeSubscriptions.length > 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin relative z-10" />
          </div>
          <p className="text-zinc-500 text-sm font-medium">Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 relative overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-emerald-600/[0.02] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-emerald-400/[0.015] rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-[#060606]/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" asLink={false} />
            <div className="h-5 w-px bg-zinc-800" />
            <span className="text-sm text-zinc-400 font-medium tracking-wide">Minha Assinatura</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInfo}
              className="text-zinc-500 hover:text-zinc-300 h-8 w-8 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar ao painel
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 relative z-10">
        {/* Hero: Plan Summary */}
        <motion.div {...fadeUp(0)}>
          <Card className="bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/40 border-zinc-800/60 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/[0.06] rounded-full blur-[80px]" />
            <CardContent className="p-8 relative z-10">
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Plano atual</p>
                  <h2 className="text-3xl font-bold text-zinc-50 capitalize tracking-tight">
                    Wiize {profile?.plan || "Free"}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-2">
                    {profile?.email}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Ativo até</p>
                  <p className="text-2xl font-bold text-zinc-50 tabular-nums">
                    {profile?.subscription_current_period_end
                      ? formatDate(profile.subscription_current_period_end)
                      : "—"}
                  </p>
                  {hasActiveSub && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" /> Renovação ativa
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Two-column grid: Payment Method + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <motion.div {...fadeUp(0.06)}>
            <Card className="bg-zinc-900/50 border-zinc-800/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-zinc-300 font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethod ? (
                  <div className="flex items-center gap-4 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                    <div className="h-12 w-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase tracking-wider border border-zinc-600/30">
                      {paymentMethod.brand || "CARD"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200 tracking-wide">
                        •••• •••• •••• {paymentMethod.lastDigits}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">Cartão de crédito</p>
                    </div>
                  </div>
                ) : isPix ? (
                  <div className="flex items-center gap-4 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                    <div className="h-12 w-16 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                      <Banknote className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">PIX Automático</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Pagamento recorrente via banco</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-600">Nenhuma forma de pagamento encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div {...fadeUp(0.09)}>
            <Card className="bg-zinc-900/50 border-zinc-800/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-zinc-300 font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <HelpCircle className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  Precisa de ajuda?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/30 transition-all group cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200">Falar com suporte</p>
                    <p className="text-[11px] text-zinc-500">WhatsApp · Resposta rápida</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </a>

                <a
                  href="/ajuda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/30 transition-all group cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <HelpCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200">Central de Ajuda</p>
                    <p className="text-[11px] text-zinc-500">Dúvidas frequentes e tutoriais</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </a>

                <a
                  href="mailto:suporte@wiize.com.br"
                  className="flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/30 transition-all group cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Headphones className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200">E-mail de suporte</p>
                    <p className="text-[11px] text-zinc-500">suporte@wiize.com.br</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <motion.div {...fadeUp(0.12)}>
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-zinc-300 font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscriptions.map((sub) => {
                  const st = statusMap[sub.status] || statusMap.PENDING;
                  const StIcon = st.icon;
                  return (
                    <div key={sub.id} className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                        <p className="font-semibold text-zinc-200 text-sm">{sub.description || "Assinatura Wiize"}</p>
                        <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                          <StIcon className="h-3 w-3 mr-1" /> {st.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Valor", value: formatCurrency(sub.value) },
                          { label: "Ciclo", value: cycleMap[sub.cycle] || sub.cycle },
                          { label: "Pagamento", value: billingTypeMap[sub.billingType] || sub.billingType },
                          { label: "Próx. cobrança", value: formatDate(sub.nextDueDate) },
                        ].map((item) => (
                          <div key={item.label} className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/20">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{item.label}</p>
                            <p className="text-sm text-zinc-200 font-semibold">{item.value}</p>
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
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-zinc-300 font-semibold">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  Histórico de Cobranças
                </CardTitle>
                {payments.length > 0 && (
                  <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded-full">
                    {payments.length} {payments.length === 1 ? "registro" : "registros"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_100px_80px_60px] gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">
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
                        className="grid grid-cols-[1fr_100px_80px_60px] gap-3 items-center bg-zinc-800/20 hover:bg-zinc-800/40 rounded-lg px-4 py-3 border border-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StIcon className={`h-3.5 w-3.5 shrink-0 ${st.color.includes("emerald") ? "text-emerald-400" : st.color.includes("red") ? "text-red-400" : st.color.includes("amber") ? "text-amber-400" : "text-zinc-400"}`} />
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-300 font-medium truncate">
                              {formatDate(p.dueDate)} · {billingTypeMap[p.billingType] || p.billingType}
                            </p>
                            {p.creditCard && (
                              <p className="text-[10px] text-zinc-600 mt-0.5">•••{p.creditCard.creditCardNumber}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-200 font-semibold text-right tabular-nums">
                          {formatCurrency(p.value)}
                        </p>
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-[9px] ${st.color}`}>
                            {st.label}
                          </Badge>
                        </div>
                        <div className="text-right">
                          {p.invoiceUrl ? (
                            <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5 inline" />
                            </a>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600 font-medium">Nenhuma cobrança encontrada</p>
                  <p className="text-[11px] text-zinc-700 mt-1">As cobranças aparecerão aqui após o primeiro pagamento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation Section */}
        <motion.div {...fadeUp(0.2)}>
          <Card className="bg-zinc-900/50 border-zinc-800/50 border-t-red-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-zinc-300 font-semibold">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                </div>
                Cancelar Renovação Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cancelled ? (
                <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm text-emerald-300 font-semibold">Renovação cancelada com sucesso</p>
                  <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
                    Seu plano continua ativo até <strong className="text-zinc-300">{profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "o final do período"}</strong>. Não haverá novas cobranças.
                  </p>
                </div>
              ) : isPix && !hasActiveSub ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-4 flex gap-3">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Como seu pagamento é via <strong className="text-zinc-300">PIX recorrente</strong>, o cancelamento deve ser feito diretamente no app do seu banco.
                    </p>
                  </div>
                  <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30">
                    <h4 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
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
                          <span className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-sm text-zinc-400 leading-relaxed pt-0.5">
                            {step.text}{step.bold && <> <strong className="text-zinc-200">{step.bold}</strong></>}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <p className="text-[11px] text-zinc-600 text-center">
                    Após cancelar no banco, seu plano continua ativo até o final do período vigente.
                  </p>
                </div>
              ) : hasActiveSub ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Ao cancelar, a renovação automática será desativada. Seu plano continua ativo até o fim do período atual — sem novas cobranças.
                  </p>
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-lg p-3 flex gap-2.5 items-center">
                    <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-zinc-400">Você não será cobrado novamente após o cancelamento.</span>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-all"
                        disabled={cancelling}
                      >
                        {cancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Cancelar renovação automática
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">Confirmar cancelamento</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          Tem certeza que deseja cancelar a renovação automática? Seu plano continuará ativo até{" "}
                          <strong className="text-zinc-200">
                            {activeSubscriptions[0]?.nextDueDate
                              ? formatDate(activeSubscriptions[0].nextDueDate)
                              : "o fim do período"}
                          </strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                          Manter assinatura
                        </AlertDialogCancel>
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
                  <Shield className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600 font-medium">Nenhuma assinatura ativa para cancelar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div {...fadeUp(0.25)} className="text-center pb-10 space-y-3">
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Seus dados estão protegidos com criptografia de ponta</span>
          </div>
          <p className="text-[10px] text-zinc-700">
            © {new Date().getFullYear()} Wiize. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
