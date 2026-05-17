import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Webhook, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WebhookConnection } from "@/hooks/useWebhookGate";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pendingConnections: WebhookConnection[];
  context?: "chat" | "campaign" | "flow";
};

const COPY: Record<NonNullable<Props["context"]>, { title: string; desc: string }> = {
  chat: {
    title: "Webhook obrigatório para o Chat",
    desc: "Para receber mensagens e atualizações de status em tempo real, o webhook da Meta precisa estar configurado e validado em cada número conectado.",
  },
  campaign: {
    title: "Webhook obrigatório para Campanhas",
    desc: "Sem o webhook validado a Meta não consegue avisar a plataforma sobre entregas, leituras e respostas das suas campanhas.",
  },
  flow: {
    title: "Webhook obrigatório para Fluxos",
    desc: "Os fluxos dependem de eventos da Meta para evoluir conversas. Configure e valide o webhook antes de continuar.",
  },
};

export function WebhookRequiredDialog({ open, onOpenChange, pendingConnections, context = "campaign" }: Props) {
  const navigate = useNavigate();
  const copy = COPY[context];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
            <Webhook className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{copy.desc}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {pendingConnections.length} número{pendingConnections.length === 1 ? "" : "s"} pendente{pendingConnections.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1">
            {pendingConnections.slice(0, 4).map((c) => (
              <li key={c.id} className="text-xs text-foreground/80 flex justify-between">
                <span className="font-medium truncate">{c.display_phone_number ?? "—"}</span>
                <span className="text-muted-foreground truncate ml-2">{c.business_name ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Agora não</Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/meta-configuracoes?tab=webhook");
            }}
            className="gap-1.5"
          >
            Configurar webhook <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
