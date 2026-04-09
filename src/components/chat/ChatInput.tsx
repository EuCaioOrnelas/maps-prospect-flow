import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Mic, Plus, X, Image, FileText, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from "@/components/ui/emoji-picker";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
}

export function ChatInput({ onSendMessage, onSendMedia }: ChatInputProps) {
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (preview) {
      onSendMedia(preview.file, caption || undefined);
      setPreview(null);
      setCaption("");
      return;
    }
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
    setEmojiOpen(false);
    inputRef.current?.focus();
  }, [text, preview, caption, onSendMessage, onSendMedia]);

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

  return (
    <>
      {/* ─── File preview overlay ─── */}
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

      {/* ─── Input bar ─── */}
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

          {/* Emoji picker with Popover */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn("wa-emoji-btn p-[8px] rounded-full transition-colors", emojiOpen ? "bg-white/10" : "hover:bg-white/5")}
              >
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
                className="h-[320px]"
                onEmojiSelect={({ emoji }) => {
                  setText(prev => prev + emoji);
                  inputRef.current?.focus();
                }}
              >
                <EmojiPickerSearch placeholder="Buscar emoji..." />
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
            <button
              onClick={handleSend}
              className="p-[8px] rounded-full bg-[#00a884] hover:bg-[#06cf9c] transition-colors"
            >
              <Send size={20} className="text-white ml-[1px]" />
            </button>
          ) : (
            <button className="p-[8px] rounded-full hover:bg-white/5 transition-colors">
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
