import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Plus, Trash2, AlertCircle, CheckCircle2, Info, Upload, FileText,
  LayoutGrid, Image as ImageIcon, MessageSquare, Type, MousePointerClick, Save, Send, Braces,
} from "lucide-react";
import { TemplatePreview } from "./TemplatePreview";
import {
  DraftTemplate, TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES, emptyDraft,
  normalizeTemplateName, validateDraft, bodyPlaceholders, type TemplateButton,
} from "@/lib/metaTemplates";

interface TemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: DraftTemplate | null;
  editing?: boolean;
  onSubmit: (draft: DraftTemplate) => Promise<boolean>;
  onSaveDraft?: (draft: DraftTemplate) => Promise<boolean>;
  onUploadMedia: (file: File) => Promise<{ handle?: string; error?: string }>;
}

const SectionTitle = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
    {children}
  </h3>
);


type MediaFormat = "IMAGE" | "VIDEO" | "DOCUMENT";

const ACCEPT: Record<MediaFormat, string> = {
  IMAGE: "image/jpeg,image/png",
  VIDEO: "video/mp4,video/3gpp",
  DOCUMENT: "application/pdf",
};

// Limits published by the WhatsApp Cloud API for template header samples.
const MEDIA_LIMITS: Record<string, number> = {
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "video/mp4": 16 * 1024 * 1024,
  "video/3gpp": 16 * 1024 * 1024,
  "application/pdf": 16 * 1024 * 1024,
};

const HEADER_OPTIONS = [
  { value: "NONE", label: "Nenhum" },
  { value: "TEXT", label: "Texto" },
  { value: "IMAGE", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "DOCUMENT", label: "Documento" },
];

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  ) : null;

