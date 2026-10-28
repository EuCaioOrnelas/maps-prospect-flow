import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";
import {
  Bold, Code, Heading1, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, Quote, Strikethrough,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Converte texto antigo (sem formatação) em HTML para o editor. */
export function toEditorHtml(value: string | null | undefined) {
  if (!value) return "";
  if (looksLikeHtml(value)) return value;
  return value.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

export function isRichEmpty(html: string | null | undefined) {
  if (!html) return true;
  if (/<img/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

const proseClass =
  "prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-1.5 prose-a:text-primary prose-img:rounded-lg prose-img:border prose-img:border-border prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground";

/** Exibe o conteúdo formatado de forma segura. */
export function RichTextView({ html, empty = "Sem descrição.", className }: { html: string | null | undefined; empty?: string; className?: string }) {
  if (isRichEmpty(html)) return <p className={cn("text-sm text-muted-foreground", className)}>{empty}</p>;
  const clean = DOMPurify.sanitize(toEditorHtml(html), { ADD_ATTR: ["target", "rel"] });
  return <div className={cn(proseClass, "text-foreground", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Pasta do projeto onde as imagens são guardadas (somente quem acessa o projeto vê). */
  projectId?: string | null;
  minHeightClass?: string;
}

function ToolBtn({ active, onClick, label, children, disabled }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder = "Escreva aqui… use títulos, listas, links e imagens.", projectId, minHeightClass = "min-h-[280px]" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false } as any),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: { attributes: { class: cn(proseClass, minHeightClass, "px-4 py-3 focus:outline-none") } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Sincroniza quando o valor muda por fora (ex.: abrir outra tarefa).
  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    if (next !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(next, { emitUpdate: false } as any);
  }, [value, editor]);

  if (!editor) return <div className={cn("rounded-xl border border-input", minHeightClass)} />;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Endereço do link (deixe vazio para remover)", prev || "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") return editor.chain().focus().unsetLink().run();
    if (!/^(https?:|mailto:)/i.test(url.trim())) return toast.error("Use um link começando com https://");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem pode ter no máximo 5 MB.");
    if (!projectId) return toast.error("Salve o projeto antes de enviar imagens.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${projectId}/inline/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("project-files").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("project-files").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr || !data) throw sErr;
      editor.chain().focus().setImage({ src: data.signedUrl, alt: file.name }).run();
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  const addImage = () => {
    if (projectId) return fileRef.current?.click();
    const url = window.prompt("Endereço da imagem (https://...)");
    if (url && /^https:\/\//i.test(url.trim())) editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 px-1.5 py-1">
        <ToolBtn label="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Título 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolBtn label="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Riscado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Código" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolBtn label="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Divisória" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolBtn label="Link" active={editor.isActive("link")} onClick={setLink}><Link2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Imagem" onClick={addImage} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}</ToolBtn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
