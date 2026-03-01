import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, FlaskConical, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, PenLine, Users, Bold, Italic, Link2 } from "lucide-react";
import { useRef } from "react";

const TARGET_EMAIL = "caiowiize@gmail.com";

const EMAIL_TYPES = [
  {
    type: "CAMPAIGN_SCHEDULED_STARTED",
    label: "Campanha Iniciada",
    payload: { campaign_name: "Campanha Teste", total_leads: 150, scheduled_time: "09:00" },
  },
  {
    type: "NUMBER_DISCONNECTED",
    label: "Número Desconectado",
    payload: { phone_number: "+55 11 99999-9999", instance_name: "teste-instance" },
  },
  {
    type: "CAMPAIGN_FAILED_TO_START",
    label: "Campanha Falhou",
    payload: { campaign_name: "Campanha Teste", reason: "Número não conectado ao WhatsApp" },
  },
  {
    type: "WEEKLY_SUMMARY",
    label: "Resumo Semanal",
    payload: { period: "17 fev — 24 fev", messages_sent: 342, responses: 89, response_rate: 26, new_leads: 45 },
  },
  {
    type: "CAMPAIGN_COMPLETED",
    label: "Campanha Concluída",
    payload: { campaign_name: "Campanha Teste", total_sent: 200, total_responses: 52 },
  },
  {
    type: "ADMIN_BROADCAST",
    label: "Broadcast Admin",
    payload: { subject: "Teste de Broadcast", title: "Novidades da Wiize", content: "<p>Este é um <strong>teste</strong> do sistema de broadcast.</p><p>Tudo funcionando corretamente! 🎉</p>" },
  },
];

// ─── Compose Tab ────────────────────────────────────────────────────────────

type PlanFilter = "free" | "start" | "growth" | "scale";

