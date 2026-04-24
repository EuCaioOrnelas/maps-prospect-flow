import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { fmtDate } from "@/lib/partnerFormat";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";

interface Lead {
  user_id: string;
  id: string;
  name: string | null;
  email: string;
  partner_id: string;
  attributed_at: string;
  is_trial: boolean;
  is_paid: boolean;
  is_cancelled: boolean;
  current_plan: string | null;
  paid_at: string | null;
  last_activity_at: string | null;
  partner?: { full_name: string; referral_code: string } | null;
}

export default function AdminPartnersLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [partners, setPartners] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, partnersRes] = await Promise.all([
        supabase
          .from("partner_leads")
          .select("id, user_id, name, email, partner_id, attributed_at, is_trial, is_paid, is_cancelled, current_plan, paid_at, last_activity_at, partner:partners(full_name, referral_code)")
          .order("attributed_at", { ascending: false })
          .limit(500),
        supabase.from("partners").select("id, full_name").order("full_name"),
      ]);
      setLeads((leadsRes.data as any) || []);
      setPartners((partnersRes.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = leads.filter((l) => {
    if (partnerFilter !== "all" && l.partner_id !== partnerFilter) return false;
    if (statusFilter === "paid" && !l.is_paid) return false;
    if (statusFilter === "trial" && !l.is_trial) return false;
    if (statusFilter === "cancelled" && !l.is_cancelled) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(l.email.toLowerCase().includes(q) || (l.name || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const statusBadge = (l: Lead) => {
    if (l.is_cancelled) return <Badge variant="destructive">Cancelado</Badge>;
    if (l.is_paid) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
    if (l.is_trial) return <Badge variant="secondary">Trial</Badge>;
    return <Badge variant="outline">Lead</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leads Indicados</h1>
        <p className="text-sm text-muted-foreground">Todos os usuários cadastrados via link de parceiros</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Parceiro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os parceiros</SelectItem>
                {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="trial">Em trial</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} resultados</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Atribuído em</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
                ) : filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedUserId(l.user_id)}
                  >
                    <TableCell>
                      <div className="font-medium">{l.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.partner?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{l.partner?.referral_code}</div>
                    </TableCell>
                    <TableCell>{statusBadge(l)}</TableCell>
                    <TableCell><span className="capitalize">{l.current_plan || "—"}</span></TableCell>
                    <TableCell className="text-sm">{fmtDate(l.attributed_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.paid_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(o) => !o && setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
