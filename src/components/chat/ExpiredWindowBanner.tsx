import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Info, MessageSquare, Send } from "lucide-react";

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

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

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
      <div className="px-4 py-3 wa-input-bar border-t wa-border-light">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium wa-text-primary">
              Janela de 24h expirada
            </p>
            <p className="text-[12px] wa-text-secondary mt-0.5 leading-[17px]">
              Não é possível enviar mensagens livres. Para retomar, envie um template aprovado pela Meta.
            </p>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="mt-2 h-8 bg-[#024d3f] hover:bg-[#036b56] text-white text-[12px] px-4"
            >
              <Send size={13} className="mr-1.5" />
              Reabrir conversa
            </Button>
          </div>
        </div>
      </div>

      {/* Template selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-xl bg-background border border-border shadow-2xl [&>button]:hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
              <MessageSquare size={20} className="text-[#024d3f]" />
              Reabrir conversa
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-2">
            <p className="text-[13px] text-muted-foreground leading-[19px]">
              A janela de 24h com <span className="font-medium text-foreground">{contactName || formatPhoneDisplay(contactPhone)}</span> expirou.
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
                    ? "border-[#024d3f] bg-[#024d3f]/5"
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

          {/* Pricing info */}
          <div className="mx-5 mb-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground leading-[16px]">
                  <span className="font-medium text-foreground">Custo por conversa: ~R$ 0,25 – R$ 0,80</span>
                </p>
                <p className="text-[10px] text-muted-foreground leading-[15px] mt-0.5">
                  Esse valor é cobrado diretamente pela <span className="font-medium">Meta (WhatsApp)</span>, não pela Wiize. 
                  O preço varia conforme a categoria do template e o país do destinatário.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="h-9 px-4 text-[13px] text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReopen}
              disabled={!selectedTemplate}
              className="bg-[#024d3f] hover:bg-[#036b56] text-white h-9 px-5"
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
