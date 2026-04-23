import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDate, commissionStatusColors, commissionStatusLabel } from "@/lib/partnerFormat";
import { RecordManualSaleDialog } from "@/components/admin/partners/RecordManualSaleDialog";
import { Plus, XCircle, CheckCircle2 } from "lucide-react";

interface Sale {
  id: string;
  amount_cents: number;
  paid_at: string;
  plan: string;
  payment_provider: string;
  payment_method: string | null;
  is_recurring: boolean;
  external_reference: string | null;
  refunded_at: string | null;
  partner: { full_name: string; referral_code: string };
}

interface Commission {
  id: string;
  partner_id: string;
  commission_amount_cents: number;
  base_amount_cents: number;
  commission_percent: number;
  status: string;
  available_at: string;
  paid_at: string | null;
  cancellation_reason: string | null;
  partner: { full_name: string };
  sale: { plan: string; paid_at: string } | null;
}

export default function AdminPartnersSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recordOpen, setRecordOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [salesRes, commRes] = await Promise.all([
      supabase
        .from("partner_sales")
        .select("id, amount_cents, paid_at, plan, payment_provider, payment_method, is_recurring, external_reference, refunded_at, partner:partners(full_name, referral_code)")
        .order("paid_at", { ascending: false })
        .limit(500),
      supabase
        .from("partner_commissions")
        .select("id, partner_id, commission_amount_cents, base_amount_cents, commission_percent, status, available_at, paid_at, cancellation_reason, partner:partners(full_name), sale:partner_sales(plan, paid_at)")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setSales((salesRes.data as any) || []);
    setCommissions((commRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancelCommission = async (id: string) => {
    const reason = window.prompt("Motivo do cancelamento:");
    if (!reason) return;
    const { error } = await supabase
      .from("partner_commissions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Comissão cancelada" });
    load();
  };

  const releaseCommission = async (id: string) => {
    const { error } = await supabase
      .from("partner_commissions")
      .update({ status: "available", available_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Comissão liberada" });
    load();
  };

  const filteredCommissions = commissions.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search.trim() && !c.partner.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendas & Comissões</h1>
          <p className="text-sm text-muted-foreground">Vendas geradas via parceiros e comissões calculadas automaticamente</p>
        </div>
        <Button onClick={() => setRecordOpen(true)} className="gap-2"><Plus size={16} /> Lançar venda manual</Button>
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Comissões ({commissions.length})</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Input placeholder="Buscar parceiro..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="available">Disponíveis</SelectItem>
                    <SelectItem value="paid">Pagas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto">{filteredCommissions.length} resultados</span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Libera em</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : filteredCommissions.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma comissão.</TableCell></TableRow>
                    ) : filteredCommissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.partner.full_name}</TableCell>
                        <TableCell><span className="capitalize">{c.sale?.plan || "—"}</span></TableCell>
                        <TableCell className="text-right">{fmtBRL(c.base_amount_cents)}</TableCell>
                        <TableCell className="text-right">{c.commission_percent}%</TableCell>
                        <TableCell className="text-right font-medium">{fmtBRL(c.commission_amount_cents)}</TableCell>
                        <TableCell><Badge variant="outline" className={commissionStatusColors[c.status]}>{commissionStatusLabel[c.status] || c.status}</Badge></TableCell>
                        <TableCell className="text-sm">{fmtDate(c.available_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {c.status === "pending" && (
                              <Button size="sm" variant="ghost" onClick={() => releaseCommission(c.id)} title="Liberar agora"><CheckCircle2 size={14} /></Button>
                            )}
                            {(c.status === "pending" || c.status === "available") && (
                              <Button size="sm" variant="ghost" onClick={() => cancelCommission(c.id)} title="Cancelar"><XCircle size={14} className="text-destructive" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : sales.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma venda registrada.</TableCell></TableRow>
                    ) : sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.partner.full_name}</TableCell>
                        <TableCell><span className="capitalize">{s.plan}</span></TableCell>
                        <TableCell className="text-right">{fmtBRL(s.amount_cents)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{s.payment_provider}</Badge></TableCell>
                        <TableCell><span className="text-xs">{s.is_recurring ? "Recorrente" : "Avulsa"}</span></TableCell>
                        <TableCell className="text-sm">{fmtDate(s.paid_at)}</TableCell>
                        <TableCell>
                          {s.refunded_at ? <Badge variant="destructive">Reembolsada</Badge> : <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordManualSaleDialog open={recordOpen} onOpenChange={setRecordOpen} onCreated={load} />
    </div>
  );
}
