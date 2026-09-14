import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CalendarClock, Clock, Loader2, Lock, Plus, Send, ShieldCheck, Trash2, X, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  components: any[];
}

export interface ScheduledRow {
  id: string;
  kind: string;
  content: string | null;
  template_name: string | null;
  scheduled_at: string;
  status: string;
  sequence: number;
  error: string | null;
}

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  wabaConnectionId: string;
  contactPhone: string;
  contactName: string | null;
  /** true quando o número é Evolution (sem janela de 24h e sem templates). */
  isEvolution: boolean;
  /** Data/hora ISO da última mensagem recebida do contato. */
  lastInboundAt: string | null;
  fetchTemplates?: () => Promise<MetaTemplate[]>;
}

const pad = (n: number) => String(n).padStart(2, "0");

const defaultDateTime = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "Agendada", className: "bg-primary/10 text-primary border-primary/20" },
  sent: { label: "Enviada", className: "bg-muted text-muted-foreground border-border" },
  failed: { label: "Falhou", className: "bg-destructive/10 text-destructive border-destructive/20" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
};

export function ScheduleMessageDialog({
  open, onOpenChange, conversationId, wabaConnectionId, contactPhone, contactName,
  isEvolution, lastInboundAt, fetchTemplates,
}: ScheduleMessageDialogProps) {
  const { user, accountOwnerId } = useAuth();
  const initial = defaultDateTime();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [blocks, setBlocks] = useState<string[]>([""]);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ScheduledRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const scheduledAt = useMemo(() => {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [date, time]);

  /** Janela de 24h da Meta calculada para o horário escolhido. */
  const windowClosed = useMemo(() => {
    if (isEvolution) return false;
    if (!lastInboundAt || !scheduledAt) return true;
    const limit = new Date(parseISO(lastInboundAt).getTime() + 24 * 60 * 60 * 1000);
    return scheduledAt.getTime() > limit.getTime();
  }, [isEvolution, lastInboundAt, scheduledAt]);

  const windowLimitLabel = useMemo(() => {
    if (isEvolution || !lastInboundAt) return null;
    const limit = new Date(parseISO(lastInboundAt).getTime() + 24 * 60 * 60 * 1000);
    return format(limit, "dd/MM 'às' HH:mm", { locale: ptBR });
  }, [isEvolution, lastInboundAt]);

  const templateRequired = windowClosed;
  const freeTextUnlocked = !templateRequired || !!templateName;

  const loadRows = useCallback(async () => {
    if (!conversationId) return;
    setLoadingRows(true);
    const { data } = await supabase
      .from("chat_scheduled_messages")
      .select("id, kind, content, template_name, scheduled_at, status, sequence, error")
      .eq("conversation_id", conversationId)
      .order("scheduled_at", { ascending: true })
      .order("sequence", { ascending: true })
      .limit(50);
    setRows((data as ScheduledRow[]) || []);
    setLoadingRows(false);
  }, [conversationId]);

  useEffect(() => {
    if (!open) return;
    void loadRows();
    const next = defaultDateTime();
    setDate(next.date);
    setTime(next.time);
    setBlocks([""]);
    setTemplateName(null);
  }, [open, loadRows]);

  useEffect(() => {
    if (!open || isEvolution || !templateRequired || templates.length > 0 || !fetchTemplates) return;
    setLoadingTemplates(true);
    fetchTemplates()
      .then((t) => setTemplates(t || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [open, isEvolution, templateRequired, templates.length, fetchTemplates]);

  const updateBlock = (index: number, value: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? value : b)));
  };
  const removeBlock = (index: number) => {
    setBlocks((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== index)));
  };

  const handleSchedule = async () => {
    if (!scheduledAt) { toast.error("Escolha data e hora."); return; }
    if (scheduledAt.getTime() <= Date.now()) { toast.error("Escolha um horário no futuro."); return; }
    if (templateRequired && !templateName) { toast.error("Selecione o template que reabre a conversa."); return; }

    const texts = blocks.map((b) => b.trim()).filter(Boolean);
    if (!templateRequired && texts.length === 0) { toast.error("Escreva ao menos uma mensagem."); return; }

    const owner = accountOwnerId || user?.id;
    if (!owner || !user?.id) { toast.error("Sessão expirada."); return; }

    setSaving(true);
    try {
      const base = {
        owner_user_id: owner,
        created_by: user.id,
        conversation_id: conversationId,
        waba_connection_id: wabaConnectionId,
        contact_phone: contactPhone,
        status: "pending",
      };
      const payload: any[] = [];
      let seq = 0;
      if (templateRequired && templateName) {
        const tpl = templates.find((t) => t.name === templateName);
        payload.push({
          ...base,
          kind: "template",
          template_name: templateName,
          template_language: tpl?.language || "pt_BR",
          content: null,
          scheduled_at: scheduledAt.toISOString(),
          sequence: seq++,
        });
      }
      texts.forEach((text, i) => {
        payload.push({
          ...base,
          kind: "text",
          content: text,
          // mensagens seguintes saem 1 minuto após a anterior, como numa conversa real
          scheduled_at: new Date(scheduledAt.getTime() + (payload.length + i) * 60 * 1000).toISOString(),
          sequence: seq++,
        });
      });

      const { error } = await supabase.from("chat_scheduled_messages").insert(payload as never);
      if (error) throw error;

      toast.success(payload.length > 1 ? "Mensagens agendadas." : "Mensagem agendada.");
      setBlocks([""]);
      setTemplateName(null);
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível agendar.");
    } finally {
      setSaving(false);
    }
  };

  const cancelRow = async (id: string) => {
    const { error } = await supabase
      .from("chat_scheduled_messages")
      .update({ status: "canceled", updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) { toast.error("Não foi possível cancelar."); return; }
    toast.success("Agendamento cancelado.");
    void loadRows();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Agendar mensagem</DialogTitle>
              <DialogDescription className="text-xs">
                Para {contactName || contactPhone} · {isEvolution ? "Número de atendimento" : "Número oficial Meta"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data do envio</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Horário</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Status da janela de 24h */}
          {!isEvolution && (
            <div className={cn(
              "rounded-xl border px-4 py-3 flex items-start gap-3",
              windowClosed ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-muted/20"
            )}>
              {windowClosed
                ? <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                : <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />}
              <div className="text-xs leading-relaxed text-muted-foreground">
                {windowClosed ? (
                  <>
                    <span className="font-semibold text-foreground">Fora da janela de 24 horas.</span>{" "}
                    No horário escolhido só é possível iniciar com um template aprovado. Depois de escolher o
                    template, as mensagens livres são liberadas e saem logo em seguida.
                    {windowLimitLabel && <> A janela atual vai até {windowLimitLabel}.</>}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">Dentro da janela de 24 horas.</span>{" "}
                    Pode enviar mensagens livres.
                    {windowLimitLabel && <> A janela vai até {windowLimitLabel}.</>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Template obrigatório */}
          {templateRequired && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Template de abertura</label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                  <Loader2 size={14} className="animate-spin" /> Carregando templates aprovados…
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                  Nenhum template aprovado disponível neste número.
                </div>
              ) : (
                <div className="grid gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {templates.map((t) => {
                    const body = t.components?.find((c: any) => c.type === "BODY")?.text || t.name;
                    const selected = templateName === t.name;
                    return (
                      <button
                        key={t.id || t.name}
                        type="button"
                        onClick={() => setTemplateName(selected ? null : t.name)}
                        className={cn(
                          "text-left rounded-xl border px-4 py-3 transition-all",
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground truncate">{t.name}</span>
                          {selected && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{body}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mensagens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                {templateRequired ? "Mensagens após o template" : "Mensagens"}
              </label>
              {!freeTextUnlocked && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock size={11} /> Escolha o template primeiro
                </span>
              )}
            </div>
            <div className={cn("space-y-2 transition-opacity", !freeTextUnlocked && "opacity-50 pointer-events-none")}>
              {blocks.map((block, i) => (
                <div key={i} className="relative">
                  <Textarea
                    value={block}
                    onChange={(e) => updateBlock(i, e.target.value)}
                    placeholder={i === 0 ? "Escreva a mensagem que será enviada…" : "Mensagem seguinte…"}
                    rows={3}
                    className="resize-none pr-10"
                  />
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remover mensagem"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setBlocks((prev) => [...prev, ""])}
              >
                <Plus size={14} /> Adicionar mensagem
              </Button>
            </div>
          </div>

          {/* Fila do contato */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-foreground">Agendamentos deste contato</p>
            {loadingRows ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" /> Carregando…
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Nenhuma mensagem agendada por enquanto.
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {[...pending, ...history].map((r) => {
                  const meta = statusMeta[r.status] || statusMeta.pending;
                  return (
                    <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">
                            {format(parseISO(r.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", meta.className)}>
                            {meta.label}
                          </Badge>
                          {r.kind === "template" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Template</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {r.kind === "template" ? r.template_name : r.content}
                        </p>
                        {r.error && <p className="text-[11px] text-destructive mt-0.5">{r.error}</p>}
                      </div>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => cancelRow(r.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label="Cancelar agendamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSchedule} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Agendar envio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
