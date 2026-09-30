import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountRole } from "@/hooks/useAccountRole";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PasswordField, isStrongPassword } from "@/components/wiize-api/PasswordField";
import { WiizePayConnectionCard } from "@/components/integrations/WiizePayConnectionCard";
import {
  ArrowLeft, ShieldCheck, Download, RefreshCw, Lock, MailCheck, Ban,
  Plug, Clock, FileJson, TriangleAlert, CheckCircle2,
} from "lucide-react";

// ---------------------------------------------------------------
// MÓDULO SEGURO DE EXPORTAÇÃO — Preparação Wiize Pay
// READY_FOR_WIIZE_PAY: o frontend apenas solicita; todas as
// decisões de segurança vivem no backend (edge function).
// ---------------------------------------------------------------

const ENTITY_LABELS: Record<string, string> = {
  leads: "Empresas e contatos (CRM)",
  vendas: "Negócios e vendas",
  contratos: "Contratos (recorrentes)",
  atividades: "Atividades",
  notas: "Histórico e notas",
  anexos: "Anexos (apenas referência)",
  formularios: "Formulários",
  respostas_formulario: "Respostas de formulários",
  produtos: "Produtos e serviços",
  etapas_e_configuracoes: "Etapas do funil e configurações",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando confirmação",
  authorized: "Autorizada",
  processing: "Processando",
  completed: "Concluída",
  failed: "Falhou",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-warning border border-warning/30",
  authorized: "bg-info/10 text-info border border-info/30",
  processing: "bg-info/10 text-info border border-info/30",
  completed: "bg-primary/10 text-primary border border-primary/30",
  failed: "bg-destructive/10 text-destructive border border-destructive/30",
  expired: "bg-muted text-muted-foreground border border-border",
  cancelled: "bg-muted text-muted-foreground border border-border",
};

