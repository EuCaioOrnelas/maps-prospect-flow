import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, FileText, Shield, AlertTriangle, CheckCircle,
  Clock, XCircle, LogOut, ChevronRight, Banknote, Loader2,
  Calendar, Receipt, Info, ArrowLeft,
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" asLink={false} />
            <span className="text-zinc-500">|</span>
            <span className="text-sm text-zinc-400 font-medium">Minha Assinatura</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Plan Summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Plano atual</p>
                  <h2 className="text-2xl font-bold text-zinc-100 capitalize">
                    Wiize {profile?.plan || "Free"}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {profile?.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500 mb-1">Ativo até</p>
                  <p className="text-lg font-semibold text-zinc-100">
                    {profile?.subscription_current_period_end
                      ? formatDate(profile.subscription_current_period_end)
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-zinc-200">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethod ? (
                <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                  <div className="h-10 w-14 bg-zinc-700 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-300 uppercase">
                    {paymentMethod.brand || "CARD"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      •••• •••• •••• {paymentMethod.lastDigits}
                    </p>
                    <p className="text-xs text-zinc-500">Cartão de crédito</p>
                  </div>
                </div>
              ) : isPix ? (
                <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                  <div className="h-10 w-14 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">PIX</p>
                    <p className="text-xs text-zinc-500">Pagamento recorrente via PIX</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Nenhuma forma de pagamento encontrada.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-zinc-200">
                  <Receipt className="h-4 w-4 text-emerald-500" />
                  Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscriptions.map((sub) => {
                  const st = statusMap[sub.status] || statusMap.PENDING;
                  const StIcon = st.icon;
                  return (
                    <div key={sub.id} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <p className="font-medium text-zinc-200 text-sm">{sub.description || "Assinatura Wiize"}</p>
                        <Badge variant="outline" className={`text-xs ${st.color}`}>
                          <StIcon className="h-3 w-3 mr-1" /> {st.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-zinc-500">Valor</p>
                          <p className="text-zinc-300 font-medium">{formatCurrency(sub.value)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Ciclo</p>
                          <p className="text-zinc-300 font-medium">{cycleMap[sub.cycle] || sub.cycle}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Pagamento</p>
                          <p className="text-zinc-300 font-medium">{billingTypeMap[sub.billingType] || sub.billingType}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Próx. cobrança</p>
                          <p className="text-zinc-300 font-medium">{formatDate(sub.nextDueDate)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payment History */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-zinc-200">
                <FileText className="h-4 w-4 text-emerald-500" />
                Histórico de Cobranças
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p) => {
                    const st = statusMap[p.status] || statusMap.PENDING;
                    const StIcon = st.icon;
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-4 py-3 border border-zinc-700/30">
                        <div className="flex items-center gap-3">
                          <StIcon className={`h-4 w-4 ${st.color.includes("emerald") ? "text-emerald-400" : st.color.includes("red") ? "text-red-400" : st.color.includes("amber") ? "text-amber-400" : "text-zinc-400"}`} />
                          <div>
                            <p className="text-sm text-zinc-200 font-medium">
                              {formatCurrency(p.value)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(p.dueDate)} · {billingTypeMap[p.billingType] || p.billingType}
                              {p.creditCard && ` · •••${p.creditCard.creditCardNumber}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                            {st.label}
                          </Badge>
                          {p.invoiceUrl && (
                            <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 text-xs underline">
                              Fatura
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-6">Nenhuma cobrança encontrada.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation Section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-zinc-900/60 border-zinc-800 border-red-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-zinc-200">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Cancelar Renovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cancelled ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-emerald-300 font-medium">Renovação cancelada com sucesso</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Seu plano continua ativo até {profile?.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "o final do período"}.
                  </p>
                </div>
              ) : isPix && !hasActiveSub ? (
                /* PIX cancellation instructions */
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Como seu pagamento é via PIX recorrente, o cancelamento deve ser feito diretamente no seu banco:
                  </p>
                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-200">Passo a passo:</h4>
                    <ol className="space-y-2 text-sm text-zinc-400">
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">1.</span>
                        Abra o app do seu banco e vá em <strong className="text-zinc-200">PIX</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">2.</span>
                        Procure por <strong className="text-zinc-200">PIX Automático</strong> ou <strong className="text-zinc-200">Autorizações de PIX</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">3.</span>
                        Encontre a cobrança da <strong className="text-zinc-200">Wiize / ASAAS</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">4.</span>
                        Toque em <strong className="text-zinc-200">Cancelar autorização</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">5.</span>
                        Confirme o cancelamento
                      </li>
                    </ol>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Após cancelar no banco, seu plano continua ativo até o final do período vigente. Não haverá novas cobranças.
                  </p>
                </div>
              ) : hasActiveSub ? (
                /* Card/subscription cancellation */
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Ao cancelar, a renovação automática será desativada. Seu plano continua ativo até o fim do período atual.
                  </p>
                  <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Info className="h-3.5 w-3.5 text-amber-400" />
                      <span>Você não será cobrado novamente após o cancelamento.</span>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full" disabled={cancelling}>
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
                <p className="text-sm text-zinc-500 text-center py-4">
                  Nenhuma assinatura ativa encontrada para cancelar.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-zinc-600">
            Dúvidas? Entre em contato pelo chat de atendimento.
          </p>
        </div>
      </div>
    </div>
  );
}
