import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";
import { getProviderLabel } from "@/lib/paymentProviderLabel";

export default function AdminAssinaturas() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name, plan, payment_provider, subscription_current_period_end, subscription_price_cents, created_at, is_custom_subscription, trial_will_charge_at")
        .neq("plan", "free")
        .in("payment_provider", ["stripe", "asaas", "manual"])
        .order("created_at", { ascending: false })
        .limit(500);
      setSubscribers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const isTrialing = (s: any) =>
    s.trial_will_charge_at && new Date(s.trial_will_charge_at).getTime() > Date.now();

  const filtered = subscribers.filter(s => 
    s.email?.toLowerCase().includes(search.toLowerCase()) || 
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const planColors: Record<string, string> = {
    start: "bg-blue-500/10 text-blue-500",
    growth: "bg-violet-500/10 text-violet-500",
    scale: "bg-amber-500/10 text-amber-500",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos os usuários pagantes — Stripe (Cartão), Asaas (PIX) e contratos customizados</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email ou nome..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(sub => (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelectedUserId(sub.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{sub.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`${planColors[sub.plan] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
                          {isTrialing(sub) ? `trial ${sub.plan}` : sub.plan}
                        </Badge>
                        {isTrialing(sub) && (
                          <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 px-1.5 py-0">
                            Trial (não pago)
                          </Badge>
                        )}
                        {sub.is_custom_subscription && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 px-1.5 py-0">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isTrialing(sub)
                        ? `Trial • ${getProviderLabel(sub.payment_provider)}`
                        : sub.payment_provider === "manual" ? "Manual (Admin)" : getProviderLabel(sub.payment_provider)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isTrialing(sub)
                        ? `Cobra em ${new Date(sub.trial_will_charge_at).toLocaleDateString("pt-BR")}`
                        : sub.subscription_current_period_end ? new Date(sub.subscription_current_period_end).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
