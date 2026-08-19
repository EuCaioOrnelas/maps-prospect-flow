import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Link2, Unlink, CheckCircle2, AlertTriangle } from "lucide-react";
import calendarIcon from "@/assets/icons/google-calendar-sm.png";
import { EVENT_TYPES } from "@/lib/calendarConfig";
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

export function GoogleCalendarSyncDialog({ open, onOpenChange, onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [settings, setSettings] = useState<GoogleSyncSettings | null>(null);
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([]);

  const [tokenId, setTokenId] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pullEnabled, setPullEnabled] = useState(true);
  const [windowDays, setWindowDays] = useState("60");
  const [defaultType, setDefaultType] = useState("meeting");

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
    setDefaultType(s?.default_event_type || "meeting");
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
      const timer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(timer);
          void loadStatus();
        }
      }, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar com o Google.");
    }
  };

  const handleSave = async () => {
    if (!tokenId) {
      toast.error("Conecte uma conta Google primeiro.");
      return;
    }
    setSaving(true);
    try {
      const chosen = calendars.find((c) => c.id === calendarId);
      const state = await call({
        action: "save",
        settings: {
          google_token_id: tokenId,
          calendar_id: calendarId,
          calendar_name: chosen?.summary || null,
          sync_enabled: syncEnabled,
          push_enabled: pushEnabled,
          pull_enabled: pullEnabled,
          sync_window_days: Number(windowDays),
          default_event_type: defaultType,
        },
      });
      applyState(state);
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await call({ action: "sync" });
      toast.success(
        `Sincronizado: ${res.pushed || 0} enviados, ${res.updated || 0} atualizados, ${res.pulled || 0} importados.`,
      );
      onSynced?.();
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await call({ action: "disconnect" });
      toast.success("Sincronização desativada.");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.");
    } finally {
      setSaving(false);
    }
  };

  const account = accounts.find((a) => a.id === tokenId);
  const needsScope = !!account && !account.has_calendar_scope;

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
            {/* Conta Google */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Conta Google
              </Label>
              {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Nenhuma conta Google conectada ainda.
                  </p>
                  <Button onClick={handleConnect} className="rounded-xl">
                    <Link2 className="mr-2 h-4 w-4" />
                    Conectar conta Google
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
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
                  <Button variant="ghost" size="sm" onClick={handleConnect} className="h-8 px-2 text-xs">
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Conectar outra conta
                  </Button>
                </div>
              )}
              {needsScope && (
                <p className="flex items-start gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Esta conta ainda não autorizou o Google Agenda. Clique em “Conectar outra conta” com o
                  mesmo e-mail para liberar o acesso.
                </p>
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
                    description="Eventos do Google entram na agenda da Wiize."
                    checked={pullEnabled}
                    onChange={setPullEnabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Janela de sincronização
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tipo dos importados
                    </Label>
                    <Select value={defaultType} onValueChange={setDefaultType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar configuração
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={syncing || !settings}
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
