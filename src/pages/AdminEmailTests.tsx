import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, FlaskConical, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, PenLine, Users, Bold, Italic, Link2, History } from "lucide-react";
import { Link } from "react-router-dom";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { EmailHistoryPanel } from "@/components/admin/EmailHistoryPanel";

const TARGET_EMAIL = "caiowiize@gmail.com";

type SendEmailResult = {
  success?: boolean;
  duplicate?: boolean;
  id?: string;
  provider_id?: string;
  error?: string;
  details?: unknown;
};

const validateSendEmailResult = (data: unknown): SendEmailResult => {
  const result = (data || {}) as SendEmailResult;
  if (result.duplicate) {
    throw new Error("Este envio foi ignorado por duplicidade. Tente novamente em alguns segundos.");
  }
  if (!result.success || !result.provider_id) {
    throw new Error(result.error || "O servidor não confirmou o envio do e-mail.");
  }
  return result;
};

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
  {
    type: "AGENT_HUMAN_HANDOFF",
    label: "Transferência p/ Humano",
    payload: { agent_name: "Agente Vendas", lead_phone: "+55 11 99999-9999", lead_name: "João Silva", stage_name: "Atendimento Humano", reason: "O agente não soube responder a pergunta do lead e transferiu para atendimento humano." },
  },
];

// ─── Compose Tab ────────────────────────────────────────────────────────────

type ScoreLevelFilter = "Frio" | "Baixo engajamento" | "Engajado" | "Alto valor" | "Pronto para upgrade";
type SegmentFilter = "all" | "free_only" | "paid_only" | "start" | "growth" | "scale" | "churned";

