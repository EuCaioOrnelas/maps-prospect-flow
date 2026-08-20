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
  AlertTriangle,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  BellRing,
  Layers,
  Clock3,
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
  pull_all_calendars?: boolean;
  reminder_enabled?: boolean;
  reminder_minutes?: number;
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

const REMINDER_OPTIONS = [
  { value: "10", label: "10 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "180", label: "3 horas antes" },
  { value: "720", label: "12 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

export function GoogleCalendarSyncDialog({ open, onOpenChange, onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [settings, setSettings] = useState<GoogleSyncSettings | null>(null);
  const [calendars, setCalendars] = useState<
    { id: string; summary: string; primary: boolean; writable?: boolean }[]
  >([]);
  const [health, setHealth] = useState<"unknown" | "checking" | "ok" | "broken">("unknown");

  const [tokenId, setTokenId] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pullEnabled, setPullEnabled] = useState(true);
  const [pullAll, setPullAll] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("30");
  const [windowDays, setWindowDays] = useState("60");

  const progressTimer = useRef<number | null>(null);
  const syncPromise = useRef<Promise<any> | null>(null);
  const autoSyncRef = useRef<((tokenIdOverride?: string) => Promise<void>) | null>(null);


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
    setPullAll(s?.pull_all_calendars ?? true);
    setReminderEnabled(s?.reminder_enabled ?? false);
    setReminderMinutes(String(s?.reminder_minutes ?? 30));
    setWindowDays(String(s?.sync_window_days ?? 60));
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const state = await call({ action: "status" });
      applyState(state);
      return state;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar a conexão.");
      return null;
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

  // Lista todas as agendas da conta escolhida
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

      let finished = false;
      const finish = async (announce: boolean) => {
        if (finished) return;
        finished = true;
        window.removeEventListener("message", onMessage);
        if (announce) toast.success("Conta Google conectada.");
        const state = await loadStatus();
        // Primeira sincronização automática: o usuário não precisa clicar em nada.
        const account = (state?.accounts || [])[0];
        if (account) void autoSyncRef.current?.(state?.settings?.google_token_id || account.id);

      };

      const onMessage = (event: MessageEvent) => {
        if ((event.data as any)?.source !== "wiize-google-oauth") return;
        void finish(true);
      };
      window.addEventListener("message", onMessage);

      const timer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(timer);
          void finish(false);
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
      pull_all_calendars: pullAll,
      reminder_enabled: reminderEnabled,
      reminder_minutes: Number(reminderMinutes),
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
      toast.success("Preferências salvas.");
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
    // Salva sempre antes de sincronizar para respeitar as escolhas atuais.
    await call({ action: "save", settings: buildSettings() });
    return call({ action: "sync" });
  };

  const describe = (res: any) =>
    `${res.pulled || 0} importados do Google · ${res.pushed || 0} enviados · ${
      res.updated || 0
    } atualizados${res.skipped ? ` · ${res.skipped} ignorados por conflito` : ""}`;

  const handleSync = async () => {
    if (!tokenId) {
      toast.error("Conecte uma conta Google primeiro.");
      return;
    }
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

  const handleDisconnect = async () => {
    const ok = window.confirm(
      "Desconectar o Google Agenda? Os compromissos importados serão removidos da Wiize. Os criados por você permanecem.",
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await call({ action: "disconnect" });
      toast.success(
        `Conexão removida.${res?.removed ? ` ${res.removed} importado(s) excluído(s).` : ""}`,
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
  const connected = accounts.length > 0;
  const writable = calendars.filter((c) => c.writable !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 max-h-[90vh]">
        {/* Cabeçalho */}
        <DialogHeader className="space-y-0 border-b border-border bg-muted/30 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-border bg-background">
              <img src={calendarIcon} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Google Agenda</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Traga todos os seus calendários do Google para a Wiize e envie os compromissos
                criados aqui de volta para lá. Conexão individual por usuário.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[64vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Conta */}
              <section className="rounded-[14px] border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {connected ? account?.email || "Conta Google" : "Nenhuma conta conectada"}
                    </p>
                    <div className="mt-0.5 text-xs">
                      {health === "checking" && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando permissões…
                        </span>
                      )}
                      {health === "ok" && !needsScope && (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <ShieldCheck className="h-3.5 w-3.5" /> Conexão ativa
                        </span>
                      )}
                      {needsReconnect && health !== "checking" && (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> Autorização incompleta — reconecte
                          marcando todas as permissões
                        </span>
                      )}
                      {health === "unknown" && !connected && (
                        <span className="text-muted-foreground">
                          Ao autorizar, marque <strong>todas</strong> as caixas de permissão de agenda.
                        </span>
                      )}
                    </div>
                  </div>
                  {connected && !needsReconnect && (
                    <Button variant="ghost" size="sm" onClick={handleConnect} className="shrink-0 text-xs">
                      Trocar conta
                    </Button>
                  )}
                </div>

                {(!connected || needsReconnect) && (
                  <Button onClick={handleConnect} className="mt-3 w-full rounded-xl" size="lg">
                    <Link2 className="mr-2 h-4 w-4" />
                    {connected ? "Reconectar conta Google" : "Conectar conta Google"}
                  </Button>
                )}

                {accounts.length > 1 && (
                  <Select value={tokenId} onValueChange={setTokenId}>
                    <SelectTrigger className="mt-3">
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
              </section>

              {connected && (
                <>
                  {/* Importação */}
                  <section className="space-y-3 rounded-[14px] border border-border p-4">
                    <SectionTitle
                      icon={ArrowDownToLine}
                      title="Google → Wiize"
                      subtitle="O que entra na sua agenda da Wiize"
                    />
                    <ToggleRow
                      label="Importar compromissos"
                      description="Traz eventos dos últimos 12 meses e do período à frente."
                      checked={pullEnabled}
                      onChange={setPullEnabled}
                    />
                    <ToggleRow
                      label="Todas as minhas agendas"
                      description={
                        calendars.length
                          ? `Importa as ${calendars.length} agendas da conta (principal, trabalho, treino, compartilhadas).`
                          : "Importa todas as agendas da conta, não só a principal."
                      }
                      checked={pullAll}
                      onChange={setPullAll}
                      disabled={!pullEnabled}
                    />
                    {!pullAll && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Agenda importada
                        </Label>
                        <Select value={calendarId} onValueChange={setCalendarId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a agenda" />
                          </SelectTrigger>
                          <SelectContent>
                            {calendars.length === 0 && (
                              <SelectItem value="primary">Agenda principal</SelectItem>
                            )}
                            {calendars.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.summary}
                                {c.primary ? " (principal)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </section>

                  {/* Envio */}
                  <section className="space-y-3 rounded-[14px] border border-border p-4">
                    <SectionTitle
                      icon={ArrowUpFromLine}
                      title="Wiize → Google"
                      subtitle="Para onde vão os compromissos criados aqui"
                    />
                    <ToggleRow
                      label="Enviar compromissos da Wiize"
                      description="Reuniões, demos e ligações aparecem no seu Google Agenda."
                      checked={pushEnabled}
                      onChange={setPushEnabled}
                    />
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Agenda de destino
                      </Label>
                      <Select value={calendarId} onValueChange={setCalendarId} disabled={!pushEnabled}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a agenda" />
                        </SelectTrigger>
                        <SelectContent>
                          {writable.length === 0 && (
                            <SelectItem value="primary">Agenda principal</SelectItem>
                          )}
                          {writable.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.summary}
                              {c.primary ? " (principal)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </section>

                  {/* Lembretes por e-mail */}
                  <section className="space-y-3 rounded-[14px] border border-border p-4">
                    <SectionTitle
                      icon={BellRing}
                      title="Lembretes por e-mail"
                      subtitle="Só recebe quem ativar — nada é enviado por padrão"
                    />
                    <ToggleRow
                      label="Quero ser lembrado por e-mail"
                      description="Vale para os compromissos importados do Google."
                      checked={reminderEnabled}
                      onChange={setReminderEnabled}
                    />
                    {reminderEnabled && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <Clock3 className="h-3 w-3" /> Antecedência do aviso
                        </Label>
                        <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REMINDER_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                      Compromissos criados dentro da Wiize seguem o lembrete escolhido no próprio
                      compromisso. Sem lembrete configurado, nenhum e-mail é disparado.
                    </p>
                  </section>

                  {/* Período + status */}
                  <section className="space-y-3 rounded-[14px] border border-border p-4">
                    <SectionTitle
                      icon={Layers}
                      title="Período e status"
                      subtitle="Janela de sincronização e último resultado"
                    />
                    <ToggleRow
                      label="Sincronização ativa"
                      description="Pausa tudo sem perder as configurações."
                      checked={syncEnabled}
                      onChange={setSyncEnabled}
                    />
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

                    {settings?.last_sync_at && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              settings.last_sync_status === "ok" ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                          Última sincronização:{" "}
                          {new Date(settings.last_sync_at).toLocaleString("pt-BR")}
                        </p>
                        {settings.last_sync_error && (
                          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-amber-600">
                            {settings.last_sync_error}
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  {(syncing || progress > 0) && (
                    <div className="space-y-2 rounded-[14px] border border-primary/20 bg-primary/5 p-4">
                      <Progress value={progress} className="h-2" />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Importando todas as suas agendas… contas com muitos eventos podem levar
                        alguns minutos.
                      </p>
                      {syncing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={moveToBackground}
                          className="w-full rounded-lg text-xs"
                        >
                          Continuar em segundo plano
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="w-full text-xs text-destructive hover:text-destructive"
                  >
                    <Unlink className="mr-2 h-3.5 w-3.5" />
                    Desconectar e remover importados
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {connected && !loading && (
          <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row">
            <Button variant="outline" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar preferências
            </Button>
            <Button onClick={handleSync} disabled={syncing} className="flex-1 rounded-xl">
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizar agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", disabled && "opacity-50")}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
