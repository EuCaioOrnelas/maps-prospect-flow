import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreatePartnerDialog } from "@/components/admin/partners/CreatePartnerDialog";

interface Partner {
  id: string;
  full_name: string;
  email: string;
  referral_code: string;
  level: "bronze" | "silver" | "gold" | "platinum";
  status: "active" | "inactive" | "blocked";
  total_leads: number;
  total_paid_clients: number;
  lifetime_commission_cents: number;
  created_at: string;
}

const levelColors: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-700 border-amber-700/30",
  silver: "bg-slate-400/10 text-slate-500 border-slate-400/30",
  gold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  platinum: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

export default function AdminPartnersList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("id, full_name, email, referral_code, level, status, total_leads, total_paid_clients, lifetime_commission_cents, created_at")
      .order("created_at", { ascending: false });
    setPartners((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = partners.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.referral_code.toLowerCase().includes(q);
  });

  const copyLink = async (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast({ title: "Link copiado!", description: url });
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const fmt = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Parceiros</h1>
          <p className="text-sm text-muted-foreground">{partners.length} cadastrados · {partners.filter(p => p.status === "active").length} ativos</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={16} /> Criar parceiro
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou código..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Código / Link</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Comissão total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {partners.length === 0 ? "Nenhum parceiro cadastrado ainda. Clique em \"Criar parceiro\" para começar." : "Nenhum resultado."}
                  </TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => copyLink(p.referral_code)} className="inline-flex items-center gap-2 text-sm font-mono bg-muted px-2 py-1 rounded hover:bg-muted/70 transition-colors">
                        {p.referral_code}
                        {copiedCode === p.referral_code ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${levelColors[p.level]}`}>{p.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : p.status === "blocked" ? "destructive" : "secondary"} className="capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.total_leads}</TableCell>
                    <TableCell className="text-right">{p.total_paid_clients}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(p.lifetime_commission_cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreatePartnerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </div>
  );
}
