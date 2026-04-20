import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Send, CheckCircle2, XCircle, FlaskConical, Activity, Mail,
  MousePointerClick, Eye as EyeIcon, AlertTriangle, DollarSign, RefreshCw
} from "lucide-react";

const RENEWAL_STAGES = [
  { stage: "D-5", label: "D-5 (Início)", color: "default" as const },
  { stage: "D-3", label: "D-3 (Reforço)", color: "default" as const },
  { stage: "D-1", label: "D-1 (Urgência)", color: "secondary" as const },
  { stage: "D0", label: "D0 (Último aviso)", color: "secondary" as const },
  { stage: "D+1", label: "D+1 (Suspenso)", color: "destructive" as const },
];

export function PixTestsTrackingTab() {
  return (
    <Tabs defaultValue="tests" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tests" className="gap-1.5">
          <FlaskConical size={14} /> Testes de Email
        </TabsTrigger>
        <TabsTrigger value="tracking" className="gap-1.5">
          <Activity size={14} /> Tracking
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tests" className="mt-4">
        <TestsSection />
      </TabsContent>
      <TabsContent value="tracking" className="mt-4">
        <TrackingSection />
      </TabsContent>
    </Tabs>
  );
}

function TestsSection() {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const sendTestEmail = async (stage: string) => {
    const key = `${paymentMethod}_${billingPeriod}_${stage}`;
    setResults((prev) => ({ ...prev, [key]: "sending" }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const daysMap: Record<string, number> = { "D-5": 5, "D-3": 3, "D-1": 1, "D0": 0, "D+1": -1 };
      const remainingDays = daysMap[stage] ?? 0;

      const origin = "https://wiize.com.br";
      const checkoutUrl = paymentMethod === "card"
        ? `${origin}/minha-assinatura`
        : `${origin}/checkout-pix?plan=growth&planName=${encodeURIComponent("Wiize Growth (Teste)")}&email=${encodeURIComponent(user.email || "")}&name=${encodeURIComponent("Admin (Teste)")}&renewal=true`;

      // Build realistic price label per scenario
      let planPrice: string;
      if (paymentMethod === "pix") {
        planPrice = "R$ 696/mês";
      } else if (billingPeriod === "annual") {
        // R$ 596 × 12 = R$ 7.152 total, parcelado em 12×
        planPrice = "R$ 7.152 em 12× R$ 596";
      } else {
        planPrice = "R$ 696/mês";
      }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: "SUBSCRIPTION_RENEWAL",
          payload: {
            plan_name: "Wiize Growth (Teste)",
            plan_price: planPrice,
            expiry_date: new Date(Date.now() + remainingDays * 86400000).toLocaleDateString("pt-BR"),
            remaining_days: remainingDays,
            checkout_url: checkoutUrl,
            user_name: "Admin (Teste)",
            stage,
            payment_method: paymentMethod,
          },
          idempotency_key: `test_renewal_${paymentMethod}_${billingPeriod}_${stage}_${Date.now()}`,
        },
      });

      if (error) throw error;
      setResults((prev) => ({ ...prev, [key]: "success" }));
      toast({ title: `✅ Email ${stage} (${paymentMethod}) enviado` });
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [key]: "error" }));
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    }
  };

  const sendAll = async () => {
    for (const s of RENEWAL_STAGES) {
      await sendTestEmail(s.stage);
      await new Promise((r) => setTimeout(r, 700));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Envie emails de teste para <strong>seu email</strong>.
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setPaymentMethod("pix")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                paymentMethod === "pix" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💸 PIX
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                paymentMethod === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💳 Cartão
            </button>
          </div>
          {paymentMethod === "card" && (
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingPeriod === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anual 12×
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={sendAll} className="gap-2">
            <FlaskConical size={14} /> Testar Todos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {RENEWAL_STAGES.map((s) => {
          const key = `${paymentMethod}_${billingPeriod}_${s.stage}`;
          const status = results[key] || "idle";
          return (
            <Card key={s.stage} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <Badge variant={s.color}>{s.stage}</Badge>
                  <p className="text-sm text-foreground mt-1">{s.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status === "success" && <CheckCircle2 size={16} className="text-primary" />}
                  {status === "error" && <XCircle size={16} className="text-destructive" />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail(s.stage)}
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TrackingSection() {
  const [events, setEvents] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, logsRes] = await Promise.all([
        supabase
          .from("pix_tracking_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("email_logs")
          .select("*")
          .eq("email_type", "SUBSCRIPTION_RENEWAL" as any)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setEvents(eventsRes.data || []);
      setEmailLogs(logsRes.data || []);
    } catch (err) {
      console.error("Error loading tracking data:", err);
    } finally {
      setLoading(false);
    }
  };

  const eventIcons: Record<string, any> = {
    email_sent: <Mail size={14} className="text-blue-500" />,
    email_opened: <EyeIcon size={14} className="text-yellow-500" />,
    email_clicked: <MousePointerClick size={14} className="text-primary" />,
    email_failed: <AlertTriangle size={14} className="text-destructive" />,
    payment_confirmed: <DollarSign size={14} className="text-primary" />,
    access_suspended: <XCircle size={14} className="text-destructive" />,
    processing_error: <AlertTriangle size={14} className="text-destructive" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Eventos de tracking de renovação PIX</p>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Atualizar
        </Button>
      </div>

      {/* Email Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Emails de Renovação Enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : emailLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium text-foreground">Para</th>
                    <th className="text-left p-2 font-medium text-foreground">Assunto</th>
                    <th className="text-left p-2 font-medium text-foreground">Status</th>
                    <th className="text-left p-2 font-medium text-foreground">Aberto</th>
                    <th className="text-left p-2 font-medium text-foreground">Clicado</th>
                    <th className="text-left p-2 font-medium text-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="p-2 text-xs text-muted-foreground">{log.to_email}</td>
                      <td className="p-2 text-xs">{log.subject || "—"}</td>
                      <td className="p-2">
                        <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">
                        {log.opened_count > 0 ? (
                          <span className="text-primary font-medium">{log.opened_count}x</span>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-xs">
                        {log.clicked_count > 0 ? (
                          <span className="text-primary font-medium">{log.clicked_count}x</span>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum email de renovação enviado ainda.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tracking Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Eventos de Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  {eventIcons[ev.event_type] || <Activity size={14} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{ev.event_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.renewal_stage && <Badge variant="outline" className="text-xs mr-2">{ev.renewal_stage}</Badge>}
                      {ev.user_id?.slice(0, 8)}… · {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum evento de tracking registrado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
