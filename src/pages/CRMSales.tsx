import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSales, computeSalesMetrics } from "@/hooks/useSales";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  FileText,
  Download,
  Trash2,
  Search,
  CalendarClock,
  Repeat,
  Building2,
  User,
  Calendar,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Pencil,
  CircleDollarSign,
  Layers,
  Activity,
  Settings2,
} from "lucide-react";
import { CRMTabs } from "@/components/crm/CRMTabs";
import { SalesKPIs } from "@/components/crm/SalesKPIs";
import { RegisterSaleDialog } from "@/components/crm/RegisterSaleDialog";
import { EditSaleDialog } from "@/components/crm/EditSaleDialog";
import { ExportSalesButton } from "@/components/crm/ExportSalesButton";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAccountRole } from "@/hooks/useAccountRole";
import { canChangeSaleResponsible } from "@/lib/salesPermissions";
import type { Sale } from "@/hooks/useSales";
import { toast } from "sonner";


const initialsOf = (name?: string | null, email?: string | null) => {
  const s = (name || email || "?").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
};


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
  const navigate = useNavigate();
  const location = useLocation();
  const { sales, deleteSale, getAttachmentUrl } = useSales();
  const { members } = useAccountMembers();
  const { role } = useAccountRole();
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m])), [members]);
  const memberNameById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.user_id, m.name || m.email || m.user_id.slice(0, 8)])),
    [members]
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const params = new URLSearchParams(location.search);
  const isRegisterMode = params.get("mode") === "registrar";
  const leadId = params.get("leadId") || (location.state as any)?.leadId || "";
  const leadName = (location.state as any)?.leadName as string | undefined;
  const initialValue = Number((location.state as any)?.initialValue || 0);
  const initialTitle = (location.state as any)?.initialTitle as string | undefined;

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
      if (responsibleFilter !== "all") {
        if (responsibleFilter === "none") {
          if (s.responsible_user_id) return false;
        } else if (responsibleFilter === "me") {
          if (s.responsible_user_id !== user?.id) return false;
        } else if (s.responsible_user_id !== responsibleFilter) {
          return false;
        }
      }
      if (dateFrom && s.start_date < dateFrom) return false;
      if (dateTo && s.start_date > dateTo) return false;
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
  }, [sales, typeFilter, statusFilter, responsibleFilter, search, dateFrom, dateTo, user?.id]);

  // KPIs seguem os filtros ativos (inclusive por responsável)
  const metrics = useMemo(() => computeSalesMetrics(filtered), [filtered]);

  const handleDownload = async (path: string) => {
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível abrir o arquivo");
  };

  const handleOpenLead = (leadId: string) => {
    navigate("/crm", { state: { openLeadId: leadId, openTab: "deals" } });
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setResponsibleFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = !!(
    search ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    responsibleFilter !== "all" ||
    dateFrom ||
    dateTo
  );


  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO title="Vendas & Receita — CRM" description="Controle financeiro das vendas fechadas no CRM" />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="flex flex-col h-screen">
          {/* Header — Wiize format */}
          <div className="flex-shrink-0 border-b border-border/50">
            <div className="px-3 pt-2 pb-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
                      {isRegisterMode ? "Registrar venda" : "Pipeline"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {isRegisterMode
                        ? "Cadastre os detalhes da venda fechada"
                        : "Histórico financeiro de vendas fechadas — controle total da sua receita"}
                    </p>
                  </div>
                </div>
                {isRegisterMode && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/crm/vendas")}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Voltar
                  </Button>
                )}
              </div>
              <CRMTabs />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-5">
            {isRegisterMode ? (
              <Card className="p-4 sm:p-6 rounded-2xl border-border/40 max-w-3xl">
                {leadId ? (
                  <RegisterSaleDialog
                    open
                    embedded
                    embeddedLayout="page"
                    onOpenChange={(open) => {
                      if (!open) navigate("/crm/vendas");
                    }}
                    leadId={leadId}
                    leadName={leadName}
                    initialValue={initialValue}
                    initialTitle={initialTitle}
                    onCreated={() => navigate("/crm/vendas")}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">Selecione um lead para registrar venda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Abra um lead ou mova-o para Fechado (Ganho) para preencher este formulário automaticamente.
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <>
            <SalesKPIs
              totalRevenue={metrics.totalRevenue}
              mrr={metrics.mrr}
              activeSales={metrics.activeSales}
              projected12mo={metrics.projected12mo}
              nextExpiration={metrics.nextExpiration}
            />

            {/* Expirando em breve */}
            {metrics.expiringSoon.length > 0 && (
              <Card className="p-4 border-amber-500/30 bg-amber-500/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">
                    Expirando em até 30 dias ({metrics.expiringSoon.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {metrics.expiringSoon.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-amber-500/20 bg-card p-2.5 text-xs cursor-pointer hover:bg-amber-500/5"
                      onClick={() => handleOpenLead(s.lead_id)}
                    >
                      <p className="font-medium truncate">{s.title || s.lead?.company_name || "Venda"}</p>
                      <p className="text-muted-foreground">
                        {s.lead?.company_name || s.lead?.contact_name || "—"} · expira{" "}
                        {fmtDate(s.expiration_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Filtros - loose, sem card */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar venda ou cliente..."
                    className="pl-9 bg-card/60 border-border/60"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-card/60 border-border/60"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                    <SelectItem value="one_time">Venda única</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-card/60 border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="renewed">Renovado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9 bg-card/60 border-border/60"
                    title="Data inicial"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9 bg-card/60 border-border/60"
                    title="Data final"
                  />
                </div>
              </div>
              {hasFilters && (
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>


            {/* Tabela */}
            <Card className="overflow-hidden rounded-2xl border-border/40">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    {sales.length === 0 ? "Sem dados para análise" : "Nenhuma venda encontrada"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sales.length === 0
                      ? "Mova um lead para \"Fechado (Ganho)\" no pipeline para registrar uma venda."
                      : "Ajuste os filtros para ver outras vendas."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Cliente</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><CircleDollarSign className="w-3 h-3" /> Valor</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><Layers className="w-3 h-3" /> Tipo</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Início</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3 h-3" /> Expira</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><Activity className="w-3 h-3" /> Status</span></th>
                        <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1.5"><User className="w-3 h-3" /> Resp.</span></th>
                        <th className="px-4 py-2.5 font-medium text-right"><span className="inline-flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> Ações</span></th>

                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((s) => {
                        const st = STATUS_BADGES[s.status] || STATUS_BADGES.active;
                        const total =
                          s.sale_type === "recurring" ? s.value * (s.contract_months || 1) : s.value;
                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-muted/25 cursor-pointer transition-colors"
                            onClick={() => handleOpenLead(s.lead_id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  {s.lead?.company_name ? (
                                    <Building2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <User className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[260px] flex items-center gap-1 text-foreground">
                                    {s.lead?.company_name || s.lead?.contact_name || "—"}
                                    <ArrowUpRight className="w-3 h-3 text-muted-foreground/50" />
                                  </p>
                                  {s.title && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                                      {s.title}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              <div className="font-semibold">{fmtMoney(total)}</div>
                              {s.sale_type === "recurring" && (
                                <div className="text-[10px] text-muted-foreground">
                                  {fmtMoney(s.value)} × {s.contract_months} {s.contract_months === 1 ? "mês" : "meses"}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {s.sale_type === "recurring" ? (
                                <Badge variant="outline" className="gap-1">
                                  <Repeat className="w-3 h-3" /> Recorrente
                                </Badge>
                              ) : (
                                <Badge variant="outline">Única</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {fmtDate(s.start_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarClock className="w-3 h-3" />
                                {fmtDate(s.expiration_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={st.tone}>
                                {st.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {(() => {
                                const r = s.responsible_user_id ? memberById[s.responsible_user_id] : null;
                                const label = r?.name || r?.email || "Sem responsável";
                                return (
                                  <div title={label} className="inline-flex">
                                    {r?.avatar_url ? (
                                      <img
                                        src={r.avatar_url}
                                        alt={label}
                                        className="w-7 h-7 rounded-lg object-cover border border-border/60 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center border border-border/60 shrink-0">
                                        {r ? initialsOf(r.name, r.email) : <User className="w-3.5 h-3.5" />}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {s.receipt_url && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Comprovante"
                                    onClick={() => handleDownload(s.receipt_url!)}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {s.contract_url && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Contrato"
                                    onClick={() => handleDownload(s.contract_url!)}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Editar venda"
                                  onClick={() => setEditingSale(s)}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Excluir venda"
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
              </>
            )}
          </div>
        </div>
      </main>
      <EditSaleDialog open={!!editingSale} onOpenChange={(o) => !o && setEditingSale(null)} sale={editingSale} />
    </div>
  );
}

