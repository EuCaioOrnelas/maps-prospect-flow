import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FlaskConical, Loader2, CheckCircle2, XCircle, AlertTriangle, Users } from "lucide-react";

// ── Broadcast Tab ──────────────────────────────────────────────────────────────

function BroadcastTab() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetPlan, setTargetPlan] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; errors: number } | null>(null);

  const handleSend = async () => {
    if (!subject || !content) {
      toast({ title: "Preencha assunto e conteúdo", variant: "destructive" });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Get target users
      let query = supabase.from("profiles").select("id, email, plan").eq("is_blocked", false);
      if (targetPlan !== "all") {
        query = query.eq("plan", targetPlan);
      }

      const { data: users, error } = await query;
      if (error) throw error;

      let sent = 0, skipped = 0, errors = 0;

      for (const user of users || []) {
        try {
          const { error: sendErr } = await supabase.functions.invoke("send-email", {
            body: {
              user_id: user.id,
              email_type: "ADMIN_BROADCAST",
              payload: { subject, title: title || subject, content },
              idempotency_key: `broadcast_${user.id}_${Date.now()}`,
            },
          });

          if (sendErr) {
            errors++;
          } else {
            sent++;
          }
        } catch {
          errors++;
        }
      }

      setResult({ sent, skipped, errors });
      toast({ title: `Broadcast enviado: ${sent} emails` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Assunto do e-mail *</label>
          <Input
            placeholder="Ex: Novidades da Wiize — Janeiro 2026"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Título interno (header do email)</label>
          <Input
            placeholder="Usa o assunto se vazio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Conteúdo (HTML permitido) *</label>
        <Textarea
          placeholder="<p>Olá! Temos novidades incríveis para você...</p>"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use tags HTML: &lt;p&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt;, &lt;ul&gt;, &lt;li&gt; etc. O header e footer com branding Wiize são adicionados automaticamente.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Enviar para</label>
          <Select value={targetPlan} onValueChange={setTargetPlan}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              <SelectItem value="free">Apenas Free</SelectItem>
              <SelectItem value="start">Apenas Start</SelectItem>
              <SelectItem value="growth">Apenas Growth</SelectItem>
              <SelectItem value="scale">Apenas Scale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button onClick={handleSend} disabled={sending || !subject || !content} className="gap-2">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Enviando..." : "Enviar Broadcast"}
        </Button>
      </div>

      {result && (
        <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border">
          <Badge variant="default" className="gap-1"><CheckCircle2 size={12} /> {result.sent} enviados</Badge>
          {result.errors > 0 && <Badge variant="destructive" className="gap-1"><XCircle size={12} /> {result.errors} erros</Badge>}
        </div>
      )}
    </div>
  );
}

// ── Test Tab ───────────────────────────────────────────────────────────────────

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

function TestTab() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});

  const sendTest = async (emailType: string, payload: Record<string, unknown>) => {
    setTestResults((prev) => ({ ...prev, [emailType]: "sending" }));

    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: emailType,
          payload,
          idempotency_key: `test_${emailType}_${Date.now()}`,
        },
      });

      if (error) throw error;

      setTestResults((prev) => ({ ...prev, [emailType]: "success" }));
      toast({ title: `✅ Email "${emailType}" enviado para seu email` });
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
          Os emails de teste serão enviados para <strong>seu email</strong> cadastrado.
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

// ── Logs Tab ───────────────────────────────────────────────────────────────────

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

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function AdminEmailPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Mail size={20} />
          Sistema de E-mails
        </CardTitle>
        <CardDescription>Enviar broadcast, testar templates e ver logs de envio</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="test" className="gap-1">
              <FlaskConical size={14} /> Testar
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="gap-1">
              <Users size={14} /> Broadcast
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1">
              <AlertTriangle size={14} /> Logs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="test" className="mt-4">
            <TestTab />
          </TabsContent>
          <TabsContent value="broadcast" className="mt-4">
            <BroadcastTab />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
