import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon, Minus,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { uploadBlogImage } from "@/lib/blogImageUpload";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ value, onChange, placeholder }: Props) {
  const onChangeRef = useRef(onChange);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const selectionRef = useRef<{ from: number; to: number; text: string } | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ allowBase64: true, HTMLAttributes: { class: "blog-content-image" } }),
      Placeholder.configure({ placeholder: placeholder || "Escreva seu conteúdo..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      try {
        onChangeRef.current(editor.getHTML());
      } catch {
        /* ignore transient prosemirror serialization race */
      }
    },
    editorProps: {
      attributes: {
        class:
          "blog-content blog-content-editor max-w-none focus:outline-none min-h-[500px] px-4 sm:px-6 py-8",
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    let current = "";
    try { current = editor.getHTML(); } catch { return; }
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  // Force re-render on selection changes so toolbar disabled state stays accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to, empty } = editor.state.selection;
      const text = empty ? "" : editor.state.doc.textBetween(from, to, " ").trim();
      selectionRef.current = !empty && text ? { from, to, text } : null;
      setTick((t) => t + 1);
    };
    handler();
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  if (!editor) return null;

  const hasSelection = !!selectionRef.current;

  const selectedChain = () => {
    const selection = selectionRef.current;
    if (!selection) return null;
    return editor.chain().focus().setTextSelection({ from: selection.from, to: selection.to });
  };

  const currentRange = () => {
    rangeRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    return rangeRef.current;
  };

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^(https?:|mailto:|tel:|data:image\/|blob:)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  type ToolbarButtonProps = {
    onClick: () => void | boolean;
    active?: boolean;
    children: ReactNode;
    title: string;
    disabled?: boolean;
    requireSelection?: boolean;
  };

  const Btn = ({ onClick, active, children, title, disabled, requireSelection = true }: ToolbarButtonProps) => {
    const isDisabled = disabled || (requireSelection && !hasSelection);
    return (
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        size="sm"
        disabled={isDisabled}
        onMouseDown={(e) => {
          // Prevent the editor from losing selection when clicking the toolbar
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          if (isDisabled) return;
          onClick?.();
        }}
        title={isDisabled && requireSelection ? `${title} (selecione um texto primeiro)` : title}
        className="h-8 w-8 p-0"
      >
        {children}
      </Button>
    );
  };

  const addLink = () => {
    const selection = selectionRef.current;
    if (!selection) return;
    rangeRef.current = { from: selection.from, to: selection.to };
    setLinkUrl(editor.getAttributes("link")?.href || "https://");
    setLinkDialogOpen(true);
  };

  const applyLink = () => {
    const range = rangeRef.current;
    if (!range) return;
    const href = normalizeUrl(linkUrl);
    const chain = editor.chain().focus().setTextSelection(range);
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href }).run();
    setLinkDialogOpen(false);
  };

  const addImage = () => {
    currentRange();
    setImageUrl("");
    setImageAlt("");
    setImageDialogOpen(true);
  };

  const applyImage = () => {
    const src = normalizeUrl(imageUrl);
    if (!src) return;
    const alt = imageAlt.trim() || "";
    const range = rangeRef.current;
    const chain = editor.chain().focus();
    if (range) chain.setTextSelection(range);
    // setImage inserts as a block-level image so the preview styles (.blog-content img) apply
    (chain as any).setImage({ src, alt }).run();
    setImageDialogOpen(false);
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/50 rounded-t-lg">
        <Btn onClick={() => selectedChain()?.toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => selectedChain()?.toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleStrike().run()} active={editor.isActive("strike")} title="Tachado"><Strikethrough className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleCode().run()} active={editor.isActive("code")} title="Código"><Code className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => selectedChain()?.toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista ordenada"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação"><Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => selectedChain()?.deleteSelection().setHorizontalRule().run()} title="Linha"><Minus className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={addLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn onClick={addImage} title="Imagem (URL)" requireSelection={false}><ImageIcon className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" requireSelection={false} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer" requireSelection={false} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} />

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar link</DialogTitle>
            <DialogDescription>Informe a URL que será aplicada ao texto selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="blog-link-url">URL</Label>
            <Input id="blog-link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://wiize.com.br" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={applyLink}>Aplicar link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar imagem</DialogTitle>
            <DialogDescription>Informe a URL e o texto alternativo da imagem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blog-image-url">URL da imagem</Label>
              <Input id="blog-image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-image-alt">Alt text</Label>
              <Input id="blog-image-alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Descreva a imagem" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={applyImage} disabled={!imageUrl.trim()}>Adicionar imagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
