import { useState, useRef, useCallback } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, List, ListOrdered, Link2, Type, Eye, Code,
  MousePointerClick, Variable, Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  variables: any;
  channel: string;
  is_active: boolean;
}

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MessageTemplate | null;
  onSave: (template: Partial<MessageTemplate>) => void;
}

const AVAILABLE_VARIABLES = [
  { key: "user_name", label: "Nome do usuário", example: "João" },
  { key: "product_name", label: "Nome do produto", example: "Wiize" },
  { key: "cta_link", label: "Link CTA", example: "https://..." },
  { key: "trial_days_left", label: "Dias restantes", example: "7" },
  { key: "projects_created", label: "Projetos criados", example: "3" },
  { key: "feature_usage", label: "Uso de features", example: "12" },
];

export function TemplateEditorDialog({ open, onOpenChange, template, onSave }: TemplateEditorDialogProps) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [previewTab, setPreviewTab] = useState<string>("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when template changes
  useState(() => {
    setName(template?.name || "");
    setSubject(template?.subject || "");
    setBody(template?.body || "");
    setIsActive(template?.is_active ?? true);
  });

  const insertAtCursor = useCallback((before: string, after: string = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const newText = body.substring(0, start) + before + selected + after + body.substring(end);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }, [body]);

  const insertVariable = (key: string) => {
    insertAtCursor(`{{${key}}}`);
  };

  const insertTrackedButton = () => {
    insertAtCursor(
      `<a href="{{cta_link}}" style="display:inline-block;padding:12px 28px;background:#3daa57;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;" target="_blank">`,
      `Clique aqui</a>`
    );
  };

  const toolbarActions = [
    { icon: Bold, label: "Negrito", action: () => insertAtCursor("<strong>", "</strong>") },
    { icon: Italic, label: "Itálico", action: () => insertAtCursor("<em>", "</em>") },
    { icon: Heading2, label: "Título", action: () => insertAtCursor('<h2 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;">', "</h2>") },
    { icon: List, label: "Lista", action: () => insertAtCursor("<ul style=\"padding-left:20px;margin:8px 0;\">\n  <li>", "</li>\n</ul>") },
    { icon: ListOrdered, label: "Lista numerada", action: () => insertAtCursor("<ol style=\"padding-left:20px;margin:8px 0;\">\n  <li>", "</li>\n</ol>") },
    { icon: Link2, label: "Link", action: () => insertAtCursor('<a href="URL" style="color:#3daa57;text-decoration:underline;">', "</a>") },
  ];

  const getPreviewHtml = () => {
    let preview = body;
    AVAILABLE_VARIABLES.forEach((v) => {
      preview = preview.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), `<span style="background:#3daa57;color:#fff;padding:1px 6px;border-radius:3px;font-size:12px;">${v.example}</span>`);
    });
    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="background:#3daa57;padding:20px 28px;text-align:center;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Wiize</span>
        </div>
        <div style="padding:28px 32px;color:#333;font-size:14px;line-height:1.7;">
          ${preview}
        </div>
        <div style="padding:14px 28px;background:#f9f9f9;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;">Você recebeu este e-mail porque tem uma conta na Wiize.</p>
        </div>
      </div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            {template?.id ? "Editar Template" : "Novo Template de Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Name & Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome interno</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Welcome Day 1" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Assunto do email</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Bem-vindo ao Wiize, {{user_name}}!" className="h-9" />
            </div>
          </div>

          {/* Editor / Preview Tabs */}
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="h-8">
                <TabsTrigger value="editor" className="text-xs h-7 gap-1.5"><Code className="h-3 w-3" />Editor</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-7 gap-1.5"><Eye className="h-3 w-3" />Preview</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-xs">Ativo</Label>
              </div>
            </div>

            <TabsContent value="editor" className="space-y-3 mt-0">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 p-1.5 bg-muted/50 rounded-lg border border-border/50 flex-wrap">
                {toolbarActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={action.action}
                    title={action.label}
                  >
                    <action.icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={insertTrackedButton}
                  title="Botão CTA com rastreamento"
                >
                  <MousePointerClick className="h-3.5 w-3.5 text-primary" />
                  Botão CTA
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <div className="flex items-center gap-0.5">
                  <Variable className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  {AVAILABLE_VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => insertVariable(v.key)}
                      title={v.label}
                    >
                      {`{{${v.key.split("_")[0]}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Code Editor */}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className={cn(
                  "w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs font-mono",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  "resize-y min-h-[280px] placeholder:text-muted-foreground/50"
                )}
                placeholder="Escreva o HTML do email aqui..."
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <div className="rounded-lg border border-border bg-[#f0f0f0] p-6 min-h-[380px] overflow-auto">
                {/* Subject preview */}
                <div className="mb-4 px-2">
                  <p className="text-[11px] text-gray-500 mb-0.5">Assunto:</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {subject.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                      const v = AVAILABLE_VARIABLES.find((v) => v.key === key);
                      return v?.example || key;
                    })}
                  </p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(getPreviewHtml()) }} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Variables Reference */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">Variáveis disponíveis:</span>
            {AVAILABLE_VARIABLES.map((v) => (
              <Badge key={v.key} variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-muted" onClick={() => insertVariable(v.key)}>
                {`{{${v.key}}}`}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            onSave({ name, subject, body, is_active: isActive, channel: "email", variables: [] });
            onOpenChange(false);
          }}>
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
