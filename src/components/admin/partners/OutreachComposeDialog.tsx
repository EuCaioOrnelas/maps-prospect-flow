import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send, Eye, Variable, AlertTriangle } from "lucide-react";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";

import {
  DEFAULT_TEMPLATE_BODY,
  DEFAULT_TEMPLATE_SUBJECT,
  OUTREACH_VARIABLES,
  emailHtmlToText,
  renderTemplate,
  textToEmailHtml,
} from "@/lib/influencerOutreach";

interface Target {
  prospect: any;
  contact: { id: string; value: string } | null;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targets: Target[];
  onCreated: (campaignId: string) => void;
}

export function OutreachComposeDialog({ open, onOpenChange, targets, onCreated }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState<string>("custom");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(DEFAULT_TEMPLATE_SUBJECT);
  const [bodyText, setBodyText] = useState(DEFAULT_TEMPLATE_BODY);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(`Abordagem influenciadores · ${new Date().toLocaleDateString("pt-BR")}`);
    setPreviewIndex(0);
    (supabase as any)
      .from("influencer_email_templates")
      .select("*").order("created_at", { ascending: false })
      .then(({ data }: any) => setTemplates(data ?? []));
  }, [open]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "custom") return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject || "");
    setBodyText(emailHtmlToText(t.body_html || ""));
  };

  const preview = useMemo(() => {
    const t = targets[previewIndex];
    if (!t) return { subject: "", body: "" };
    return {
      subject: renderTemplate(subject, t.prospect),
      body: renderTemplate(bodyText, t.prospect),
    };
  }, [targets, previewIndex, subject, bodyText]);

  const insertVariable = (key: string) => setBodyText((v) => `${v}{{${key}}}`);

  const submit = async () => {
    if (!subject.trim() || !bodyText.trim()) {
      toast({ title: "Preencha assunto e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const items = targets.map((t) => ({
        prospect_id: t.prospect.id,
        contact_id: t.contact?.id ?? null,
        email: t.email,
        subject: renderTemplate(subject, t.prospect),
        body_html: textToEmailHtml(renderTemplate(bodyText, t.prospect)),
      }));

      const { data, error } = await supabase.functions.invoke("influencer-outreach", {
        body: {
          action: "create_campaign",
          name: name.trim() || "Abordagem influenciadores",
          template_id: templateId === "custom" ? null : templateId,
          body_html: textToEmailHtml(bodyText),
          allow_duplicates: allowDuplicates,
          items,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const skipped = (data as any)?.skipped ?? [];
      toast({
        title: "Campanha criada",
        description: `${(data as any).queued} envio(s) na fila${skipped.length ? ` · ${skipped.length} ignorado(s)` : ""}.`,
      });
      onOpenChange(false);
      onCreated((data as any).campaign_id);
    } catch (e: any) {
      toast({ title: "Não foi possível criar a campanha", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} className="text-primary" /> Nova abordagem por e-mail
          </DialogTitle>
          <DialogDescription>
            {targets.length} influenciador(es) com e-mail disponível. As mensagens são personalizadas por canal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 overflow-hidden">
          {/* Editor */}
          <ScrollArea className="max-h-[62vh] pr-3">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome da campanha (interno)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Mensagem personalizada</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <Textarea rows={14} value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="font-normal leading-relaxed" />
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Variable size={13} className="text-primary/70" /> Variáveis disponíveis
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {OUTREACH_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="text-[11px] rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-border p-3">
                <Checkbox checked={allowDuplicates} onCheckedChange={(v) => setAllowDuplicates(!!v)} className="mt-0.5" />
                <span className="text-xs text-muted-foreground">
                  Permitir reenvio para contatos que já receberam alguma abordagem anteriormente.
                </span>
              </label>

              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Contatos marcados como “Não contatar” ou que pediram descadastro são bloqueados automaticamente.
                  Todo e-mail leva link de opt-out e respostas voltam para a fila de parcerias.
                </p>
              </div>
            </div>
          </ScrollArea>

          {/* Preview */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Eye size={13} className="text-primary" /> Pré-visualização
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={previewIndex === 0}
                  onClick={() => setPreviewIndex((i) => i - 1)}>‹</Button>
                <span className="text-[11px] text-muted-foreground">{previewIndex + 1}/{targets.length}</span>
                <Button size="sm" variant="ghost" disabled={previewIndex >= targets.length - 1}
                  onClick={() => setPreviewIndex((i) => i + 1)}>›</Button>
              </div>
            </div>
            <div className="flex items-center gap-2.5 mb-3 min-w-0">
              <ChannelAvatar
                src={targets[previewIndex]?.prospect?.thumbnail_url}
                name={targets[previewIndex]?.prospect?.channel_name}
                size={32}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{targets[previewIndex]?.prospect?.channel_name || "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{targets[previewIndex]?.email || "—"}</p>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[52vh]">
              <div className="rounded-xl bg-background border border-border p-4">
                <p className="text-sm font-semibold mb-3">{preview.subject || "Sem assunto"}</p>
                <Separator className="mb-3" />
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{preview.body}</p>
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending || targets.length === 0}>
            {sending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Send className="mr-2" size={14} />}
            Criar campanha e enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
