import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, Zap, CreditCard, CheckCircle2, ExternalLink } from "lucide-react";

interface MetaDisclaimerModalProps {
  open: boolean;
  onAccept: () => void;
}

export const MetaDisclaimerModal = ({ open, onAccept }: MetaDisclaimerModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) return;
    setCountdown(5);
    setAgreed(false);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const canProceed = agreed && countdown === 0;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        hideCloseButton
        className="max-w-3xl max-h-[90vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Campanhas via API Oficial Meta
          </DialogTitle>
          <DialogDescription>
            Leia atentamente antes de prosseguir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Zap size={20} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">API Outbound — Somente leads com opt-in</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A API oficial da Meta <strong>não funciona para prospecção fria</strong>. 
                  Você só pode enviar mensagens para leads que já tiveram contato prévio com você: 
                  te enviaram mensagem no WhatsApp, preencheram formulários nos seus sites conectados à Meta, 
                  ou aceitaram receber ofertas suas (opt-in). Envios para contatos sem relacionamento prévio 
                  serão bloqueados pela Meta.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <CreditCard size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Pagamento direto à Meta</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A Wiize <strong>não cobra nenhum valor</strong> por mensagem enviada.
                  O pagamento é feito diretamente à Meta através da sua conta Business.
                  Nós apenas intermediamos a integração.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <CheckCircle2 size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Templates verificados</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Todas as mensagens precisam usar templates aprovados pela Meta,
                  garantindo conformidade e alta taxa de entrega.
                </p>
              </div>
            </div>
          </div>

          {/* Important disclaimers */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
            <p className="text-sm font-medium">Informações importantes:</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• A Wiize atua exclusivamente como intermediária tecnológica</li>
              <li>• Você é responsável pelo conteúdo das mensagens e custos junto à Meta</li>
              <li>• É necessário ter uma conta Meta Business verificada</li>
              <li>• Os templates de mensagem devem ser criados e aprovados no painel da Meta</li>
              <li>• O limite de envios depende do tier da sua conta na Meta</li>
            </ul>
          </div>

          {/* Guidelines links */}
          <div className="flex flex-col gap-1">
            <a
              href="/diretrizes-de-envio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} />
              Ver Diretrizes de Envio
            </a>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} />
              Ver Termos de Uso completos (Seção 9 — WhatsApp API)
            </a>
          </div>

          {/* Agreement checkbox */}
          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="meta-agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={countdown > 0}
            />
            <Label htmlFor="meta-agree" className="text-sm leading-tight cursor-pointer">
              Li e concordo com os termos de uso e entendo que a Wiize não é responsável
              por custos, conteúdo ou restrições aplicadas pela Meta à minha conta.
            </Label>
          </div>

          <Button
            onClick={onAccept}
            disabled={!canProceed}
            className="w-full"
          >
            {countdown > 0 ? `Aguarde ${countdown}s...` : "Entendi e quero continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
