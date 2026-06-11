import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Mic, Plus, X, ImageIcon, FileText, Film, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerCategories, EmojiPickerContent } from "@/components/ui/emoji-picker";
import { ChatMessage } from "@/hooks/useChat";

interface ChatInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

// Pick the best supported mime — Meta accepts audio/ogg (opus) and audio/mp4.
// audio/webm is NOT supported by Meta Cloud API. Always prefer ogg/opus.
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

export function ChatInput({ onSendMessage, onSendMedia, replyingTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioMimeRef = useRef<{ mime: string; ext: string }>({ mime: "audio/webm", ext: "webm" });
  // Press tracking: differentiate tap vs hold (whatsapp-style)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  const handleSend = useCallback(() => {
    if (preview) {
      onSendMedia(preview.file, caption || undefined);
      setPreview(null);
      setCaption("");
      return;
    }
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyingTo?.id);
    setText("");
    setEmojiOpen(false);
    onCancelReply?.();
    inputRef.current?.focus();
  }, [text, preview, caption, onSendMessage, onSendMedia, replyingTo, onCancelReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttach(false);
    if (type === "image" || type === "video") {
      const url = URL.createObjectURL(file);
      setPreview({ file, url, type });
    } else {
      setPreview({ file, url: "", type: "document" });
    }
    e.target.value = "";
  };

  // Waveform analyser loop — responsive (uses container width)
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
        // Cap at 240 bars (~2min @120bpm sampling) — display layer clamps to width
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
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blobType = picked.mime.split(";")[0]; // strip codecs for File
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        if (audioBlob.size > 0) {
          const audioFile = new File([audioBlob], `audio_${Date.now()}.${picked.ext}`, { type: blobType });
          onSendMedia(audioFile);
        }
        cleanupRecording();
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // get periodic data
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

  // Mic button behavior (WhatsApp-style):
  //  - tap (release < 250ms, no hold): start recording — tap again to send
  //  - hold (press > 250ms): record while held — release to send
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
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (isRecording && isHoldingRef.current) {
      // Was a hold-to-record gesture: release sends
      stopRecording();
    } else if (!isRecording) {
      // Was a tap: start recording (toggle mode)
      void startRecording();
    }
  };
  const handleMicPointerLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
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
    };
  }, []);

  // Recording UI — WhatsApp style with responsive waveform
  if (isRecording) {
    return (
      <div className="flex items-center gap-[8px] px-[12px] py-[6px]">
        <button
          onClick={cancelRecording}
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center hover:bg-white/5 transition-colors shrink-0"
        >
          <Trash2 size={20} className="text-red-400" />
        </button>

        <div className="flex-1 wa-input-field rounded-[21px] flex items-center gap-3 px-[16px] py-[10px] min-h-[46px] overflow-hidden">
          <div className="w-[10px] h-[10px] rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[14px] wa-text-primary font-mono min-w-[42px] shrink-0">{formatTime(recordingTime)}</span>

          {/* Responsive waveform — fills available width */}
          <div className="flex-1 flex items-center justify-end gap-[2px] h-[28px] overflow-hidden">
            {waveformBars.slice(-200).map((bar, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-[#00a884] shrink-0"
                style={{ height: `${Math.max(bar * 26, 3)}px` }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={stopRecording}
          className="w-[42px] h-[42px] bg-[#00a884] hover:bg-[#06cf9c] rounded-full flex items-center justify-center transition-colors shrink-0"
          title="Enviar áudio"
        >
          <Send size={18} className="text-white ml-[1px]" />
        </button>
      </div>
    );
  }

  return (
    <>
      {replyingTo && (
        <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 rounded-t-xl wa-input-field">
          <div className="w-[3px] h-8 rounded-full bg-[#00a884] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#00a884] font-medium">
              {replyingTo.direction === "outbound" ? "Você" : "Contato"}
            </p>
            <p className="text-[12px] wa-text-muted truncate">{replyingTo.content || "📎 Mídia"}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-white/10">
            <X size={16} className="wa-icon-muted" />
          </button>
        </div>
      )}

      {preview && (
        <div className="mx-4 mb-2 rounded-xl wa-input-field border wa-border-light overflow-hidden">
          <div className="flex items-end gap-3 px-4 py-3">
            <div className="flex-1 flex flex-col items-center">
              {preview.type === "image" && (
                <img src={preview.url} alt="Preview" className="max-h-[250px] rounded-[6px] object-contain mb-3" />
              )}
              {preview.type === "video" && (
                <video src={preview.url} controls className="max-h-[250px] rounded-[6px] mb-3" />
              )}
              {preview.type === "document" && (
                <div className="wa-doc-preview rounded-xl p-4 flex items-center gap-3 mb-3 w-full max-w-[300px]">
                  <FileText size={28} className="text-[#00a884] shrink-0" />
                  <span className="text-[14px] wa-text-primary truncate">{preview.file.name}</span>
                </div>
              )}
              {preview.type !== "document" && (
                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Adicionar legenda..."
                  className="w-full bg-transparent wa-text-primary text-[14px] px-[12px] py-[9px] rounded-lg outline-none border-none placeholder:wa-text-muted"
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <button onClick={() => { setPreview(null); setCaption(""); }} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X size={20} className="wa-icon-header" />
              </button>
              <button onClick={handleSend} className="w-[42px] h-[42px] bg-[#00a884] hover:bg-[#06cf9c] rounded-full flex items-center justify-center transition-colors">
                <Send size={18} className="text-white ml-[2px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!preview && (
        <div className="flex items-end gap-[6px] px-[12px] py-[6px] relative">
          {showAttach && (
            <div className="wa-attach-menu absolute bottom-[60px] left-[20px] wa-attach-bg rounded-2xl shadow-2xl border wa-border-light p-3 flex gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-2xl bg-[#00a884]/15 ring-1 ring-[#00a884]/30 flex items-center justify-center group-hover:bg-[#00a884]/25 group-hover:scale-105 transition-all">
                  <ImageIcon size={22} className="text-[#00a884]" strokeWidth={1.8} />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Fotos</span>
              </button>
              <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-2xl bg-[#00a884]/15 ring-1 ring-[#00a884]/30 flex items-center justify-center group-hover:bg-[#00a884]/25 group-hover:scale-105 transition-all">
                  <Film size={22} className="text-[#00a884]" strokeWidth={1.8} />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Vídeo</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-2xl bg-[#00a884]/15 ring-1 ring-[#00a884]/30 flex items-center justify-center group-hover:bg-[#00a884]/25 group-hover:scale-105 transition-all">
                  <FileText size={22} className="text-[#00a884]" strokeWidth={1.8} />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Arquivo</span>
              </button>
            </div>
          )}

          <div className="flex-1 wa-input-field flex items-end shadow-sm rounded-[21px] overflow-hidden">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setEmojiOpen(false); }}
              className="wa-attach-btn p-[12px] shrink-0 self-end hover:opacity-70 transition-opacity"
            >
              <Plus size={22} className={cn("transition-transform duration-200", showAttach ? "text-[#00a884] rotate-45" : "wa-icon-panel")} />
            </button>

            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button className="p-[12px] pl-0 shrink-0 self-end hover:opacity-70 transition-opacity">
                  <Smile size={22} className={emojiOpen ? "text-[#00a884]" : "wa-icon-panel"} />
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
                    activeCategory={activeEmojiCategory}
                    onCategoryClick={(idx) => {
                      setActiveEmojiCategory(idx);
                      const popoverEl = document.querySelector('[data-radix-popper-content-wrapper] [class*="outline-none"]');
                      if (popoverEl) {
                        const headers = popoverEl.querySelectorAll("[data-category-header]");
                        if (headers[idx]) headers[idx].scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  />
                  <EmojiPickerSearch placeholder="Pesquisar emoji" />
                  <EmojiPickerContent onVisibleCategoryChange={setActiveEmojiCategory} />
                </EmojiPicker>
              </PopoverContent>
            </Popover>

            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              rows={1}
              className="flex-1 bg-transparent wa-text-primary text-[15px] pl-[4px] pr-[8px] py-[12px] outline-none resize-none max-h-[120px] overflow-y-auto leading-[20px] placeholder:wa-text-muted wa-scrollbar"
              style={{ minHeight: "24px" }}
            />

            {text.trim() ? (
              <button onClick={handleSend} className="p-[12px] shrink-0 self-end hover:opacity-70 transition-opacity">
                <Send size={20} className="text-[#00a884]" />
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
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e, "video")} />
    </>
  );
}
