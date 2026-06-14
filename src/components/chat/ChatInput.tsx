import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Send, Smile, Mic, Plus, X, ImageIcon, FileText, Film, Trash2, MessageSquareText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerCategories, EmojiPickerContent } from "@/components/ui/emoji-picker";
import { ChatMessage } from "@/hooks/useChat";
import { useQuickReplies, applyQuickReplyVariables, type QuickReply } from "@/hooks/useQuickReplies";
import { useQuickReplyContext } from "@/hooks/useQuickReplyContext";
import { QuickReplyPicker } from "./QuickReplyPicker";

interface ChatInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  /** External files (e.g. dropped on the message area) — preview opens automatically */
  externalFiles?: File[];
  onExternalConsumed?: () => void;
  /** Current conversation context (for quick reply variable resolution) */
  conversation?: { contact_name?: string | null; contact_phone?: string | null } | null;
  /** Stable identifier used to persist the draft per conversation in localStorage */
  conversationId?: string | null;
}

interface AttachedFile {
  file: File;
  url: string;
  type: "image" | "video" | "document";
  id: string;
}

function fileTypeOf(file: File): "image" | "video" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function pickAudioMime(): { mime: string; ext: string } {
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c.mime)) return c;
  }
  return { mime: "audio/webm", ext: "webm" };
}

