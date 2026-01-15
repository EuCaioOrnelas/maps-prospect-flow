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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            Sistema de Janelas Inteligente
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            O envio é dividido em <strong>janelas progressivas</strong>. Cada janela só é liberada 
            quando um lead <strong>responde</strong> sua mensagem, validando que seu conteúdo está 
            sendo bem recebido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Como funciona */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              Como funciona a liberação por resposta
            </h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">1</div>
                <span>Campanha inicia enviando até <strong className="text-foreground">20 mensagens</strong> (Janela 1)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">2</div>
                <span>O sistema <strong className="text-foreground">aguarda uma resposta</strong> de qualquer lead da campanha</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">3</div>
                <span>Quando um lead responde, a <strong className="text-foreground">próxima janela é liberada automaticamente</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">4</div>
                <span>O processo se repete para cada janela: <strong className="text-foreground">20 → 30 → 50 → 100</strong></span>
              </div>
            </div>
          </div>

          {/* Janelas de envio */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Limites de cada janela
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {SENDING_WINDOWS.map((window, index) => (
                <div 
                  key={window.window}
                  className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border relative"
                >
                  <span className="text-xs text-muted-foreground">Janela {window.window}</span>
                  <span className="text-lg font-bold text-primary">{window.limit}</span>
                  <span className="text-xs text-muted-foreground">msgs</span>
                  {index < SENDING_WINDOWS.length - 1 && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Total: até <strong>200 mensagens por dia</strong> por número
            </p>
          </div>

          {/* Regras de segurança */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Proteções automáticas
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Janela só avança com <strong>pelo menos 1 resposta recebida</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Sistema detecta bloqueios e <strong>pausa automaticamente</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Leads que não respondem são <strong>protegidos de reenvio</strong></span>
              </li>
            </ul>
          </div>

          {/* Info sobre respostas */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm text-blue-600 dark:text-blue-400">
                  Por que precisamos de respostas?
                </p>
                <p className="text-xs text-muted-foreground">
                  Quando leads respondem, isso indica ao WhatsApp que suas mensagens são relevantes.
                  Isso <strong>protege seu número</strong> e aumenta a taxa de entrega.
                </p>
              </div>
            </div>
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
