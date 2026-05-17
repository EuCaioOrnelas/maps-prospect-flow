import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, MoreHorizontal, ArrowRight, MessageSquare, Reply, Bot, UserCheck,
  Search, Tag, Loader2, Sparkles, Users, Send, MessageCircle, DollarSign,
  AlertCircle, Percent, Smartphone, FileText, TrendingUp, Calendar as CalendarIcon, X,
  ChevronLeft, ChevronRight, Copy, Check, Megaphone,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MetaTemplates from "./MetaTemplates";
import MetaReabertura from "./MetaReabertura";
import { RotateCcw } from "lucide-react";

const ITEMS_PER_PAGE = 10;
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Category { id: string; name: string; color: string; }
interface Template { id: string; name: string; body: string; language: string; category_id: string | null; }
interface CampaignRow {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  total_responses: number | null;
  created_at: string;
  whatsapp_number_id: string | null;
  messages: any;
  leads: any;
  current_lead_index: number | null;
}

// Custo médio estimado por mensagem enviada via Meta Cloud (BRL)
const COST_PER_MESSAGE = 0.12;
const fmtN = (n: number) => n.toLocaleString("pt-BR");
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "outline" }> = {
  running: { label: "Ativa", tone: "default" },
  paused: { label: "Pausada", tone: "secondary" },
  scheduled: { label: "Agendada", tone: "outline" },
  completed: { label: "Concluída", tone: "outline" },
  archived: { label: "Arquivada", tone: "outline" },
  pending: { label: "Pendente", tone: "outline" },
  postponed: { label: "Adiada", tone: "secondary" },
};

