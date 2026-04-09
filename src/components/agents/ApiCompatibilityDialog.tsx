import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Workflow, Smartphone, Info } from "lucide-react";

interface ApiCompatibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiCompatibilityDialog({ open, onOpenChange }: ApiCompatibilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Compatibilidade de APIs</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            Entenda quais funcionalidades estão disponíveis em cada tipo de conexão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Outbound API */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">API Outbound (WhatsApp Web)</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você conecta seu número à ferramenta via QR Code. Ideal para prospecção e automação.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground"><strong>Agentes de IA</strong> — Exclusivo desta API</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Workflow className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground"><strong>Fluxos de automação</strong> — Disponível</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span><strong>Chat integrado</strong> — Use o WhatsApp Web tradicional</span>
              </div>
            </div>
          </div>

          {/* Inbound API */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="text-sm font-bold text-foreground">API Meta Partners (Inbound)</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              API oficial da Meta via Cloud API. Ideal para atendimento profissional com templates aprovados.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground"><strong>Chat integrado</strong> — Exclusivo desta API</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Workflow className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground"><strong>Fluxos de automação</strong> — Use fluxos para IA nesta API</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="w-3.5 h-3.5 shrink-0" />
                <span><strong>Agentes de IA</strong> — Use Fluxos com nó de Agente IA</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full rounded-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
