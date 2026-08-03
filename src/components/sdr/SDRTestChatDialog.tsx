import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, RotateCcw, Send, Sparkles, User, Loader2, Play } from "lucide-react";

type ChatItem =
  | { kind: "lead"; text: string }
  | { kind: "sdr"; text: string }
  | { kind: "insight"; text: string };

const STAGE_LABEL: Record<string, string> = {
  conexao: "Conexão",
  necessidade: "Necessidade",
  valor: "Valor",
  objecoes: "Objeções",
  fechamento: "Fechamento",
};

const ACTION_LABEL: Record<string, string> = {
  responder: "Continuar respondendo",
  aguardar: "Aguardar resposta do lead",
  followup: "Programar follow-up",
  chamar_vendedor: "Chamar vendedor humano",
  encerrar: "Encerrar conversa",
};

interface Props {
  agent: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SDRTestChatDialog({ agent, open, onOpenChange }: Props) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [memory, setMemory] = useState<any>({});
  const [stage, setStage] = useState<string>("conexao");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setItems([]);
    setInput("");
    setMemory({});
    setStage("conexao");
  };

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, agent?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, sending]);

  const buildInsights = (analysis: any, nextAction: string, scheduledSlots: string[]) => {
    const out: string[] = [];
    const prevFacts: string[] = memory?.fatos ?? [];
    const prevObj: string[] = memory?.objecoes ?? [];
    const prevProm: string[] = memory?.promessas ?? [];
    const mem = analysis?.memoria ?? {};

    for (const f of (mem.fatos ?? []) as string[]) {
      if (!prevFacts.includes(f)) out.push(`Informação registrada: ${f}`);
    }
    for (const o of (mem.objecoes ?? []) as string[]) {
      if (!prevObj.includes(o)) out.push(`Objeção identificada: ${o}`);
    }
    for (const p of (mem.promessas ?? []) as string[]) {
      if (!prevProm.includes(p)) out.push(`Compromisso assumido: ${p}`);
    }

    const nextStage = analysis?.proximo_passo ?? analysis?.passo_atual;
    if (nextStage && nextStage !== stage) {
      out.push(
        `Etapa do funil avançou: ${STAGE_LABEL[stage] ?? stage} → ${STAGE_LABEL[nextStage] ?? nextStage}`,
      );
    }
    if (analysis?.dor) out.push(`Dor entendida: ${analysis.dor}`);
    if (analysis?.micro_objetivo) out.push(`Micro-objetivo desta resposta: ${analysis.micro_objetivo}`);
    if (analysis?.sentimento) out.push(`Sentimento do lead: ${analysis.sentimento} · abertura ${analysis.abertura ?? "-"}`);
    if (scheduledSlots.length) out.push(`Horários oferecidos: ${scheduledSlots.length} opção(ões) da agenda`);
    if (analysis?.agendamento?.confirmado) out.push("Lead confirmou um horário — em produção a reunião seria criada na Agenda");
    if (nextAction && nextAction !== "responder") out.push(`Próxima ação: ${ACTION_LABEL[nextAction] ?? nextAction}`);

    return out;
  };

  const runTurn = async (message: string, triggerType: "inbound" | "outbound") => {
    if (!agent) return;
    setSending(true);
    try {
      const history = items
        .filter((i) => i.kind !== "insight")
        .map((i) => ({ role: i.kind === "sdr" ? "assistant" : "user", content: (i as any).text }));

      const { data, error } = await supabase.functions.invoke("sdr-brain", {
        body: {
          agentId: agent.id,
          message,
          triggerType,
          history,
          persist: false,
          leadContext: {
            modo: "teste_interno",
            contact_name: "Lead de Teste",
            memoria_acumulada: memory,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const msgs: string[] = Array.isArray((data as any)?.messages) ? (data as any).messages : [];
      const analysis = (data as any)?.analysis ?? {};
      const nextAction = (data as any)?.next_action ?? "aguardar";
      const slots: string[] = analysis?.agendamento?.opcoes_iso ?? [];

      const insights = buildInsights(analysis, nextAction, slots);

      setItems((prev) => [
        ...prev,
        ...msgs.map((t) => ({ kind: "sdr", text: t }) as ChatItem),
        ...insights.map((t) => ({ kind: "insight", text: t }) as ChatItem),
      ]);
      setMemory(analysis?.memoria ?? memory);
      setStage(analysis?.proximo_passo ?? analysis?.passo_atual ?? stage);

      if (!msgs.length) {
        setItems((prev) => [
          ...prev,
          { kind: "insight", text: "O SDR decidiu não responder agora (aguardar / follow-up)." },
        ]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível falar com o SDR");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setItems((prev) => [...prev, { kind: "lead", text }]);
    await runTurn(text, "inbound");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate">Testar {agent?.name ?? "SDR"}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Simulação idêntica ao WhatsApp — nada é salvo nem enviado
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-b border-border bg-muted/40">
          <Badge variant="secondary" className="gap-1">
            Etapa: {STAGE_LABEL[stage] ?? stage}
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={reset} disabled={sending}>
            <RotateCcw size={14} /> Resetar conversa
          </Button>
        </div>

        <div ref={scrollRef} className="h-[420px] overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Bot size={22} />
              </span>
              <div>
                <p className="font-medium">Comece a simulação</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Escreva como se fosse o lead, ou peça para o SDR iniciar o primeiro contato.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => runTurn("", "outbound")}
                disabled={sending}
              >
                <Play size={14} /> SDR inicia a conversa
              </Button>
            </div>
          )}

          {items.map((item, i) =>
            item.kind === "insight" ? (
              <div
                key={i}
                className="mx-auto max-w-[92%] flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2"
              >
                <Sparkles size={13} className="text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ) : (
              <div
                key={i}
                className={`flex items-end gap-2 ${item.kind === "lead" ? "justify-end" : "justify-start"}`}
              >
                {item.kind === "sdr" && (
                  <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </span>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    item.kind === "lead"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {item.text}
                </div>
                {item.kind === "lead" && (
                  <span className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <User size={14} />
                  </span>
                )}
              </div>
            ),
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-primary" />
              O SDR está analisando e escrevendo...
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Escreva como o lead responderia..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={sending}
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
