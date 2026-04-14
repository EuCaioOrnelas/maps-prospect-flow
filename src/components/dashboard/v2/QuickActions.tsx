import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Flame, LayoutGrid, Bot, Zap, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function QuickActions() {
  const navigate = useNavigate();
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  const actions = [
    { label: "Nova campanha", icon: <Rocket size={14} />, action: () => setShowCampaignDialog(true), primary: true },
    { label: "Leads quentes", icon: <Flame size={14} />, action: () => navigate("/crm-score") },
    { label: "Abrir CRM", icon: <LayoutGrid size={14} />, action: () => navigate("/crm") },
    { label: "Criar fluxo", icon: <Bot size={14} />, action: () => navigate("/whatsapp-automations") },
  ];

  return (
    <>
      <Card className="border-border/40 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.primary ? "default" : "outline"}
                size="sm"
                className={
                  action.primary
                    ? "gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "gap-1.5 text-xs border-border/50 hover:bg-muted/50"
                }
                onClick={action.action}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Campanha</DialogTitle>
            <DialogDescription>Escolha o tipo de campanha que deseja iniciar</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1 text-left"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <span className="font-semibold text-foreground">Prospecção Fria</span>
              <span className="text-xs text-muted-foreground">Meta API Outbound — Envio em massa para leads que ainda não conhecem você</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1 text-left"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <span className="font-semibold text-foreground">Relacionamento Interno</span>
              <span className="text-xs text-muted-foreground">Meta API Inbound — Nutrição e follow-up para leads que já interagiram</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
