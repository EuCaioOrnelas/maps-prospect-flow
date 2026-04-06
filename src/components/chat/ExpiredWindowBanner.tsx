import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, MessageSquare, Send } from "lucide-react";

interface ExpiredWindowBannerProps {
  contactName: string | null;
  contactPhone: string;
  onReopenConversation: (templateName: string) => void;
}

const TEMPLATES = [
  {
    id: "hello_world",
    name: "Olá (padrão)",
    description: "Template simples de saudação aprovado pela Meta",
    preview: "Olá! Como posso ajudá-lo(a)?",
  },
  {
    id: "follow_up",
    name: "Follow-up",
    description: "Template de acompanhamento comercial",
    preview: "Olá {{nome}}, tudo bem? Gostaria de retomar nossa conversa...",
  },
  {
    id: "reengagement",
    name: "Reengajamento",
    description: "Template para retomar contato após período de inatividade",
    preview: "Olá {{nome}}! Faz um tempo que não conversamos. Tenho novidades...",
  },
];

export function ExpiredWindowBanner({ contactName, contactPhone, onReopenConversation }: ExpiredWindowBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleReopen = () => {
    if (!selectedTemplate) return;
    onReopenConversation(selectedTemplate);
    setDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <>
      {/* Banner in chat */}
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/40">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
              Janela de 24h expirada
            </p>
            <p className="text-[12px] text-amber-700/80 dark:text-amber-400/70 mt-0.5 leading-[17px]">
              Não é possível enviar mensagens livres. Para retomar o contato, envie um template aprovado pela Meta.
            </p>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="mt-2 h-8 bg-[#00a884] hover:bg-[#06cf9c] text-white text-[12px] px-4"
            >
              <Send size={13} className="mr-1.5" />
              Reabrir conversa
            </Button>
          </div>
        </div>
      </div>

      {/* Template selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-lg font-medium flex items-center gap-2">
              <MessageSquare size={20} className="text-[#00a884]" />
              Reabrir conversa
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-2">
            <p className="text-[13px] text-muted-foreground leading-[19px]">
              A janela de 24h com <span className="font-medium text-foreground">{contactName || contactPhone}</span> expirou.
              Selecione um template aprovado pela Meta para enviar:
            </p>
          </div>

          <div className="px-5 py-3 space-y-2 max-h-[300px] overflow-y-auto">
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedTemplate === template.id
                    ? "border-[#00a884] bg-[#00a884]/5"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <p className="text-[13px] font-medium text-foreground">{template.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{template.description}</p>
                <div className="mt-2 bg-muted/50 rounded-md px-3 py-2">
                  <p className="text-[12px] text-muted-foreground italic">"{template.preview}"</p>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-500" />
              <span className="text-[11px] text-muted-foreground">Cobrado por conversa (Meta)</span>
            </div>
            <Button
              onClick={handleReopen}
              disabled={!selectedTemplate}
              className="bg-[#00a884] hover:bg-[#06cf9c] text-white h-9 px-5"
            >
              <Send size={14} className="mr-1.5" />
              Enviar template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
