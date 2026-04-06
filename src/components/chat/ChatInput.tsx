import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, Smile, X, Image, FileText, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, caption?: string) => void;
}

const EMOJI_SETS = [
  ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😗"],
  ["😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐"],
  ["😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑"],
  ["😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰"],
  ["😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬","😈","👿","💀","☠️","💩","🤡"],
  ["👍","👎","👌","🤝","👏","🙌","💪","❤️","🔥","⭐","🎉","✅","⚡","💯","🚀","💡"],
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

  // Auto resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  return (
    <div className="bg-[#202c33] border-t border-[#222d34]">
      {/* File preview */}
      {preview && (
        <div className="px-4 py-3 bg-[#111b21] flex items-end gap-3">
          <div className="flex-1 flex flex-col items-center">
            {preview.type === "image" && (
              <img src={preview.url} alt="Preview" className="max-h-[200px] rounded-lg object-contain mb-2" />
            )}
            {preview.type === "video" && (
              <video src={preview.url} controls className="max-h-[200px] rounded-lg mb-2" />
            )}
            {preview.type === "document" && (
              <div className="bg-[#202c33] rounded-lg p-4 flex items-center gap-3 mb-2">
                <FileText size={28} className="text-[#00a884]" />
                <span className="text-sm text-[#e9edef] truncate">{preview.file.name}</span>
              </div>
            )}
            {preview.type !== "document" && (
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Adicionar legenda..."
                className="w-full bg-[#2a3942] text-[#e9edef] text-sm px-3 py-2 rounded-lg border-none outline-none placeholder:text-[#8696a0]"
                onKeyDown={e => e.key === "Enter" && handleSend()}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setPreview(null); setCaption(""); }} className="p-2 hover:bg-[#3b4a54] rounded-full">
              <X size={18} className="text-[#8696a0]" />
            </button>
            <button onClick={handleSend} className="p-2.5 bg-[#00a884] hover:bg-[#06cf9c] rounded-full transition-colors">
              <Send size={18} className="text-[#111b21]" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && !preview && (
        <div className="bg-[#111b21] border-t border-[#222d34] p-3 max-h-[250px] overflow-y-auto">
          {EMOJI_SETS.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-1 mb-1">
              {row.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { setText(prev => prev + emoji); inputRef.current?.focus(); }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#3b4a54] rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Attach menu */}
      {showAttach && !preview && (
        <div className="absolute bottom-[60px] left-3 bg-[#233138] rounded-2xl shadow-xl border border-[#3b4a54] p-4 flex gap-4 z-50">
          <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-[#7f66ff] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Image size={22} className="text-white" />
            </div>
            <span className="text-xs text-[#8696a0]">Fotos</span>
          </button>
          <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-[#ff6f69] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Film size={22} className="text-white" />
            </div>
            <span className="text-xs text-[#8696a0]">Vídeos</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-[#5f66cd] flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={22} className="text-white" />
            </div>
            <span className="text-xs text-[#8696a0]">Documento</span>
          </button>
        </div>
      )}

      {/* Input bar */}
      {!preview && (
        <div className="flex items-end gap-2 px-3 py-2.5">
          <button
            onClick={() => { setShowEmojis(!showEmojis); setShowAttach(false); }}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              showEmojis ? "text-[#00a884]" : "text-[#8696a0] hover:text-[#e9edef]"
            )}
          >
            <Smile size={22} />
          </button>
          <button
            onClick={() => { setShowAttach(!showAttach); setShowEmojis(false); }}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              showAttach ? "text-[#00a884]" : "text-[#8696a0] hover:text-[#e9edef]"
            )}
          >
            <Paperclip size={22} />
          </button>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem"
              rows={1}
              className="w-full resize-none bg-[#2a3942] text-[#e9edef] text-[15px] px-3 py-2.5 rounded-lg border-none outline-none placeholder:text-[#8696a0] max-h-[120px] overflow-y-auto leading-[20px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              text.trim() ? "text-[#00a884] hover:text-[#06cf9c]" : "text-[#8696a0]"
            )}
          >
            <Send size={22} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, "document")} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileSelect(e, "video")} />
    </div>
  );
}
