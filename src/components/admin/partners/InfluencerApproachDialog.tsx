// Abordagem individual pesquisada por IA.
// A IA pesquisa o influenciador (perfil, bio, redes, vídeos reais) e escreve uma
// primeira mensagem personalizada — sem inventar informação. O admin revisa,
// edita, regenera ou envia reaproveitando o motor de e-mail já existente.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import { textToEmailHtml } from "@/lib/influencerOutreach";
import {
  Loader2, Sparkles, Send, Copy, RefreshCw, Search, AlertTriangle,
  CheckCircle2, Target, FileText, Wand2, Save,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospect: any | null;
  email: string;
  onSent?: () => void;
}

const STEPS = [
  { icon: Search, label: "Pesquisando o influenciador" },
  { icon: Wand2, label: "Analisando conteúdos reais" },
  { icon: FileText, label: "Escrevendo a abordagem" },
];

export function InfluencerApproachDialog({ open, onOpenChange, prospect, email, onSent }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [approachId, setApproachId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [research, setResearch] = useState<any | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const variantRef = useRef(0);
  const historyRef = useRef<string[]>([]);

  const generate = useCallback(async (regenerate = false) => {
    if (!prospect) return;
    setLoading(true);
    setError(null);
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 2500);
    const t2 = setTimeout(() => setStep(2), 6000);
    try {
      const { data, error: err } = await supabase.functions.invoke("influencer-ai-approach", {
        body: {
          action: "generate",
          prospect_id: prospect.id,
          variant: regenerate ? ++variantRef.current : 0,
          previous_messages: regenerate ? historyRef.current : [],
        },
      });
      if (err) throw err;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setApproachId(d.approach?.id ?? null);
      setAnalysis(d.analysis);
      setResearch(d.research);
      setSubject(d.subject || "");
      setMessage(d.message || "");
      setSaved(true);
      historyRef.current = [...historyRef.current, d.message || ""].slice(-3);
    } catch (e: any) {
      setError(e?.message || "Não foi possível gerar a abordagem.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
    }
  }, [prospect]);

  /** Carrega o rascunho já salvo; só gera com IA quando não existir nenhum. */
  const loadOrGenerate = useCallback(async () => {
    if (!prospect) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.functions.invoke("influencer-ai-approach", {
        body: { action: "latest", prospect_id: prospect.id },
      });
      const a = (data as any)?.approach;
      if (a?.message) {
        setApproachId(a.id);
        setAnalysis(a.analysis ?? null);
        setResearch(a.research ?? null);
        setSubject(a.subject || "");
        setMessage(a.message || "");
        setSaved(true);
        historyRef.current = [a.message];
        setLoading(false);
        return;
      }
    } catch {
      /* segue para geração */
    }
    setLoading(false);
    generate(false);
  }, [prospect, generate]);

  useEffect(() => {
    if (!open || !prospect) return;
    variantRef.current = 0;
    historyRef.current = [];
    setAnalysis(null);
    setResearch(null);
    setSubject("");
    setMessage("");
    setApproachId(null);
    setSaved(false);
    loadOrGenerate();
  }, [open, prospect?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = useCallback(async (silent = false) => {
    if (!approachId) return;
    await supabase.functions.invoke("influencer-ai-approach", {
      body: { action: "save", approach_id: approachId, subject, message },
    });
    setSaved(true);
    if (!silent) toast({ title: "Rascunho salvo" });
  }, [approachId, subject, message, toast]);

  const copy = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${message}`);
    toast({ title: "Abordagem copiada" });
  };


  const send = async () => {
    if (!prospect || !email) return;
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Preencha assunto e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("influencer-outreach", {
        body: {
          action: "create_campaign",
          name: `Abordagem IA · ${prospect.channel_name}`.slice(0, 120),
          template_id: null,
          body_html: textToEmailHtml(message),
          allow_duplicates: false,
          items: [{
            prospect_id: prospect.id,
            contact_id: null,
            email,
            subject: subject.trim(),
            body_html: textToEmailHtml(message),
          }],
        },
      });
      if (err) throw err;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.queued === 0) {
        const skipped = (data as any)?.skipped?.[0]?.reason;
        throw new Error(skipped || "Envio bloqueado para este contato.");
      }
      if (approachId) {
        await supabase.functions.invoke("influencer-ai-approach", {
          body: { action: "mark_sent", approach_id: approachId, subject, message },
        });
      }
      toast({ title: "Abordagem enviada", description: email });
      onOpenChange(false);
      onSent?.();
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const words = message.split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Abordagem personalizada por IA
          </DialogTitle>
          <DialogDescription>
            A IA pesquisa o criador antes de escrever e só usa informações reais — nada é inventado. O rascunho fica salvo: só gera de novo se você clicar em Regenerar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <ChannelAvatar src={prospect?.thumbnail_url} name={prospect?.channel_name} size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{prospect?.channel_name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {prospect?.platform === "instagram" ? "Instagram" : "YouTube"} · {email || "Sem e-mail cadastrado"}
            </p>
          </div>
          {research && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {research.fonte === "youtube_api"
                ? `${research.videos_recentes + research.videos_antigos} conteúdo(s) analisado(s)`
                : "Baseado no perfil"}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={26} />
            <div className="space-y-1.5 text-center">
              {STEPS.map((s, i) => (
                <p key={s.label}
                  className={`text-xs flex items-center justify-center gap-1.5 ${i === step ? "text-foreground font-medium" : i < step ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                  {i < step ? <CheckCircle2 size={12} className="text-emerald-500" /> : <s.icon size={12} />}
                  {s.label}
                </p>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="mx-auto text-amber-500" size={22} />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => generate(false)}>
              <RefreshCw size={14} className="mr-2" /> Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5 overflow-hidden">
            {/* Análise */}
            <ScrollArea className="max-h-[52vh] pr-3">
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Target size={13} className="text-primary" /> Análise da IA
                </p>
                {[
                  ["Nicho identificado", analysis?.nicho],
                  ["Conteúdo usado na personalização", analysis?.conteudo_usado],
                  ["Por que esse conteúdo", analysis?.por_que],
                  ["Oportunidade identificada", analysis?.oportunidade],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-border p-3">
                    <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                    <p className="text-xs leading-relaxed">{value || "—"}</p>
                  </div>
                ))}

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={analysis?.personalizado ? "default" : "outline"} className="text-[10px]">
                    {analysis?.personalizado ? "Personalizada" : "Genérica"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">Confiança: {analysis?.confianca ?? "—"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{words} palavras</Badge>
                </div>

                {!!analysis?.alertas?.length && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-700 dark:text-amber-500 space-y-0.5">
                      {analysis.alertas.map((a: string) => <p key={a}>{a}</p>)}
                    </div>
                  </div>
                )}

                {!!research?.titulos?.length && (
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] text-muted-foreground mb-1.5">Conteúdos reais consultados</p>
                    <ul className="space-y-1">
                      {research.titulos.slice(0, 6).map((t: string) => (
                        <li key={t} className="text-[11px] text-muted-foreground truncate">• {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Mensagem */}
            <div className="flex flex-col min-h-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assunto</Label>
                <Input value={subject} onChange={(e) => { setSubject(e.target.value); setSaved(false); }} />
              </div>
              <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <Textarea rows={16} value={message} onChange={(e) => { setMessage(e.target.value); setSaved(false); }}
                  className="leading-relaxed flex-1 min-h-[320px]" />
              </div>
            </div>
          </div>
        )}

        <Separator />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" disabled={sending}
            onClick={async () => { if (!saved) await saveDraft(true); onOpenChange(false); }}>Fechar</Button>
          <Button variant="outline" onClick={() => generate(true)} disabled={loading || sending}>
            <RefreshCw size={14} className="mr-2" /> Regenerar
          </Button>
          <Button variant="outline" onClick={() => saveDraft(false)} disabled={loading || sending || !approachId || saved}>
            <Save size={14} className="mr-2" /> {saved ? "Salvo" : "Salvar rascunho"}
          </Button>
          <Button variant="outline" onClick={copy} disabled={loading || !message}>
            <Copy size={14} className="mr-2" /> Copiar
          </Button>
          <Button onClick={send} disabled={loading || sending || !message || !email}>
            {sending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Send className="mr-2" size={14} />}
            Enviar e-mail
          </Button>
        </div>
        {!email && !loading && (
          <p className="text-[11px] text-amber-600 text-right">
            Sem e-mail cadastrado para este influenciador — copie a mensagem ou cadastre um contato.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
