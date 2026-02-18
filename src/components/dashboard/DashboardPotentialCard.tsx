import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, TrendingUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DashboardPotentialCardProps {
  searchesUsed: number;
  searchesLimit: number;
  leadsProspected: number;
  messagesSent: number;
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export function DashboardPotentialCard({ searchesUsed, searchesLimit, leadsProspected, messagesSent }: DashboardPotentialCardProps) {
  const navigate = useNavigate();
  const remaining = Math.max(searchesLimit - searchesUsed, 0);
  const capacityUsed = searchesLimit > 0 ? (searchesUsed / searchesLimit) * 100 : 0;

  // Activation rate: how many conversations per lead
  const activationRate = leadsProspected > 0 ? messagesSent / leadsProspected : 0;
  const potentialConversations = Math.round(remaining * activationRate);

  return (
    <Card className="border-border/50 flex flex-col">
      <CardContent className="py-5 px-5 space-y-4 flex-1 flex flex-col">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Potencial de Escala Disponível</p>
            <p className="text-[10px] text-muted-foreground/60">Capacidade do seu plano no período atual</p>
          </div>
        </div>

        {/* 3 Column Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center space-y-0.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Target size={14} className="text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground leading-tight">{fmtInt(searchesLimit)}</p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">prospecções disponíveis</p>
          </div>
          <div className="text-center space-y-0.5">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-1">
              <TrendingUp size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground leading-tight">{fmtInt(searchesUsed)}</p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">prospecções utilizadas</p>
          </div>
          <div className="text-center space-y-0.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-1">
              <Rocket size={14} className="text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 leading-tight">{fmtInt(remaining)}</p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">ainda disponíveis</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={capacityUsed} className="h-2" />
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/50">
              {fmtInt(searchesUsed)} usadas
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              {fmtInt(searchesLimit)} disponíveis
            </span>
          </div>
        </div>

        {/* Strategic growth line */}
        {potentialConversations > 0 && (
          <p className="text-[11px] text-primary/80 leading-relaxed">
            Você pode gerar até <span className="font-semibold">+{fmtInt(potentialConversations)} novas conversas</span> se utilizar 100% do seu plano.
          </p>
        )}

        {/* CTA Button */}
        <div className="pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate('/dashboard')}
          >
            <Rocket size={13} />
            Escalar Prospecção
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
