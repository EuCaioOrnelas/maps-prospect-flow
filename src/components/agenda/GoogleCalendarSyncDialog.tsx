import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import calendarIcon from "@/assets/icons/google-calendar-sm.png";
import { cn } from "@/lib/utils";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export interface GoogleSyncSettings {
  google_token_id: string;
  google_email: string | null;
  calendar_id: string;
  calendar_name: string | null;
  sync_enabled: boolean;
  push_enabled: boolean;
  pull_enabled: boolean;
  sync_window_days: number;
  default_event_type: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

interface GoogleAccount {
  id: string;
  email: string | null;
  has_calendar_scope: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
}

const STEPS = [
  "Clique em “Conectar conta Google” e escolha a conta que você usa no dia a dia.",
  "Na tela do Google, marque TODAS as caixinhas de permissão — principalmente “Ver, editar, compartilhar e excluir definitivamente todas as agendas”. Sem elas a sincronização não funciona.",
  "Escolha a agenda de destino, ligue os sentidos desejados e clique em “Salvar configuração”.",
  "Clique em “Sincronizar agora”. Agendas grandes podem levar alguns minutos — você pode deixar rodando em segundo plano.",
];


export function GoogleCalendarSyncDialog({ open, onOpenChange, onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [settings, setSettings] = useState<GoogleSyncSettings | null>(null);
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([]);
  const [health, setHealth] = useState<"unknown" | "checking" | "ok" | "broken">("unknown");

  const [tokenId, setTokenId] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pullEnabled, setPullEnabled] = useState(true);
  const [windowDays, setWindowDays] = useState("60");

  const progressTimer = useRef<number | null>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync", { body });
    if (error) {
      const details = (error as any)?.context ? await (error as any).context.text() : error.message;
      throw new Error(details || error.message);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  const applyState = useCallback((state: any) => {
    setAccounts(state.accounts || []);
    const s = state.settings as GoogleSyncSettings | null;
    setSettings(s);
    const firstAccount = (state.accounts || [])[0];
    setTokenId(s?.google_token_id || firstAccount?.id || "");
    setCalendarId(s?.calendar_id || "primary");
    setSyncEnabled(s?.sync_enabled ?? true);
    setPushEnabled(s?.push_enabled ?? true);
    setPullEnabled(s?.pull_enabled ?? true);
    setWindowDays(String(s?.sync_window_days ?? 60));
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      applyState(await call({ action: "status" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar a conexão.");
    } finally {
      setLoading(false);
    }
  }, [call, applyState]);

  useEffect(() => {
    if (open) void loadStatus();
  }, [open, loadStatus]);

  // Checa se a autorização do Google continua válida.
  useEffect(() => {
    if (!open || !tokenId) {
      setHealth("unknown");
      return;
    }
    let active = true;
    setHealth("checking");
    call({ action: "verify", google_token_id: tokenId })
      .then((res) => {
        if (active) setHealth(res?.healthy ? "ok" : "broken");
      })
      .catch(() => {
        if (active) setHealth("broken");
      });
    return () => {
      active = false;
    };
  }, [open, tokenId, call]);

  // Lista as agendas da conta escolhida
  useEffect(() => {
    if (!open || !tokenId) {
      setCalendars([]);
      return;
    }
    let active = true;
    call({ action: "calendars", google_token_id: tokenId })
      .then((res) => {
        if (active) setCalendars(res.calendars || []);
      })
      .catch(() => {
        if (active) setCalendars([]);
      });
    return () => {
      active = false;
    };
  }, [open, tokenId, call]);

  const handleConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        body: { scopes: CALENDAR_SCOPES },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Não foi possível iniciar a autorização.");
      const popup = window.open(data.url, "google-oauth", "width=520,height=680,left=200,top=80");

      const onMessage = (event: MessageEvent) => {
        if ((event.data as any)?.source !== "wiize-google-oauth") return;
        window.removeEventListener("message", onMessage);
        toast.success("Conta Google conectada.");
        void loadStatus();
      };
      window.addEventListener("message", onMessage);

      const timer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(timer);
          window.removeEventListener("message", onMessage);
          void loadStatus();
        }
      }, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar com o Google.");
    }
  };

  const buildSettings = () => {
    const chosen = calendars.find((c) => c.id === calendarId);
    return {
      google_token_id: tokenId,
      calendar_id: calendarId,
      calendar_name: chosen?.summary || null,
      sync_enabled: syncEnabled,
      push_enabled: pushEnabled,
      pull_enabled: pullEnabled,
      sync_window_days: Number(windowDays),
      default_event_type: "google",
    };
  };

  const handleSave = async () => {
    if (!tokenId) {
      toast.error("Conecte uma conta Google primeiro.");
      return;
    }
    setSaving(true);
    try {
      applyState(await call({ action: "save", settings: buildSettings() }));
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const startProgress = () => {
    setProgress(8);
    progressTimer.current = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + Math.max(1, Math.round((95 - p) / 12))));
    }, 400);
  };

  const stopProgress = () => {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    progressTimer.current = null;
    setProgress(100);
    window.setTimeout(() => setProgress(0), 900);
  };

  useEffect(() => () => {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
  }, []);

  const runSync = async () => {
    // Garante que a configuração atual esteja salva antes de sincronizar.
    if (!settings) await call({ action: "save", settings: buildSettings() });
    return call({ action: "sync" });
  };

  const describe = (res: any) =>
    `Sincronizado: ${res.pushed || 0} enviados, ${res.updated || 0} atualizados, ${res.pulled || 0} importados${
      res.skipped ? `, ${res.skipped} ignorados por conflito de horário` : ""
    }.`;

  const handleSync = async () => {
    setSyncing(true);
    startProgress();
    const promise = runSync();
    syncPromise.current = promise;
    try {
      const res = await promise;
      if (syncPromise.current !== promise) return; // já foi para segundo plano
      toast.success(describe(res));
      onSynced?.();
      await loadStatus();
    } catch (err) {
      if (syncPromise.current !== promise) return;
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar.");
    } finally {
      if (syncPromise.current === promise) {
        syncPromise.current = null;
        stopProgress();
        setSyncing(false);
      }
    }
  };

  /** Continua a sincronização já em andamento fora do modal. */
  const moveToBackground = () => {
    const promise = syncPromise.current;
    syncPromise.current = null;
    stopProgress();
    setSyncing(false);
    onOpenChange(false);
    toast.info("Sincronização continua em segundo plano. Avisamos quando terminar.");
    void promise
      ?.then((res) => {
        toast.success(describe(res));
        onSynced?.();
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Falha ao sincronizar em segundo plano."),
      );
  };

  const handleBackgroundSync = () => {
    toast.info("Sincronizando em segundo plano…");
    onOpenChange(false);
    void runSync()
      .then((res) => {
        toast.success(describe(res));
        onSynced?.();
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Falha ao sincronizar em segundo plano."),
      );
  };

  const handleDisconnect = async () => {
    const ok = window.confirm(
      "Desincronizar? Todos os compromissos importados do Google serão removidos da Agenda Wiize e os vínculos serão apagados. Seus compromissos criados na Wiize permanecem.",
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await call({ action: "disconnect" });
      toast.success(
        `Sincronização removida.${res?.removed ? ` ${res.removed} compromisso(s) importado(s) excluído(s).` : ""}`,
      );
      onSynced?.();
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.");
    } finally {
      setSaving(false);
    }
  };


  const account = accounts.find((a) => a.id === tokenId);
  const needsScope = !!account && !account.has_calendar_scope;
  const needsReconnect = needsScope || health === "broken";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <img src={calendarIcon} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
            </div>
            <div>
              <DialogTitle>Conexão Google Agenda</DialogTitle>
              <DialogDescription>
                Sincronize os compromissos da Wiize com o seu Google Agenda nos dois sentidos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Passo a passo */}
            <ol className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {/* Estado da conexão + botão principal */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {accounts.length === 0
                      ? "Nenhuma conta Google conectada"
                      : account?.email || "Conta Google"}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs">
                    {health === "checking" && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando conexão…
                      </span>
                    )}
                    {health === "ok" && !needsScope && (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <ShieldCheck className="h-3.5 w-3.5" /> Conexão ativa
                      </span>
                    )}
                    {needsReconnect && health !== "checking" && (
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Autorização expirada — reconecte
                      </span>
                    )}
                    {health === "unknown" && accounts.length === 0 && (
                      <span className="text-muted-foreground">Conecte para começar</span>
                    )}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                variant={needsReconnect || accounts.length === 0 ? "default" : "outline"}
                className="w-full rounded-xl"
                size="lg"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {accounts.length === 0
                  ? "Conectar conta Google"
                  : needsReconnect
                    ? "Reconectar conta Google"
                    : "Conectar outra conta"}
              </Button>

              {accounts.length > 1 && (
                <Select value={tokenId} onValueChange={setTokenId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o e-mail" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.email || "Conta Google"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {accounts.length > 0 && (
              <>
                {/* Agenda */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Agenda de destino
                  </Label>
                  <Select value={calendarId} onValueChange={setCalendarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a agenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.length === 0 && <SelectItem value="primary">Agenda principal</SelectItem>}
                      {calendars.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.summary}
                          {c.primary ? " (principal)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Opções */}
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <ToggleRow
                    label="Sincronização ativa"
                    description="Liga ou pausa a troca de compromissos."
                    checked={syncEnabled}
                    onChange={setSyncEnabled}
                  />
                  <ToggleRow
                    label="Wiize → Google"
                    description="Seus compromissos da Wiize aparecem no Google."
                    checked={pushEnabled}
                    onChange={setPushEnabled}
                  />
                  <ToggleRow
                    label="Google → Wiize"
                    description="Eventos do Google entram como “Google Agenda”."
                    checked={pullEnabled}
                    onChange={setPullEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Janela de sincronização (para frente)
                  </Label>
                  <Select value={windowDays} onValueChange={setWindowDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Próximos 30 dias</SelectItem>
                      <SelectItem value="60">Próximos 60 dias</SelectItem>
                      <SelectItem value="90">Próximos 90 dias</SelectItem>
                      <SelectItem value="180">Próximos 180 dias</SelectItem>
                      <SelectItem value="365">Próximos 365 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    A importação sempre traz também os últimos 12 meses da sua agenda Google.
                  </p>
                </div>

                {settings?.last_sync_at && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2
                      className={cn(
                        "h-3.5 w-3.5",
                        settings.last_sync_status === "ok" ? "text-emerald-500" : "text-amber-500",
                      )}
                    />
                    Última sincronização: {new Date(settings.last_sync_at).toLocaleString("pt-BR")}
                    {settings.last_sync_error ? ` — ${settings.last_sync_error}` : ""}
                  </p>
                )}

                {(syncing || progress > 0) && (
                  <div className="space-y-1.5">
                    <Progress value={progress} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">
                      Sincronizando compromissos com o Google…
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar configuração
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 rounded-xl"
                  >
                    {syncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sincronizar agora
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleBackgroundSync}
                  disabled={syncing}
                  className="w-full text-xs"
                >
                  Sincronizar em segundo plano e fechar
                </Button>

                {settings && (
                  <Button
                    variant="ghost"
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <Unlink className="mr-2 h-4 w-4" />
                    Desativar sincronização
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
