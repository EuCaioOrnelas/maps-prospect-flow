import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { fmtBRL, levelColors, levelLabel } from "@/lib/partnerFormat";

interface Partner {
  id: string;
  full_name: string;
  level: string;
  total_paid_clients: number;
  lifetime_revenue_cents: number;
  lifetime_commission_cents: number;
  total_leads: number;
}

export default function AdminPartnersRankings() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, full_name, level, total_paid_clients, lifetime_revenue_cents, lifetime_commission_cents, total_leads")
        .eq("status", "active")
        .order("lifetime_revenue_cents", { ascending: false })
        .limit(50);
      setPartners((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const podium = partners.slice(0, 3);
  const rest = partners.slice(3);

  const trophyIcon = (i: number) => {
    if (i === 0) return <Trophy className="text-yellow-500" size={32} />;
    if (i === 1) return <Medal className="text-slate-400" size={32} />;
    return <Award className="text-amber-700" size={32} />;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rankings de Parceiros</h1>
        <p className="text-sm text-muted-foreground">Top parceiros por receita gerada (lifetime)</p>
      </div>

      {loading ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : partners.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum parceiro ativo ainda.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podium.map((p, i) => (
              <Card key={p.id} className={i === 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-3">{trophyIcon(i)}</div>
                  <h3 className="font-semibold text-lg">{p.full_name}</h3>
                  <Badge variant="outline" className={`capitalize mt-1 ${levelColors[p.level]}`}>{levelLabel[p.level]}</Badge>
                  <div className="mt-4 pt-4 border-t space-y-1">
                    <div className="text-2xl font-bold">{fmtBRL(p.lifetime_revenue_cents)}</div>
                    <p className="text-xs text-muted-foreground">{p.total_paid_clients} clientes pagos</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {rest.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Demais posições</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {rest.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-muted-foreground w-8">#{i + 4}</span>
                        <div>
                          <div className="font-medium">{p.full_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`capitalize text-[10px] ${levelColors[p.level]}`}>{levelLabel[p.level]}</Badge>
                            <span className="text-xs text-muted-foreground">{p.total_paid_clients} clientes · {p.total_leads} leads</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{fmtBRL(p.lifetime_revenue_cents)}</div>
                        <div className="text-xs text-muted-foreground">{fmtBRL(p.lifetime_commission_cents)} em comissões</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
