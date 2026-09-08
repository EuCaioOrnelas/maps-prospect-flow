import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebhookPanel } from "@/components/meta/WebhookPanel";
import { BackupProgressBanner } from "@/components/chat/BackupProgressBanner";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Phone, Pencil, Info, ExternalLink, Trash2, AlertTriangle, ShieldAlert, Loader2, HelpCircle, Webhook, CheckCircle2,
  Headset, Megaphone, QrCode, Settings2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ProviderChoiceDialog } from "@/components/numbers/ProviderChoiceDialog";
import { EvolutionConnectDialog } from "@/components/numbers/EvolutionConnectDialog";
import { EvolutionSettingsForm, DEFAULT_EVOLUTION_SETTINGS, type EvolutionSettings } from "@/components/numbers/EvolutionSettingsForm";
import { MetaManualSetup } from "@/components/meta-campaigns/MetaManualSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useWabaResponsibles } from "@/hooks/useWabaResponsibles";
import { ResponsiblesPicker, ResponsibleAvatars } from "@/components/meta/ResponsiblesPicker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone_number: string | null;
  access_token: string;
  status: string | null;
  nickname: string | null;
  responsible_user_id?: string | null;
  provider?: "meta" | "evolution" | string | null;
  evolution_instance_name?: string | null;
  evolution_state?: string | null;
  evolution_settings?: Partial<EvolutionSettings> | null;
  profile_name?: string | null;
  profile_pic_url?: string | null;
}

const isEvo = (c: WabaConnection) => c.provider === "evolution";


import { getNumbersLimit } from "@/lib/planAccess";

const META_PLAN_LIMITS: Record<string, number> = {
  free: 1, trial: 1, start: 2, growth: 5, scale: 10,
};

