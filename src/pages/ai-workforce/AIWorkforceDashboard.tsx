import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Bot as BotIcon, Plus, Target, TrendingUp, Users, Activity, Sparkles } from "lucide-react";
import { useWorkforceList } from "@/hooks/useAIWorkforce";
import { WorkforcePageLayout } from "@/components/ai-workforce/WorkforcePageLayout";

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof BotIcon; label: string; value: string; hint?: string }) {
  return (
    <Card className="bg-card/60 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AIWorkforceDashboard() {
  const { data: workers = [], isLoading } = useWorkforceList();

  return (
    <WorkforcePageLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
              <Sparkles className="size-3.5" /> Novo
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Workforce</h1>
            <p className="text-muted-foreground mt-1">
              Colaboradores digitais orientados a objetivos, integrados ao CRM e aos fluxos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/ai-workforce/legacy">Versão Clássica</Link>
            </Button>
            <Button asChild>
              <Link to="/ai-workforce/novo">
                <Plus className="size-4 mr-2" /> Novo Colaborador
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={Users} label="Colaboradores" value={String(workers.length)} hint="Total ativo na conta" />
          <Kpi icon={Activity} label="Conversas em execução" value="0" hint="Em tempo real" />
          <Kpi icon={Target} label="Objetivos concluídos" value="0" hint="Últimos 30 dias" />
          <Kpi icon={TrendingUp} label="Taxa de sucesso" value="—" hint="Média geral" />
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seus colaboradores</h2>
            <Link to="/ai-workforce/colaboradores" className="text-sm text-muted-foreground hover:text-foreground">
              Ver todos
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : workers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <Bot className="size-10 mx-auto text-muted-foreground/60" />
                <p className="mt-3 font-medium">Nenhum colaborador ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro colaborador digital para começar.</p>
                <Button asChild className="mt-4">
                  <Link to="/ai-workforce/novo"><Plus className="size-4 mr-2" /> Criar colaborador</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.slice(0, 6).map((w) => (
                <Link key={w.id} to={`/ai-workforce/colaboradores/${w.id}`}>
                  <Card className="hover:border-primary/60 transition-colors h-full">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Bot className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{w.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.role || "Sem função definida"}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2 min-h-[40px]">
                        {w.description || "Sem descrição."}
                      </p>
                      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span className="capitalize">{w.status}</span>
                        <span>{w.channel}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkforcePageLayout>
  );
}
