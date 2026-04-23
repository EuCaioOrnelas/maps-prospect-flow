import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/partnerFormat";

export default function PartnerLeads() {
  const { partner } = useOutletContext<any>();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase.from("partner_leads").select("*").eq("partner_id", partner.id).order("attributed_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    })();
  }, [partner?.id]);

  const status = (l: any) => {
    if (l.is_cancelled) return <Badge variant="destructive">Cancelado</Badge>;
    if (l.is_paid) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
    if (l.is_trial) return <Badge variant="secondary">Trial</Badge>;
    return <Badge variant="outline">Lead</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Meus leads</h1>
        <p className="text-sm text-muted-foreground">Pessoas cadastradas via seu link — {leads.length} total</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : leads.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Você ainda não tem leads. Compartilhe seu link!</TableCell></TableRow>
                ) : leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.name || l.email.split("@")[0]}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell><span className="capitalize">{l.current_plan || "—"}</span></TableCell>
                    <TableCell>{status(l)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.attributed_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.paid_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
