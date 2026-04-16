import { useState, useEffect } from "react";
import { TrendingDown, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminChurn() {
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("cancellation_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setCancellations(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const reasonLabels: Record<string, string> = {
    expensive: "Caro demais",
    not_using: "Não estava usando",
    bug: "Problemas técnicos",
    competitor: "Migrou para concorrente",
    missing_feature: "Falta recurso",
    trial_ended: "Teste acabou",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Churn Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise de cancelamentos e prevenção de churn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cancelamentos 30d</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cancellations.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 86400000)).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Principal Motivo</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {cancellations.length > 0 ? reasonLabels[cancellations[0]?.cancellation_reason] || cancellations[0]?.cancellation_reason : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Feedbacks</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cancellations.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cancelamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Nível de Uso</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancellations.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{reasonLabels[c.cancellation_reason] || c.cancellation_reason}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.usage_level || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
