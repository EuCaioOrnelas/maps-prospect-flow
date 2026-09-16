import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from "@/components/ui/emoji-picker";
import {
  QUICK_REPLY_VARIABLES,
  quickReplySteps,
  type QuickReply,
  type QuickReplyInput,
  type QuickReplyStep,
} from "@/hooks/useQuickReplies";
import { supabase } from "@/integrations/supabase/client";
import {
  Smile, Paperclip, X, Loader2, Plus, ArrowUp, ArrowDown, Trash2, Clock,
  MessageSquareText, ImageIcon, Film, Music, FileText, Mic, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { resolveStorageUrl } from "@/lib/privateStorage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: QuickReply | null;
  onSubmit: (input: QuickReplyInput) => Promise<void>;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

const STEP_META: Record<string, { label: string; icon: any }> = {
  text: { label: "Texto", icon: MessageSquareText },
  image: { label: "Imagem", icon: ImageIcon },
  video: { label: "Vídeo", icon: Film },
  audio: { label: "Áudio", icon: Music },
  document: { label: "Documento", icon: FileText },
};

function MediaThumb({ step }: { step: QuickReplyStep }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!step.media_url) { setUrl(null); return; }
    resolveStorageUrl(step.media_url).then(u => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [step.media_url]);

  if (step.type === "image" && url) {
    return <img src={url} alt="" className="w-12 h-12 rounded object-cover border border-border" />;
  }
  if (step.type === "audio" && url) {
    const Icon = STEP_META.audio.icon;
    return (
      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary">
        <Icon size={18} />
      </div>
    );
  }
  const Icon = STEP_META[step.type]?.icon || FileText;
  return (
    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary">
      <Icon size={18} />
    </div>
  );
}

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * dur;
    setTime(el.currentTime);
  };

  const progress = dur ? (time / dur) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 w-full">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={e => setDur(e.currentTarget.duration)}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(0); }}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors"
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="group relative h-5 flex items-center cursor-pointer"
          onClick={seek}
          role="slider"
          aria-label="Linha de reprodução"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(time)}
        >
          <div className="relative w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div
            className="absolute w-3 h-3 rounded-full bg-primary shadow ring-2 ring-background transition-transform group-hover:scale-110"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums mt-0.5">
          <span>{fmtTime(time)}</span>
          <span>{fmtTime(dur)}</span>
        </div>
      </div>
    </div>
  );
}

function AudioPreview({ step }: { step: QuickReplyStep }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!step.media_url) { setUrl(null); return; }
    resolveStorageUrl(step.media_url).then(u => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [step.media_url]);

  return (
    <div className="flex-1 min-w-0">
      {url ? <AudioPlayer src={url} /> : <div className="h-10 rounded-lg bg-muted animate-pulse" />}
      <p className="text-[10px] text-muted-foreground truncate mt-1">{step.media_filename || "áudio"}</p>
    </div>
  );
}

