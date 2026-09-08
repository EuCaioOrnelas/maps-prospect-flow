import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Smartphone, CheckCircle2, RefreshCw, Headset, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_EVOLUTION_SETTINGS, EvolutionSettingsForm, type EvolutionSettings } from "./EvolutionSettingsForm";
import { ResponsiblesPicker } from "@/components/meta/ResponsiblesPicker";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useWabaResponsibles } from "@/hooks/useWabaResponsibles";

type Step = "name" | "qr" | "settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (connection: any) => void;
}

async function callEvolution(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        msg = j?.message || j?.error || msg;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as any;
}

export function EvolutionConnectDialog({ open, onOpenChange, onConnected }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("name");
  const [nickname, setNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [state, setState] = useState<"connecting" | "open" | "close">("connecting");
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [settings, setSettings] = useState<EvolutionSettings>(DEFAULT_EVOLUTION_SETTINGS);
  const [pendingKey, setPendingKey] = useState<keyof EvolutionSettings | null>(null);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const { members } = useAccountMembers();
  const { role } = useAccountRole();
  const { setNumberResponsibles, assignmentByUser } = useWabaResponsibles();
  const canChangeResponsible = role === "owner" || role === "admin";
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  };

  const reset = () => {
    stopPolling();
    setStep("name");
    setNickname("");
    setConnection(null);
    setQr(null);
    setState("connecting");
    setSettings(DEFAULT_EVOLUTION_SETTINGS);
  };

  useEffect(() => { if (!open) reset(); return stopPolling; }, [open]);

  const fetchQr = useCallback(async (connId: string) => {
    setRefreshingQr(true);
    try {
      const res = await callEvolution({ action: "qr", connection_id: connId });
      if (res?.qr?.base64) setQr(res.qr.base64);
      if (res?.state === "open") setState("open");
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o QR code", description: e.message, variant: "destructive" });
    } finally {
      setRefreshingQr(false);
    }
  }, [toast]);

  // Polling de status enquanto estiver no passo do QR
  useEffect(() => {
    if (step !== "qr" || !connection?.id || state === "open") return;
    let qrTicks = 0;
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await callEvolution({ action: "status", connection_id: connection.id });
        if (res?.state === "open") {
          setState("open");
          setConnection(res.connection || connection);
          stopPolling();
          window.setTimeout(() => setStep("settings"), 900);
          return;
        }
        // QR expira ~40s; renova a cada ~30s
        qrTicks += 1;
        if (qrTicks % 10 === 0) fetchQr(connection.id);
      } catch { /* silencioso */ }
    }, 3000);
    return stopPolling;
  }, [step, connection?.id, state, fetchQr]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await callEvolution({ action: "create", nickname: nickname.trim() || undefined, settings });
      setConnection(res.connection);
      setQr(res?.qr?.base64 || null);
      setStep("qr");
      if (!res?.qr?.base64) fetchQr(res.connection.id);
    } catch (e: any) {
      toast({ title: "Erro ao criar número", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (key: keyof EvolutionSettings, next: boolean) => {
    if (!connection?.id) return;
    const previous = settings;
    const optimistic = { ...settings, [key]: next };
    setSettings(optimistic);
    setPendingKey(key);
    try {
      const res = await callEvolution({ action: "set_settings", connection_id: connection.id, settings: optimistic });
      if (res?.settings) setSettings(res.settings);
    } catch (e: any) {
      setSettings(previous);
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setPendingKey(null);
    }
  };

  const finish = async () => {
    if (canChangeResponsible && connection?.id) {
      try {
        await setNumberResponsibles(connection.id, responsibles);
      } catch (e: any) {
        toast({ title: "Não foi possível salvar os responsáveis", description: e.message, variant: "destructive" });
      }
    }
    onConnected({ ...connection, evolution_settings: settings, evolution_state: "open" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && step === "qr" && state !== "open") { /* mantém conexão em 'connecting' para retomar depois */ } onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary/10 text-primary"><Headset size={15} /></span>
            Número de Atendimento
          </DialogTitle>
          <DialogDescription>
            {step === "name" && "Dê um nome ao número para identificá-lo na plataforma."}
            {step === "qr" && "Leia o QR code com o WhatsApp do celular para conectar."}
            {step === "settings" && "Conectado! Ajuste o comportamento do número. As alterações valem na hora."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-[11px] font-medium">
          {(["name", "qr", "settings"] as Step[]).map((s, i) => {
            const idx = ["name", "qr", "settings"].indexOf(step);
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}>{done ? "✓" : i + 1}</span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {s === "name" ? "Identificação" : s === "qr" ? "QR code" : "Preferências"}
                </span>
                {i < 2 && <span className="h-px w-6 bg-border" />}
              </div>
            );
          })}
        </div>

        {step === "name" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Apelido do número</label>
              <Input
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Suporte, Pós-venda, Financeiro…"
                maxLength={80}
                onKeyDown={(e) => { if (e.key === "Enter" && !creating) handleCreate(); }}
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5">
              <p className="flex items-center gap-2 text-foreground font-medium"><Smartphone size={13} /> O que você vai precisar</p>
              <p>• O celular com o WhatsApp que será conectado, com internet.</p>
              <p>• Este número serve para atendimento, chat, CRM e IA — não para disparos.</p>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <QrCode size={14} className="mr-2" />}
              {creating ? "Preparando conexão…" : "Gerar QR code"}
            </Button>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-4 pt-2">
            <div className="mx-auto flex h-[264px] w-[264px] items-center justify-center rounded-2xl border border-border bg-card p-3 shadow-sm">
              {state === "open" ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <CheckCircle2 size={44} />
                  <p className="text-sm font-semibold">Conectado!</p>
                </div>
              ) : qr ? (
                <img src={qr} alt="QR code para conectar o WhatsApp" className="h-full w-full rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 size={22} className="animate-spin" />
                  <p className="text-xs">Gerando QR code…</p>
                </div>
              )}
            </div>

            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li><strong className="text-foreground">1.</strong> Abra o WhatsApp no celular.</li>
              <li><strong className="text-foreground">2.</strong> Toque em <strong className="text-foreground">Mais opções</strong> (ou Configurações) → <strong className="text-foreground">Dispositivos conectados</strong>.</li>
              <li><strong className="text-foreground">3.</strong> Toque em <strong className="text-foreground">Conectar dispositivo</strong> e aponte a câmera para o QR code.</li>
            </ol>

            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 size={11} className="animate-spin" /> Aguardando leitura…
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => connection && fetchQr(connection.id)} disabled={refreshingQr || state === "open"}>
                <RefreshCw size={12} className={refreshingQr ? "animate-spin" : ""} /> Novo QR code
              </Button>
            </div>
          </div>
        )}

        {step === "settings" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {connection?.nickname || "Número"} conectado
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {connection?.display_phone_number ? `+${connection.display_phone_number}` : "Sincronizando número…"}
                  {connection?.profile_name ? ` · ${connection.profile_name}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium"><Settings2 size={14} className="text-primary" /> Preferências do número</div>
            <EvolutionSettingsForm value={settings} onChange={handleToggle} pendingKey={pendingKey} />

            {canChangeResponsible && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsáveis pelo número</label>
                <ResponsiblesPicker
                  members={members}
                  value={responsibles}
                  onChange={setResponsibles}
                  assignmentByUser={assignmentByUser}
                  currentConnectionId={connection?.id ?? null}
                />
              </div>
            )}

            <Button className="w-full" onClick={finish}>Concluir</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
