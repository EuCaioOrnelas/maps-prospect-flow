import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import { DEFAULT_TEMPLATE_BODY, OUTREACH_VARIABLES, prospectOutreachLabel, renderTemplate } from "@/lib/influencerOutreach";
import {
  Loader2, Send, Paperclip, X, StickyNote, Mail, MessageSquare, Inbox, ArrowUpRight,
} from "lucide-react";

interface Props {
  prospect: any | null;
  defaultEmail?: string;
  onClose: () => void;
  onChanged?: () => void;
}

const MAX_FILE_MB = 3;

/** Converte arquivo em base64 puro (sem o prefixo data:) para envio via Resend. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Thread de e-mail do influenciador no formato de ticket: histórico de ida e volta,
 * resposta com anexo e anotações internas da equipe.
 */
export function InfluencerThreadDialog({ prospect, defaultEmail, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("conversa");

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const [{ data }, { data: sentRows }] = await Promise.all([
      (supabase as any).from("influencer_messages").select("*").eq("prospect_id", id).order("created_at", { ascending: true }),
      (supabase as any).from("influencer_campaign_recipients").select("id, campaign_id, prospect_id, subject, body_html, email, sent_at, provider_message_id")
        .eq("prospect_id", id).not("sent_at", "is", null).order("sent_at", { ascending: true }),
    ]);
    const persisted = data ?? [];
    const recipientIds = new Set(persisted.map((m: any) => m.recipient_id).filter(Boolean));
    const legacy = (sentRows ?? []).filter((r: any) => !recipientIds.has(r.id)).map((r: any) => ({
      id: `legacy-${r.id}`, prospect_id: r.prospect_id, campaign_id: r.campaign_id, recipient_id: r.id,
      direction: "enviada", subject: r.subject,
      body_text: String(r.body_html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").trim(),
      from_email: "parcerias@wiize.com.br", to_email: r.email, created_at: r.sent_at,
      provider_message_id: r.provider_message_id, attachments: [],
    }));
    setMessages([...persisted, ...legacy].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!prospect?.id) return;
    setTab("conversa");
    setFiles([]);
    setText("");
    setNote("");
    setTo(defaultEmail || prospect.contact_email || "");
    load(prospect.id);
  }, [prospect?.id, defaultEmail, load]);

  // Realtime: respostas recebidas aparecem na hora.
  useEffect(() => {
    if (!prospect?.id) return;
    const ch = supabase
      .channel(`influencer-thread-${prospect.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "influencer_messages", filter: `prospect_id=eq.${prospect.id}` },
        () => load(prospect.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [prospect?.id, load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const lastSubject = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.subject);
    return last?.subject ? (last.subject.startsWith("Re:") ? last.subject : `Re: ${last.subject}`) : "";
  }, [messages]);
  const previewText = useMemo(() => renderTemplate(text, prospect), [text, prospect]);

  useEffect(() => { if (!subject) setSubject(lastSubject); }, [lastSubject]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const next: File[] = [];
    for (const f of Array.from(list).slice(0, 3)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${f.name} excede ${MAX_FILE_MB}MB`, variant: "destructive" });
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const sendReply = async () => {
    if (!prospect) return;
    if (!to.trim() || !subject.trim() || !text.trim()) {
      toast({ title: "Preencha destinatário, assunto e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async (f) => ({ filename: f.name, content: await toBase64(f) })),
      );
      const { data, error } = await supabase.functions.invoke("influencer-outreach", {
        body: { action: "send_reply", prospect_id: prospect.id, to: to.trim(), subject: subject.trim(), body_text: text.trim(), attachments },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "E-mail enviado" });
      setText(""); setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      await load(prospect.id);
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const saveNote = async () => {
    if (!prospect || !note.trim()) return;
    setSavingNote(true);
    const { data, error } = await supabase.functions.invoke("influencer-outreach", {
      body: { action: "add_note", prospect_id: prospect.id, body_text: note.trim() },
    });
    setSavingNote(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro ao salvar anotação", description: error?.message ?? (data as any).error, variant: "destructive" });
      return;
    }
    setNote("");
    setTab("conversa");
    load(prospect.id);
  };

  if (!prospect) return null;

  return (
    <Dialog open={!!prospect} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[96vh] flex flex-col overflow-hidden p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-6">
            <ChannelAvatar src={prospect.thumbnail_url} name={prospect.channel_name} size={48} />
            <div className="min-w-0 text-left">
              <p className="truncate text-base">{prospect.channel_name}</p>
              <p className="text-xs font-normal text-muted-foreground truncate">
                {to || "sem e-mail"} · {prospectOutreachLabel(prospect.status)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="self-start">
            <TabsTrigger value="conversa"><MessageSquare size={14} className="mr-1.5" /> Conversa</TabsTrigger>
            <TabsTrigger value="nota"><StickyNote size={14} className="mr-1.5" /> Anotação interna</TabsTrigger>
          </TabsList>

          {/* Histórico + resposta */}
          <TabsContent value="conversa" className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4 mt-4">
            <div className="flex-1 min-h-[420px] h-[55vh] overflow-y-auto overscroll-contain pr-3">

              {loading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-muted-foreground" size={18} /></div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                  <Inbox className="mx-auto text-muted-foreground" size={22} />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Envie a primeira abordagem abaixo ou crie uma campanha.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const mine = m.direction === "enviada";
                    const isNote = m.direction === "nota";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={[
                          "max-w-[80%] rounded-2xl border p-4 space-y-2",
                          isNote ? "border-amber-500/30 bg-amber-500/10"
                            : mine ? "border-primary/25 bg-primary/10"
                              : "border-border bg-muted/60",
                        ].join(" ")}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[11px]">
                              {isNote ? "Anotação" : mine ? "Enviada" : "Recebida"}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(m.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          {m.subject && <p className="text-xs font-semibold">{m.subject}</p>}
                          <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{m.body_text}</p>
                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {m.attachments.map((a: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[11px]">
                                  <Paperclip size={11} className="mr-1" /> {a.filename}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border p-4 space-y-3 shrink-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Para</Label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@canal.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assunto</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Parceria Wiize" />
                </div>
              </div>
              <Textarea rows={6} placeholder={messages.length ? "Escreva a resposta…" : "Escreva a primeira abordagem…"}
                value={text} onChange={(e) => setText(e.target.value)} />
              {!messages.length && !text && (
                <Button type="button" size="sm" variant="outline" onClick={() => setText(DEFAULT_TEMPLATE_BODY)}>
                  Usar modelo de apresentação da Wiize
                </Button>
              )}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Variáveis de personalização</Label>
                <div className="flex flex-wrap gap-2">
                  {OUTREACH_VARIABLES.slice(0, 8).map((variable) => (
                    <Button key={variable.key} type="button" size="sm" variant="outline" className="h-7 px-2.5 text-[11px]"
                      onClick={() => setText((value) => `${value}${value ? " " : ""}{{{variable.key}}}`)}>
                      {`{{${variable.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>
              {text.trim() && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Prévia enviada</p>
                  <Separator className="my-2" />
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewText}</p>
                  <p className="mt-3 text-sm text-muted-foreground">Atenciosamente,<br />Equipe de Parcerias Wiize</p>
                </div>
              )}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f) => (
                    <Badge key={f.name} variant="secondary" className="text-[11px]">
                      <Paperclip size={11} className="mr-1" /> {f.name}
                      <Button type="button" variant="ghost" size="sm" className="ml-1 h-5 w-5 p-0" aria-label={`Remover ${f.name}`}
                        title={`Remover ${f.name}`} onClick={() => setFiles((s) => s.filter((x) => x !== f))}><X size={10} /></Button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" multiple className="hidden"
                  onChange={(e) => pickFiles(e.target.files)} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Paperclip size={14} className="mr-1.5" /> Anexo
                </Button>
                {to && (
                  <a href={`mailto:${to}`} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
                    <ArrowUpRight size={12} /> abrir no meu e-mail
                  </a>
                )}
                <div className="flex-1" />
                <Button size="sm" disabled={sending} onClick={sendReply}>
                  {sending ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Send size={14} className="mr-1.5" />}
                  Enviar e-mail
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Mail size={13} className="mt-0.5 shrink-0" />
                 O envio usa parcerias@wiize.com.br. A resposta volta automaticamente para esta conversa e marca o envio como “Resposta recebida”.
              </p>
            </div>
          </TabsContent>

          {/* Anotação interna */}
          <TabsContent value="nota" className="mt-4 space-y-3">
            <Textarea rows={6} placeholder="Contexto interno da negociação (não é enviado ao influenciador)…"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" disabled={savingNote || !note.trim()} onClick={saveNote}>
                {savingNote ? <Loader2 className="animate-spin mr-1.5" size={13} /> : <StickyNote size={13} className="mr-1.5" />}
                Salvar anotação
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
