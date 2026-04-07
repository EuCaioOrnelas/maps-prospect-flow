import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Shield, Smartphone, ArrowRight, Clock, X, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ChatOfficialApiDialogProps {
  open: boolean;
  onClose: () => void;
  hasConnection: boolean;
}

export const ChatOfficialApiDialog = ({ open, onClose, hasConnection }: ChatOfficialApiDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/50 gap-0 [&>button]:hidden">
        <VisuallyHidden><DialogTitle>Chat Meta Partners Inbound</DialogTitle></VisuallyHidden>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-8 pt-8 pb-6">
          {hasConnection && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-foreground">
              Chat — Meta Partners Inbound
            </h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-semibold gap-1">
              <FlaskConical className="h-2.5 w-2.5" />
              BETA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            O chat da Wiize funciona exclusivamente com números conectados via Meta Partners Inbound.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-3">
          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-muted/50 border border-border/30">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Por que preciso da Meta Partners Inbound?</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Ao conectar um número via Meta Partners Inbound, o WhatsApp no celular deixa de receber mensagens. 
                O chat da Wiize substitui o app, permitindo responder seus contatos diretamente por aqui.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-muted/50 border border-border/30">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Janela de 24h e custos de reabertura</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                A Meta permite responder gratuitamente dentro de uma janela de 24h após a última mensagem do contato. 
                Após esse período, para reabrir a conversa é necessário enviar um template aprovado, 
                que é cobrado pela Meta (~R$&nbsp;0,25 a R$&nbsp;0,80 por mensagem, conforme a categoria).
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-muted/50 border border-border/30">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Seguro e profissional</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Todas as mensagens passam pela infraestrutura oficial da Meta, com 
                criptografia, rastreamento de entrega em tempo real e total conformidade.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2">
          {hasConnection ? (
            <Button onClick={onClose} className="w-full h-11 rounded-xl font-medium">
              Acessar o Chat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="space-y-2.5">
              <Button
                onClick={() => navigate("/meta-campaigns")}
                className="w-full h-11 rounded-xl font-medium"
              >
                Conectar Meta Partners Inbound
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Você será direcionado para a seção de Relacionamento
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
