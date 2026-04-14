import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, LayoutGrid, Bot, Zap, Rocket, Megaphone, Users } from "lucide-react";
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
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-card">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Rocket size={18} className="text-primary" />
                </div>
                Tipo de Campanha
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Escolha a estratégia ideal para o seu objetivo
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-3 p-6 pt-2">
            <button
              className="group relative w-full text-left p-5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300 overflow-hidden"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Megaphone size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base mb-1">Prospecção Fria</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Envio em massa para leads que ainda não conhecem você. Ideal para expandir sua base e gerar novas oportunidades de venda.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary/70">
                    API Outbound • Alta escala
                  </span>
                </div>
              </div>
            </button>

            <button
              className="group relative w-full text-left p-5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300 overflow-hidden"
              onClick={() => {
                setShowCampaignDialog(false);
                navigate('/whatsapp-campaign');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Users size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base mb-1">Relacionamento Interno</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nutrição e follow-up para leads que já interagiram com você. Seguro para o seu número principal e com maior taxa de resposta.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary/70">
                    Meta API Inbound • Opt-in seguro
                  </span>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
