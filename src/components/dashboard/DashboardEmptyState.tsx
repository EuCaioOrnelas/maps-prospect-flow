import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Search, MessageCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardEmptyState() {
  const steps = [
    {
      icon: <Search size={20} />,
      title: "Prospecte leads",
      description: "Use a busca para encontrar empresas e contatos qualificados.",
      link: "/dashboard",
      linkLabel: "Buscar leads",
    },
    {
      icon: <MessageCircle size={20} />,
      title: "Inicie campanhas",
      description: "Envie mensagens em escala via Meta API oficial.",
      link: "/meta-campaigns",
      linkLabel: "Criar campanha",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Visão Geral</h1>
      </div>

      <Card className="bg-card border-border/50 rounded-xl">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <BarChart3 size={28} className="text-muted-foreground/40" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-lg font-semibold text-foreground">
              Sem dados suficientes para análise
            </h2>
            <p className="text-sm text-muted-foreground">
              Seus dashboards e gráficos aparecerão aqui conforme você começar a usar a plataforma. Prospecte leads, envie campanhas e acompanhe sua evolução em tempo real.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((step) => (
          <Card key={step.title} className="bg-card border-border/50 rounded-xl">
            <CardContent className="py-6 px-5 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link to={step.link}>{step.linkLabel}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}