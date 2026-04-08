import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Image, FileAudio, Video, FileText,
  Plus, X, Upload, Trash2, Play, Pause, Square, Mic,
  FileUp, GripVertical, Eye,
} from "lucide-react";

const AVAILABLE_VARIABLES = [
  { key: "{nome}", label: "Nome do contato" },
  { key: "{telefone}", label: "Telefone" },
  { key: "{email}", label: "Email" },
  { key: "{empresa}", label: "Empresa" },
  { key: "{cidade}", label: "Cidade" },
  { key: "{origem}", label: "Origem" },
  { key: "{data}", label: "Data atual" },
  { key: "{hora}", label: "Hora atual" },
];

const CONTENT_TYPES = [
  { value: "text", icon: MessageSquare, label: "Texto", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "image", icon: Image, label: "Imagem", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { value: "audio", icon: FileAudio, label: "Áudio", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { value: "video", icon: Video, label: "Vídeo", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { value: "document", icon: FileText, label: "Documento", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
];

// ===== DRAG & DROP UPLOAD =====
function MediaDropZone({
  accept,
  maxSizeMB,
  label,
  onFileSelected,
  currentUrl,
  onRemove,
  previewType,
  uploading,
}: {
  accept: string;
  maxSizeMB: number;
  label: string;
  onFileSelected: (file: File) => void;
  currentUrl?: string;
  onRemove?: () => void;
  previewType: "image" | "video" | "audio" | "document";
  uploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
          return;
        }
        onFileSelected(file);
      }
    },
    [maxSizeMB, onFileSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
        return;
      }
      onFileSelected(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  if (currentUrl) {
    return (
      <div className="space-y-2">
        {previewType === "image" && (
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
            <img src={currentUrl} alt="Preview" className="w-full max-h-48 object-contain" />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {previewType === "video" && (
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
            <video src={currentUrl} controls className="w-full max-h-48" />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {previewType === "document" && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <FileText size={20} className="text-amber-400 shrink-0" />
            <span className="text-xs text-foreground truncate flex-1">{currentUrl.split("/").pop()}</span>
            <button
              onClick={onRemove}
              className="w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {previewType === "audio" && (
          <div className="relative p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <audio src={currentUrl} controls className="w-full h-10" />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border/50 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Enviando...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center">
            <Upload size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground/60">Máx: {maxSizeMB}MB</p>
        </div>
      )}
    </div>
  );
}

// ===== AUDIO RECORDER =====
function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
      recording ? "border-red-500/40 bg-red-500/5" : "border-border/50 bg-muted/10"
    )}>
      <button
        onClick={recording ? stopRecording : startRecording}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
          recording
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        {recording ? <Square size={16} /> : <Mic size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">
          {recording ? "Gravando..." : "Gravar áudio"}
        </p>
        {recording ? (
          <p className="text-[10px] text-red-400 font-mono">{formatTime(seconds)}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">Clique para iniciar a gravação</p>
        )}
      </div>
      {recording && (
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
      )}
    </div>
  );
}

// ===== VARIABLES HELPER =====
function VariablesInline({ onInsert }: { onInsert?: (v: string) => void }) {
  return (
    <div className="p-2.5 rounded-lg border border-border/30 bg-muted/10">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">📌 Variáveis disponíveis:</p>
      <div className="flex flex-wrap gap-1">
        {AVAILABLE_VARIABLES.map((v) => (
          <Badge
            key={v.key}
            variant="secondary"
            className="text-[9px] px-1.5 py-0 h-5 font-mono cursor-pointer hover:bg-primary/20"
            onClick={() => {
              if (onInsert) onInsert(v.key);
              else navigator.clipboard.writeText(v.key);
            }}
            title={`Clique para copiar: ${v.key}`}
          >
            {v.key}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====
interface MessageContentBuilderProps {
  config: any;
  updateConfig: (key: string, value: any) => void;
}

export function MessageContentBuilder({ config, updateConfig }: MessageContentBuilderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("wa-flow-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("wa-flow-media").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + (err.message || "Tente novamente"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (url: string) => {
    if (!user || !url) return;
    try {
      const bucket = "wa-flow-media";
      const prefix = supabase.storage.from(bucket).getPublicUrl("").data.publicUrl;
      const path = url.replace(prefix, "");
      if (path) await supabase.storage.from(bucket).remove([path]);
    } catch {
      // silent fail on cleanup
    }
  };

  const handleMediaUpload = async (file: File, type: string) => {
    const url = await uploadFile(file, type);
    if (url) {
      updateConfig("message_type", type);
      updateConfig("media_url", url);
      updateConfig("media_filename", file.name);
      setActiveMenu(null);
    }
  };

  const handleAudioRecorded = async (blob: Blob) => {
    const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "audio/webm" });
    const url = await uploadFile(file, "audio");
    if (url) {
      updateConfig("message_type", "audio");
      updateConfig("media_url", url);
      updateConfig("media_filename", file.name);
      setActiveMenu(null);
    }
  };

  const handleRemoveMedia = () => {
    if (config.media_url) removeFile(config.media_url);
    updateConfig("media_url", "");
    updateConfig("media_filename", "");
  };

  const handleAddText = () => {
    updateConfig("message_type", "text");
    setActiveMenu(null);
  };

  const hasContent = config.message_type && (
    config.message_type === "text" ? !!config.content :
    !!config.media_url
  );

  return (
    <div className="space-y-4">
      {/* Content menu */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Adicionar conteúdo à mensagem</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.value}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all",
                activeMenu === ct.value
                  ? "border-primary bg-primary/10 text-primary scale-[1.02]"
                  : `border-border/30 hover:border-primary/30 text-muted-foreground hover:text-foreground`
              )}
              onClick={() => {
                if (ct.value === "text") {
                  handleAddText();
                } else {
                  setActiveMenu(activeMenu === ct.value ? null : ct.value);
                }
              }}
            >
              <ct.icon size={15} />
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active content type configuration */}
      {activeMenu === "image" && !config.media_url && (
        <div className="space-y-3 p-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 animate-in slide-in-from-top-2">
          <Label className="text-xs font-medium text-emerald-400">📷 Adicionar imagem</Label>
          <MediaDropZone
            accept="image/jpeg,image/png,image/webp,image/gif"
            maxSizeMB={5}
            label="Arraste ou clique para enviar uma imagem"
            onFileSelected={(f) => handleMediaUpload(f, "image")}
            previewType="image"
            uploading={uploading}
          />
          <p className="text-[10px] text-muted-foreground">Formatos: JPEG, PNG, WebP, GIF. Máx: 5MB</p>
        </div>
      )}

      {activeMenu === "audio" && !config.media_url && (
        <div className="space-y-3 p-3 rounded-xl border border-orange-400/20 bg-orange-400/5 animate-in slide-in-from-top-2">
          <Label className="text-xs font-medium text-orange-400">🎙️ Adicionar áudio</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">Gravar</p>
              <AudioRecorder onRecorded={handleAudioRecorded} />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">Enviar arquivo</p>
              <MediaDropZone
                accept="audio/ogg,audio/mpeg,audio/mp4,audio/webm,audio/wav"
                maxSizeMB={16}
                label="Arraste um áudio"
                onFileSelected={(f) => handleMediaUpload(f, "audio")}
                previewType="audio"
                uploading={uploading}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Formato recomendado: OGG/OPUS. Máx: 16MB</p>
        </div>
      )}

      {activeMenu === "video" && !config.media_url && (
        <div className="space-y-3 p-3 rounded-xl border border-purple-400/20 bg-purple-400/5 animate-in slide-in-from-top-2">
          <Label className="text-xs font-medium text-purple-400">🎬 Adicionar vídeo</Label>
          <MediaDropZone
            accept="video/mp4,video/webm"
            maxSizeMB={16}
            label="Arraste ou clique para enviar um vídeo"
            onFileSelected={(f) => {
              // Check duration via video element
              const video = document.createElement("video");
              video.preload = "metadata";
              video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                if (video.duration > 120) {
                  toast.error("O vídeo deve ter no máximo 2 minutos");
                  return;
                }
                handleMediaUpload(f, "video");
              };
              video.src = URL.createObjectURL(f);
            }}
            previewType="video"
            uploading={uploading}
          />
          <p className="text-[10px] text-muted-foreground">Formato: MP4, WebM. Máx: 2 minutos, 16MB</p>
        </div>
      )}

      {activeMenu === "document" && !config.media_url && (
        <div className="space-y-3 p-3 rounded-xl border border-amber-400/20 bg-amber-400/5 animate-in slide-in-from-top-2">
          <Label className="text-xs font-medium text-amber-400">📄 Adicionar documento</Label>
          <MediaDropZone
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            maxSizeMB={20}
            label="Arraste ou clique para enviar um documento"
            onFileSelected={(f) => handleMediaUpload(f, "document")}
            previewType="document"
            uploading={uploading}
          />
          <p className="text-[10px] text-muted-foreground">Formatos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX. Máx: 20MB</p>
        </div>
      )}

      {/* ===== CONFIGURED CONTENT DISPLAY ===== */}
      {config.message_type && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <Label className="text-xs font-medium">Conteúdo configurado</Label>
          </div>

          {/* TEXT */}
          {config.message_type === "text" && (
            <div className="space-y-3">
              <Textarea
                value={config.content || ""}
                onChange={(e) => updateConfig("content", e.target.value)}
                placeholder="Olá {nome}! Como posso te ajudar?&#10;&#10;Use variáveis para personalizar"
                className="text-sm min-h-[100px]"
              />
              <VariablesInline />
            </div>
          )}

          {/* IMAGE */}
          {config.message_type === "image" && config.media_url && (
            <div className="space-y-3">
              <MediaDropZone
                accept="image/*"
                maxSizeMB={5}
                label=""
                onFileSelected={(f) => handleMediaUpload(f, "image")}
                currentUrl={config.media_url}
                onRemove={handleRemoveMedia}
                previewType="image"
                uploading={uploading}
              />
              <div className="space-y-2">
                <Label className="text-xs">Legenda (texto da imagem)</Label>
                <Textarea
                  value={config.caption || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  placeholder="Texto que acompanha a imagem..."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <VariablesInline />
            </div>
          )}

          {/* AUDIO */}
          {config.message_type === "audio" && config.media_url && (
            <div className="space-y-3">
              <MediaDropZone
                accept="audio/*"
                maxSizeMB={16}
                label=""
                onFileSelected={(f) => handleMediaUpload(f, "audio")}
                currentUrl={config.media_url}
                onRemove={handleRemoveMedia}
                previewType="audio"
                uploading={uploading}
              />
            </div>
          )}

          {/* VIDEO */}
          {config.message_type === "video" && config.media_url && (
            <div className="space-y-3">
              <MediaDropZone
                accept="video/*"
                maxSizeMB={16}
                label=""
                onFileSelected={(f) => handleMediaUpload(f, "video")}
                currentUrl={config.media_url}
                onRemove={handleRemoveMedia}
                previewType="video"
                uploading={uploading}
              />
              <div className="space-y-2">
                <Label className="text-xs">Legenda (texto do vídeo)</Label>
                <Textarea
                  value={config.caption || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  placeholder="Texto que acompanha o vídeo..."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <VariablesInline />
            </div>
          )}

          {/* DOCUMENT */}
          {config.message_type === "document" && config.media_url && (
            <div className="space-y-3">
              <MediaDropZone
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                maxSizeMB={20}
                label=""
                onFileSelected={(f) => handleMediaUpload(f, "document")}
                currentUrl={config.media_url}
                onRemove={handleRemoveMedia}
                previewType="document"
                uploading={uploading}
              />
              <div className="space-y-2">
                <Label className="text-xs">Nome do arquivo</Label>
                <Input
                  value={config.filename || config.media_filename || ""}
                  onChange={(e) => updateConfig("filename", e.target.value)}
                  placeholder="proposta-comercial.pdf"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Legenda (texto do documento)</Label>
                <Textarea
                  value={config.caption || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  placeholder="Texto que acompanha o documento..."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <VariablesInline />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
