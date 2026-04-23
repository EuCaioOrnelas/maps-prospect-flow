import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb,
  ChevronLeft, ChevronRight, Calendar, User, CreditCard, Clock,
  Mail, Phone, MapPin, FileText, DollarSign, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getProviderLabel } from "@/lib/paymentProviderLabel";
import { CustomSubscriptionTab } from "./customSubscription/CustomSubscriptionTab";

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_PRICES_MONTHLY: Record<string, number> = { start: 296, growth: 696, scale: 897 };

const CATEGORY_CONFIG = [
  { key: "activation_score", label: "Ativação", icon: "🚀", color: "bg-emerald-500" },
  { key: "engagement_score", label: "Engajamento", icon: "💬", color: "bg-blue-500" },
  { key: "value_score", label: "Valor", icon: "💎", color: "bg-purple-500" },
  { key: "purchase_intent_score", label: "Intenção Compra", icon: "🛒", color: "bg-yellow-500" },
  { key: "churn_risk_score", label: "Risco Churn", icon: "⚠️", color: "bg-red-500" },
];

const EVENTS_PER_PAGE = 15;

export const AdminUserInfoDialog = ({ userId, open, onOpenChange }: Props) => {
  const [profile, setProfile] = useState<any>(null);
  const [scoreData, setScoreData] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);

  useEffect(() => {
    if (open && userId) {
      loadAll();
      setEventsPage(0);
    }
  }, [open, userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setProfile(profileData);

      // Load checkout info for address/cpf
      const { data: checkout } = await supabase
        .from("checkout_leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCheckoutData(checkout);

      // Load score
      try {
        const { data: result } = await supabase.functions.invoke("score-processor", {
          body: { action: "get_user_detail", user_id: userId },
        });
        setScoreData(result);
      } catch {
        setScoreData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("score-processor", {
        body: { action: "recalculate", user_id: userId },
      });
      if (error) throw error;
      toast.success("Score recalculado!");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getScoreColor = (score: number) => {
    if (score >= 81) return "text-purple-400";
    if (score >= 61) return "text-emerald-400";
    if (score >= 41) return "text-blue-400";
    if (score >= 21) return "text-yellow-400";
    return "text-red-400";
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "rising") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Revenue calculations
  const getMonthlyValue = () => {
    if (!profile) return 0;
    if (profile.subscription_price_cents) {
      const price = profile.subscription_price_cents / 100;
      const periodEnd = profile.subscription_current_period_end ? new Date(profile.subscription_current_period_end) : null;
      const created = new Date(profile.created_at);
      if (periodEnd) {
        const days = (periodEnd.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 300) return price / 12;
      }
      return price;
    }
    return PLAN_PRICES_MONTHLY[profile.plan] || 0;
  };

  const getLTV = () => {
    if (!profile || profile.plan === "free") return { months: 0, value: 0 };
    const now = new Date();
    const created = new Date(profile.created_at);
    const months = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const monthly = getMonthlyValue();
    return { months, value: months * monthly };
  };

  const getDaysSinceCreation = () => {
    if (!profile) return 0;
    return Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedEvents = scoreData?.events ? [...scoreData.events].sort(
    (a: any, b: any) => new Date(b.event_occurred_at).getTime() - new Date(a.event_occurred_at).getTime()
  ) : [];
  const totalEventPages = Math.ceil(sortedEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = sortedEvents.slice(eventsPage * EVENTS_PER_PAGE, (eventsPage + 1) * EVENTS_PER_PAGE);

  const ltvData = getLTV();
  const providerLabel = getProviderLabel(profile?.payment_provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Usuário</span>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="gap-2">
              {recalculating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalcular Score
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !profile ? (
          <p className="text-muted-foreground text-center py-8">Usuário não encontrado.</p>
        ) : (
          <div className="space-y-4">
            {/* User Header */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{profile.name || "Sem nome"}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {profile.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.phone}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {(profile.plan || "free").toUpperCase()}
                  </Badge>
                  {scoreData?.score?.last_event_at && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Último evento: {formatDate(scoreData.score.last_event_at)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Desde {formatDate(profile.created_at)} ({getDaysSinceCreation()} dias)
                  </Badge>
                </div>
              </div>
              {scoreData?.score && (
                <div className="text-center shrink-0">
                  <p className={`text-3xl font-bold ${getScoreColor(Number(scoreData.score.total_score))}`}>
                    {Number(scoreData.score.total_score).toFixed(0)}
                  </p>
                  <div className="flex items-center gap-1 justify-center mt-1">
                    <TrendIcon trend={scoreData.score.trend} />
                    <Badge variant="outline" className="text-xs">{scoreData.score.score_label}</Badge>
                  </div>
                </div>
              )}
            </div>

            <Tabs defaultValue="info" className="w-full">
              <TabsList className={`w-full grid ${profile?.is_custom_subscription ? "grid-cols-5" : "grid-cols-4"}`}>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="receita">Receita</TabsTrigger>
                {profile?.is_custom_subscription && (
                  <TabsTrigger value="custom">Contrato</TabsTrigger>
                )}
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              {/* INFO TAB */}
              <TabsContent value="info" className="space-y-4 mt-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Nome" value={profile.name || "—"} icon={<User className="h-3.5 w-3.5" />} />
                    <InfoRow label="Email" value={profile.email} icon={<Mail className="h-3.5 w-3.5" />} />
                    <InfoRow label="Telefone" value={profile.phone || checkoutData?.phone || "—"} icon={<Phone className="h-3.5 w-3.5" />} />
                    <InfoRow label="CPF/CNPJ" value={profile.cpf || checkoutData?.tax_id || "—"} icon={<FileText className="h-3.5 w-3.5" />} />
                    <InfoRow
                      label="Endereço"
                      value={(() => {
                        const addr = profile?.address || checkoutData?.address;
                        const num = profile?.address_number || checkoutData?.address_number;
                        const comp = profile?.address_complement;
                        const bairro = profile?.neighborhood || checkoutData?.neighborhood;
                        const cidade = profile?.city;
                        const uf = profile?.state;
                        const cep = profile?.postal_code || checkoutData?.postal_code;
                        const parts = [
                          [addr, num].filter(Boolean).join(", "),
                          comp,
                          bairro,
                          [cidade, uf].filter(Boolean).join("/"),
                          cep,
                        ].filter(Boolean);
                        return parts.length ? parts.join(" · ") : "—";
                      })()}
                      icon={<MapPin className="h-3.5 w-3.5" />}
                    />
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Plano & Assinatura</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoRow label="Plano atual" value={(profile.plan || "free").toUpperCase()} icon={<CreditCard className="h-3.5 w-3.5" />} />
                    <InfoRow label="Provedor" value={providerLabel} icon={<Receipt className="h-3.5 w-3.5" />} />
                    <InfoRow
                      label="Próx. vencimento"
                      value={profile.subscription_current_period_end ? formatDate(profile.subscription_current_period_end) : "—"}
                      icon={<Calendar className="h-3.5 w-3.5" />}
                    />
                    <InfoRow label="Bloqueado" value={profile.is_blocked ? "Sim" : "Não"} icon={<User className="h-3.5 w-3.5" />} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* RECEITA TAB */}
              <TabsContent value="receita" className="space-y-4 mt-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Receita do Usuário</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Valor Mensal</p>
                        <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(getMonthlyValue())}</p>
                        <p className="text-[10px] text-muted-foreground">{profile.plan !== "free" ? `Plano ${profile.plan}` : "Sem plano ativo"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Receita Total (LTV)</p>
                        <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(ltvData.value)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          ~{ltvData.months.toFixed(1)} meses · {Math.floor(ltvData.months * 30)} dias · {Math.floor(ltvData.months / (7/30))} semanas
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <InfoRow label="Provedor" value={providerLabel} icon={<Receipt className="h-3.5 w-3.5" />} />
                      <InfoRow label="Tempo como assinante" value={`${ltvData.months.toFixed(1)} meses`} icon={<Clock className="h-3.5 w-3.5" />} />
                      {profile.subscription_current_period_end && new Date(profile.subscription_current_period_end) < new Date() && (
                        <InfoRow
                          label="Data cancelamento"
                          value={formatDate(profile.subscription_current_period_end)}
                          icon={<Calendar className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SCORE TAB */}
              <TabsContent value="score" className="space-y-4 mt-4">
                {scoreData?.score ? (
                  <>
                    <Card className="border-border/50">
                      <CardContent className="pt-4 space-y-3">
                        {CATEGORY_CONFIG.map((cat) => {
                          const value = Number(scoreData.score[cat.key] || 0);
                          const maxPct = cat.key === "churn_risk_score" ? 20 : 30;
                          const pct = Math.min(100, (Math.abs(value) / maxPct) * 100);
                          return (
                            <div key={cat.key} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span>{cat.icon}</span> {cat.label}
                                </span>
                                <span className={cat.key === "churn_risk_score" ? "text-destructive font-bold" : "font-bold"}>
                                  {cat.key === "churn_risk_score" ? `-${Math.abs(value).toFixed(1)}` : value.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${cat.color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Evolution chart inside Score tab */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Evolução do Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {scoreData.history?.length > 1 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={[...scoreData.history].reverse()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="created_at" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} tick={{ fontSize: 10 }} />
                              <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} labelFormatter={(v) => new Date(v).toLocaleString("pt-BR")} />
                              <Line type="monotone" dataKey="new_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-muted-foreground text-center py-6 text-sm">Dados insuficientes para o gráfico.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Insights - moved to bottom */}
                    {scoreData.insights?.length > 0 && (
                      <Card className="border-border/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-400" /> Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {scoreData.insights.map((insight: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span> {insight}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum score encontrado.</p>
                )}
              </TabsContent>

              {/* HISTORICO TAB */}
              <TabsContent value="historico" className="mt-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Histórico de Eventos</CardTitle>
                      {totalEventPages > 1 && (
                        <span className="text-xs text-muted-foreground">Página {eventsPage + 1} de {totalEventPages}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {paginatedEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        {paginatedEvents.map((event: any) => (
                          <div key={event.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-border/30 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{event.event_name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{event.event_category}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className={`font-mono text-sm font-bold ${Number(event.adjusted_points) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                {Number(event.adjusted_points) >= 0 ? "+" : ""}{Number(event.adjusted_points).toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(event.event_occurred_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-6">Nenhum evento registrado.</p>
                    )}
                    {totalEventPages > 1 && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                        <Button variant="outline" size="sm" onClick={() => setEventsPage(p => Math.max(0, p - 1))} disabled={eventsPage === 0} className="gap-1">
                          <ChevronLeft className="h-3 w-3" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEventsPage(p => Math.min(totalEventPages - 1, p + 1))} disabled={eventsPage >= totalEventPages - 1} className="gap-1">
                          Próxima <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">{icon} {label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
