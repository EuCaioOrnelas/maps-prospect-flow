import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Flame, LayoutGrid, Download, Bot, Upload, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Nova campanha", icon: <Plus size={14} />, route: "/whatsapp-campaign", primary: true },
    { label: "Leads quentes", icon: <Flame size={14} />, route: "/opportunities" },
    { label: "Abrir CRM", icon: <LayoutGrid size={14} />, route: "/crm" },
    { label: "Exportar pipeline", icon: <Download size={14} />, route: "/crm" },
    { label: "Treinar IA", icon: <Bot size={14} />, route: "/ai-agents" },
    { label: "Importar leads", icon: <Upload size={14} />, route: "/whatsapp-campaign" },
  ];

  return (
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
              onClick={() => navigate(action.route)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