export default function MetaCampanhas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [numberMap, setNumberMap] = useState<Record<string, { phone: string; label: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsCampaign, setDetailsCampaign] = useState<CampaignRow | null>(null);

  const loadCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_campaigns")
      .select("id,name,status,total_leads,sent_count,failed_count,total_responses,created_at,whatsapp_number_id,messages,leads,current_lead_index")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data as CampaignRow[]) || [];
    setCampaigns(rows);

    const numIds = Array.from(new Set(rows.map(r => r.whatsapp_number_id).filter(Boolean))) as string[];
    if (numIds.length) {
      const { data: nums } = await supabase
        .from("whatsapp_numbers")
        .select("id,phone_number,label")
        .in("id", numIds);
      const map: Record<string, { phone: string; label: string | null }> = {};
      (nums || []).forEach((n: any) => { map[n.id] = { phone: n.phone_number, label: n.label }; });
      setNumberMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadCampaigns(); }, [user?.id]);

  // Filtros (busca, status, intervalo de datas)
  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const to = dateRange?.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : (from ? new Date(dateRange!.from!).setHours(23, 59, 59, 999) : null);
    return campaigns.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (from !== null) {
        const t = new Date(c.created_at).getTime();
        if (t < from) return false;
        if (to !== null && t > to) return false;
      }
      return true;
    });
  }, [campaigns, search, statusFilter, dateRange]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE));
  const pagedCampaigns = useMemo(
    () => filteredCampaigns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredCampaigns, currentPage]
  );

  // KPI: custo médio por campanha
  const avgCostPerCampaign = useMemo(() => {
    if (!filteredCampaigns.length) return 0;
    const total = filteredCampaigns.reduce((s, c) => s + (c.sent_count || 0) * COST_PER_MESSAGE, 0);
    return total / filteredCampaigns.length;
  }, [filteredCampaigns]);

  const totalSpent = useMemo(
    () => filteredCampaigns.reduce((s, c) => s + (c.sent_count || 0) * COST_PER_MESSAGE, 0),
    [filteredCampaigns]
  );

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    campaigns.forEach((c) => s.add(c.status));
    return Array.from(s);
  }, [campaigns]);

  const startNewCampaign = () => {
    sessionStorage.setItem(
      "meta_campaign_preset",
      JSON.stringify({ source: "meta_platform" })
    );
    navigate("/meta-campaigns");
  };

  const openCampaign = (_id: string) => navigate("/meta-campaigns");

  return (
    <MetaLayout title="Campanhas" description="Crie, agende e monitore campanhas de relacionamento via Meta Cloud API.">
      <MetaPageHeader
        title="Campanhas"
        description="Crie campanhas a partir dos seus templates Wiize e acompanhe envios, respostas, custo e ROI em tempo real."
      />

      <Tabs defaultValue="campanhas" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="bg-muted/40 border border-border/60 p-1 h-9">
            <TabsTrigger value="campanhas" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Megaphone size={13} /> Campanhas
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <FileText size={13} /> Templates
            </TabsTrigger>
            <TabsTrigger value="reabertura" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <RotateCcw size={13} /> Reabertura
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="campanhas" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <Button size="sm" onClick={startNewCampaign}>
              <Plus size={14} className="mr-1.5" /> Nova campanha
            </Button>
          </div>

      {/* KPIs */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={MessageSquare} label="Campanhas" value={fmtN(filteredCampaigns.length)} />
          <KpiTile icon={Send} label="Total enviado" value={fmtN(filteredCampaigns.reduce((s, c) => s + (c.sent_count || 0), 0))} />
          <KpiTile icon={DollarSign} label="Custo total" value={fmtBRL(totalSpent)} />
          <KpiTile icon={TrendingUp} label="Custo médio / campanha" value={fmtBRL(avgCostPerCampaign)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} /> Carregando campanhas…
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 border-dashed text-center">
          <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={28} />
          <p className="font-medium">Nenhuma campanha ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Crie sua primeira campanha a partir de um template.</p>
          <Button className="mt-4" size="sm" onClick={startNewCampaign}>
            <Plus size={14} className="mr-1.5" /> Nova campanha
          </Button>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          {/* Toolbar de filtros */}
          <div className="flex flex-col gap-3 p-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Todas</Chip>
                {statusOptions.map((st) => (
                  <Chip key={st} active={statusFilter === st} onClick={() => setStatusFilter(st)}>
                    {STATUS_LABEL[st]?.label ?? st}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-9 justify-start text-left font-normal gap-2", !dateRange && "text-muted-foreground")}
                  >
                    <CalendarIcon size={14} />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM", { locale: ptBR })} –{" "}
                          {format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
                      )
                    ) : (
                      <span>Filtrar por data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border/60 shadow-lg bg-popover" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={ptBR}
                    showOutsideDays={false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    classNames={{
                      caption_label: "text-sm font-medium text-foreground",
                      nav_button:
                        "h-7 w-7 rounded-full border border-border bg-background p-0 text-foreground opacity-100 hover:bg-muted hover:text-foreground inline-flex items-center justify-center [&_svg]:m-0",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                      day: "h-9 w-9 p-0 font-normal text-foreground rounded-md hover:bg-muted hover:text-foreground aria-selected:opacity-100 transition-colors",
                      day_selected:
                        "bg-transparent text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground",
                      day_range_start:
                        "day-range-start !bg-primary !text-primary-foreground rounded-md hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
                      day_range_end:
                        "day-range-end !bg-primary !text-primary-foreground rounded-md hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
                      day_range_middle:
                        "!bg-transparent !text-foreground hover:!bg-primary/20 rounded-none",
                      day_today: "border border-primary/50 text-foreground",
                      day_outside: "text-muted-foreground/30 opacity-0 pointer-events-none",
                      day_disabled: "!text-muted-foreground/30",
                    }}
                  />
                  <div className="flex items-center justify-end gap-1.5 px-3 py-2 border-t border-border/60 bg-muted/20">
                    {[
                      { label: "7 dias", days: 7 },
                      { label: "30 dias", days: 30 },
                      { label: "60 dias", days: 60 },
                      { label: "90 dias", days: 90 },
                    ].map((q) => (
                      <Button
                        key={q.days}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(to.getDate() - (q.days - 1));
                          setDateRange({ from, to });
                        }}
                      >
                        {q.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {(dateRange || statusFilter !== "all" || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-muted-foreground"
                  onClick={() => { setDateRange(undefined); setStatusFilter("all"); setSearch(""); }}
                >
                  <X size={14} className="mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Tabela */}
          {filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma campanha encontrada com os filtros atuais.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60 bg-muted/20">
                  <TableHead className="w-[28%]">
                    <span className="inline-flex items-center gap-1.5"><MessageSquare size={12} /> Campanha</span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5"><Tag size={12} /> Status</span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5"><Smartphone size={12} /> Número</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><Users size={12} /> Leads</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><Send size={12} /> Enviados</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><Reply size={12} /> Respostas</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><AlertCircle size={12} /> Erros</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><Percent size={12} /> Taxa</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5"><DollarSign size={12} /> Custo</span>
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCampaigns.map((c) => {
                  const s = STATUS_LABEL[c.status] ?? { label: c.status, tone: "outline" as const };
                  const responses = c.total_responses ?? 0;
                  const cost = (c.sent_count || 0) * COST_PER_MESSAGE;
                  const sendRate = c.total_leads > 0 ? (c.sent_count / c.total_leads) * 100 : 0;
                  const num = c.whatsapp_number_id ? numberMap[c.whatsapp_number_id] : null;
                  const phoneTail = num?.phone ? `•••• ${num.phone.replace(/\D/g, "").slice(-4)}` : "—";
                  const numberLabel = num ? (num.label ? `${num.label} · ${phoneTail}` : phoneTail) : "—";

                  return (
                    <TableRow
                      key={c.id}
                      onClick={() => openCampaign(c.id)}
                      className="cursor-pointer border-border/50 hover:bg-muted/30"
                    >
                      <TableCell className="py-3">
                        <div className="min-w-0 max-w-[260px]">
                          <p className="font-medium text-foreground truncate" title={c.name}>{c.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <CalendarIcon size={10} />
                            {format(new Date(c.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={s.tone}>{s.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                          <Smartphone size={12} className="shrink-0" />
                          <span className="truncate max-w-[140px]">{numberLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtN(c.total_leads)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtN(c.sent_count)}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">{fmtN(responses)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", c.failed_count > 0 && "text-amber-500")}>{fmtN(c.failed_count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{sendRate.toFixed(0)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(cost)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetailsCampaign(c)}
                          title="Ver detalhes"
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {filteredCampaigns.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                {filteredCampaigns.length.toLocaleString("pt-BR")} campanha(s) — Página {currentPage.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")}
              </span>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="h-8 px-2 text-xs">
                  <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 px-2">
                  <ChevronLeft size={16} />
                </Button>
                {(() => {
                  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 4) pages.push("ellipsis-start");
                    const start = Math.max(2, currentPage - 2);
                    const end = Math.min(totalPages - 1, currentPage + 2);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (currentPage < totalPages - 3) pages.push("ellipsis-end");
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) => {
                    if (p === "ellipsis-start" || p === "ellipsis-end") {
                      return <span key={`${p}-${idx}`} className="px-1 text-muted-foreground text-xs select-none">…</span>;
                    }
                    return (
                      <Button
                        key={`page-${p}-${idx}`}
                        size="sm"
                        variant={p === currentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(p)}
                        className="h-8 min-w-[2rem] px-2 text-xs"
                      >
                        {p.toLocaleString("pt-BR")}
                      </Button>
                    );
                  });
                })()}
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 px-2">
                  <ChevronRight size={16} />
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 px-2 text-xs">
                  <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Fluxo da campanha */}
      <Card className="p-6 border-border/60">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground">Fluxo da campanha Meta</h3>
          <p className="text-xs text-muted-foreground">Como cada lead percorre a campanha</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { icon: MessageSquare, title: "Template Wiize", desc: "Template aprovado é enviado ao lead pela Meta Cloud API." },
            { icon: Reply, title: "Lead responde", desc: "A resposta abre a janela de 24h e habilita o próximo passo." },
            { icon: Bot, title: "IA envia CTA", desc: "Mensagem gerada por IA é enviada como CTA para validar interesse." },
            { icon: UserCheck, title: "Handoff humano", desc: "Quando o lead demonstra interesse, o operador assume na inbox." },
          ].map((s, i) => (
            <div key={s.title} className="relative">
              <div className="rounded-xl border border-border/60 p-4 bg-card h-full">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <s.icon size={16} />
                </div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
              {i < 3 && (
                <ArrowRight className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
              )}
            </div>
          ))}
        </div>
      </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-0">
          <MetaTemplates embedded />
        </TabsContent>
      </Tabs>

      <CampaignDetailsDialog
        campaign={detailsCampaign}
        numberMap={numberMap}
        onClose={() => setDetailsCampaign(null)}
      />
    </MetaLayout>
  );
}

function CampaignDetailsDialog({
  campaign,
  numberMap,
  onClose,
}: {
  campaign: CampaignRow | null;
  numberMap: Record<string, { phone: string; label: string | null }>;
  onClose: () => void;
}) {
  const open = !!campaign;
  const c = campaign;
  const s = c ? STATUS_LABEL[c.status] ?? { label: c.status, tone: "outline" as const } : null;
  const responses = c?.total_responses ?? 0;
  const sent = c?.sent_count ?? 0;
  const failed = c?.failed_count ?? 0;
  const total = c?.total_leads ?? 0;
  const pending = Math.max(0, total - sent - failed);
  const cost = sent * COST_PER_MESSAGE;
  const sendRate = total > 0 ? (sent / total) * 100 : 0;
  const responseRate = sent > 0 ? (responses / sent) * 100 : 0;
  const failRate = total > 0 ? (failed / total) * 100 : 0;
  const num = c?.whatsapp_number_id ? numberMap[c.whatsapp_number_id] : null;
  const phoneFull = num?.phone ? num.phone : "—";

  // messages may be array of {body, ...} or { items: [...] } or string
  const messagesList: string[] = (() => {
    if (!c?.messages) return [];
    const m = c.messages;
    if (Array.isArray(m)) return m.map((x: any) => (typeof x === "string" ? x : x?.body ?? x?.text ?? JSON.stringify(x)));
    if (typeof m === "string") return [m];
    if (m?.items && Array.isArray(m.items)) return m.items.map((x: any) => (typeof x === "string" ? x : x?.body ?? x?.text ?? JSON.stringify(x)));
    if (m?.body) return [m.body];
    return [];
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        {c && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="truncate" title={c.name}>{c.name}</DialogTitle>
                  <DialogDescription className="inline-flex items-center gap-1.5 mt-1">
                    <CalendarIcon size={12} />
                    Criada em {format(new Date(c.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </DialogDescription>
                </div>
                {s && <Badge variant={s.tone} className="shrink-0">{s.label}</Badge>}
              </div>
            </DialogHeader>

            {/* Resumo de envio */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Send size={12} /> Relatório de envio
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Metric icon={Users} label="Leads" value={fmtN(total)} />
                <Metric icon={Send} label="Enviados" value={fmtN(sent)} />
                <Metric icon={Reply} label="Respostas" value={fmtN(responses)} />
                <Metric icon={AlertCircle} label="Erros" value={fmtN(failed)} valueClass={failed > 0 ? "text-amber-500" : ""} />
                <Metric icon={Percent} label="Taxa de envio" value={`${sendRate.toFixed(1)}%`} />
                <Metric icon={Percent} label="Taxa de resposta" value={`${responseRate.toFixed(1)}%`} />
                <Metric icon={Percent} label="Taxa de erro" value={`${failRate.toFixed(1)}%`} />
                <Metric icon={DollarSign} label="Custo total" value={fmtBRL(cost)} />
              </div>
              {pending > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                  <Loader2 size={10} /> {fmtN(pending)} ainda em fila/processamento
                </p>
              )}
            </section>

            {/* Progresso visual */}
            <section>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{fmtN(sent + failed)} / {fmtN(total)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-primary" style={{ width: `${total ? (sent / total) * 100 : 0}%` }} />
                <div className="h-full bg-amber-500" style={{ width: `${total ? (failed / total) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" /> Enviado</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Erro</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/30" /> Pendente</span>
              </div>
            </section>

            {/* Canal */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Smartphone size={12} /> Canal de envio
              </h4>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Número</span>
                  <span className="font-medium tabular-nums">{phoneFull}</span>
                </div>
                {num?.label && (
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <span className="text-muted-foreground">Identificação</span>
                    <span className="font-medium">{num.label}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Template usado */}
            {messagesList.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                  <MessageSquare size={12} /> Template usado
                </h4>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-sm whitespace-pre-wrap text-foreground">{messagesList[0]}</p>
                </div>
              </section>
            )}

            {/* Números pendentes / não enviados */}
            <PendingNumbersSection campaign={c} />

            {/* Identificadores */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <FileText size={12} /> Identificador
              </h4>
              <CopyableId id={c.id} />
            </section>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold tabular-nums text-foreground truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon, label, value, valueClass = "",
}: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2 border border-border/40">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        <Icon size={10} />
        <p className="text-[10px] uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center gap-2">
      <code className="text-xs font-mono text-muted-foreground break-all flex-1 min-w-0">{id}</code>
      <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={handleCopy}>
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        <span className="text-[11px]">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  );
}

function PendingNumbersSection({ campaign }: { campaign: CampaignRow }) {
  const leads = Array.isArray(campaign.leads) ? campaign.leads : [];
  const idx = campaign.current_lead_index ?? 0;
  const pendingPhones: string[] = leads.slice(idx).map((l: any) => l?.phone).filter(Boolean);
  const failedCount = campaign.failed_count ?? 0;
  // Best effort: failed phones are not stored individually; show pending only.
  if (pendingPhones.length === 0 && failedCount === 0) return null;
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
        <AlertCircle size={12} /> Envios pendentes / com erro
      </h4>
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Loader2 size={10} /> Pendentes: <span className="text-foreground font-semibold tabular-nums">{pendingPhones.length}</span></span>
          <span className="inline-flex items-center gap-1"><AlertCircle size={10} /> Erros: <span className={`font-semibold tabular-nums ${failedCount > 0 ? "text-amber-500" : "text-foreground"}`}>{failedCount}</span></span>
        </div>
        {pendingPhones.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
            {pendingPhones.map((p, i) => (
              <code key={i} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground">
                {p}
              </code>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TemplatePickerDialog({
  open, onClose, onSelect,
}: {
  open: boolean; onClose: () => void; onSelect: (t: Template | null) => void;
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      supabase.from("wiize_message_templates").select("*").eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false }),
      supabase.from("wiize_template_categories").select("*").eq("user_id", user.id).order("name"),
    ]).then(([{ data: tpls }, { data: cats }]) => {
      setTemplates((tpls as Template[]) || []);
      setCategories((cats as Category[]) || []);
      setLoading(false);
    });
  }, [open, user?.id]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filter === "uncategorized") list = list.filter((t) => !t.category_id);
    else if (filter !== "all") list = list.filter((t) => t.category_id === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(s) || t.body.toLowerCase().includes(s));
    }
    return list;
  }, [templates, filter, search]);

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>
            Escolha um template Wiize para iniciar. Você seguirá com seleção de leads, configurações e confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>Todos</Chip>
            <Chip active={filter === "uncategorized"} onClick={() => setFilter("uncategorized")}>Sem categoria</Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={filter === c.id} color={c.color} onClick={() => setFilter(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…" className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="overflow-y-auto -mx-6 px-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={16} /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-medium text-sm">Nenhum template encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie templates em Meta Platform → Templates.
              </p>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => onSelect(null)}>
                <Sparkles size={13} className="mr-1.5" /> Continuar sem template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
              {filtered.map((t) => {
                const cat = t.category_id ? catById.get(t.category_id) : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t)}
                    className="text-left rounded-lg border border-border/60 hover:border-foreground/40 p-4 bg-card transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      {cat ? (
                        <Badge className="border-0 shrink-0" style={{ background: `${cat.color}22`, color: cat.color }}>
                          <Tag size={10} className="mr-1" />{cat.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-[10px]">Sem categoria</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Pular e continuar sem template
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  active, children, onClick, color,
}: { active: boolean; children: React.ReactNode; onClick: () => void; color?: string; }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-all ${
        active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-foreground border-border hover:border-primary/40"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
