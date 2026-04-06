import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, Smile, X, Image, FileText, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
}

const EMOJI_GROUPS = [
  { label: "Rostos", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"] },
  { label: "Gestos", emojis: ["👍","👎","👌","🤝","👏","🙌","🙏","💪","✌️","🤞","🤟","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤏","✍️","🤳","💅","🦾","🦿"] },
  { label: "Símbolos", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🔥","⭐","🌟","✨","⚡","💡","🎉","🎊","🎈","✅","❌","⭕","❗","❓","💯","🚀","🏆","🎯","💎","🔑","🎵"] },
];

export function ChatInput({ onSendMessage, onSendMedia }: ChatInputProps) {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
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
    setShowEmojis(false);
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".wa-emoji-picker") && !target.closest(".wa-emoji-btn")) setShowEmojis(false);
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
                <div className="wa-doc-preview rounded-[8px] p-4 flex items-center gap-3 mb-3 w-full max-w-[300px]">
                  <FileText size={28} className="text-[#00a884] shrink-0" />
                  <span className="text-[14px] wa-text-primary truncate">{preview.file.name}</span>
                </div>
              )}
              {preview.type !== "document" && (
                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Adicionar legenda..."
                  className="w-full wa-bg-input wa-text-primary text-[14px] px-[12px] py-[9px] rounded-[8px] outline-none border-none placeholder:wa-text-muted"
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <button onClick={() => { setPreview(null); setCaption(""); }} className="wa-icon-button p-2">
                <X size={20} className="wa-icon-header" />
              </button>
              <button onClick={handleSend} className="w-[42px] h-[42px] bg-[#00a884] hover:bg-[#06cf9c] rounded-full flex items-center justify-center transition-colors">
                <Send size={18} className="text-white ml-[2px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Emoji picker ─── */}
      {showEmojis && !preview && (
        <div className="wa-emoji-picker wa-emoji-bg border-t wa-border-light overflow-hidden">
          <div className="max-h-[240px] overflow-y-auto wa-scrollbar p-3">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="text-[12px] wa-text-muted font-medium mb-[6px] uppercase tracking-wide">{group.label}</p>
                <div className="flex flex-wrap gap-[1px]">
                  {group.emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setText(prev => prev + emoji); inputRef.current?.focus(); }}
                      className="w-[36px] h-[36px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] text-[22px] transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input bar ─── */}
      {!preview && (
        <div className="wa-input-bar flex items-end gap-[5px] px-[10px] py-[5px] relative">
          {/* Attach menu */}
          {showAttach && (
            <div className="wa-attach-menu absolute bottom-[60px] left-[15px] wa-attach-bg rounded-[12px] shadow-xl border wa-border-light p-[10px] flex gap-[10px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-[4px] group">
                <div className="w-[53px] h-[53px] rounded-full bg-[#7f66ff] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Image size={24} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted">Fotos</span>
              </button>
              <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-[4px] group">
                <div className="w-[53px] h-[53px] rounded-full bg-[#ff5e79] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Film size={24} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted">Vídeo</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-[4px] group">
                <div className="w-[53px] h-[53px] rounded-full bg-[#5f66cd] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText size={24} className="text-white" />
                </div>
                <span className="text-[11px] wa-text-muted">Arquivo</span>
              </button>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowEmojis(!showEmojis); setShowAttach(false); }}
            className={cn("wa-emoji-btn wa-icon-button p-[8px] rounded-full", showEmojis && "wa-icon-active")}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" className={showEmojis ? "wa-icon-tinted" : "wa-icon-panel"}>
              <path fill="currentColor" d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2.029 6.486 2.029 12s4.457 10 9.955 10 9.984-4.486 9.984-10S17.482 2 11.984 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.535-5.757a5.21 5.21 0 0 1-3.07-1.001.469.469 0 0 0-.639.095.465.465 0 0 0 .075.636 6.22 6.22 0 0 0 3.634 1.19 6.22 6.22 0 0 0 3.634-1.19.465.465 0 0 0 .075-.636.469.469 0 0 0-.639-.095 5.21 5.21 0 0 1-3.07 1.001z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmojis(false); }}
            className={cn("wa-attach-btn wa-icon-button p-[8px] rounded-full", showAttach && "wa-icon-active")}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" className={showAttach ? "wa-icon-tinted" : "wa-icon-panel"}>
              <path fill="currentColor" d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.102.736 1.619.736.509 0 .961-.218 1.286-.542l5.643-5.643a.534.534 0 0 0-.757-.756L8.621 15.18a.84.84 0 0 1-.529.202c-.272 0-.62-.14-.901-.421-.579-.579-.617-1.29-.073-1.835l7.916-7.916c1.042-1.042 2.976-.95 4.262.336.648.647 1.043 1.386 1.1 2.078.05.609-.19 1.199-.727 1.736l-9.547 9.548a4.505 4.505 0 0 1-3.212 1.33 4.505 4.505 0 0 1-3.212-1.33c-.86-.86-1.33-1.998-1.33-3.21 0-1.211.47-2.351 1.33-3.21l7.404-7.404a.534.534 0 0 0-.757-.757L3.462 12.34a5.51 5.51 0 0 0-1.646 3.977v.239z" />
            </svg>
          </button>

          <div className="flex-1 py-[5px]">
            <div className="wa-input-field rounded-[8px] flex items-end">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem"
                rows={1}
                className="flex-1 bg-transparent wa-text-primary text-[15px] px-[12px] py-[9px] outline-none resize-none max-h-[100px] overflow-y-auto leading-[20px] placeholder:wa-text-muted wa-scrollbar"
                style={{ minHeight: "20px" }}
              />
            </div>
          </div>

          {text.trim() ? (
            <button onClick={handleSend} className="wa-icon-button p-[8px] rounded-full">
              <svg viewBox="0 0 24 24" width="26" height="26" className="wa-icon-panel">
                <path fill="currentColor" d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
              </svg>
            </button>
          ) : (
            <button className="wa-icon-button p-[8px] rounded-full">
              <svg viewBox="0 0 24 24" width="26" height="26" className="wa-icon-panel">
                <path fill="currentColor" d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.238 6.002s-6.238-2.471-6.238-6.002H4.761c0 4.001 3.178 7.297 7.061 7.885v3.884h.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-1z" />
              </svg>
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
