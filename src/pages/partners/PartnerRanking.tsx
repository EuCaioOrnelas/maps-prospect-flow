import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, ShieldCheck, Rocket, Crown } from "lucide-react";
import { fmtBRL, levelLabel } from "@/lib/partnerFormat";
import { cn } from "@/lib/utils";

const levelIcons: Record<string, any> = {
  bronze: ShieldCheck, silver: Award, gold: Rocket, platinum: Crown,
};
const levelGradients: Record<string, string> = {
  bronze: "from-muted/40 to-muted/10 text-foreground",
  silver: "from-muted/60 to-muted/20 text-foreground",
  gold: "from-primary/15 to-primary/5 text-primary",
  platinum: "from-foreground/10 to-foreground/5 text-foreground",
};

const tierThresholds = [
  { level: "bronze", min: 0, max: 500000, label: "Select", percent: 10 },
  { level: "silver", min: 500000, max: 2500000, label: "Signature", percent: 15 },
  { level: "gold", min: 2500000, max: 10000000, label: "Prime", percent: 20 },
  { level: "platinum", min: 10000000, max: Infinity, label: "Exclusive", percent: 25 },
];

interface RankRow {
  id: string;
  full_name: string;
  level: string;
  lifetime_revenue_cents: number;
  total_paid_clients: number;
}

export default function PartnerRanking() {
  const { partner } = useOutletContext<any>();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, full_name, level, lifetime_revenue_cents, total_paid_clients")
        .eq("status", "active")
        .order("lifetime_revenue_cents", { ascending: false })
        .limit(20);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const me = rows.find((r) => r.id === partner.id);
  const myIndex = me ? rows.indexOf(me) : -1;
  const myRevenue = me?.lifetime_revenue_cents || 0;
  const currentTier = tierThresholds.find((t) => myRevenue >= t.min && myRevenue < t.max) || tierThresholds[0];
  const nextTier = tierThresholds.find((t) => t.min > myRevenue);
  const progressPct = nextTier ? Math.min(100, ((myRevenue - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ranking de parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">Veja onde você está e o que falta para o próximo nível.</p>
      </div>

      {/* My progress */}
      <Card className={cn("bg-gradient-to-br border", levelGradients[currentTier.level])}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-70">Sua posição</div>
              <div className="text-3xl font-bold mt-1">{myIndex >= 0 ? `#${myIndex + 1}` : "—"}</div>
              <div className="text-sm mt-1">
                Nível atual: <strong>{levelLabel[currentTier.level]}</strong> ({currentTier.percent}%)
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide opacity-70">Receita gerada</div>
              <div className="text-2xl font-bold mt-1">{fmtBRL(myRevenue)}</div>
              <div className="text-sm mt-1">{me?.total_paid_clients || 0} clientes pagos</div>
            </div>
          </div>

          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-2">
                <span>Faltam <strong>{fmtBRL(nextTier.min - myRevenue)}</strong> para {levelLabel[nextTier.level]}</span>
                <span className="opacity-70">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                <div className="h-full bg-current opacity-70 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 20 ranking */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            <h2 className="font-semibold">Top 20 parceiros</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center"><div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Sem parceiros no ranking ainda.</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r, i) => {
                const Icon = levelIcons[r.level] || ShieldCheck;
                const isMe = r.id === partner.id;
                return (
                  <div key={r.id} className={cn("flex items-center gap-4 px-5 py-3.5", isMe && "bg-primary/5")}>
                    <div className={cn("w-8 text-center font-bold text-sm", i < 3 ? "text-primary" : "text-muted-foreground")}>
                      {i + 1}
                    </div>
                    <div className={cn("h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-br", levelGradients[r.level])}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {/* Anonymize others — first name + last initial */}
                        {isMe ? r.full_name + " (você)" : anonymize(r.full_name)}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{levelLabel[r.level]} · {r.total_paid_clients} clientes</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{fmtBRL(r.lifetime_revenue_cents)}</div>
                      <div className="text-xs text-muted-foreground">receita gerada</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function anonymize(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0)}.`;
}
