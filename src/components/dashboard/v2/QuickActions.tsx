import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Flame, LayoutGrid, Download, Bot, Upload, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleExportPipeline = async () => {
    try {
      if (!user) return;
      const { data: leads, error } = await supabase
        .from("leads")
        .select("company_name, contact_name, phone, email, estimated_value, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!leads || leads.length === 0) {
        toast.info("Nenhum lead para exportar");
        return;
      }

      const header = "Empresa,Contato,Telefone,Email,Valor,Criado em\n";
      const rows = leads.map(l =>
        `"${l.company_name || ''}","${l.contact_name || ''}","${l.phone || ''}","${l.email || ''}","${l.estimated_value || ''}","${l.created_at || ''}"`
      ).join("\n");

      const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pipeline_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pipeline exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar pipeline");
    }
  };

  const actions = [
    { label: "Nova campanha", icon: <Plus size={14} />, action: () => navigate("/whatsapp-campaign"), primary: true },
    { label: "Leads quentes", icon: <Flame size={14} />, action: () => navigate("/opportunities") },
    { label: "Abrir CRM", icon: <LayoutGrid size={14} />, action: () => navigate("/crm") },
    { label: "Exportar pipeline", icon: <Download size={14} />, action: handleExportPipeline },
    { label: "Treinar IA", icon: <Bot size={14} />, action: () => navigate("/ai-agents") },
    { label: "Importar leads", icon: <Upload size={14} />, action: () => navigate("/whatsapp-campaign") },
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
              onClick={action.action}
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
