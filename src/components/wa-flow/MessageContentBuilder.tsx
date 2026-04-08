import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Image, FileAudio, Video, FileText,
  X, Upload, Trash2, Play, Pause, Square, Mic,
  Clock, Shuffle,
} from "lucide-react";

// ===== CONTENT TYPES (3x2 grid) =====
const CONTENT_TYPES = [
  { value: "text", icon: MessageSquare, label: "Texto" },
  { value: "image", icon: Image, label: "Imagem" },
  { value: "audio", icon: FileAudio, label: "Áudio" },
  { value: "video", icon: Video, label: "Vídeo" },
  { value: "document", icon: FileText, label: "Documento" },
  { value: "delay", icon: Clock, label: "Delay" },
];

const MAX_CONTENT_ITEMS = 5; // delay doesn't count

interface ContentItem {
  id: string;
  type: "text" | "image" | "audio" | "video" | "document" | "delay";
  content?: string;
  caption?: string;
  media_url?: string;
  media_filename?: string;
  delay_seconds?: number;
  delay_min?: number;
  delay_max?: number;
}

// ===== CUSTOM AUDIO PLAYER =====
function CustomAudioPlayer({ src, onRemove }: { src: string; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-1.5 rounded-full bg-muted/40 cursor-pointer relative overflow-hidden" onClick={seek}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ===== DRAG & DROP UPLOAD =====
function MediaDropZone({
  accept, maxSizeMB, label, onFileSelected, uploading,
}: {
  accept: string; maxSizeMB: number; label: string;
  onFileSelected: (file: File) => void; uploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) { toast.error(`Máximo: ${maxSizeMB}MB`); return; }
      onFileSelected(file);
    }
  }, [maxSizeMB, onFileSelected]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
        isDragging
          ? "border-primary/40 bg-primary/5"
          : "border-muted-foreground/20 bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          if (file.size > maxSizeMB * 1024 * 1024) { toast.error(`Máximo: ${maxSizeMB}MB`); return; }
          onFileSelected(file);
        }
        if (inputRef.current) inputRef.current.value = "";
      }} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Enviando...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Upload size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground/60">Máx: {maxSizeMB}MB</p>
        </div>
      )}
    </div>
  );
}

// ===== AUDIO RECORDER WITH WAVEFORM =====
function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(new Array(20).fill(4));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob);
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
      };

      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);

      const updateWave = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bars = Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor((i / 20) * data.length);
          return Math.max(4, (data[idx] / 255) * 28);
        });
        setWaveformLevels(bars);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setWaveformLevels(new Array(20).fill(4));
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      onClick={recording ? stopRecording : startRecording}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center gap-3",
        recording
          ? "border-red-500/30 bg-red-500/5"
          : "border-muted-foreground/20 bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/30"
      )}
    >
      {recording ? (
        <>
          <div className="flex items-center gap-[2px] h-8">
            {waveformLevels.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-red-400 transition-all duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-400">{fmt(seconds)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Clique para parar</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Mic size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Gravar áudio</p>
          <p className="text-[10px] text-muted-foreground/60">Clique para iniciar</p>
        </>
      )}
    </div>
  );
}

