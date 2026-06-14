import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUICK_REPLY_VARIABLES } from "@/hooks/useQuickReplies";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

type Connection = { id: string; nickname: string | null; display_phone_number: string | null };
type Config = {
  enabled: boolean;
  message: string;
  start_time: string;
  end_time: string;
  weekdays: number[];
  timezone: string;
  once_per_day: boolean;
};

const DEFAULT_CFG: Config = {
  enabled: false,
  message: "Olá! 👋 Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos assim que possível.",
  start_time: "09:00",
  end_time: "18:00",
  weekdays: [1, 2, 3, 4, 5],
  timezone: "America/Sao_Paulo",
  once_per_day: true,
};

export default function ChatAutoReply() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [cfg, setCfg] = useState<Config>(DEFAULT_CFG);
  const [hasActiveFlows, setHasActiveFlows] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
    supabase.from("user_waba_connections")
      .select("id, nickname, display_phone_number")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .then(({ data }) => {
        const list = data ?? [];
        setConnections(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedId || !user) return;
    supabase.from("chat_auto_replies").select("*").eq("waba_connection_id", selectedId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCfg({
            enabled: data.enabled,
            message: data.message,
            start_time: String(data.start_time).slice(0, 5),
            end_time: String(data.end_time).slice(0, 5),
            weekdays: data.weekdays,
            timezone: data.timezone,
            once_per_day: data.once_per_day,
          });
        } else {
          setCfg(DEFAULT_CFG);
        }
      });
    supabase.from("wa_automation_flows")
      .select("id")
      .eq("user_id", user.id)
      .eq("waba_connection_id", selectedId)
      .eq("status", "active")
      .limit(1)
      .then(({ data }) => setHasActiveFlows((data ?? []).length > 0));
  }, [selectedId, user]);

  const toggleWeekday = (v: number) => {
    setCfg((c) => ({
      ...c,
      weekdays: c.weekdays.includes(v) ? c.weekdays.filter((d) => d !== v) : [...c.weekdays, v].sort(),
    }));
  };

  const save = async () => {
    if (!user || !selectedId) return;
    setSaving(true);
    const { error } = await supabase.from("chat_auto_replies").upsert(
      { user_id: user.id, waba_connection_id: selectedId, ...cfg, updated_at: new Date().toISOString() },
      { onConflict: "waba_connection_id" },
    );
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração salva");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="lg:hidden"><AppHeader profile={profile} /></div>
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto px-6 py-10">
              <Button variant="ghost" size="sm" onClick={() => navigate("/chat/configuracoes")} className="gap-2 mb-6">
                <ArrowLeft size={16} /> Voltar
              </Button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock size={20} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Resposta automática</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Envie uma mensagem automática quando um cliente escrever fora do horário de atendimento.
              </p>

              {connections.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  Nenhum número conectado. Conecte um número WhatsApp primeiro.
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                  <div>
                    <Label className="text-sm">Número WhatsApp</Label>
                    <Select value={selectedId} onValueChange={setSelectedId}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {connections.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nickname || c.display_phone_number || c.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFlows && (
                    <div className="flex gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <div>
                        Este número tem <b>fluxos de automação ativos</b>. A resposta automática <b>não será disparada</b>
                        para evitar conflito. Desative os fluxos para usar esta funcionalidade.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Ativar resposta automática</Label>
                      <p className="text-xs text-muted-foreground">Envia a mensagem fora do horário configurado.</p>
                    </div>
                    <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} />
                  </div>

                  <div>
                    <Label className="text-sm">Mensagem</Label>
                    <Textarea
                      value={cfg.message}
                      onChange={(e) => setCfg((c) => ({ ...c, message: e.target.value }))}
                      rows={4}
                      className="mt-2"
                      maxLength={1000}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Início do expediente</Label>
                      <Input type="time" value={cfg.start_time}
                        onChange={(e) => setCfg((c) => ({ ...c, start_time: e.target.value }))} className="mt-2" />
                    </div>
                    <div>
                      <Label className="text-sm">Fim do expediente</Label>
                      <Input type="time" value={cfg.end_time}
                        onChange={(e) => setCfg((c) => ({ ...c, end_time: e.target.value }))} className="mt-2" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Dias úteis</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {WEEKDAYS.map((d) => {
                        const on = cfg.weekdays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleWeekday(d.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              on
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <Label className="text-sm font-semibold">Enviar apenas 1× por dia por contato</Label>
                      <p className="text-xs text-muted-foreground">Evita disparar várias respostas para o mesmo cliente.</p>
                    </div>
                    <Switch checked={cfg.once_per_day} onCheckedChange={(v) => setCfg((c) => ({ ...c, once_per_day: v }))} />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
