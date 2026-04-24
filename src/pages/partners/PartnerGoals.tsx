import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Gift, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { fmtBRL, fmtDate, goalStatusColors, goalStatusLabel, goalTypeLabel, formatGoalValue } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  achieved_value: number;
  prize_amount_cents: number;
  status: string;
  prize_status: string;
  starts_at: string;
  deadline_at: string;
  completed_at: string | null;
  prize_claimed_at: string | null;
}

export default function PartnerGoals() {
  const { partner } = useOutletContext<any>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    if (!partner?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("partner_goals")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false });
    setGoals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [partner?.id]);

  const claim = async (goalId: string) => {
    setClaimingId(goalId);
    const { data, error } = await supabase.rpc("claim_partner_goal_prize", { p_goal_id: goalId });
    setClaimingId(null);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    const result = data as any;
    if (result?.error) { toast({ title: "Não foi possível", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Prêmio resgatado!", description: "O valor foi adicionado à sua fila de saques." });
    load();
  };

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const past = goals.filter((g) => g.status === "expired" || g.status === "cancelled");

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <PageHeader title="Suas metas" subtitle="Aqui aparecerão metas com prêmios criadas pelo time Wiize" icon={Target} />
        <Card className="border-dashed border-border/60">
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary mx-auto">
              <Trophy size={22} />
            </div>
            <div className="text-sm font-semibold">Nenhuma meta ativa no momento</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Quando o time Wiize lançar uma campanha de incentivo (receita, clientes pagos, MRR ou leads), ela aparecerá aqui com prêmio em dinheiro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Suas metas" subtitle={`${active.length} ativa(s) · ${completed.length} concluída(s)`} icon={Target} />

      {active.length > 0 && (
        <Section title="Em andamento" icon={Clock}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {active.map((g) => <GoalCard key={g.id} goal={g} onClaim={claim} claiming={claimingId === g.id} />)}
          </div>
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Concluídas" icon={CheckCircle2}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completed.map((g) => <GoalCard key={g.id} goal={g} onClaim={claim} claiming={claimingId === g.id} />)}
          </div>
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Encerradas">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {past.map((g) => <GoalCard key={g.id} goal={g} onClaim={claim} claiming={false} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        {Icon && <Icon size={13} />} {title}
      </div>
      {children}
    </div>
  );
}

function GoalCard({ goal, onClaim, claiming }: { goal: Goal; onClaim: (id: string) => void; claiming: boolean }) {
  const pct = Math.min(100, (Number(goal.achieved_value) / Number(goal.target_value)) * 100);
  const isAchieved = goal.status === "completed";
  const canClaim = isAchieved && goal.prize_status === "not_claimed";
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline_at).getTime() - Date.now()) / 86400000));

  return (
    <Card className={cn(
      "relative overflow-hidden border-border/60 transition-all hover:shadow-lg",
      isAchieved && "ring-1 ring-emerald-500/30 shadow-[0_0_30px_-12px_hsl(142_76%_36%/0.5)]",
      canClaim && "ring-1 ring-primary/40 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.6)]",
    )}>
      <div className={cn(
        "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl",
        isAchieved ? "bg-emerald-500/15" : "bg-primary/15",
      )} />
      <CardContent className="relative p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight">{goal.title}</div>
            {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
          </div>
          <Badge variant="outline" className={goalStatusColors[goal.status]}>{goalStatusLabel[goal.status]}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target size={12} />
          <span>{goalTypeLabel[goal.goal_type] || goal.goal_type}</span>
          <span>·</span>
          <span>Meta: <strong className="text-foreground">{formatGoalValue(goal.goal_type, Number(goal.target_value))}</strong></span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">
              {formatGoalValue(goal.goal_type, Number(goal.achieved_value))} / {formatGoalValue(goal.goal_type, Number(goal.target_value))}
              <span className="text-muted-foreground ml-2">({Math.round(pct)}%)</span>
            </span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Gift size={11} /> Prêmio</div>
            <div className="text-base font-bold text-primary mt-0.5">{fmtBRL(goal.prize_amount_cents)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock size={11} /> Prazo</div>
            <div className="text-sm font-semibold mt-0.5">
              {goal.status === "active" ? `${daysLeft} dias restantes` : fmtDate(goal.deadline_at)}
            </div>
          </div>
        </div>

        {canClaim && (
          <Button
            onClick={() => onClaim(goal.id)}
            disabled={claiming}
            className="w-full gap-2"
            size="lg"
          >
            {claiming ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
            Resgatar prêmio · {fmtBRL(goal.prize_amount_cents)}
          </Button>
        )}
        {isAchieved && goal.prize_status === "requested" && (
          <div className="text-xs text-center text-blue-600 bg-blue-500/10 rounded-lg py-2 font-medium">
            ⏳ Resgate solicitado — acompanhe em <strong>Saques</strong>
          </div>
        )}
        {isAchieved && goal.prize_status === "paid" && (
          <div className="text-xs text-center text-emerald-600 bg-emerald-500/10 rounded-lg py-2 font-medium">
            ✅ Prêmio pago em {fmtDate(goal.prize_claimed_at)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
