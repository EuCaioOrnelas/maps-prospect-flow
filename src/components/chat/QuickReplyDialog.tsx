import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent } from "@/components/ui/emoji-picker";
import { QUICK_REPLY_VARIABLES, type QuickReply, type QuickReplyInput } from "@/hooks/useQuickReplies";
import { supabase } from "@/integrations/supabase/client";
import { Smile, Paperclip, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: QuickReply | null;
  onSubmit: (input: QuickReplyInput) => Promise<void>;
}

export function QuickReplyDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { user } = useAuth();
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaFilename, setMediaFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setShortcut(initial?.shortcut || "");
      setTitle(initial?.title || "");
      setContent(initial?.content || "");
      setMediaUrl(initial?.media_url || null);
      setMediaType(initial?.media_type || null);
      setMediaFilename(initial?.media_filename || null);
    }
  }, [open, initial]);

  const insertAtCursor = (insertion: string) => {
    const el = textareaRef.current;
    if (!el) { setContent(prev => prev + insertion); return; }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + insertion + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `quick-replies/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      const type = file.type.startsWith("image/") ? "image"
                  : file.type.startsWith("video/") ? "video"
                  : file.type.startsWith("audio/") ? "audio"
                  : "document";
      setMediaUrl(data.publicUrl);
      setMediaType(type);
      setMediaFilename(file.name);
    } catch (e: any) {
      toast.error("Erro no upload: " + (e?.message || "desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!shortcut.trim()) { toast.error("Defina um atalho"); return; }
    if (!content.trim() && !mediaUrl) { toast.error("Adicione texto ou mídia"); return; }
    setSaving(true);
    try {
      await onSubmit({
        shortcut: shortcut.replace(/^\/+/, "").trim(),
        title: title.trim() || null,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
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
          <DialogDescription>Defina o atalho e o conteúdo. Use variáveis para personalizar dinamicamente.</DialogDescription>
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
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Tabela de preços" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Mensagem</Label>
              <div className="flex items-center gap-1">
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 gap-1">
                      <Smile size={14} /> <span className="text-xs">Emoji</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-[320px] p-0">
                    <EmojiPicker className="h-[320px]" onEmojiSelect={({ emoji }) => insertAtCursor(emoji)}>
                      <EmojiPickerSearch placeholder="Pesquisar emoji" />
                      <EmojiPickerContent />
                    </EmojiPicker>
                  </PopoverContent>
                </Popover>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  <span className="text-xs">Anexar</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }}
                />
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Digite a mensagem... use {{nome}}, {{empresa}}, {{cidade}}, {{endereco}}, {{email}}, {{telefone}}"
              className="min-h-[140px] resize-y font-mono text-sm"
            />
          </div>

          {mediaUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              {mediaType === "image" ? (
                <img src={mediaUrl} className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs uppercase font-semibold">{mediaType?.slice(0,3) || "file"}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{mediaFilename || "anexo"}</p>
                <p className="text-[10px] text-muted-foreground">{mediaType}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setMediaUrl(null); setMediaType(null); setMediaFilename(null); }}>
                <X size={14} />
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs mb-2 block">Variáveis disponíveis (clique para inserir)</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLY_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  title={v.description}
                  onClick={() => insertAtCursor(`{{${v.key}}}`)}
                  className="px-2 py-1 rounded-md text-[11px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {initial ? "Salvar alterações" : "Criar mensagem rápida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
