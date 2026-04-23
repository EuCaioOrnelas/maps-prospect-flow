import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Copy, Check, Users, UserCheck, DollarSign, Award, Crown, Medal, Gem, HelpCircle } from "lucide-react";
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

const levelMeta = {
  bronze: { icon: Medal, classes: "bg-amber-700/10 text-amber-600 border-amber-700/30", label: "Bronze" },
  silver: { icon: Award, classes: "bg-slate-400/10 text-slate-400 border-slate-400/30", label: "Silver" },
  gold: { icon: Crown, classes: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", label: "Gold" },
  platinum: { icon: Gem, classes: "bg-sky-400/10 text-sky-400 border-sky-400/30", label: "Platinum" },
} as const;

const statusMeta: Record<Partner["status"], { dot: string; classes: string; label: string }> = {
  active: { dot: "bg-emerald-500 shadow-emerald-500/50 shadow-md", classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", label: "Ativo" },
  inactive: { dot: "bg-muted-foreground/40", classes: "bg-muted text-muted-foreground border-border", label: "Inativo" },
  blocked: { dot: "bg-rose-500", classes: "bg-rose-500/10 text-rose-500 border-rose-500/30", label: "Bloqueado" },
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

  useEffect(() => {
    load();
  }, []);

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

  const totalCommission = partners.reduce((s, p) => s + p.lifetime_commission_cents, 0);
  const activeCount = partners.filter((p) => p.status === "active").length;

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/20 p-6 lg:p-8 backdrop-blur-sm">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/15 p-3 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
                <Users size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Parceiros</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie cadastro, níveis e códigos de indicação dos parceiros do programa.
                </p>
              </div>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-md shadow-primary/20">
              <Plus size={16} /> Criar parceiro
            </Button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl opacity-50" />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-xl p-2 bg-primary/10 ring-1 ring-primary/20 text-primary">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total cadastrados</div>
              <div className="text-2xl font-bold tracking-tight">{partners.length}</div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl opacity-50" />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-xl p-2 bg-primary/10 ring-1 ring-primary/20 text-primary">
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ativos agora</div>
              <div className="text-2xl font-bold tracking-tight">{activeCount}</div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl opacity-50" />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-xl p-2 bg-primary/10 ring-1 ring-primary/20 text-primary">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Comissão acumulada</div>
              <div className="text-2xl font-bold tracking-tight">{fmt(totalCommission)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table card */}
        <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-sm min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou código..."
                  className="pl-9 bg-background/60"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Parceiro</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">
                      <div className="flex items-center gap-1.5">
                        Código / Link
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger>
                            <HelpCircle size={12} className="text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-xs">
                            Clique no código para copiar o link de indicação completo.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Nível</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Leads</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Clientes</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Comissão total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <div className="rounded-2xl bg-muted/50 p-4">
                            <Users size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {partners.length === 0 ? "Nenhum parceiro cadastrado ainda" : "Nenhum resultado"}
                            </p>
                            <p className="text-xs mt-1">
                              {partners.length === 0
                                ? 'Clique em "Criar parceiro" para começar.'
                                : "Tente ajustar sua busca."}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => {
                      const lvl = levelMeta[p.level];
                      const LvlIcon = lvl.icon;
                      const st = statusMeta[p.status];
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div className="font-medium text-sm">{p.full_name}</div>
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => copyLink(p.referral_code)}
                              className="inline-flex items-center gap-2 text-xs font-mono bg-muted/60 hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors group/copy"
                            >
                              {p.referral_code}
                              {copiedCode === p.referral_code ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} className="text-muted-foreground group-hover/copy:text-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${lvl.classes}`}>
                              <LvlIcon size={11} />
                              {lvl.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${st.classes}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.total_leads}</TableCell>
                          <TableCell className="text-right text-sm">{p.total_paid_clients}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {fmt(p.lifetime_commission_cents)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <CreatePartnerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      </div>
    </TooltipProvider>
  );
}
