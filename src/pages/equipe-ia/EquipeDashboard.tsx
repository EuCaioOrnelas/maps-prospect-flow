import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Bot as BotIcon, Plus, Target, TrendingUp, Users, Activity, ArrowRight } from "lucide-react";
import { useEquipeList } from "@/hooks/useEquipeIA";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";
import { CreateEquipeDialog } from "@/components/equipe-ia/CreateEquipeDialog";
import { usePrimaryProvider } from "@/hooks/useUserAICredentials";
import { PROVIDER_BY_ID } from "@/lib/aiProviders";

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof BotIcon; label: string; value: string; hint?: string }) {
  return (
    <Card className="bg-card/60 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">{label}</span>
            <p className="text-2xl font-semibold tracking-tight leading-tight mt-0.5">{value}</p>
          </div>
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-3">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function statusMeta(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" };
  if (s === "draft" || s === "rascunho") return { label: "Rascunho", cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20" };
  return { label: "Inativo", cls: "bg-muted text-muted-foreground ring-border" };
}

export default function EquipeDashboard() {
  const { data: workers = [], isLoading } = useEquipeList();
  const showSeeAll = workers.length > 6;
  const [createOpen, setCreateOpen] = useState(false);
  const primary = usePrimaryProvider();
  const providerInfo = primary ? PROVIDER_BY_ID[primary] : null;

  return (
    <EquipePageLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Bot className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">Equipe IA</h1>
            <p className="text-muted-foreground mt-1">
              Colaboradores digitais orientados a objetivos, integrados ao CRM e aos fluxos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={Users} label="Colaboradores" value={String(workers.length)} hint="Total ativo na conta" />
          <Kpi icon={Activity} label="Conversas em execução" value="0" hint="Em tempo real" />
          <Kpi icon={Target} label="Objetivos concluídos" value="0" hint="Últimos 30 dias" />
          <Kpi icon={TrendingUp} label="Taxa de sucesso" value="—" hint="Média geral" />
        </div>

        <section>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold">Seus colaboradores</h2>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1.5" /> Criar colaborador
            </Button>
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
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4 mr-2" /> Criar colaborador
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.slice(0, 6).map((w) => {
                  const st = statusMeta(w.status);
                  return (
                    <Card key={w.id} className="hover:border-primary/60 hover:shadow-sm transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Bot className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate leading-tight">{w.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{w.role || "Sem função definida"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md ring-1 ${st.cls}`}>
                              <span className="size-1.5 rounded-full bg-current" />
                              {st.label}
                            </span>
                            {providerInfo && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 ring-1 ring-border px-2 py-1 rounded-md">
                                <img src={providerInfo.logo} alt={providerInfo.name} className="size-3.5 object-contain" />
                                {providerInfo.shortName}
                              </span>
                            )}
                          </div>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10">
                            <Link to={`/equipe-ia/colaboradores/${w.id}`}>
                              Abrir <ArrowRight className="size-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {showSeeAll && (
                <div className="flex justify-end mt-4">
                  <Link to="/equipe-ia/colaboradores" className="text-sm text-muted-foreground hover:text-foreground">
                    Ver todos →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <CreateEquipeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </EquipePageLayout>
  );
}