// ===== CONTENT ITEM EDITOR =====
function ContentItemEditor({
  item, onUpdate, onRemove, uploading, onUpload, onAudioRecorded,
}: {
  item: ContentItem;
  onUpdate: (key: string, value: any) => void;
  onRemove: () => void;
  uploading: boolean;
  onUpload: (file: File, type: string) => Promise<string | null>;
  onAudioRecorded: (blob: Blob) => Promise<string | null>;
}) {
  const typeConfig: Record<string, { label: string; icon: any }> = {
    text: { label: "Texto", icon: MessageSquare },
    image: { label: "Imagem", icon: Image },
    audio: { label: "Áudio", icon: FileAudio },
    video: { label: "Vídeo", icon: Video },
    document: { label: "Documento", icon: FileText },
    delay: { label: "Delay Inteligente", icon: Shuffle },
  };

  const cfg = typeConfig[item.type] || typeConfig.text;
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-muted-foreground" />
          <span className="text-[11px] font-medium text-foreground">{cfg.label}</span>
        </div>
        <button onClick={onRemove} className="w-6 h-6 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* TEXT */}
        {item.type === "text" && (
          <Textarea
            value={item.content || ""}
            onChange={(e) => onUpdate("content", e.target.value)}
            placeholder="Olá {nome}! Como posso te ajudar?"
            className="text-sm min-h-[80px] bg-background/50"
          />
        )}

        {/* IMAGE */}
        {item.type === "image" && (
          <>
            {item.media_url ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-border/40 bg-muted/20">
                  <img src={item.media_url} alt="Preview" className="w-full max-h-40 object-contain" />
                  <button
                    onClick={() => { onUpdate("media_url", ""); onUpdate("media_filename", ""); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <Textarea
                  value={item.caption || ""}
                  onChange={(e) => onUpdate("caption", e.target.value)}
                  placeholder="Legenda da imagem..."
                  className="text-sm min-h-[50px] bg-background/50"
                />
              </div>
            ) : (
              <MediaDropZone
                accept="image/jpeg,image/png,image/webp,image/gif"
                maxSizeMB={5}
                label="Arraste ou clique para enviar"
                onFileSelected={async (f) => {
                  const url = await onUpload(f, "image");
                  if (url) { onUpdate("media_url", url); onUpdate("media_filename", f.name); }
                }}
                uploading={uploading}
              />
            )}
          </>
        )}

        {/* AUDIO */}
        {item.type === "audio" && (
          <>
            {item.media_url ? (
              <CustomAudioPlayer src={item.media_url} onRemove={() => { onUpdate("media_url", ""); onUpdate("media_filename", ""); }} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <AudioRecorder onRecorded={async (blob) => {
                  const url = await onAudioRecorded(blob);
                  if (url) { onUpdate("media_url", url); onUpdate("media_filename", `gravacao-${Date.now()}.webm`); }
                }} />
                <MediaDropZone
                  accept="audio/ogg,audio/mpeg,audio/mp4,audio/webm,audio/wav"
                  maxSizeMB={16}
                  label="Enviar arquivo"
                  onFileSelected={async (f) => {
                    const url = await onUpload(f, "audio");
                    if (url) { onUpdate("media_url", url); onUpdate("media_filename", f.name); }
                  }}
                  uploading={uploading}
                />
              </div>
            )}
          </>
        )}

        {/* VIDEO */}
        {item.type === "video" && (
          <>
            {item.media_url ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-border/40 bg-muted/20">
                  <video src={item.media_url} controls className="w-full max-h-40" />
                  <button
                    onClick={() => { onUpdate("media_url", ""); onUpdate("media_filename", ""); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <Textarea
                  value={item.caption || ""}
                  onChange={(e) => onUpdate("caption", e.target.value)}
                  placeholder="Legenda do vídeo..."
                  className="text-sm min-h-[50px] bg-background/50"
                />
              </div>
            ) : (
              <MediaDropZone
                accept="video/mp4,video/webm"
                maxSizeMB={50}
                label="Arraste ou clique para enviar"
                onFileSelected={async (f) => {
                  const video = document.createElement("video");
                  video.preload = "metadata";
                  video.onloadedmetadata = async () => {
                    URL.revokeObjectURL(video.src);
                    if (video.duration > 120) { toast.error("Máximo 2 minutos"); return; }
                    const url = await onUpload(f, "video");
                    if (url) { onUpdate("media_url", url); onUpdate("media_filename", f.name); }
                  };
                  video.src = URL.createObjectURL(f);
                }}
                uploading={uploading}
              />
            )}
          </>
        )}

        {/* DOCUMENT */}
        {item.type === "document" && (
          <>
            {item.media_url ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
                  <FileText size={18} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{item.media_filename || "Documento"}</span>
                  <button
                    onClick={() => { onUpdate("media_url", ""); onUpdate("media_filename", ""); }}
                    className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
                <Textarea
                  value={item.caption || ""}
                  onChange={(e) => onUpdate("caption", e.target.value)}
                  placeholder="Legenda do documento..."
                  className="text-sm min-h-[50px] bg-background/50"
                />
              </div>
            ) : (
              <MediaDropZone
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                maxSizeMB={20}
                label="Arraste ou clique para enviar"
                onFileSelected={async (f) => {
                  const url = await onUpload(f, "document");
                  if (url) { onUpdate("media_url", url); onUpdate("media_filename", f.name); }
                }}
                uploading={uploading}
              />
            )}
          </>
        )}

        {/* DELAY - Smart with min/max */}
        {item.type === "delay" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-[11px] text-muted-foreground shrink-0 w-8">Mín</Label>
                <Input
                  type="number"
                  min={5}
                  value={item.delay_min ?? item.delay_seconds ?? 5}
                  onChange={(e) => {
                    const v = Math.max(5, parseInt(e.target.value) || 5);
                    onUpdate("delay_min", v);
                    if (v > (item.delay_max ?? v)) onUpdate("delay_max", v);
                  }}
                  className="h-8 text-sm bg-background/50"
                />
                <span className="text-[10px] text-muted-foreground shrink-0">s</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-[11px] text-muted-foreground shrink-0 w-8">Máx</Label>
                <Input
                  type="number"
                  min={item.delay_min ?? 5}
                  value={item.delay_max ?? item.delay_seconds ?? 10}
                  onChange={(e) => {
                    const min = item.delay_min ?? 5;
                    const v = Math.max(min, parseInt(e.target.value) || min);
                    onUpdate("delay_max", v);
                  }}
                  className="h-8 text-sm bg-background/50"
                />
                <span className="text-[10px] text-muted-foreground shrink-0">s</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
              <Shuffle size={10} className="shrink-0" />
              O sistema escolherá um tempo aleatório entre o mínimo e o máximo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Helper: compute send groups =====
function computeGroups(contents: ContentItem[]): number[] {
  // Assign a group number to each item. Items separated by a delay belong to different groups.
  // Delay items themselves get their own "separator" group (rendered differently).
  const groups: number[] = [];
  let g = 1;
  for (let i = 0; i < contents.length; i++) {
    if (contents[i].type === "delay") {
      groups.push(-1); // separator marker
      g++;
    } else {
      groups.push(g);
    }
  }
  return groups;
}

// ===== MAIN COMPONENT =====
interface MessageContentBuilderProps {
  config: any;
  updateConfig: (key: string, value: any) => void;
}

export function MessageContentBuilder({ config, updateConfig }: MessageContentBuilderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const contents: ContentItem[] = config.contents || [];

  const setContents = (newContents: ContentItem[]) => {
    updateConfig("contents", newContents);
  };

  const contentCount = contents.filter(c => c.type !== "delay").length;

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("wa-flow-media").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("wa-flow-media").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || "Tente novamente"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAudioRecorded = async (blob: Blob): Promise<string | null> => {
    const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "audio/webm" });
    return await uploadFile(file, "audio");
  };

  const addContent = (type: ContentItem["type"]) => {
    if (type !== "delay" && contentCount >= MAX_CONTENT_ITEMS) {
      toast.error(`Máximo de ${MAX_CONTENT_ITEMS} conteúdos por mensagem (delay não conta)`);
      return;
    }
    const newItem: ContentItem = {
      id: `${type}-${Date.now()}`,
      type,
      ...(type === "delay" ? { delay_min: 5, delay_max: 15 } : {}),
    };
    setContents([...contents, newItem]);
  };

  const updateItem = (id: string, key: string, value: any) => {
    setContents(contents.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const removeItem = (id: string) => {
    const item = contents.find(c => c.id === id);
    if (item?.media_url) {
      try {
        const bucket = "wa-flow-media";
        const prefix = supabase.storage.from(bucket).getPublicUrl("").data.publicUrl;
        const path = item.media_url.replace(prefix, "");
        if (path) supabase.storage.from(bucket).remove([path]);
      } catch { /* silent */ }
    }
    setContents(contents.filter(c => c.id !== id));
  };

  const groups = computeGroups(contents);
  // Build content number (only non-delay items are numbered)
  let contentNum = 0;
  const contentNumbers = contents.map(c => {
    if (c.type !== "delay") { contentNum++; return contentNum; }
    return -1;
  });

  return (
    <div className="space-y-4">
      {/* Content type grid - 3x2 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Adicionar conteúdo</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {CONTENT_TYPES.map((ct) => {
            const disabled = ct.value !== "delay" && contentCount >= MAX_CONTENT_ITEMS;
            return (
              <button
                key={ct.value}
                disabled={disabled}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-[10px] transition-all",
                  disabled
                    ? "border-border/20 text-muted-foreground/40 cursor-not-allowed"
                    : "border-border/30 hover:border-primary/30 text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
                onClick={() => addContent(ct.value as ContentItem["type"])}
              >
                <ct.icon size={15} />
                {ct.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Use variáveis como {"{nome}"}, {"{telefone}"}, {"{empresa}"}, {"{email}"}, {"{cidade}"}, {"{data}"}, {"{hora}"} ou crie as suas. • {contentCount}/{MAX_CONTENT_ITEMS} conteúdos
        </p>
      </div>

      {/* Content items list */}
      {contents.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <Label className="text-xs font-medium">Conteúdos ({contents.length})</Label>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-3">
            Conteúdos contínuos são enviados juntos. Adicione delay para separar envios.
          </p>
          <div className="space-y-1.5">
            {contents.map((item, index) => {
              const isDelay = item.type === "delay";
              const num = contentNumbers[index];

              // Check if this starts a new send group
              const prevIsDelay = index > 0 && contents[index - 1].type === "delay";
              const isFirstInGroup = index === 0 || prevIsDelay;
              const nextIsDelay = index < contents.length - 1 && contents[index + 1].type === "delay";
              const isLastInGroup = index === contents.length - 1 || nextIsDelay;

              if (isDelay) {
                return (
                  <div key={item.id} className="relative py-1">
                    {/* Delay separator line */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border/40" />
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/30 border border-border/30">
                        <Clock size={10} className="text-muted-foreground/60" />
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                          {item.delay_min ?? item.delay_seconds ?? 5}s – {item.delay_max ?? item.delay_seconds ?? 10}s
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                    {/* Hidden editor - click to expand */}
                    <div className="mt-1.5">
                      <ContentItemEditor
                        item={item}
                        onUpdate={(key, value) => updateItem(item.id, key, value)}
                        onRemove={() => removeItem(item.id)}
                        uploading={uploading}
                        onUpload={uploadFile}
                        onAudioRecorded={handleAudioRecorded}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="relative flex items-start gap-2.5">
                  {/* Green numbered circle */}
                  <div className="flex flex-col items-center pt-3 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-400">{num}</span>
                    </div>
                    {/* Connecting line to next item in same group */}
                    {!isLastInGroup && (
                      <div className="w-px h-full min-h-[8px] bg-emerald-500/20 mt-1" />
                    )}
                  </div>
                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    <ContentItemEditor
                      item={item}
                      onUpdate={(key, value) => updateItem(item.id, key, value)}
                      onRemove={() => removeItem(item.id)}
                      uploading={uploading}
                      onUpload={uploadFile}
                      onAudioRecorded={handleAudioRecorded}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
