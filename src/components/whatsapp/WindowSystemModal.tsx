import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle, CheckCircle2, Clock, MessageSquare } from "lucide-react";

interface WindowSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  totalLeads: number;
}

// Definição das janelas de envio
export const SENDING_WINDOWS = [
  { window: 1, limit: 20, label: "Janela 1" },
  { window: 2, limit: 30, label: "Janela 2" },
  { window: 3, limit: 50, label: "Janela 3" },
  { window: 4, limit: 100, label: "Janela 4" },
] as const;

export const getTotalWindowLimit = () => 
  SENDING_WINDOWS.reduce((sum, w) => sum + w.limit, 0); // 200

export const getWindowLimit = (windowNumber: number): number => {
  const window = SENDING_WINDOWS.find(w => w.window === windowNumber);
  return window?.limit || 0;
};

export const getAccumulatedLimit = (windowNumber: number): number => {
  return SENDING_WINDOWS
    .filter(w => w.window <= windowNumber)
    .reduce((sum, w) => sum + w.limit, 0);
};

export const WindowSystemModal = ({ 
  isOpen, 
  onClose, 
  onAccept,
  totalLeads 
}: WindowSystemModalProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
      setAccepted(false);
    }
  };

  const handleClose = () => {
    setAccepted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            Como funciona o envio por janelas
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            O envio das mensagens é feito em etapas chamadas de <strong>janelas</strong>.
            Isso protege o número contra bloqueios e permite que o sistema valide a aceitação 
            das mensagens antes de liberar volumes maiores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Explicação das Janelas */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Janelas de envio
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {SENDING_WINDOWS.map((window) => (
                <div 
                  key={window.window}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <span className="font-medium text-sm">{window.label}</span>
                  <span className="text-primary font-semibold">
                    até {window.limit} mensagens
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Você selecionou <strong>{totalLeads}</strong> contatos para esta campanha.
            </p>
          </div>

          {/* Regras Principais */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Regras de proteção
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>A próxima janela só é liberada após <strong>pelo menos 1 resposta recebida</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>Caso não haja resposta ou ocorra bloqueio/denúncia, <strong>o envio é pausado automaticamente</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>O limite total diário permanece em <strong>até 200 mensagens por número</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>Contatos que não respondem são <strong>bloqueados para reenvio futuro</strong></span>
              </li>
            </ul>
          </div>

          {/* Aviso de Responsabilidade */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm text-amber-600 dark:text-amber-400">
                  Aviso de responsabilidade
                </p>
                <p className="text-xs text-muted-foreground">
                  O WhatsApp possui políticas próprias. Mesmo seguindo boas práticas, 
                  bloqueios podem ocorrer. Este sistema reduz riscos, mas não garante 
                  ausência de bloqueios.
                </p>
              </div>
            </div>
          </div>

          {/* Checkbox de Aceite */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background">
            <Checkbox 
              id="accept-terms" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="accept-terms" 
              className="text-sm font-medium cursor-pointer leading-relaxed"
            >
              Entendi como funcionam as janelas de envio e os riscos envolvidos
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!accepted}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Iniciar campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