function ComposeTab() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedPlans, setSelectedPlans] = useState<PlanFilter[]>(["free", "start", "growth", "scale"]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const textareaRef = useState<HTMLTextAreaElement | null>(null);

  const togglePlan = (plan: PlanFilter) => {
    setSelectedPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: "Preencha o assunto e o conteúdo", variant: "destructive" });
      return;
    }
    if (selectedPlans.length === 0) {
      toast({ title: "Selecione ao menos um plano", variant: "destructive" });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Fetch target users based on plan filter
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, name, plan")
        .in("plan", selectedPlans)
        .eq("is_blocked", false);

      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        toast({ title: "Nenhum usuário encontrado para os planos selecionados" });
        setSending(false);
        return;
      }

      // Check marketing preferences
      const userIds = users.map((u) => u.id);
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("user_id, marketing_enabled")
        .in("user_id", userIds);

      const prefsMap = new Map(prefs?.map((p) => [p.user_id, p.marketing_enabled]) || []);

      // Content is already HTML-ready from the editor
      const htmlContent = content.trim();

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const u of users) {
        // Respect marketing preferences (default: disabled for marketing)
        const marketingEnabled = prefsMap.get(u.id) ?? false;
        if (!marketingEnabled) {
          skipped++;
          continue;
        }

        try {
          const { error } = await supabase.functions.invoke("send-email", {
            body: {
              user_id: u.id,
              email_type: "ADMIN_BROADCAST",
              payload: {
                subject: subject.trim(),
                content: htmlContent,
              },
              idempotency_key: `broadcast_${Date.now()}_${u.id}`,
            },
          });
          if (error) throw error;
          sent++;
        } catch {
          failed++;
        }
      }

      setResult({ sent, failed, skipped });
      toast({ title: `✅ Envio concluído: ${sent} enviados, ${skipped} opt-out, ${failed} erros` });
    } catch (err: any) {
      toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleTestSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: "Preencha o assunto e o conteúdo", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const htmlContent = content.trim();

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: "ADMIN_BROADCAST",
          payload: {
            subject: `[TESTE] ${subject.trim()}`,
            content: htmlContent,
          },
          idempotency_key: `test_compose_${Date.now()}`,
          override_email: TARGET_EMAIL,
        },
      });

      if (error) throw error;
      toast({ title: `✅ Teste enviado para ${TARGET_EMAIL}` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <Label htmlFor="email-subject" className="text-foreground">Assunto do e-mail *</Label>
          <Input
            id="email-subject"
            placeholder="Ex: Novidade importante na Wiize!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
            maxLength={150}
          />
        </div>
        <div>
          <Label htmlFor="email-title" className="text-foreground">Título interno (opcional)</Label>
          <Input
            id="email-title"
            placeholder="Título exibido dentro do e-mail (se vazio, usa o assunto)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            maxLength={150}
          />
        </div>
        <div>
          <Label htmlFor="email-content" className="text-foreground">Conteúdo *</Label>
          <Textarea
            id="email-content"
            placeholder="Escreva o conteúdo do e-mail aqui. Cada linha vira um parágrafo."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 min-h-[160px]"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cada linha será convertida em um parágrafo. {content.length}/5000
          </p>
        </div>
      </div>

      <div>
        <Label className="text-foreground mb-2 block">
          <Users size={14} className="inline mr-1" />
          Público-alvo (planos)
        </Label>
        <div className="flex flex-wrap gap-3">
          {([
            { value: "free" as PlanFilter, label: "Free" },
            { value: "growth" as PlanFilter, label: "Growth" },
            { value: "scale" as PlanFilter, label: "Scale" },
          ]).map((plan) => (
            <label
              key={plan.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedPlans.includes(plan.value)}
                onCheckedChange={() => togglePlan(plan.value)}
              />
              <span className="text-sm text-foreground">{plan.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Apenas usuários com marketing habilitado receberão o e-mail.
        </p>
      </div>

      {result && (
        <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
          <p className="text-sm font-medium text-foreground">Resultado do envio:</p>
          <div className="flex gap-4 text-sm">
            <span className="text-primary">✅ {result.sent} enviados</span>
            <span className="text-muted-foreground">⏭️ {result.skipped} opt-out</span>
            {result.failed > 0 && <span className="text-destructive">❌ {result.failed} erros</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleTestSend}
          disabled={sending}
          className="gap-2"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
          Enviar teste para mim
        </Button>
        <Button
          onClick={handleSend}
          disabled={sending}
          className="gap-2"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar para todos
        </Button>
      </div>
    </div>
  );
}

// ─── Test Tab ────────────────────────────────────────────────────────────────

function TestTab() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});

  const sendTest = async (emailType: string, payload: Record<string, unknown>) => {
    setTestResults((prev) => ({ ...prev, [emailType]: "sending" }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: emailType,
          payload,
          idempotency_key: `test_${emailType}_${Date.now()}`,
          override_email: TARGET_EMAIL,
        },
      });

      if (error) throw error;

      setTestResults((prev) => ({ ...prev, [emailType]: "success" }));
      toast({ title: `✅ Email "${emailType}" enviado para ${TARGET_EMAIL}` });
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [emailType]: "error" }));
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive" });
    }
  };

  const sendAll = async () => {
    for (const et of EMAIL_TYPES) {
      await sendTest(et.type, et.payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Todos os testes serão enviados para <strong>{TARGET_EMAIL}</strong>
        </p>
        <Button variant="outline" size="sm" onClick={sendAll} className="gap-2">
          <FlaskConical size={14} />
          Testar Todos
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EMAIL_TYPES.map((et) => {
          const status = testResults[et.type] || "idle";
          return (
            <div
              key={et.type}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{et.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{et.type}</p>
              </div>
              <div className="flex items-center gap-2">
                {status === "success" && <CheckCircle2 size={16} className="text-primary" />}
                {status === "error" && <XCircle size={16} className="text-destructive" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTest(et.type, et.payload)}
                  disabled={status === "sending"}
                >
                  {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Logs Tab ────────────────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Últimos 50 emails enviados</p>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Carregar logs"}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-foreground">Tipo</th>
                <th className="text-left p-2 font-medium text-foreground">Para</th>
                <th className="text-left p-2 font-medium text-foreground">Status</th>
                <th className="text-left p-2 font-medium text-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="p-2 font-mono text-xs">{log.email_type}</td>
                  <td className="p-2 text-muted-foreground">{log.to_email}</td>
                  <td className="p-2">
                    <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const AdminEmailTests = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail size={24} />
              E-mails
            </h1>
            <p className="text-sm text-muted-foreground">
              Compor, testar e acompanhar envios
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="compose" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compose" className="gap-1">
                  <PenLine size={14} /> Compor
                </TabsTrigger>
                <TabsTrigger value="test" className="gap-1">
                  <FlaskConical size={14} /> Testar
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-1">
                  <AlertTriangle size={14} /> Logs
                </TabsTrigger>
              </TabsList>
              <TabsContent value="compose" className="mt-4">
                <ComposeTab />
              </TabsContent>
              <TabsContent value="test" className="mt-4">
                <TestTab />
              </TabsContent>
              <TabsContent value="logs" className="mt-4">
                <LogsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEmailTests;
