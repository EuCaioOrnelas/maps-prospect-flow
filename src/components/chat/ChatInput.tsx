import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Mic, MicOff, Plus, X, Image, FileText, Film, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerCategories, EmojiPickerContent, CATEGORIES } from "@/components/ui/emoji-picker";
import { ChatMessage } from "@/hooks/useChat";

interface ChatInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export function ChatInput({ onSendMessage, onSendMedia, replyingTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
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

  // Audio recording
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
      inputRef.current.style.height = "20px";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px";
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

  // Recording UI
  if (isRecording) {
    return (
      <div className="wa-input-bar flex items-center gap-3 px-[10px] py-[8px]">
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
        <div className="flex items-center gap-2 px-4 py-2 border-t wa-border-light wa-input-bar">
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
        <div className="wa-preview-bg border-t wa-border-light">
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
                  className="w-full wa-bg-input wa-text-primary text-[14px] px-[12px] py-[9px] rounded-lg outline-none border-none placeholder:wa-text-muted"
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <button onClick={() => { setPreview(null); setCaption(""); }} className="wa-icon-button p-2 rounded-full hover:bg-white/5 transition-colors">
                <X size={20} className="wa-icon-header" />
              </button>
              <button onClick={handleSend} className="w-[42px] h-[42px] bg-[#00a884] hover:bg-[#06cf9c] rounded-full flex items-center justify-center transition-colors">
                <Send size={18} className="text-white ml-[2px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      {!preview && (
        <div className="wa-input-bar flex items-end gap-[6px] px-[10px] py-[5px] relative">
          {/* Attach menu */}
          {showAttach && (
            <div className="wa-attach-menu absolute bottom-[60px] left-[15px] wa-attach-bg rounded-2xl shadow-2xl border wa-border-light p-3 flex gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
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

          {/* Emoji picker */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button className={cn("wa-emoji-btn p-[8px] rounded-full transition-colors", emojiOpen ? "bg-white/10" : "hover:bg-white/5")}>
                <Smile size={24} className={emojiOpen ? "text-[#00a884]" : "wa-icon-panel"} />
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
                <EmojiPickerSearch placeholder="Buscar emoji..." />
                <EmojiPickerCategories />
                <EmojiPickerContent />
              </EmojiPicker>
            </PopoverContent>
          </Popover>

          {/* Attach button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setEmojiOpen(false); }}
            className={cn("wa-attach-btn p-[8px] rounded-full transition-colors", showAttach ? "bg-white/10" : "hover:bg-white/5")}
          >
            <Plus size={24} className={cn("transition-transform duration-200", showAttach ? "text-[#00a884] rotate-45" : "wa-icon-panel")} />
          </button>

          {/* Input field */}
          <div className="flex-1 py-[5px]">
            <div className="wa-input-field rounded-xl flex items-end">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem"
                rows={1}
                className="flex-1 bg-transparent wa-text-primary text-[15px] px-[12px] py-[9px] outline-none resize-none max-h-[100px] overflow-y-auto leading-[20px] placeholder:wa-text-muted wa-scrollbar"
                style={{ minHeight: "20px" }}
              />
            </div>
          </div>

          {/* Send or Mic button */}
          {text.trim() ? (
            <button onClick={handleSend} className="p-[8px] rounded-full bg-[#00a884] hover:bg-[#06cf9c] transition-colors">
              <Send size={20} className="text-white ml-[1px]" />
            </button>
          ) : (
            <button onClick={startRecording} className="p-[8px] rounded-full hover:bg-white/5 transition-colors">
              <Mic size={24} className="wa-icon-panel" />
            </button>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e, "video")} />
    </>
  );
}
