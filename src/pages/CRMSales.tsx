import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSales, type SaleStatus } from "@/hooks/useSales";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, FileText, Download, Trash2, Search, CalendarClock, Repeat } from "lucide-react";
import { CRMTabs } from "@/components/crm/CRMTabs";
import { SalesKPIs } from "@/components/crm/SalesKPIs";
import { toast } from "sonner";

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

const STATUS_BADGES: Record<string, { label: string; tone: string }> = {
  active: { label: "Ativo", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  expired: { label: "Expirado", tone: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  renewed: { label: "Renovado", tone: "bg-primary/10 text-primary border-primary/30" },
};

export default function CRMSales() {
  const { user, profile } = useAuth();
  const { sales, metrics, deleteSale, getAttachmentUrl } = useSales();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: sidebarProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (typeFilter !== "all" && s.sale_type !== typeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.lead?.company_name?.toLowerCase().includes(q) ||
          s.lead?.contact_name?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [sales, typeFilter, statusFilter, search]);

  const handleDownload = async (path: string) => {
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível abrir o arquivo");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO title="Vendas & Receita — CRM" description="Controle financeiro das vendas fechadas no CRM" />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="flex flex-col h-screen">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/50">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Vendas & Receita</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Histórico financeiro de vendas fechadas — controle total da sua receita
                  </p>
                </div>
              </div>
            </div>
            <CRMTabs />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-5">
            <SalesKPIs
              totalRevenue={metrics.totalRevenue}
              mrr={metrics.mrr}
              activeSales={metrics.activeSales}
              projected12mo={metrics.projected12mo}
              nextExpiration={metrics.nextExpiration}
            />

            {/* Expirando em breve */}
            {metrics.expiringSoon.length > 0 && (
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Expirando em até 30 dias ({metrics.expiringSoon.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {metrics.expiringSoon.slice(0, 6).map((s) => (
                    <div key={s.id} className="rounded-lg border border-amber-500/20 bg-card p-2.5 text-xs">
                      <p className="font-medium truncate">{s.title || s.lead?.company_name || "Venda"}</p>
                      <p className="text-muted-foreground">
                        {s.lead?.company_name || s.lead?.contact_name || "—"} · expira {fmtDate(s.expiration_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título, cliente ou descrição..."
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                  <SelectItem value="one_time">Venda única</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="renewed">Renovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            <Card className="overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">Nenhuma venda encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mova um lead para "Fechado (Ganho)" no pipeline para registrar uma venda.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Venda</th>
                        <th className="px-4 py-2.5 font-medium">Cliente</th>
                        <th className="px-4 py-2.5 font-medium">Valor</th>
                        <th className="px-4 py-2.5 font-medium">Tipo</th>
                        <th className="px-4 py-2.5 font-medium">Início</th>
                        <th className="px-4 py-2.5 font-medium">Expira</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((s) => {
                        const st = STATUS_BADGES[s.status] || STATUS_BADGES.active;
                        const total = s.sale_type === "recurring" ? s.value * (s.contract_months || 1) : s.value;
                        return (
                          <tr key={s.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <p className="font-medium truncate max-w-[240px]">{s.title || "—"}</p>
                              {s.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[240px]">{s.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.lead?.company_name || s.lead?.contact_name || "—"}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              <div className="font-semibold">{fmtMoney(total)}</div>
                              {s.sale_type === "recurring" && (
                                <div className="text-[10px] text-muted-foreground">{fmtMoney(s.value)}/mês × {s.contract_months}m</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {s.sale_type === "recurring" ? (
                                <Badge variant="outline" className="gap-1"><Repeat className="w-3 h-3" /> Recorrente</Badge>
                              ) : (
                                <Badge variant="outline">Única</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtDate(s.start_date)}</td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtDate(s.expiration_date)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={st.tone}>{st.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {s.receipt_url && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Comprovante" onClick={() => handleDownload(s.receipt_url!)}>
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {s.contract_url && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Contrato" onClick={() => handleDownload(s.contract_url!)}>
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={async () => {
                                    if (!confirm("Excluir esta venda?")) return;
                                    await deleteSale(s.id);
                                    toast.success("Venda removida");
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