function RecordingWave({ stream }: { stream: MediaStream }) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = barsRef.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          const v = data[Math.floor((i * data.length) / bars.length)] / 255;
          (bars[i] as HTMLElement).style.height = `${Math.max(12, v * 100)}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); void ctx.close(); };
  }, [stream]);

  return (
    <div ref={barsRef} className="flex items-center gap-[3px] h-6 px-1" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-destructive transition-[height] duration-75"
          style={{ height: "12%" }}
        />
      ))}
    </div>
  );
}

export function QuickReplyDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { user } = useAuth();
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<QuickReplyStep[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const uploadTargetRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recStream, setRecStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    setShortcut(initial?.shortcut || "");
    setTitle(initial?.title || "");
    const loaded = quickReplySteps(initial).map(s => ({ ...s, id: s.id || newId() }));
    setSteps(loaded.length ? loaded : [{ id: newId(), type: "text", content: "", delay_seconds: 0 }]);
  }, [open, initial]);

  const patchStep = (id: string, patch: Partial<QuickReplyStep>) =>
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const addStep = (type: QuickReplyStep["type"]) =>
    setSteps(prev => [...prev, { id: newId(), type, content: "", delay_seconds: prev.length ? 3 : 0 }]);

  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const moveStep = (id: string, dir: -1 | 1) =>
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const insertAtCursor = (stepId: string, insertion: string) => {
    const el = textRefs.current[stepId];
    const step = steps.find(s => s.id === stepId);
    const current = step?.content || "";
    if (!el) { patchStep(stepId, { content: current + insertion }); return; }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + insertion + current.slice(end);
    patchStep(stepId, { content: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const uploadForStep = async (stepId: string, file: File) => {
    if (!user) return;
    setUploadingId(stepId);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/quick-replies/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      const type = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("video/") ? "video"
        : file.type.startsWith("audio/") ? "audio"
        : "document";
      patchStep(stepId, { type: type as QuickReplyStep["type"], media_url: data.publicUrl, media_filename: file.name });
    } catch (e: any) {
      toast.error("Erro no upload: " + (e?.message || "desconhecido"));
    } finally {
      setUploadingId(null);
    }
  };

  const startRecording = async (stepId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find(m => MediaRecorder.isTypeSupported?.(m)) || "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecStream(null);
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm";
        await uploadForStep(stepId, new File([blob], `audio-${Date.now()}.${ext}`, { type: mime }));
        setRecordingId(null);
      };
      recorderRef.current = rec;
      rec.start();
      setRecStream(stream);
      setRecordingId(stepId);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => recorderRef.current?.stop();

  const handleSave = async () => {
    if (!shortcut.trim()) { toast.error("Defina um atalho"); return; }
    if (!title.trim()) { toast.error("Defina um título para a mensagem rápida"); return; }
    const clean = steps
      .map(s => ({
        ...s,
        content: (s.content || "").trim() ? s.content : "",
        delay_seconds: Math.max(0, Math.min(600, Number(s.delay_seconds) || 0)),
      }))
      .filter(s => (s.type === "text" ? !!(s.content || "").trim() : !!s.media_url));
    if (clean.length === 0) { toast.error("Adicione ao menos uma mensagem com texto ou mídia"); return; }

    const firstText = clean.find(s => s.type === "text");
    const firstMedia = clean.find(s => s.type !== "text");

    setSaving(true);
    try {
      await onSubmit({
        shortcut: shortcut.replace(/^\/+/, "").trim(),
        title: title.trim() || null,
        content: firstText?.content || "",
        media_url: firstMedia?.media_url || null,
        media_type: firstMedia ? firstMedia.type : null,
        media_filename: firstMedia?.media_filename || null,
        steps: clean,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar mensagem rápida" : "Nova mensagem rápida"}</DialogTitle>
          <DialogDescription>
            Monte uma sequência: mensagem 1, 2, 3… cada uma pode ser texto, áudio, imagem, vídeo ou documento,
            com o atraso de envio que você escolher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Label className="text-xs">Atalho *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">/</span>
                <Input
                  value={shortcut}
                  onChange={e => setShortcut(e.target.value.replace(/\s/g, "").toLowerCase())}
                  placeholder="preco"
                  className="pl-7 font-mono"
                  maxLength={32}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Tabela de preços" maxLength={60} />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const Icon = STEP_META[step.type]?.icon || MessageSquareText;
              return (
                <div key={step.id} className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                      <Icon size={14} />
                    </div>
                    <span className="text-sm font-medium">Mensagem {idx + 1}</span>
                    <span className="text-[11px] text-muted-foreground">{STEP_META[step.type]?.label}</span>

                    <div className="ml-auto flex items-center gap-1">
                      {idx > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 mr-1 cursor-help">
                              <Clock size={13} className="text-muted-foreground" />
                              <Input
                                type="number"
                                min={0}
                                max={600}
                                value={step.delay_seconds ?? 0}
                                onChange={e => patchStep(step.id, { delay_seconds: Number(e.target.value) })}
                                className="h-7 w-[64px] text-xs"
                              />
                              <span className="text-[11px] text-muted-foreground">s</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Delay de envio: espera em segundos antes de enviar esta mensagem</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(step.id, -1)} disabled={idx === 0}>
                        <ArrowUp size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(step.id, 1)} disabled={idx === steps.length - 1}>
                        <ArrowDown size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStep(step.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {step.type === "text" ? (
                    <>
                      <div className="flex items-center justify-end">
                        <Popover open={emojiFor === step.id} onOpenChange={o => setEmojiFor(o ? step.id : null)}>
                          <PopoverTrigger asChild>
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 gap-1">
                              <Smile size={14} /> <span className="text-xs">Emoji</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="end" className="w-[320px] p-0">
                            <EmojiPicker className="h-[320px]" onEmojiSelect={({ emoji }) => insertAtCursor(step.id, emoji)}>
                              <EmojiPickerSearch placeholder="Pesquisar emoji" />
                              <EmojiPickerContent />
                            </EmojiPicker>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Textarea
                        ref={el => { textRefs.current[step.id] = el; }}
                        value={step.content || ""}
                        onChange={e => patchStep(step.id, { content: e.target.value })}
                        placeholder="Digite a mensagem… use *negrito*, _itálico_, ~riscado~ e variáveis como {{nome}}"
                        className="min-h-[110px] resize-y text-sm"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_REPLY_VARIABLES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            title={v.description}
                            onClick={() => insertAtCursor(step.id, `{{${v.key}}}`)}
                            className="px-2 py-1 rounded-md text-[11px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {`{{${v.key}}}`}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {step.media_url ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                          {step.type === "audio" ? (
                            <>
                              <AudioPreview step={step} />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => patchStep(step.id, { media_url: null, media_filename: null })}>
                                <X size={14} />
                              </Button>
                            </>
                          ) : (
                            <>
                              <MediaThumb step={step} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{step.media_filename || "anexo"}</p>
                                <p className="text-[10px] text-muted-foreground">{STEP_META[step.type]?.label}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => patchStep(step.id, { media_url: null, media_filename: null })}>
                                <X size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button" size="sm" variant="outline" className="gap-1.5"
                            disabled={uploadingId === step.id}
                            onClick={() => { uploadTargetRef.current = step.id; fileInputRef.current?.click(); }}
                          >
                            {uploadingId === step.id ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                            Enviar arquivo
                          </Button>
                          {step.type === "audio" && (
                            recordingId === step.id ? (
                              <>
                                <Button type="button" size="sm" variant="destructive" className="gap-1.5" onClick={stopRecording}>
                                  <Mic size={14} /> Parar gravação
                                </Button>
                                {recStream && <RecordingWave stream={recStream} />}
                              </>
                            ) : (
                              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void startRecording(step.id)}>
                                <Mic size={14} /> Gravar áudio
                              </Button>
                            )
                          )}
                        </div>
                      )}
                      {(step.type === "image" || step.type === "video" || step.type === "document") && (
                        <Input
                          value={step.content || ""}
                          onChange={e => patchStep(step.id, { content: e.target.value })}
                          placeholder="Legenda (opcional)"
                          className="text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={e => {
              const f = e.target.files?.[0];
              const target = uploadTargetRef.current;
              if (f && target) void uploadForStep(target, f);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap gap-2">
            {(["text", "audio", "image", "video", "document"] as const).map(t => {
              const Icon = STEP_META[t].icon;
              return (
                <Button key={t} type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => addStep(t)}>
                  <Plus size={13} /> <Icon size={13} /> {STEP_META[t].label}
                </Button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !!uploadingId}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {initial ? "Salvar alterações" : "Criar mensagem rápida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