export function TemplateBuilderDialog({
  open, onOpenChange, initialDraft, editing = false, onSubmit, onSaveDraft, onUploadMedia,
}: TemplateBuilderDialogProps) {
  const [draft, setDraft] = useState<DraftTemplate>(initialDraft ?? emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);


  useEffect(() => {
    if (open) {
      setDraft(initialDraft ?? emptyDraft());
      setTouched(false);
      setMediaFile(null);
      setMediaPreviewUrl(null);
      setUploadStage(null);
      setUploadError(null);
      setSubmitStage(null);
    }
  }, [open, initialDraft]);

  useEffect(() => () => { if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl); }, [mediaPreviewUrl]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    const limit = MEDIA_LIMITS[file.type];
    if (!limit) {
      setUploadError("Formato não suportado pela Meta para este tipo de cabeçalho.");
      return;
    }
    if (file.size > limit) {
      setUploadError(`Arquivo muito grande. O limite para este formato é ${Math.round(limit / (1024 * 1024))} MB.`);
      return;
    }

    setMediaFile(file);
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl(file.type.startsWith("application/") ? null : URL.createObjectURL(file));

    setUploadStage("Enviando arquivo para a Meta…");
    const res = await onUploadMedia(file);
    if (res.error || !res.handle) {
      setUploadStage(null);
      setUploadError(res.error || "Não foi possível enviar o arquivo para a Meta.");
      setDraft((d) => ({ ...d, headerHandle: "" }));
      return;
    }
    setDraft((d) => ({ ...d, headerHandle: res.handle as string }));
    setUploadStage(null);
  };

  const set = <K extends keyof DraftTemplate>(key: K, value: DraftTemplate[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const { errors, list } = useMemo(() => validateDraft(draft, { editing }), [draft, editing]);
  const varCount = useMemo(() => new Set(bodyPlaceholders(draft.body)).size, [draft.body]);
  const showErrors = touched;

  /** Renumbers {{n}} sequentially and keeps the examples aligned with them. */
  const applyBody = (rawBody: string, prevExamples: string[]) => {
    const seen: number[] = [];
    bodyPlaceholders(rawBody).forEach((n) => { if (!seen.includes(n)) seen.push(n); });

    const body = rawBody.replace(/\{\{(\d+)\}\}/g, (_m, n) => `{{${seen.indexOf(Number(n)) + 1}}}`);
    const examples = seen.map((oldIndex) => prevExamples[oldIndex - 1] ?? "");
    return { body, examples };
  };


  const setBody = (value: string) => {
    setDraft((d) => {
      const { body, examples } = applyBody(value, d.bodyExamples);
      return { ...d, body, bodyExamples: examples };
    });
  };

  /** Inserts the next variable exactly where the cursor is. */
  const addVariable = () => {
    const el = bodyRef.current;
    const token = `{{${varCount + 1}}}`;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? draft.body.length;
    const next = `${draft.body.slice(0, start)}${token}${draft.body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const setExample = (index: number, value: string) => {
    const next = [...draft.bodyExamples];
    next[index] = value;
    set("bodyExamples", next);
  };

  const updateButton = (index: number, patch: Partial<TemplateButton>) => {
    const next = draft.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b));
    set("buttons", next);
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setTouched(true);
    if (!draft.name.trim() || errors.name) return;
    setSavingDraft(true);
    setSubmitStage("Salvando rascunho…");
    try {
      const ok = await onSaveDraft(draft);
      if (ok) onOpenChange(false);
    } finally {
      setSubmitStage(null);
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (list.length) {
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    setSubmitStage("Enviando template para análise da Meta…");
    try {
      const ok = await onSubmit(draft);
      setSubmitStage(ok ? "Template criado." : null);
      if (ok) onOpenChange(false);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)] max-w-5xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="h-[18px] w-[18px]" aria-hidden />
              </span>
              {editing ? "Editar template" : "Criar template"}
            </DialogTitle>
            <DialogDescription>
              O conteúdo é enviado para análise da Meta. Nome e idioma não podem ser alterados depois da criação.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden grid lg:grid-cols-[1.4fr_1fr] gap-6 p-6">
            {/* ----------------------------------------------------------- form */}
            <div className="space-y-6 min-w-0">
              <section className="space-y-4">
                <SectionTitle icon={LayoutGrid}>Informações básicas</SectionTitle>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nome do template</Label>
                    <Input
                      value={draft.name}
                      disabled={editing}
                      onChange={(e) => set("name", normalizeTemplateName(e.target.value))}
                      placeholder="pedido_confirmado"
                      className="mt-1.5"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Apenas letras minúsculas, números e underline.
                    </p>
                    <FieldError message={showErrors ? errors.name : undefined} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Categoria</Label>
                    <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger className="mt-1.5 text-foreground hover:bg-muted/40 hover:text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="data-[highlighted]:bg-muted data-[highlighted]:text-foreground">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 min-h-8 text-[11px] leading-4 text-muted-foreground">
                      {TEMPLATE_CATEGORIES.find((category) => category.value === draft.category)?.hint}
                    </p>
                    <FieldError message={showErrors ? errors.category : undefined} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Idioma</Label>
                    <Select value={draft.language} onValueChange={(v) => set("language", v)} disabled={editing}>
                      <SelectTrigger className="mt-1.5 text-foreground hover:bg-muted/40 hover:text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={showErrors ? errors.language : undefined} />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <SectionTitle icon={ImageIcon}>Cabeçalho</SectionTitle>
                <Select
                  value={draft.headerFormat}
                  onValueChange={(v) => set("headerFormat", v as DraftTemplate["headerFormat"])}
                >
                  <SelectTrigger className="sm:w-56 text-foreground hover:bg-muted/40 hover:text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HEADER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {draft.headerFormat === "TEXT" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Texto do cabeçalho</Label>
                      <Input
                        value={draft.headerText}
                        maxLength={60}
                        onChange={(e) => set("headerText", e.target.value)}
                        placeholder="Pedido confirmado"
                        className="mt-1.5"
                      />
                      <FieldError message={showErrors ? errors.headerText : undefined} />
                    </div>
                    {/\{\{1\}\}/.test(draft.headerText) && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Exemplo da variável do cabeçalho</Label>
                        <Input
                          value={draft.headerExample}
                          onChange={(e) => set("headerExample", e.target.value)}
                          placeholder="Caio"
                          className="mt-1.5"
                        />
                        <FieldError message={showErrors ? errors.headerExample : undefined} />
                      </div>
                    )}
                  </div>
                )}

                {["IMAGE", "VIDEO", "DOCUMENT"].includes(draft.headerFormat) && (
                  <div className="space-y-2.5">
                    <Label className="text-xs text-muted-foreground">Arquivo de exemplo</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={ACCEPT[draft.headerFormat as MediaFormat]}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) handleFile(f);
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button" variant="outline" size="sm" className="gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!uploadStage}
                      >
                        {uploadStage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {draft.headerHandle ? "Trocar arquivo" : "Enviar arquivo"}
                      </Button>
                      {mediaFile && (
                        <span className="text-xs text-muted-foreground">
                          {mediaFile.name} · {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    {mediaPreviewUrl && draft.headerFormat === "IMAGE" && (
                      <img
                        src={mediaPreviewUrl}
                        alt="Prévia do arquivo do cabeçalho"
                        className="max-h-40 rounded-lg border border-border object-contain"
                      />
                    )}
                    {mediaPreviewUrl && draft.headerFormat === "VIDEO" && (
                      <video src={mediaPreviewUrl} controls className="max-h-40 rounded-lg border border-border w-full" />
                    )}
                    {mediaFile && draft.headerFormat === "DOCUMENT" && (
                      <div className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs text-muted-foreground">
                        <FileText className="h-4 w-4" aria-hidden /> {mediaFile.name} ({mediaFile.type || "documento"})
                      </div>
                    )}

                    {uploadStage && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {uploadStage}
                      </p>
                    )}
                    {uploadError && <FieldError message={uploadError} />}
                    {!uploadStage && draft.headerHandle && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Arquivo enviado à Meta.
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Limites da Meta: imagem JPG/PNG até 5 MB, vídeo MP4/3GP até 16 MB, documento PDF até 16 MB.
                    </p>
                    <FieldError message={showErrors ? errors.headerHandle : undefined} />
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle icon={MessageSquare}>Corpo da mensagem</SectionTitle>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addVariable}>
                    <Braces className="h-3.5 w-3.5" /> Adicionar variável
                  </Button>
                </div>
                <Textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  maxLength={1024}
                  placeholder={"Olá, {{1}}!\nSeu pedido {{2}} foi confirmado."}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{varCount} variável(is)</span>
                  <span>{draft.body.length}/1024</span>
                </div>
                <FieldError message={showErrors ? errors.body : undefined} />

                {varCount > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
                      Os exemplos ajudam a Meta a entender o uso das variáveis durante a análise.
                    </p>
                    {Array.from({ length: varCount }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">{`{{${i + 1}}}`}</span>
                        <Input
                          value={draft.bodyExamples[i] || ""}
                          onChange={(e) => setExample(i, e.target.value)}
                          placeholder={i === 0 ? "Caio" : "#12345"}
                          className="h-8"
                        />
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground shrink-0"
                          aria-label={`Remover variável ${i + 1}`}
                          onClick={() => setBody(draft.body.split(`{{${i + 1}}}`).join(""))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <FieldError message={showErrors ? errors.bodyExamples : undefined} />
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <SectionTitle icon={Type}>Rodapé (opcional)</SectionTitle>
                <Input
                  value={draft.footer}
                  maxLength={60}
                  onChange={(e) => set("footer", e.target.value)}
                  placeholder="Equipe Wiize"
                />
                <FieldError message={showErrors ? errors.footer : undefined} />
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle icon={MousePointerClick}>Botões (opcional)</SectionTitle>
                  <Button
                    type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                    disabled={draft.buttons.length >= 10}
                    onClick={() => set("buttons", [...draft.buttons, { type: "QUICK_REPLY", text: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar botão
                  </Button>
                </div>
                {draft.buttons.map((b, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Select value={b.type} onValueChange={(v) => updateButton(i, { type: v as TemplateButton["type"] })}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICK_REPLY">Resposta rápida</SelectItem>
                          <SelectItem value="URL">Link (URL)</SelectItem>
                          <SelectItem value="PHONE_NUMBER">Telefone</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={b.text}
                        maxLength={25}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                        placeholder="Ver pedido"
                        className="h-8"
                      />
                      <Button
                        type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground"
                        onClick={() => set("buttons", draft.buttons.filter((_, idx) => idx !== i))}
                        aria-label="Remover botão"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {b.type === "URL" && (
                      <>
                        <Input
                          value={b.url || ""}
                          onChange={(e) => updateButton(i, { url: e.target.value })}
                          placeholder="https://example.com/pedido/{{1}}"
                          className="h-8"
                        />
                        {/\{\{1\}\}/.test(b.url || "") && (
                          <Input
                            value={b.example?.[0] || ""}
                            onChange={(e) => updateButton(i, { example: [e.target.value] })}
                            placeholder="Exemplo do valor da URL: 12345"
                            className="h-8"
                          />
                        )}
                      </>
                    )}
                    {b.type === "PHONE_NUMBER" && (
                      <Input
                        value={b.phone_number || ""}
                        onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                        placeholder="+5511999999999"
                        className="h-8"
                      />
                    )}
                    <FieldError message={showErrors ? errors[`button_${i}`] : undefined} />
                  </div>
                ))}
                <FieldError message={showErrors ? errors.buttons : undefined} />
              </section>
            </div>

            {/* -------------------------------------------------------- preview */}
            <div className="lg:sticky lg:top-0 space-y-3 h-fit">
              <TemplatePreview draft={draft} />
              <div
                className={`rounded-lg border p-3 text-xs ${
                  list.length
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <p className="flex items-center gap-1.5 font-medium">
                  {list.length ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {list.length
                    ? `Corrija ${list.length} problema(s) antes de enviar.`
                    : "Seu template está pronto para ser enviado."}
                </p>
                {list.length > 0 && (
                  <ul className="mt-2 space-y-1 list-disc pl-4">
                    {list.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || savingDraft}>
                Cancelar
              </Button>
              <p className="hidden sm:block text-xs text-muted-foreground">{submitStage || uploadStage || ""}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {onSaveDraft && (
                <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting || savingDraft} className="gap-2">
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar rascunho
                </Button>
              )}
              <Button
                onClick={() => { setTouched(true); if (!list.length) setConfirmOpen(true); }}
                disabled={submitting || savingDraft}
                className="gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para análise
              </Button>
            </div>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[101] w-[calc(100vw-2rem)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar template para análise da Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Após o envio, a Meta analisará o conteúdo. O template poderá ficar em análise antes de ser aprovado
              ou rejeitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSubmit(); }} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
