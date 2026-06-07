import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon, Minus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ value, onChange, placeholder }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg my-4 max-w-full" } }),
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
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-4 sm:px-6 py-8 " +
          "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground " +
          "prose-h1:text-3xl sm:prose-h1:text-5xl prose-h1:leading-tight " +
          "prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 " +
          "prose-h3:text-xl sm:prose-h3:text-2xl " +
          "prose-p:text-foreground prose-p:leading-relaxed " +
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline " +
          "prose-strong:text-foreground " +
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic " +
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none " +
          "prose-img:rounded-xl prose-img:my-6 " +
          "prose-ul:my-4 prose-ol:my-4 prose-li:my-1",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Force re-render on selection changes so toolbar disabled state stays accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => setTick((t) => t + 1);
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  if (!editor) return null;

  const hasSelection = !editor.state.selection.empty;

  const Btn = ({ onClick, active, children, title, disabled, requireSelection = true }: any) => {
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
    const url = window.prompt("URL do link:");
    if (url === null) return;
    if (url === "") return editor.chain().focus().unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("URL da imagem:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/50 rounded-t-lg">
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado"><Strikethrough className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Código"><Code className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista ordenada"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação"><Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha" requireSelection={false}><Minus className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={addLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn onClick={addImage} title="Imagem (URL)" requireSelection={false}><ImageIcon className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" requireSelection={false} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer" requireSelection={false} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
