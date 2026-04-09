import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Mic, Plus, X, Image, FileText, Film } from "lucide-react";
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

export function ChatInput({ onSendMessage, onSendMedia, replyingTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
        onSendMedia(audioFile);
        stream.getTracks().forEach(t => t.stop());
        setRecordingTime(0);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "22px";
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

  const isMultiline = false; // Always keep rounded-full

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={cancelRecording} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={22} className="text-red-400" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[15px] wa-text-primary font-mono">{formatTime(recordingTime)}</span>
          <div className="flex-1 h-[4px] rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-red-500/60 rounded-full animate-pulse" style={{ width: `${Math.min((recordingTime / 120) * 100, 100)}%` }} />
          </div>
        </div>
        <button onClick={stopRecording} className="w-[42px] h-[42px] bg-[#00a884] hover:bg-[#06cf9c] rounded-full flex items-center justify-center transition-colors">
          <Send size={18} className="text-white ml-[1px]" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Reply preview bar */}
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

      {/* File preview overlay */}
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

      {/* Floating input bar — WhatsApp style */}
      {!preview && (
        <div className="flex items-end gap-[6px] px-[12px] py-[6px] relative">
          {/* Attach menu */}
          {showAttach && (
            <div className="wa-attach-menu absolute bottom-[60px] left-[20px] wa-attach-bg rounded-2xl shadow-2xl border wa-border-light p-3 flex gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-full bg-[#7f66ff] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Image size={22} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Fotos</span>
              </button>
              <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-full bg-[#ff5e79] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Film size={22} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Vídeo</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-[6px] group">
                <div className="w-[50px] h-[50px] rounded-full bg-[#5f66cd] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <FileText size={22} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted font-medium">Arquivo</span>
              </button>
            </div>
          )}

          {/* Main pill — everything inside */}
          <div className="flex-1 wa-input-field flex items-end shadow-sm rounded-full">
            {/* Attach */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setEmojiOpen(false); }}
              className="wa-attach-btn p-[9px] shrink-0 self-end hover:opacity-70 transition-opacity"
            >
              <Plus size={22} className={cn("transition-transform duration-200", showAttach ? "text-[#00a884] rotate-45" : "wa-icon-panel")} />
            </button>

            {/* Emoji */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button className="p-[9px] shrink-0 self-end hover:opacity-70 transition-opacity">
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
                        if (headers[idx]) {
                          headers[idx].scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }
                    }}
                  />
                  <EmojiPickerSearch placeholder="Pesquisar emoji" />
                  <EmojiPickerContent onVisibleCategoryChange={setActiveEmojiCategory} />
                </EmojiPicker>
              </PopoverContent>
            </Popover>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              rows={1}
              className="flex-1 bg-transparent wa-text-primary text-[15px] pl-[2px] pr-[6px] py-[10px] outline-none resize-none max-h-[120px] overflow-y-auto leading-[20px] placeholder:wa-text-muted wa-scrollbar"
              style={{ minHeight: "22px" }}
            />

            {/* Mic/Send — inside pill */}
            {text.trim() ? (
              <button onClick={handleSend} className="p-[9px] shrink-0 self-end hover:opacity-70 transition-opacity">
                <Send size={20} className="text-[#00a884]" />
              </button>
            ) : (
              <button onClick={startRecording} className="p-[9px] shrink-0 self-end hover:opacity-70 transition-opacity">
                <Mic size={22} className="wa-icon-panel" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e, "video")} />
    </>
  );
}