function ComposeTab({ onBroadcastSent }: { onBroadcastSent?: () => void }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [scoreLevel, setScoreLevel] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; startedAt: number } | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("URL do link:");
    if (!url) return;
    const text = prompt("Texto do botão/link:", "Clique aqui");
    if (!text) return;
    const linkHtml = `<a href="${url}" style="display:inline-block;padding:10px 20px;background:#3daa57;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">${text}</a>`;
    document.execCommand("insertHTML", false, linkHtml);
    editorRef.current?.focus();
  };

  const getEditorContent = () => editorRef.current?.innerHTML || "";

  const getPlansForSegment = (): string[] => {
    switch (segment) {
      case "free_only": return ["free"];
      case "paid_only": return ["start", "growth", "scale"];
      case "start": return ["start"];
      case "growth": return ["growth"];
      case "scale": return ["scale"];
      default: return ["free", "start", "growth", "scale"];
    }
  };

  const batchInQuery = async (
    table: string,
    selectCols: string,
    filterCol: string,
    filterValues: string[],
    extraFilters?: (q: any) => any
  ): Promise<any[]> => {
    const CHUNK = 500;
    const results: any[] = [];
    for (let i = 0; i < filterValues.length; i += CHUNK) {
      const chunk = filterValues.slice(i, i + CHUNK);
      let query = (supabase.from(table as any) as any).select(selectCols).in(filterCol, chunk);
      if (extraFilters) query = extraFilters(query);
      const { data } = await query;
      if (data) results.push(...data);
    }
    return results;
  };

  const getFilteredUserIds = async (): Promise<{ eligible: any[]; skipped: number }> => {
    // For churned segment, use admin-broadcast dry_run (queries Stripe API)
    if (segment === "churned") {
      const { data, error } = await supabase.functions.invoke("admin-broadcast", {
        body: { segment: "churned", score_level: scoreLevel, dry_run: true },
      });
      if (error) throw error;
      const res = data as { queued: number; skipped: number };
      // Return fake eligible array with correct length for count display
      return {
        eligible: Array.from({ length: res.queued || 0 }, (_, i) => ({ id: `churned-${i}` })),
        skipped: res.skipped || 0,
      };
    }

    let filteredUsers: any[] = [];
    const plans = getPlansForSegment();
    const PAGE = 1000;
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, plan")
        .in("plan", plans)
        .eq("is_blocked", false)
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error) throw error;
      if (data) filteredUsers.push(...data);
      hasMore = (data?.length || 0) === PAGE;
      page++;
    }

    if (filteredUsers.length === 0) return { eligible: [], skipped: 0 };

    if (scoreLevel !== "all") {
      const userIds = filteredUsers.map(u => u.id);
      const scores = await batchInQuery(
        "user_scores", "user_id, score_label", "user_id", userIds,
        (q: any) => q.eq("score_label", scoreLevel)
      );
      const scoredIds = new Set(scores.map(s => s.user_id));
      filteredUsers = filteredUsers.filter(u => scoredIds.has(u.id));
    }

    const userIds = filteredUsers.map(u => u.id);
    const prefs = await batchInQuery(
      "email_preferences", "user_id, marketing_enabled", "user_id", userIds
    );

    const optedOutIds = new Set(
      prefs.filter(p => p.marketing_enabled === false).map(p => p.user_id)
    );

    const eligible = filteredUsers.filter(u => !optedOutIds.has(u.id));
    const skipped = filteredUsers.length - eligible.length;
    return { eligible, skipped };
  };

  const handleCountPreview = async () => {
    setLoadingCount(true);
    try {
      const { eligible } = await getFilteredUserIds();
      setMatchCount(eligible.length);
    } catch (err: any) {
      toast({ title: "Erro ao contar", description: err.message, variant: "destructive" });
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    setMatchCount(null);
  }, [segment, scoreLevel]);

  const handleSendWithEditor = async (isTest: boolean) => {
    const htmlContent = getEditorContent();
    if (!subject.trim() || !htmlContent.trim()) {
      toast({ title: "Preencha o assunto e o conteúdo", variant: "destructive" });
      return;
    }

    setSending(true);
    setResult(null);
    setProgress(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (isTest) {
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "ADMIN_BROADCAST",
            payload: { subject: `[TESTE] ${subject.trim()}`, content: htmlContent },
            idempotency_key: `test_compose_${user.id}_${Date.now()}_${crypto.randomUUID()}`,
            override_email: TARGET_EMAIL,
          },
        });
        if (error) throw error;
        const sendResult = validateSendEmailResult(data);
        toast({ title: `✅ Teste enviado para ${TARGET_EMAIL}` });
        setResult({ sent: 1, failed: 0, skipped: 0 });
        console.info("[AdminEmailTests] Broadcast test sent", sendResult);
        onBroadcastSent?.();
      } else {
        // Client-side sending with progress
        const { eligible, skipped } = await getFilteredUserIds();

        if (eligible.length === 0) {
          toast({ title: "Nenhum destinatário encontrado", variant: "destructive" });
          setSending(false);
          return;
        }

        // For churned segment, delegate to admin-broadcast since we don't have user details
        if (segment === "churned") {
          const { data, error } = await supabase.functions.invoke("admin-broadcast", {
            body: { subject: subject.trim(), content: htmlContent, segment, score_level: scoreLevel },
          });
          if (error) throw error;
          const res = data as { sent?: number; failed?: number; skipped?: number };
          setResult({ sent: res.sent || 0, failed: res.failed || 0, skipped: res.skipped || 0 });
          toast({ title: `✅ Broadcast concluído: ${res.sent || 0} enviados` });
          onBroadcastSent?.();
          setSending(false);
          setProgress(null);
          return;
        }

        const batchTimestamp = Date.now();
        let sent = 0, failed = 0;
        setProgress({ current: 0, total: eligible.length, startedAt: Date.now() });

        for (let i = 0; i < eligible.length; i++) {
          const u = eligible[i];
          if (i > 0) await new Promise(r => setTimeout(r, 650));

          try {
            const { data: sendData, error: sendErr } = await supabase.functions.invoke("send-email", {
              body: {
                user_id: u.id,
                email_type: "ADMIN_BROADCAST",
                payload: { subject: subject.trim(), content: htmlContent },
                idempotency_key: `broadcast_${batchTimestamp}_${crypto.randomUUID()}_${u.id}`,
              },
            });
            if (sendErr) throw sendErr;
            validateSendEmailResult(sendData);
            sent++;
          } catch { failed++; }

          setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        }

        setResult({ sent, failed, skipped });
        toast({ title: `✅ Broadcast concluído: ${sent} enviados, ${failed} erros` });
        onBroadcastSent?.();
      }
    } catch (err: any) {
      toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
      setProgress(null);
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
          <Label className="text-foreground">Conteúdo do e-mail *</Label>
          <p className="text-xs text-muted-foreground mb-2">
            O header com logo e footer com "não responder" são incluídos automaticamente.
          </p>
          <div className="flex items-center gap-1 p-1.5 border border-b-0 rounded-t-md bg-muted/30">
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("bold")} title="Negrito">
              <Bold size={14} />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("italic")} title="Itálico">
              <Italic size={14} />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={insertLink} title="Inserir botão/link">
              <Link2 size={14} />
              <span className="text-xs">Botão</span>
            </Button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[160px] p-3 border rounded-b-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ lineHeight: 1.7 }}
            data-placeholder="Escreva o conteúdo do e-mail aqui..."
            suppressContentEditableWarning
          />
        </div>
      </div>

      {/* Targeting — clean layout with Select dropdowns */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users size={14} />
            Público-alvo
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apenas usuários com marketing habilitado receberão o e-mail.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Segmento</Label>
            <Select value={segment} onValueChange={(v) => setSegment(v as SegmentFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                <SelectItem value="free_only">Apenas Free (não compraram)</SelectItem>
                <SelectItem value="paid_only">Apenas pagantes (compraram)</SelectItem>
                <SelectItem value="churned">Cancelados / Downgrade</SelectItem>
                <SelectItem value="start">Plano Start</SelectItem>
                <SelectItem value="growth">Plano Growth</SelectItem>
                <SelectItem value="scale">Plano Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nível de score</Label>
            <Select value={scoreLevel} onValueChange={setScoreLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="Frio">Frio (0–20)</SelectItem>
                <SelectItem value="Baixo engajamento">Baixo engajamento (21–40)</SelectItem>
                <SelectItem value="Engajado">Engajado (41–60)</SelectItem>
                <SelectItem value="Alto valor">Alto valor (61–80)</SelectItem>
                <SelectItem value="Pronto para upgrade">Pronto para upgrade (81–100)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-4 pb-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleCountPreview} disabled={loadingCount} className="gap-2">
            {loadingCount ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Contar destinatários
          </Button>
          {matchCount !== null && (
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">{matchCount}</strong> usuário(s) elegíveis
            </span>
          )}
        </div>
      </div>

      {progress && (() => {
        const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
        const elapsed = (Date.now() - progress.startedAt) / 1000;
        const avgPerItem = progress.current > 0 ? elapsed / progress.current : 0.65;
        const remaining = Math.max(0, (progress.total - progress.current) * avgPerItem);
        const formatTime = (s: number) => {
          if (s < 60) return `${Math.ceil(s)}s`;
          const m = Math.floor(s / 60);
          const sec = Math.ceil(s % 60);
          return `${m}m ${sec}s`;
        };
        return (
          <div className="p-4 rounded-lg border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <p className="text-sm font-semibold text-foreground">Enviando broadcast...</p>
              </div>
              <Badge variant="outline" className="text-xs">{pct}%</Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.current} de {progress.total} enviados</span>
              <span>
                {progress.current > 0 && progress.current < progress.total
                  ? `⏱ ~${formatTime(remaining)} restantes`
                  : progress.current === progress.total
                    ? "✅ Concluído!"
                    : "Iniciando..."}
              </span>
            </div>
          </div>
        );
      })()}

      {result && (
        <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
          <p className="text-sm font-medium text-foreground">Resultado do envio:</p>
          <div className="flex gap-4 text-sm">
            <span className="text-primary">✅ {result.sent} enviados</span>
            {result.failed > 0 && <span className="text-destructive">❌ {result.failed} erros</span>}
            <span className="text-muted-foreground">⏭️ {result.skipped} opt-out</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => handleSendWithEditor(true)} disabled={sending} className="gap-2">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
          Enviar teste para mim
        </Button>
        <Button onClick={() => handleSendWithEditor(false)} disabled={sending} className="gap-2">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar para todos
        </Button>
      </div>
    </div>
  );
}

// ─── Test Tab ────────────────────────────────────────────────────────────────

function TestTab({ onEmailSent }: { onEmailSent?: () => void }) {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});

  const sendTest = async (emailType: string, payload: Record<string, unknown>) => {
    setTestResults((prev) => ({ ...prev, [emailType]: "sending" }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: emailType,
          payload,
          idempotency_key: `test_${emailType}_${user.id}_${Date.now()}_${crypto.randomUUID()}`,
          override_email: TARGET_EMAIL,
        },
      });

      if (error) throw error;
      validateSendEmailResult(data);

      setTestResults((prev) => ({ ...prev, [emailType]: "success" }));
      toast({ title: `✅ Email "${emailType}" enviado para ${TARGET_EMAIL}` });
      onEmailSent?.();
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
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="history" className="gap-1">
                  <History size={14} /> Histórico
                </TabsTrigger>
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
              <TabsContent value="history" className="mt-4">
                <EmailHistoryPanel refreshKey={historyRefreshKey} />
              </TabsContent>
              <TabsContent value="compose" className="mt-4">
                <ComposeTab onBroadcastSent={() => setHistoryRefreshKey(k => k + 1)} />
              </TabsContent>
              <TabsContent value="test" className="mt-4">
                <TestTab onEmailSent={() => setHistoryRefreshKey(k => k + 1)} />
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