async function callApi<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("integration-export", { body });
  if (error) throw new Error(error.message || "Falha na comunicação com o servidor.");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function IntegrationWiizePay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role: accountRole, loading: roleLoading } = useAccountRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);

  const isPrivileged = accountRole === "owner" || accountRole === "admin";

  // Estado geral
  const [overview, setOverview] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Fluxo de exportação
  const [selectedEntities, setSelectedEntities] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(ENTITY_LABELS).map((k) => [k, true])),
  );
  const [exportPassword, setExportPassword] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Confirmação por e-mail
  const [confirmResult, setConfirmResult] = useState<{ ok: boolean; text: string } | null>(null);
  const confirmHandled = useRef(false);

  // Segurança
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [revokePassword, setRevokePassword] = useState("");
  const [revoking, setRevoking] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    try {
      const data = await callApi({ action: "overview" });
      setOverview(data.overview);
      setState(data.state);
      const [listData, historyData] = await Promise.all([
        callApi({ action: "list" }),
        callApi({ action: "history" }),
      ]);
      setExports(listData.exports || []);
      setLogs(historyData.logs || []);
    } catch (e: any) {
      setPageError(e?.message || "Erro ao carregar o módulo.");
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    if (!roleLoading && isPrivileged) loadAll();
  }, [roleLoading, isPrivileged, loadAll]);

  // Confirmação de exportação pelo link do e-mail (?confirm=...&request=...)
  useEffect(() => {
    if (confirmHandled.current || roleLoading || !isPrivileged) return;
    const token = searchParams.get("confirm");
    const requestId = searchParams.get("request");
    if (!token || !requestId) return;
    confirmHandled.current = true;

    callApi({ action: "confirm_export", token, request_id: requestId })
      .then(() => {
        setConfirmResult({ ok: true, text: "Exportação autorizada! O arquivo está sendo gerado. Acompanhe o status em Histórico." });
        setActiveRequestId(requestId);
      })
      .catch((e: any) => setConfirmResult({ ok: false, text: e?.message || "Não foi possível confirmar a exportação." }))
      .finally(() => {
        searchParams.delete("confirm");
        searchParams.delete("request");
        setSearchParams(searchParams, { replace: true });
      });
  }, [searchParams, setSearchParams, roleLoading, isPrivileged]);

  // Acompanhamento automático do status da exportação ativa
  useEffect(() => {
    if (!activeRequestId) return;
    const active = exports.find((e) => e.id === activeRequestId);
    if (active && ["completed", "failed", "expired", "cancelled"].includes(active.status)) return;

    const interval = setInterval(async () => {
      try {
        const data = await callApi({ action: "status", request_id: activeRequestId });
        setExports((prev) => {
          const exists = prev.some((e) => e.id === activeRequestId);
          return exists ? prev.map((e) => (e.id === activeRequestId ? { ...e, ...data.export } : e)) : [{ ...data.export }, ...prev];
        });
      } catch {
        /* silencioso: próxima tentativa no próximo ciclo */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeRequestId, exports]);

  const activeRequest = useMemo(
    () => exports.find((e) => e.id === activeRequestId) || null,
    [exports, activeRequestId],
  );

  async function handleRequestExport() {
    setExportMessage(null);
    if (!exportPassword) {
      setExportMessage({ kind: "error", text: "Digite sua Senha de Integração." });
      return;
    }
    if (!Object.values(selectedEntities).some(Boolean)) {
      setExportMessage({ kind: "error", text: "Selecione ao menos uma entidade para exportar." });
      return;
    }
    setRequesting(true);
    try {
      const data = await callApi({
        action: "request_export",
        integration_password: exportPassword,
        scope: selectedEntities,
        idempotency_key: crypto.randomUUID(),
      });
      setExportPassword("");
      setActiveRequestId(data.request_id);
      if (data.email_sent === false) {
        setExportMessage({ kind: "warn", text: data.warning || "Não foi possível enviar o e-mail de confirmação." });
      } else {
        setExportMessage({ kind: "ok", text: `Solicitação registrada. Enviamos um link de confirmação para ${data.email_sent_to}. Ele expira em 30 minutos.` });
      }
      const listData = await callApi({ action: "list" });
      setExports(listData.exports || []);
    } catch (e: any) {
      setExportMessage({ kind: "error", text: e?.message || "Erro ao solicitar exportação." });
    } finally {
      setRequesting(false);
    }
  }

  async function handleDownload(requestId: string) {
    try {
      const data = await callApi({ action: "download", request_id: requestId });
      window.open(data.url, "_blank", "noopener");
      const listData = await callApi({ action: "list" });
      setExports(listData.exports || []);
    } catch (e: any) {
      setExportMessage({ kind: "error", text: e?.message || "Erro ao gerar o download." });
    }
  }

  async function handleCancel(requestId: string) {
    try {
      await callApi({ action: "cancel", request_id: requestId });
      const listData = await callApi({ action: "list" });
      setExports(listData.exports || []);
      if (activeRequestId === requestId) setActiveRequestId(null);
    } catch (e: any) {
      setExportMessage({ kind: "error", text: e?.message || "Erro ao cancelar." });
    }
  }

  async function handleSavePassword() {
    setPasswordMessage(null);
    if (!isStrongPassword(newPassword)) {
      setPasswordMessage({ kind: "error", text: "A senha não atende aos requisitos mínimos." });
      return;
    }
    setSavingPassword(true);
    try {
      await callApi({
        action: state?.password_set ? "change_password" : "set_password",
        current_password: state?.password_set ? currentPassword : undefined,
        new_password: newPassword,
      });
      setNewPassword("");
      setCurrentPassword("");
      setPasswordMessage({ kind: "ok", text: "Senha de Integração salva com segurança." });
      const data = await callApi({ action: "get_state" });
      setState(data.state);
    } catch (e: any) {
      setPasswordMessage({ kind: "error", text: e?.message || "Erro ao salvar a senha." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevoke() {
    try {
      await callApi({ action: "revoke_connection", integration_password: revokePassword });
      setRevokePassword("");
      const data = await callApi({ action: "overview" });
      setState(data.state);
      setOverview(data.overview);
    } catch (e: any) {
      setPageError(e?.message || "Erro ao revogar a conexão.");
    }
  }

  if (roleLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SidebarProvider>
    );
  }

  if (!isPrivileged) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar profile={profile} />
          <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
            <div className="lg:hidden"><AppHeader profile={profile} /></div>
            <div className="flex-1 flex items-center justify-center p-6">
              <Alert className="max-w-md">
                <Lock className="h-4 w-4" />
                <AlertTitle>Acesso restrito</AlertTitle>
                <AlertDescription>
                  Apenas o proprietário da conta ou administradores podem acessar as integrações e exportações.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const entities = overview?.entities || {};

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="lg:hidden"><AppHeader profile={profile} /></div>
          <div className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 mb-6 -ml-2 text-muted-foreground">
                <ArrowLeft size={16} /> Voltar
              </Button>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                    <Plug className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Integrações</p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Wiize Pay</h1>
                    <p className="text-muted-foreground mt-1">
                      Conecte sua conta, gere cobranças direto do CRM e exporte seus dados com segurança.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Conexão criptografada
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      <Lock className="h-3.5 w-3.5 text-primary" /> Sem senha compartilhada
                    </span>
                  </div>
                </div>
              </div>

              {confirmResult && (
                <Alert className={confirmResult.ok ? "border-primary/30 bg-primary/5 mb-4" : "border-destructive/30 bg-destructive/5 mb-4"}>
                  {confirmResult.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <TriangleAlert className="h-4 w-4 text-destructive" />}
                  <AlertTitle>{confirmResult.ok ? "Confirmação concluída" : "Não foi possível confirmar"}</AlertTitle>
                  <AlertDescription>{confirmResult.text}</AlertDescription>
                </Alert>
              )}

              {pageError && (
                <Alert variant="destructive" className="mb-4">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{pageError}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="visao-geral">
                <TabsList className="mb-6 h-auto w-full sm:w-auto grid grid-cols-2 sm:inline-flex gap-1 rounded-xl bg-muted p-1">
                  <TabsTrigger value="visao-geral" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visão geral</TabsTrigger>
                  <TabsTrigger value="exportar" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Exportar</TabsTrigger>
                  <TabsTrigger value="historico" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Histórico</TabsTrigger>
                  <TabsTrigger value="seguranca" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Segurança</TabsTrigger>
                </TabsList>

                {/* ---------------- Visão geral ---------------- */}
                <TabsContent value="visao-geral" className="space-y-4">
                  <WiizePayConnectionCard />

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Segurança da sua conta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p>
                        <span className="font-medium">Senha de Integração:</span>{" "}
                        {state?.password_set ? (
                          <Badge className={`${STATUS_COLORS.completed} ml-1`}>Definida</Badge>
                        ) : (
                          <Badge className={`${STATUS_COLORS.pending} ml-1`}>Não definida</Badge>
                        )}
                      </p>
                      {state?.locked && (
                        <p className="text-destructive">
                          Conta temporariamente bloqueada por tentativas inválidas até {formatDate(state.locked_until)}.
                        </p>
                      )}
                      {!state?.password_set && (
                        <p className="text-muted-foreground">
                          Defina a Senha de Integração na aba <strong>Segurança</strong> para habilitar exportações.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Dados disponíveis para exportação</CardTitle>
                      <CardDescription>Contagem atual por entidade do seu CRM.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                            <div key={key} className="rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:border-primary/40">
                              <p className="text-2xl font-bold text-foreground tabular-nums">{(entities[key]?.count ?? 0).toLocaleString("pt-BR")}</p>
                              <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------------- Exportar ---------------- */}
                <TabsContent value="exportar" className="space-y-4">
                  <Alert>
                    <MailCheck className="h-4 w-4" />
                    <AlertTitle>Como funciona</AlertTitle>
                    <AlertDescription>
                      1. Defina a Senha de Integração (aba Segurança). 2. Selecione os dados e solicite a exportação.
                      3. Confirme pelo link enviado ao seu e-mail (válido por 30 minutos, uso único).
                      4. O arquivo fica disponível por 7 dias por link assinado, apenas para você.
                    </AlertDescription>
                  </Alert>

                  {activeRequest && ["pending", "authorized", "processing"].includes(activeRequest.status) && (
                    <Alert className="border-info/30 bg-info/5">
                      <Clock className="h-4 w-4 text-info" />
                      <AlertTitle>Exportação em andamento</AlertTitle>
                      <AlertDescription>
                        Status: {STATUS_LABELS[activeRequest.status] || activeRequest.status}. Esta página atualiza
                        automaticamente a cada 10 segundos.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Selecionar dados</CardTitle>
                      <CardDescription>
                        Escolha o que incluir no pacote de exportação. Anexos exportam apenas a referência do arquivo,
                        nunca o conteúdo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                          <label key={key} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selectedEntities[key] ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={!!selectedEntities[key]}
                              onChange={(e) => setSelectedEntities((p) => ({ ...p, [key]: e.target.checked }))}
                            />
                            <span className="text-sm">{label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {entities[key]?.count ?? 0}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <PasswordField
                          id="export-password"
                          label="Senha de Integração"
                          value={exportPassword}
                          onChange={setExportPassword}
                          placeholder="Digite sua Senha de Integração"
                          autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">
                          A confirmação final é feita por e-mail, mesmo com a senha correta.
                        </p>
                      </div>

                      {exportMessage && (
                        <Alert className={
                          exportMessage.kind === "ok" ? "border-primary/30 bg-primary/5"
                            : exportMessage.kind === "warn" ? "border-warning/30 bg-warning/5"
                              : "border-destructive/30 bg-destructive/5"
                        }>
                          <AlertDescription>{exportMessage.text}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleRequestExport}
                        disabled={requesting || !state?.password_set || !!state?.locked}
                        className="gap-2"
                      >
                        {requesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                        Solicitar exportação
                      </Button>
                      {!state?.password_set && (
                        <p className="text-xs text-warning">
                          Defina a Senha de Integração na aba Segurança para habilitar este botão.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------------- Histórico ---------------- */}
                <TabsContent value="historico" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Exportações</CardTitle>
                      <CardDescription>
                        Últimas 50 exportações da sua conta. Arquivos expiram em 7 dias.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exports.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>
                      ) : (
                        <div className="space-y-3">
                          {exports.map((exp) => (
                            <div key={exp.id} className="rounded-xl border border-border p-4 flex flex-wrap items-center gap-3 hover:border-primary/40 transition-colors">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={STATUS_COLORS[exp.status] || STATUS_COLORS.expired}>
                                    {STATUS_LABELS[exp.status] || exp.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{formatDate(exp.created_at)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {exp.record_counts
                                    ? Object.entries(exp.record_counts).map(([k, v]) => `${ENTITY_LABELS[k] || k}: ${v}`).join(" · ")
                                    : "Sem contagens ainda"}
                                </p>
                                {exp.checksum && (
                                  <p className="text-[11px] text-muted-foreground font-mono truncate">checksum: {String(exp.checksum).slice(0, 24)}…</p>
                                )}
                              </div>
                              {exp.status === "completed" && (
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(exp.id)}>
                                  <Download className="h-4 w-4" /> Baixar
                                </Button>
                              )}
                              {["pending", "authorized"].includes(exp.status) && (
                                <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => handleCancel(exp.id)}>
                                  <Ban className="h-4 w-4" /> Cancelar
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Registro de auditoria</CardTitle>
                      <CardDescription>Últimos eventos do módulo. Senhas e tokens nunca são registrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          {logs.slice(0, 30).map((log) => (
                            <div key={log.id} className="flex items-center gap-2 border-b pb-2">
                              <Badge variant="outline">{log.action}</Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                              {log.ip && <span className="text-xs text-muted-foreground">IP {log.ip}</span>}
                              {log.error_message && (
                                <span className="text-xs text-destructive truncate">{log.error_message}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------------- Segurança ---------------- */}
                <TabsContent value="seguranca" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4" /> {state?.password_set ? "Trocar Senha de Integração" : "Definir Senha de Integração"}
                      </CardTitle>
                      <CardDescription>
                        {state?.password_set
                          ? "Para trocar, informe a senha atual. A troca cancela confirmações pendentes."
                          : "A Senha de Integração autoriza exportações. Ela é guardada com hash + salt e nunca é exibida novamente."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {state?.password_set && (
                        <PasswordField
                          id="current-integration-password"
                          label="Senha de Integração atual"
                          value={currentPassword}
                          onChange={setCurrentPassword}
                          autoComplete="off"
                        />
                      )}
                      <PasswordField
                        id="new-integration-password"
                        label="Nova Senha de Integração"
                        value={newPassword}
                        onChange={setNewPassword}
                        autoComplete="new-password"
                        showStrength
                      />
                      {passwordMessage && (
                        <Alert className={passwordMessage.kind === "ok" ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}>
                          <AlertDescription>{passwordMessage.text}</AlertDescription>
                        </Alert>
                      )}
                      <Button onClick={handleSavePassword} disabled={savingPassword} className="gap-2">
                        {savingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {state?.password_set ? "Trocar senha" : "Definir senha"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revogar conexão</CardTitle>
                      <CardDescription>
                        READY_FOR_WIIZE_PAY: quando a integração real existir, revogar invalidará autorizações,
                        tokens e acessos delegados do Wiize Pay à sua conta, com registro em auditoria.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PasswordField
                        id="revoke-password"
                        label="Confirme com a Senha de Integração"
                        value={revokePassword}
                        onChange={setRevokePassword}
                        autoComplete="off"
                      />
                      <Button
                        variant="destructive"
                        onClick={handleRevoke}
                        disabled={revoking || !revokePassword || !state?.password_set}
                        className="gap-2"
                      >
                        {revoking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        Revogar conexão
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