export function ChatInput({ onSendMessage, onSendMedia, replyingTo, onCancelReply, externalFiles, onExternalConsumed, conversation, conversationId }: ChatInputProps) {
  const draftKey = useMemo(() => {
    const id = conversationId || conversation?.contact_phone || null;
    return id ? `wiize:chat:draft:${id}` : null;
  }, [conversationId, conversation?.contact_phone]);
  const [text, setText] = useState<string>(() => {
    if (typeof window === "undefined" || !draftKey) return "";
    try { return window.localStorage.getItem(draftKey) || ""; } catch { return ""; }
  });
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>("smileys");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const [qrIdx, setQrIdx] = useState(0);
  const [confirmQr, setConfirmQr] = useState<QuickReply | null>(null);
  const [confirmPreview, setConfirmPreview] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioMimeRef = useRef<{ mime: string; ext: string }>({ mime: "audio/webm", ext: "webm" });
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  // Quick replies
  const { items: quickReplies } = useQuickReplies();
  const quickReplyCtx = useQuickReplyContext(conversation);
  const qrMatch = useMemo(() => {
    const m = text.match(/^\/([a-zA-Z0-9_\-]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [text]);
  const qrFiltered = useMemo(() => {
    if (qrMatch === null) return [];
    if (qrMatch === "") return quickReplies.slice(0, 8);
    return quickReplies.filter(q => q.shortcut.toLowerCase().startsWith(qrMatch)).slice(0, 8);
  }, [qrMatch, quickReplies]);
  const qrOpen = qrMatch !== null && qrFiltered.length > 0;

  useEffect(() => { setQrIdx(0); }, [qrMatch, qrFiltered.length]);

  // Load saved draft when the active conversation changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!draftKey) { setText(""); return; }
    try {
      const saved = window.localStorage.getItem(draftKey) || "";
      setText(saved);
    } catch { setText(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist draft on text change (debounced via microtask-free direct write — small payload)
  useEffect(() => {
    if (typeof window === "undefined" || !draftKey) return;
    try {
      if (text && text.length > 0) {
        window.localStorage.setItem(draftKey, text);
      } else {
        window.localStorage.removeItem(draftKey);
      }
    } catch {}
  }, [text, draftKey]);

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    const next: AttachedFile[] = files.map(f => ({
      file: f,
      url: f.type.startsWith("image/") || f.type.startsWith("video/") ? URL.createObjectURL(f) : "",
      type: fileTypeOf(f),
      id: crypto.randomUUID(),
    }));
    setAttachments(prev => {
      const merged = [...prev, ...next];
      setActiveIdx(merged.length - next.length);
      return merged;
    });
  }, []);

  // Consume externally dropped files
  useEffect(() => {
    if (externalFiles && externalFiles.length) {
      addFiles(externalFiles);
      onExternalConsumed?.();
    }
  }, [externalFiles, addFiles, onExternalConsumed]);

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const idx = prev.findIndex(a => a.id === id);
      const next = prev.filter(a => a.id !== id);
      if (idx <= activeIdx) setActiveIdx(Math.max(0, activeIdx - 1));
      const removed = prev[idx];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const clearAttachments = () => {
    attachments.forEach(a => a.url && URL.revokeObjectURL(a.url));
    setAttachments([]);
    setCaption("");
    setActiveIdx(0);
  };

  const handleSend = useCallback(() => {
    if (attachments.length) {
      // Send each file; caption attached to the first one (WhatsApp behavior)
      attachments.forEach((a, i) => {
        onSendMedia(a.file, i === 0 ? (caption || undefined) : undefined);
      });
      clearAttachments();
      return;
    }
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyingTo?.id);
    setText("");
    setEmojiOpen(false);
    onCancelReply?.();
    inputRef.current?.focus();
  }, [text, attachments, caption, onSendMessage, onSendMedia, replyingTo, onCancelReply]);

  const applyQuickReply = useCallback((qr: QuickReply) => {
    const resolved = applyQuickReplyVariables(qr.content || "", quickReplyCtx);
    setConfirmPreview(resolved);
    setConfirmQr(qr);
  }, [quickReplyCtx]);

  const handleConfirmSend = useCallback(async () => {
    if (!confirmQr) return;
    const qr = confirmQr;
    const resolved = confirmPreview;
    setConfirmQr(null);
    setText("");
    if (qr.media_url) {
      try {
        const res = await fetch(qr.media_url);
        const blob = await res.blob();
        const fname = qr.media_filename || `quick-reply-${qr.shortcut}`;
        const file = new File([blob], fname, { type: blob.type || "application/octet-stream" });
        onSendMedia(file, resolved || undefined);
      } catch (err) {
        console.error("[quick-reply] media fetch failed", err);
        if (resolved.trim()) onSendMessage(resolved, replyingTo?.id);
      }
    } else if (resolved.trim()) {
      onSendMessage(resolved, replyingTo?.id);
    }
    onCancelReply?.();
    inputRef.current?.focus();
  }, [confirmQr, confirmPreview, onSendMedia, onSendMessage, onCancelReply, replyingTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (qrOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setQrIdx(i => Math.min(i + 1, qrFiltered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setQrIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Escape") { e.preventDefault(); setText(""); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = qrFiltered[qrIdx];
        if (pick) void applyQuickReply(pick);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      e.preventDefault();
      addFiles(Array.from(items));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setShowAttach(false);
    addFiles(files);
    e.target.value = "";
  };

  // Waveform analyser loop
  const startWaveformLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const barHeight = Math.min(Math.max(rms * 4, 0.05), 1);
      setWaveformBars(prev => {
        const next = [...prev, barHeight];
        if (next.length > 240) next.shift();
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const picked = pickAudioMime();
      audioMimeRef.current = picked;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: picked.mime });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blobType = picked.mime.split(";")[0];
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        if (audioBlob.size > 0) {
          const audioFile = new File([audioBlob], `audio_${Date.now()}.${picked.ext}`, { type: blobType });
          onSendMedia(audioFile);
        }
        cleanupRecording();
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setWaveformBars([]);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      startWaveformLoop();
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const cleanupRecording = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setRecordingTime(0);
    setWaveformBars([]);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop(); } catch {}
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    setIsRecording(false);
    cleanupRecording();
    audioChunksRef.current = [];
  };

  const handleMicPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRecording) return;
    isHoldingRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      void startRecording();
    }, 250);
  };
  const handleMicPointerUp = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    if (isRecording && isHoldingRef.current) stopRecording();
    else if (!isRecording) void startRecording();
  };
  const handleMicPointerLeave = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".wa-attach-menu") && !target.closest(".wa-attach-btn")) setShowAttach(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      attachments.forEach(a => a.url && URL.revokeObjectURL(a.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollEmojiCategory = useCallback((id: string) => {
    setActiveEmojiCategory(id);
    setEmojiSearch("");

    const run = () => {
      const viewport = emojiViewportRef.current;
      if (!viewport) return false;

      const header = viewport.querySelector(`[data-category-id="${id}"]`) as HTMLElement | null;
      const category = header?.closest("[frimousse-category]") as HTMLElement | null;
      const target = category ?? header;
      if (!target) return false;

      viewport.scrollTo({ top: Math.max(target.offsetTop - 1, 0), behavior: "smooth" });
      return true;
    };

    requestAnimationFrame(() => {
      if (!run()) window.setTimeout(run, 120);
    });
  }, []);

  if (isRecording) {
    return (
      <div className="flex items-center gap-[8px] px-[12px] py-[6px]">
        <button onClick={cancelRecording} className="w-[42px] h-[42px] rounded-full flex items-center justify-center hover:bg-white/5 transition-colors shrink-0">
          <Trash2 size={20} className="text-red-400" />
        </button>
        <div className="flex-1 wa-input-field rounded-[21px] flex items-center gap-3 px-[16px] py-[10px] min-h-[46px] overflow-hidden">
          <div className="w-[10px] h-[10px] rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[14px] wa-text-primary font-mono min-w-[42px] shrink-0">{formatTime(recordingTime)}</span>
          <div className="flex-1 flex items-center justify-end gap-[2px] h-[28px] overflow-hidden">
            {waveformBars.slice(-200).map((bar, i) => (
              <div key={i} className="w-[3px] rounded-full wa-accent-bg shrink-0" style={{ height: `${Math.max(bar * 26, 3)}px` }} />
            ))}
          </div>
        </div>
        <button onClick={stopRecording} className="w-[42px] h-[42px] wa-accent-bg rounded-full flex items-center justify-center transition-colors shrink-0" title="Enviar áudio">
          <Send size={18} className="text-white ml-[1px]" />
        </button>
      </div>
    );
  }

  const active = attachments[activeIdx];

  return (
    <>
      {replyingTo && !attachments.length && (() => {
        const isSelf = replyingTo.direction === "outbound";
        const color = isSelf ? "#128c7e" : "#1f7aec";
        return (
          <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 rounded-t-xl wa-input-field">
            <div className="w-[3px] h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium" style={{ color }}>{isSelf ? "Você" : "Contato"}</p>
              <p className="text-[12px] wa-text-muted truncate">{replyingTo.content || "📎 Mídia"}</p>
            </div>
            <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-white/10">
              <X size={16} className="wa-icon-muted" />
            </button>
          </div>
        );
      })()}

      {/* Multi-attachment WhatsApp-style preview */}
      {attachments.length > 0 && (
        <div className="mx-3 mb-2 rounded-xl wa-input-field border wa-border-light overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b wa-border-light">
            <span className="text-[13px] wa-text-muted">
              {attachments.length === 1
                ? active?.file.name
                : `${attachments.length} arquivos`}
            </span>
            <button onClick={clearAttachments} className="p-1.5 rounded-full hover:bg-white/5">
              <X size={18} className="wa-icon-header" />
            </button>
          </div>

          {/* Active preview */}
          <div className="flex items-center justify-center bg-black/5 dark:bg-black/30 min-h-[260px] max-h-[420px] p-4">
            {active?.type === "image" && (
              <img src={active.url} alt="Preview" className="max-h-[380px] max-w-full rounded-lg object-contain" />
            )}
            {active?.type === "video" && (
              <video src={active.url} controls className="max-h-[380px] max-w-full rounded-lg" />
            )}
            {active?.type === "document" && (
              <div className="wa-doc-preview rounded-xl p-6 flex flex-col items-center gap-3 max-w-[340px]">
                <FileText size={56} className="wa-accent-text" />
                <span className="text-[14px] wa-text-primary text-center break-words">{active.file.name}</span>
                <span className="text-[12px] wa-text-muted">
                  {(active.file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            )}
          </div>

          {/* Caption + send */}
          <div className="flex items-end gap-3 px-4 py-3 border-t wa-border-light">
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-transparent wa-text-primary text-[14px] px-[12px] py-[10px] rounded-lg outline-none border-none placeholder:wa-text-muted"
              onKeyDown={e => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend} className="w-[44px] h-[44px] wa-accent-bg rounded-full flex items-center justify-center transition-colors shrink-0">
              <Send size={18} className="text-white ml-[2px]" />
            </button>
          </div>

          {/* Thumbnails + add more */}
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto wa-border-top">
            {attachments.map((a, idx) => (
              <button
                key={a.id}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  "relative w-[56px] h-[56px] rounded-lg overflow-hidden shrink-0 border-2 transition-all",
                  idx === activeIdx ? "wa-accent-border" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                {a.type === "image" && <img src={a.url} alt="" className="w-full h-full object-cover" />}
                {a.type === "video" && (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <Film size={22} className="text-white" />
                  </div>
                )}
                {a.type === "document" && (
                  <div className="w-full h-full wa-accent-bg-soft flex items-center justify-center">
                    <FileText size={22} className="wa-accent-text" />
                  </div>
                )}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); removeAttachment(a.id); }}
                  className="absolute top-0 right-0 w-[18px] h-[18px] bg-black/70 rounded-bl-md flex items-center justify-center"
                >
                  <X size={11} className="text-white" />
                </span>
              </button>
            ))}
            <button
              onClick={() => addMoreInputRef.current?.click()}
              className="w-[56px] h-[56px] rounded-lg shrink-0 border-2 border-dashed wa-accent-border-muted wa-accent-hover-bg-softer flex items-center justify-center transition-colors"
              title="Adicionar mais"
            >
              <Plus size={22} className="wa-accent-text" />
            </button>
            <input
              ref={addMoreInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {!attachments.length && (
        <div className="wa-composer-surface border-t wa-border-light">
          {quickReplies.length > 0 && !qrOpen && (
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-4 wa-composer-fade-left pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-10 wa-composer-fade-right pointer-events-none z-10" />
              <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-1 no-scrollbar scroll-smooth snap-x snap-mandatory">
                {quickReplies.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => void applyQuickReply(qr)}
                    title={qr.title || qr.shortcut}
                    className="shrink-0 snap-start inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  >
                    <MessageSquareText size={13} className="text-primary shrink-0" />
                    <span className="text-[12px] font-medium text-foreground whitespace-nowrap max-w-[140px] truncate">
                      {qr.title || qr.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-[6px] px-[12px] py-[6px] relative">
            {qrOpen && (
              <QuickReplyPicker
                items={qrFiltered}
                query={qrMatch || ""}
                activeIdx={qrIdx}
                onHover={setQrIdx}
                onSelect={(item) => void applyQuickReply(item)}
              />
            )}
            {showAttach && (
              <div className="wa-attach-menu absolute bottom-[60px] left-[20px] wa-attach-bg rounded-2xl shadow-2xl border wa-border-light p-3 flex gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                  <div className="w-[50px] h-[50px] rounded-2xl wa-accent-bg-soft ring-1 wa-accent-ring flex items-center justify-center  group-hover:scale-105 transition-all">
                    <ImageIcon size={22} className="wa-accent-text" strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] wa-text-muted font-medium">Fotos</span>
                </button>
                <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                  <div className="w-[50px] h-[50px] rounded-2xl wa-accent-bg-soft ring-1 wa-accent-ring flex items-center justify-center  group-hover:scale-105 transition-all">
                    <Film size={22} className="wa-accent-text" strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] wa-text-muted font-medium">Vídeo</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                  <div className="w-[50px] h-[50px] rounded-2xl wa-accent-bg-soft ring-1 wa-accent-ring flex items-center justify-center  group-hover:scale-105 transition-all">
                    <FileText size={22} className="wa-accent-text" strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] wa-text-muted font-medium">Arquivo</span>
                </button>
              </div>
            )}

            <div className="flex-1 wa-input-field flex items-end rounded-[21px] overflow-hidden border wa-input-border transition-all">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setEmojiOpen(false); }}
                className="wa-attach-btn p-[12px] shrink-0 self-end hover:opacity-70 transition-opacity"
              >
                <Plus size={22} className={cn("transition-transform duration-200", showAttach ? "wa-accent-text rotate-45" : "wa-icon-panel")} />
              </button>

              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <button className="p-[12px] pl-0 shrink-0 self-end hover:opacity-70 transition-opacity">
                    <Smile size={22} className={emojiOpen ? "wa-accent-text" : "wa-icon-panel"} />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  sideOffset={10}
                  className="w-[340px] p-0 rounded-xl border wa-border-light shadow-2xl bg-popover overflow-hidden"
                >
                  <EmojiPicker
                    className="h-[350px]"
                    onEmojiSelect={({ emoji }) => {
                      setText(prev => prev + emoji);
                      inputRef.current?.focus();
                    }}
                  >
                    <EmojiPickerCategories
                      activeCategoryId={activeEmojiCategory}
                      onCategoryClick={scrollEmojiCategory}
                    />
                    <EmojiPickerSearch
                      placeholder="Pesquisar emoji"
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                    />
                    <EmojiPickerContent ref={emojiViewportRef} onVisibleCategoryChange={setActiveEmojiCategory} />
                  </EmojiPicker>
                </PopoverContent>
              </Popover>

              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={(e) => {
                  setTimeout(() => {
                    try { (e.currentTarget as HTMLTextAreaElement)?.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
                  }, 250);
                }}
                placeholder="Digite uma mensagem"
                rows={1}
                className="flex-1 bg-transparent wa-text-primary text-[15px] pl-[4px] pr-[8px] py-[12px] outline-none resize-none max-h-[120px] overflow-y-auto leading-[20px] placeholder:wa-text-muted wa-scrollbar"
                style={{ minHeight: "24px" }}
              />

              {text.trim() ? (
                <button onClick={handleSend} className="p-[12px] shrink-0 self-end hover:opacity-70 transition-opacity">
                  <Send size={20} className="wa-accent-text" />
                </button>
              ) : (
                <button
                  onPointerDown={handleMicPointerDown}
                  onPointerUp={handleMicPointerUp}
                  onPointerLeave={handleMicPointerLeave}
                  onPointerCancel={handleMicPointerLeave}
                  className="p-[12px] shrink-0 self-end hover:opacity-70 transition-opacity select-none touch-none"
                  title="Toque para gravar · Segure para gravar"
                >
                  <Mic size={22} className="wa-icon-panel" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileSelect} />

      <Dialog
        open={!!confirmQr}
        onOpenChange={(open) => {
          if (!open) {
            setText("");
            setConfirmQr(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar mensagem rápida?</DialogTitle>
            <DialogDescription>
              Você está enviando a resposta{" "}
              <span className="font-medium text-primary">/{confirmQr?.shortcut}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground border border-border">
            {confirmPreview.length > 220 ? confirmPreview.slice(0, 220) + "…" : confirmPreview || "(sem texto)"}
            {confirmQr?.media_url && (
              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                Anexo: {confirmQr.media_filename || confirmQr.media_type}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setText("");
                setConfirmQr(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirmSend()}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
