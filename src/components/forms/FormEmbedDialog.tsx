import { useMemo, useState } from "react";
import { Code2, ExternalLink, LayoutPanelTop, MousePointerClick, PanelsTopLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";

type EmbedMode = "inline" | "card" | "popup";
type EmbedStack = "html" | "react" | "next" | "php";

interface FormEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  slug: string;
}

const MODES: Array<{ value: EmbedMode; label: string; description: string; icon: typeof Code2 }> = [
  { value: "inline", label: "Na página", description: "O formulário aparece integrado ao conteúdo do site.", icon: PanelsTopLeft },
  { value: "card", label: "Em card", description: "Uma área delimitada destaca o formulário na página.", icon: LayoutPanelTop },
  { value: "popup", label: "Em popup", description: "Um botão abre o formulário sobre o site.", icon: MousePointerClick },
];

const STACKS: Array<{ value: EmbedStack; label: string }> = [
  { value: "html", label: "HTML" },
  { value: "react", label: "React" },
  { value: "next", label: "Next.js" },
  { value: "php", label: "PHP" },
];

const frameStyle = (card: boolean) => card
  ? "width:100%;height:760px;border:1px solid #e4e4e7;border-radius:12px;background:#f6f7f9;"
  : "width:100%;height:760px;border:0;background:#f6f7f9;";

function htmlSnippet(url: string, mode: EmbedMode) {
  const source = `${url}?embed=1`;
  if (mode === "popup") return `<button type="button" id="wiize-form-open">Abrir formulário</button>
<dialog id="wiize-form-popup" style="width:min(680px,calc(100% - 24px));height:min(820px,calc(100vh - 24px));padding:0;border:0;border-radius:12px;">
  <button type="button" id="wiize-form-close" aria-label="Fechar" style="position:absolute;right:12px;top:12px;z-index:2;">✕</button>
  <iframe title="Formulário" style="width:100%;height:100%;border:0;" loading="lazy"></iframe>
</dialog>
<script>
  const popup = document.getElementById('wiize-form-popup');
  const frame = popup.querySelector('iframe');
  document.getElementById('wiize-form-open').onclick = () => {
    frame.src = '${source}&' + new URLSearchParams(location.search).toString();
    popup.showModal();
  };
  document.getElementById('wiize-form-close').onclick = () => popup.close();
</script>`;
  return `<iframe
  id="wiize-form"
  data-src="${source}"
  title="Formulário"
  loading="lazy"
  style="${frameStyle(mode === "card")}"
></iframe>
<script>
  const frame = document.getElementById('wiize-form');
  const query = new URLSearchParams(location.search);
  frame.src = frame.dataset.src + (query.size ? '&' + query.toString() : '');
</script>`;
}

function reactSnippet(url: string, mode: EmbedMode, next = false) {
  const directive = next ? `"use client";\n\n` : "";
  const component = next ? "WiizeForm" : "WiizeForm";
  const source = `${url}?embed=1`;
  if (mode === "popup") return `${directive}import { useState } from "react";

export function ${component}() {
  const [open, setOpen] = useState(false);
  const src = "${source}&" + new URLSearchParams(window.location.search).toString();

  return <>
    <button type="button" onClick={() => setOpen(true)}>Abrir formulário</button>
    {open && <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.7)", display:"grid", placeItems:"center", padding:12 }}>
      <div style={{ position:"relative", width:"min(680px,100%)", height:"min(820px,100%)" }}>
        <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} style={{ position:"absolute", right:12, top:12, zIndex:2 }}>✕</button>
        <iframe src={src} title="Formulário" style={{ width:"100%", height:"100%", border:0, borderRadius:12 }} />
      </div>
    </div>}
  </>;
}`;
  return `${directive}export function ${component}() {
  const query = typeof window === "undefined" ? "" : window.location.search.slice(1);
  return <iframe
    src={"${source}" + (query ? "&" + query : "")}
    title="Formulário"
    loading="lazy"
    style={{ width:"100%", height:760, border:${mode === "card" ? `"1px solid #e4e4e7"` : "0"}, borderRadius:${mode === "card" ? "12" : "0"}, background:"#f6f7f9" }}
  />;
}`;
}

function phpSnippet(url: string, mode: EmbedMode) {
  const separator = url.includes("?") ? "&" : "?";
  const header = `<?php\n$query = htmlspecialchars($_SERVER['QUERY_STRING'] ?? '', ENT_QUOTES, 'UTF-8');\n$formUrl = '${url}${separator}embed=1' . ($query ? '&' . $query : '');\n?>\n`;
  return header + htmlSnippet("<?= $formUrl ?>", mode).replace("?embed=1", "").replace(/<script>[\s\S]*<\/script>/, "");
}

export function FormEmbedDialog({ open, onOpenChange, formName, slug }: FormEmbedDialogProps) {
  const [mode, setMode] = useState<EmbedMode>("inline");
  const [stack, setStack] = useState<EmbedStack>("html");
  const url = `${window.location.origin}/form/${encodeURIComponent(slug)}`;
  const code = useMemo(() => {
    if (stack === "react") return reactSnippet(url, mode);
    if (stack === "next") return reactSnippet(url, mode, true);
    if (stack === "php") return phpSnippet(url, mode);
    return htmlSnippet(url, mode);
  }, [mode, stack, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Code2 className="h-5 w-5 text-primary" />Incorporar formulário</DialogTitle>
          <DialogDescription>Escolha como “{formName}” aparecerá no seu site e copie o código pronto.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          {MODES.map((item) => (
            <Button key={item.value} type="button" variant="outline" onClick={() => setMode(item.value)} className={`h-auto justify-start gap-3 p-4 text-left shadow-none ${mode === item.value ? "border-primary bg-primary/5" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><item.icon className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block font-semibold">{item.label}</span><span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">{item.description}</span></span>
            </Button>
          ))}
        </div>

        <Tabs value={stack} onValueChange={(value) => setStack(value as EmbedStack)}>
          <TabsList className="h-auto w-full justify-start overflow-x-auto border border-border/60 bg-muted/40 p-1">
            {STACKS.map((item) => <TabsTrigger key={item.value} value={item.value} className="px-4">{item.label}</TabsTrigger>)}
          </TabsList>
          {STACKS.map((item) => (
            <TabsContent key={item.value} value={item.value} className="mt-3">
              <CodeBlock code={code} lang={item.value === "php" ? "php" : item.value === "html" ? "html" : "typescript"} filename={item.value === "html" ? "seu-site.html" : item.value === "php" ? "pagina.php" : item.value === "next" ? "WiizeForm.tsx" : "WiizeForm.jsx"} className="max-h-[390px] overflow-auto" />
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="max-w-xl text-xs text-muted-foreground">O formulário continua seguro na Wiize e mantém consentimento, origem, UTM e envio ao CRM.</p>
          <Button variant="outline" className="gap-2 shadow-none" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" />Abrir formulário</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