export default function MetaNumeros() {
  const { user, accountOwnerId, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAccountRole();
  const { members } = useAccountMembers();
  const { responsiblesOf, setNumberResponsibles, assignmentByUser, load: reloadResponsibles } = useWabaResponsibles();
  const canChangeResponsible = role === "owner" || role === "admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "webhook" ? "webhook" : "numeros";
  const [activeTab, setActiveTab] = useState<"numeros" | "webhook">(tabFromUrl);
  const handleTabChange = (v: string) => {
    const next = v === "webhook" ? "webhook" : "numeros";
    setActiveTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === "webhook") sp.set("tab", "webhook"); else sp.delete("tab");
    setSearchParams(sp, { replace: true });
  };

  const [connections, setConnections] = useState<WabaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiredTokenIds, setExpiredTokenIds] = useState<Set<string>>(new Set());
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  const [webhookVerifiedIds, setWebhookVerifiedIds] = useState<Set<string>>(new Set());

  const [editingConn, setEditingConn] = useState<WabaConnection | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editResponsibles, setEditResponsibles] = useState<string[]>([]);
  const [editToken, setEditToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);

  const [showAddNumber, setShowAddNumber] = useState(false);
  const [showProviderChoice, setShowProviderChoice] = useState(false);
  const [showEvolutionConnect, setShowEvolutionConnect] = useState(false);
  const [evoSettings, setEvoSettings] = useState<EvolutionSettings>(DEFAULT_EVOLUTION_SETTINGS);
  const [evoPendingKey, setEvoPendingKey] = useState<keyof EvolutionSettings | null>(null);
  const [evoReconnectId, setEvoReconnectId] = useState<string | null>(null);
  const [evoReconnectQr, setEvoReconnectQr] = useState<string | null>(null);

  const callEvolution = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("evolution-instance", { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === "function") { const j = await ctx.json(); msg = j?.message || j?.error || msg; }
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
    return data as any;
  }, []);

  const handleEvoToggle = async (key: keyof EvolutionSettings, next: boolean) => {
    if (!editingConn) return;
    const previous = evoSettings;
    const optimistic = { ...evoSettings, [key]: next };
    setEvoSettings(optimistic);
    setEvoPendingKey(key);
    try {
      const res = await callEvolution({ action: "set_settings", connection_id: editingConn.id, settings: optimistic });
      const saved = res?.settings || optimistic;
      setEvoSettings(saved);
      setConnections((prev) => prev.map((c) => (c.id === editingConn.id ? { ...c, evolution_settings: saved } : c)));
    } catch (e: any) {
      setEvoSettings(previous);
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setEvoPendingKey(null);
    }
  };

  const refreshEvoStatus = useCallback(async (connId: string) => {
    try {
      const res = await callEvolution({ action: "status", connection_id: connId });
      if (res?.connection) {
        setConnections((prev) => prev.map((c) => (c.id === connId ? { ...c, ...res.connection } : c)));
      }
      return res?.state as string | undefined;
    } catch { return undefined; }
  }, [callEvolution]);

  // Reconexão por QR de um número de atendimento existente
  useEffect(() => {
    if (!evoReconnectId) { setEvoReconnectQr(null); return; }
    let alive = true;
    const loadQr = async () => {
      try {
        const res = await callEvolution({ action: "qr", connection_id: evoReconnectId });
        if (alive && res?.qr?.base64) setEvoReconnectQr(res.qr.base64);
      } catch (e: any) {
        if (alive) toast({ title: "Não foi possível gerar o QR code", description: e.message, variant: "destructive" });
      }
    };
    loadQr();
    let ticks = 0;
    const timer = window.setInterval(async () => {
      const st = await refreshEvoStatus(evoReconnectId);
      if (st === "open") { setEvoReconnectId(null); toast({ title: "Número reconectado!" }); return; }
      ticks += 1;
      if (ticks % 10 === 0) loadQr();
    }, 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [evoReconnectId, callEvolution, refreshEvoStatus, toast]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWebhookStatus = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("meta-webhook-config", { body: { action: "info" } });
    if (error || !data) return;
    const conns = (data as any).connections ?? [];
    setWebhookVerifiedIds(new Set(conns.filter((c: any) => !!c.webhook_verified_at).map((c: any) => c.id)));
  }, []);

  useEffect(() => { loadWebhookStatus(); }, [loadWebhookStatus]);



  const userPlan = (profile?.plan || "free").toLowerCase();
  const extraNumbers = ((profile as any)?.extra_numbers as number | undefined) ?? 0;
  const numbersLimit = getNumbersLimit(profile as any);
  const basePlanNumbers = Math.max(0, (Number.isFinite(numbersLimit) ? numbersLimit : (META_PLAN_LIMITS[userPlan] ?? 1) + extraNumbers) - extraNumbers);
  const maxMetaConnections = Number.isFinite(numbersLimit) ? numbersLimit : (META_PLAN_LIMITS[userPlan] ?? 1) + extraNumbers;
  const reachedConnectionLimit = connections.length >= maxMetaConnections;
  const expiredConnections = connections.filter((c) => expiredTokenIds.has(c.id));
  const hasExpired = expiredConnections.length > 0;

  const validateConnectionToken = useCallback(async (conn: WabaConnection) => {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-fetch-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ waba_id: conn.waba_id, access_token: conn.access_token }),
    });
    const rawText = await response.text();
    let payload: any = null;
    try { payload = rawText ? JSON.parse(rawText) : null; } catch { payload = null; }
    const details = payload?.details?.error;
    return payload?.token_expired === true || details?.code === 190 || details?.error_subcode === 463;
  }, []);

  const validateTokens = useCallback(async (conns: WabaConnection[]) => {
    const results = await Promise.all(conns.map(async (c) => {
      try { return (await validateConnectionToken(c)) ? c.id : null; } catch { return null; }
    }));
    setExpiredTokenIds(new Set(results.filter(Boolean) as string[]));
  }, [validateConnectionToken]);

  const loadConnections = useCallback(async () => {
    if (!user || !accountOwnerId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_waba_connections")
        .select("*")
        .eq("owner_user_id", accountOwnerId);
      const conns = (data || []) as unknown as WabaConnection[];
      setConnections(conns);
      const metaConns = conns.filter((c) => !isEvo(c));
      if (metaConns.length) validateTokens(metaConns);
      else setExpiredTokenIds(new Set());
      // Atualiza estado da sessão dos números de atendimento em segundo plano
      conns.filter(isEvo).forEach((c) => { refreshEvoStatus(c.id); });
    } finally {
      setLoading(false);
    }
  }, [user, accountOwnerId, validateTokens, refreshEvoStatus]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleConnectionSaved = (connection: WabaConnection) => {
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === connection.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = connection; return u; }
      return [...prev, connection];
    });
    setExpiredTokenIds((prev) => { const n = new Set(prev); n.delete(connection.id); return n; });
    setShowAddNumber(false);
  };

  const handleSaveEdit = async () => {
    if (!editingConn) return;
    try {
      const updates: Record<string, any> = { nickname: editNickname || null };
      if (canChangeResponsible) {
        updates.responsible_user_id = editResponsibles[0] ?? null;
      }
      if (showTokenField && editToken.trim()) updates.access_token = editToken.trim();
      await supabase.from("user_waba_connections").update(updates).eq("id", editingConn.id);
      if (canChangeResponsible) {
        await setNumberResponsibles(editingConn.id, editResponsibles);
        await reloadResponsibles();
      }

      const updated = {
        ...editingConn,
        nickname: editNickname || null,
        ...(canChangeResponsible ? { responsible_user_id: editResponsibles[0] ?? null } : {}),
        ...(showTokenField && editToken.trim() ? { access_token: editToken.trim() } : {}),
      };
      setConnections((prev) => prev.map((c) => (c.id === editingConn.id ? updated : c)));


      if (showTokenField && editToken.trim()) {
        const stillExpired = await validateConnectionToken(updated);
        setExpiredTokenIds((prev) => {
          const n = new Set(prev);
          if (stillExpired) n.add(editingConn.id);
          else n.delete(editingConn.id);
          return n;
        });
        if (!stillExpired) toast({ title: "Token atualizado com sucesso!" });
      } else {
        toast({ title: "Número atualizado!" });
      }
      setEditingConn(null);
      setShowTokenField(false);
      setEditToken("");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    setDeleting(true);
    try {
      const target = connections.find((c) => c.id === connId);
      if (target && isEvo(target)) {
        await callEvolution({ action: "delete", connection_id: connId });
      }
      await Promise.allSettled([
        supabase.from("chat_messages").delete().in(
          "conversation_id",
          (await supabase.from("chat_conversations").select("id").eq("waba_connection_id", connId)).data?.map((c: any) => c.id) || []
        ),
      ]);
      await Promise.allSettled([
        supabase.from("chat_conversations").delete().eq("waba_connection_id", connId),
        (supabase as any).from("meta_campaigns").delete().eq("connection_id", connId),
      ]);
      const { error } = await supabase.from("user_waba_connections").delete().eq("id", connId);
      if (error) throw error;
      setConnections((prev) => prev.filter((c) => c.id !== connId));
      setExpiredTokenIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
      setPendingDeleteId(null);
      setEditingConn(null);
      toast({ title: "Número removido!", description: "A conexão foi excluída permanentemente." });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const maskSecret = (token: string) => (!token || token.length < 12) ? "••••••••" : token.slice(0, 8) + "••••••••••••";

  return (
    <MetaLayout title="Números" description="Gerencie seus números de WhatsApp: Atendimento (QR code) e Marketing (API oficial da Meta).">
      <MetaPageHeader
        title="Números"
        description="Conecte e gerencie seus números de Atendimento e de Marketing."
        titleBadge={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.open("/meta-api-guide", "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-[7px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <HelpCircle size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Guia de conexão de números</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
        actions={
          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                reachedConnectionLimit
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
              title={`${basePlanNumbers} do plano ${userPlan}${extraNumbers > 0 ? ` + ${extraNumbers} da Expansão` : ""}`}
            >
              <strong className="text-foreground tabular-nums">
                {String(connections.length).padStart(2, "0")}
              </strong>
              /
              <span className="tabular-nums">{String(maxMetaConnections).padStart(2, "0")}</span>
              <span className="opacity-70">números</span>
            </span>
            <Button
              size="sm"
              onClick={() => {
                if (reachedConnectionLimit) {
                  toast({
                    title: "Limite de números atingido",
                    description: `Seu plano permite ${basePlanNumbers} ${basePlanNumbers === 1 ? "número" : "números"}${extraNumbers > 0 ? ` + ${extraNumbers} da Expansão de Atendimento` : ""}. Adicione a Expansão de Atendimento (+1 número) ou faça upgrade.`,
                    variant: "destructive",
                  });
                  return;
                }
                setShowProviderChoice(true);
              }}
              disabled={reachedConnectionLimit}
            >
              <Plus size={14} className="mr-1.5" /> Conectar número
            </Button>
          </div>
        }
      />


      <BackupProgressBanner className="mt-3" />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">

        <TabsList className="bg-muted/40">
          <TabsTrigger value="numeros">
            <Phone size={13} className="mr-1.5" />
            Números
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Webhook size={13} className="mr-1.5" />
            Webhook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="numeros" className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={16} /> Carregando números…
            </div>
          ) : connections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Phone size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Nenhum número conectado</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Conecte um <strong className="text-foreground">Número de Atendimento</strong> por QR code em segundos, ou um
                {" "}<strong className="text-foreground">Número de Marketing</strong> pela API oficial da Meta para campanhas e disparos.
              </p>
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button onClick={() => setShowProviderChoice(true)}><Plus size={14} className="mr-1.5" /> Conectar número</Button>
                <Link to="/numeros/comparativo" className="text-xs text-primary hover:underline">Como funciona e qual a diferença?</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {hasExpired && (
                <div className="flex items-start gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-destructive/15">
                    <ShieldAlert size={20} className="text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base text-destructive">
                      {expiredConnections.length === 1 ? "1 token expirado" : `${expiredConnections.length} tokens expirados`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {expiredConnections.map(c => c.nickname || c.display_phone_number || c.phone_number_id).join(", ")} — o token de acesso expirou. Clique em editar para atualizar.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowExpiredAlert(true)}
                    >
                      <Info size={12} /> Como resolver
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connections.map((conn) => {
                  if (isEvo(conn)) {
                    const online = conn.evolution_state === "open";
                    const connecting = conn.evolution_state === "connecting";
                    return (
                      <div key={conn.id} className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${online ? "border-border hover:bg-muted/20" : "border-amber-500/40 bg-amber-500/5"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {conn.profile_pic_url ? (
                              <img src={conn.profile_pic_url} alt="" className="h-8 w-8 rounded-[9px] object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 bg-primary/10">
                                <Headset size={14} className="text-primary" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-medium text-sm truncate">
                                {conn.nickname || conn.profile_name || (conn.display_phone_number ? `+${conn.display_phone_number}` : "Número de Atendimento")}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {conn.display_phone_number ? `+${conn.display_phone_number}` : "Aguardando conexão"}{conn.profile_name ? ` · ${conn.profile_name}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              setEditingConn(conn);
                              setEditNickname(conn.nickname || "");
                              setEditResponsibles(responsiblesOf(conn.id));
                              setEditToken("");
                              setShowTokenField(false);
                              setEvoSettings({ ...DEFAULT_EVOLUTION_SETTINGS, ...(conn.evolution_settings || {}) });
                            }}>
                              <Pencil size={13} className="text-muted-foreground" />
                            </Button>
                            <ResponsibleAvatars userIds={responsiblesOf(conn.id)} members={members} max={3} />
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                              <Headset size={9} /> Atendimento
                            </span>
                          </div>
                        </div>
                        <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${online ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {online ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> : connecting ? <Loader2 size={14} className="animate-spin text-amber-600 shrink-0" /> : <AlertTriangle size={14} className="text-amber-600 shrink-0" />}
                            <div className="min-w-0">
                              <p className={`text-[11px] font-semibold ${online ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                                {online ? "WhatsApp conectado" : connecting ? "Aguardando leitura do QR code" : "WhatsApp desconectado"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {online ? "Chat, CRM e IA funcionando normalmente." : "Leia o QR code para voltar a receber mensagens."}
                              </p>
                            </div>
                          </div>
                          {!online && (
                            <Button size="sm" variant="outline" className="gap-1.5 h-7 px-2 shrink-0 text-[11px]" onClick={() => setEvoReconnectId(conn.id)}>
                              <QrCode size={11} /> Conectar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  const isExpired = expiredTokenIds.has(conn.id);
                  const webhookOk = webhookVerifiedIds.has(conn.id);
                  return (
                    <div
                      key={conn.id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
                        isExpired ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${
                            isExpired ? "bg-destructive/10" : "bg-primary/10"
                          }`}>
                            {isExpired ? (
                              <AlertTriangle size={14} className="text-destructive" />
                            ) : (
                              <Phone size={14} className="text-primary" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-sm truncate">
                              {conn.nickname || conn.display_phone_number || conn.phone_number_id}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {conn.business_name || conn.waba_id}
                            </p>
                            {isExpired && (
                              <p className="mt-1 text-[11px] font-medium text-destructive">
                                Atualize o token para voltar a carregar templates e enviar mensagens.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingConn(conn);
                              setEditNickname(conn.nickname || "");
                              setEditResponsibles(responsiblesOf(conn.id));
                              setEditToken("");
                              setShowTokenField(isExpired);
                            }}
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                          </Button>
                          <ResponsibleAvatars userIds={responsiblesOf(conn.id)} members={members} max={3} />
                          <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground items-center gap-1">
                            <Megaphone size={9} /> Marketing
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                          }`}>
                            {isExpired ? "Expirado" : "Ativo"}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                        webhookOk
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : "border-amber-500/25 bg-amber-500/5"
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {webhookOk ? (
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-[11px] font-semibold ${webhookOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                              {webhookOk ? "Webhook configurado" : "Webhook pendente"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {webhookOk
                                ? "Eventos da Meta chegando normalmente."
                                : "Chat e Campanhas precisam do webhook para funcionar."}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={webhookOk ? "ghost" : "outline"}
                          className="gap-1.5 h-7 px-2 shrink-0 text-[11px]"
                          onClick={() => handleTabChange("webhook")}
                        >
                          <Webhook size={11} />
                          {webhookOk ? "Ver webhook" : "Configurar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground">
                {connections.length}/{maxMetaConnections} números conectados
                {" "}<span className="opacity-70">({basePlanNumbers} do plano {userPlan}{extraNumbers > 0 ? ` + ${extraNumbers} da Expansão de Atendimento` : ""})</span>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <Info size={18} className="text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">API de Marketing do WhatsApp (Cloud API)</p>
                  <p className="text-muted-foreground mt-0.5">
                    Disparo via WhatsApp Cloud API utilizando <strong>HSM templates</strong> pré-aprovados pela Meta (categorias: marketing, utility e authentication). O envio é tarifado por <strong>conversa de 24h</strong> conforme a tabela oficial da Meta por país e categoria, com cobrança realizada diretamente pela Meta na conta de billing vinculada ao WABA — independente da assinatura da plataforma. Cada número possui limite de envio próprio definido pelo <strong>messaging tier</strong> e <strong>quality rating</strong> atribuídos pela Meta.
                  </p>
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1 text-xs"
                  >
                    <ExternalLink size={10} /> Ver limites de envio da Meta
                  </a>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhook" className="mt-5">
          <WebhookPanel onStatusChange={() => loadWebhookStatus()} />
        </TabsContent>
      </Tabs>



      {/* Edit Dialog */}
      <Dialog open={!!editingConn} onOpenChange={(o) => { if (!o) { setEditingConn(null); setShowTokenField(false); setEditToken(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Número
              {editingConn && expiredTokenIds.has(editingConn.id) && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                  <AlertTriangle size={10} /> Token expirado
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {editingConn && isEvo(editingConn) && (
            <div className="space-y-4">
              <div className="space-y-3">
                <DetailRow label="Tipo" value="Número de Atendimento (QR code)" />
                <DetailRow label="Número" value={editingConn.display_phone_number ? `+${editingConn.display_phone_number}` : "Aguardando conexão"} />
                <DetailRow label="Perfil" value={editingConn.profile_name || "N/A"} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido do número</label>
                <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="Ex: Suporte, Pós-venda..." />
              </div>
              {canChangeResponsible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsáveis pelo número</label>
                  <ResponsiblesPicker
                    members={members}
                    value={editResponsibles}
                    onChange={setEditResponsibles}
                    assignmentByUser={assignmentByUser}
                    currentConnectionId={editingConn.id}
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5"><Settings2 size={13} className="text-primary" /> Preferências</p>
                <p className="text-[11px] text-muted-foreground">Cada alteração é aplicada imediatamente no número.</p>
                <EvolutionSettingsForm value={evoSettings} onChange={handleEvoToggle} pendingKey={evoPendingKey} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">Salvar</Button>
                <Button variant="destructive" size="icon" onClick={() => {
                  const id = editingConn.id;
                  setEditingConn(null);
                  setTimeout(() => setPendingDeleteId(id), 50);
                }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
          {editingConn && !isEvo(editingConn) && (
            <div className="space-y-4">
              <div className="space-y-3">
                <DetailRow label="Phone Number ID" value={editingConn.phone_number_id} />
                <DetailRow label="WABA ID" value={editingConn.waba_id} />
                <DetailRow label="Número" value={editingConn.display_phone_number || "N/A"} />
                <DetailRow label="Empresa" value={editingConn.business_name || "N/A"} />
                <div>
                  <p className="text-[11px] text-muted-foreground">Access Token</p>
                  <p className="text-sm font-mono truncate">{maskSecret(editingConn.access_token || "")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Apelido do número</label>
                <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="Ex: Atendimento, Vendas..." />
              </div>

              {canChangeResponsible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsáveis pelo número</label>
                  <ResponsiblesPicker
                    members={members}
                    value={editResponsibles}
                    onChange={setEditResponsibles}
                    assignmentByUser={assignmentByUser}
                    currentConnectionId={editingConn.id}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Um número pode ter vários responsáveis, mas cada colaborador só pode ser responsável por 1 número.
                  </p>
                </div>
              )}

              {!showTokenField ? (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowTokenField(true)}>
                  <Pencil size={11} /> Atualizar token de acesso
                </Button>
              ) : (
                <div className="space-y-2 p-3 rounded-lg border border-accent/30 bg-accent/5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-accent-foreground" />
                    Novo Access Token
                  </label>
                  <Textarea value={editToken} onChange={(e) => setEditToken(e.target.value)} placeholder="Cole aqui o novo token permanente..." className="font-mono text-xs min-h-[60px]" />
                  <p className="text-[11px] text-muted-foreground">
                    Use um token de <strong>System User</strong> para evitar expirações.{" "}
                    <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Gerar token permanente →
                    </a>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">Salvar</Button>
                <Button variant="destructive" size="icon" onClick={() => {
                  const id = editingConn.id;
                  setEditingConn(null);
                  setShowTokenField(false);
                  setEditToken("");
                  // Defer to next tick so the edit Dialog fully unmounts before the AlertDialog mounts,
                  // avoiding stacked Radix overlays/focus traps that block the confirm click.
                  setTimeout(() => setPendingDeleteId(id), 50);
                }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && !deleting && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Excluir este número?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Todas as conversas, mensagens e campanhas vinculadas a este número serão removidas e não poderão ser recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); if (pendingDeleteId) handleDeleteConnection(pendingDeleteId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
              {deleting ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expired Token Help */}
      <Dialog open={showExpiredAlert} onOpenChange={setShowExpiredAlert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-destructive" />
              Token de acesso expirado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {expiredConnections.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive shrink-0" />
                  <span className="text-sm font-medium">{c.nickname || c.display_phone_number || c.phone_number_id}</span>
                  {c.business_name && <span className="text-xs text-muted-foreground">({c.business_name})</span>}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              O token de acesso {expiredConnections.length === 1 ? "deste número" : "destes números"} expirou. Para evitar isso, gere um <strong>token permanente</strong> usando um Usuário do Sistema no Meta Business Suite.
            </p>
            <Button onClick={() => setShowExpiredAlert(false)} className="w-full">Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2"><Megaphone size={16} className="text-primary" /> Número de Marketing — Meta API oficial</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <MetaManualSetup
              embedded
              onConnectionSaved={(conn) => {
                if (conn) handleConnectionSaved(conn);
                else setShowAddNumber(false);
                reloadResponsibles();
              }}
              isAddingExtra
            />
          </div>
        </DialogContent>
      </Dialog>
      <ProviderChoiceDialog
        open={showProviderChoice}
        onOpenChange={setShowProviderChoice}
        onChoose={(provider) => {
          setShowProviderChoice(false);
          if (provider === "meta") setShowAddNumber(true);
          else setShowEvolutionConnect(true);
        }}
      />

      <EvolutionConnectDialog
        open={showEvolutionConnect}
        onOpenChange={(o) => { setShowEvolutionConnect(o); if (!o) loadConnections(); }}
        onConnected={(conn) => { handleConnectionSaved(conn); reloadResponsibles(); }}
      />

      {/* Reconexão QR de número de atendimento */}
      <Dialog open={!!evoReconnectId} onOpenChange={(o) => { if (!o) setEvoReconnectId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode size={16} className="text-primary" /> Reconectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="mx-auto flex h-[264px] w-[264px] items-center justify-center rounded-2xl border border-border bg-card p-3">
            {evoReconnectQr ? (
              <img src={evoReconnectQr} alt="QR code para reconectar o WhatsApp" className="h-full w-full rounded-lg object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground"><Loader2 size={22} className="animate-spin" /><p className="text-xs">Gerando QR code…</p></div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
        </DialogContent>
      </Dialog>
    </MetaLayout>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-mono truncate">{value}</p>
  </div>
);
