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
  AlertCircle, Percent, Smartphone, FileText, TrendingUp,
} from "lucide-react";
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
  

  const loadCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_campaigns")
      .select("id,name,status,total_leads,sent_count,failed_count,total_responses,created_at,whatsapp_number_id,messages")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24);
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

  // KPI: custo médio por campanha
  const avgCostPerCampaign = useMemo(() => {
    if (!campaigns.length) return 0;
    const total = campaigns.reduce((s, c) => s + (c.sent_count || 0) * COST_PER_MESSAGE, 0);
    return total / campaigns.length;
  }, [campaigns]);

  const totalSpent = useMemo(
    () => campaigns.reduce((s, c) => s + (c.sent_count || 0) * COST_PER_MESSAGE, 0),
    [campaigns]
  );

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
        actions={
          <Button size="sm" onClick={startNewCampaign}>
            <Plus size={14} className="mr-1.5" /> Nova campanha
          </Button>
        }
      />

      {/* KPIs */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={MessageSquare} label="Campanhas" value={fmtN(campaigns.length)} />
          <KpiTile icon={Send} label="Total enviado" value={fmtN(campaigns.reduce((s, c) => s + (c.sent_count || 0), 0))} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const s = STATUS_LABEL[c.status] ?? { label: c.status, tone: "outline" as const };
            const responses = c.total_responses ?? 0;
            const cost = (c.sent_count || 0) * COST_PER_MESSAGE;
            const sendRate = c.total_leads > 0 ? (c.sent_count / c.total_leads) * 100 : 0;
            const num = c.whatsapp_number_id ? numberMap[c.whatsapp_number_id] : null;
            const numberLabel = num ? (num.label || num.phone) : "—";
            const firstMsg = Array.isArray(c.messages) ? (c.messages[0] as string) : "";
            const templatePreview = firstMsg
              ? firstMsg.split("\n")[0].slice(0, 38) + (firstMsg.length > 38 ? "…" : "")
              : "—";

            return (
              <Card
                key={c.id}
                onClick={() => openCampaign(c.id)}
                className="group p-5 border-border/60 hover:border-foreground/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Criada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={s.tone}>{s.label}</Badge>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Metric icon={Users} label="Leads" value={fmtN(c.total_leads)} />
                  <Metric icon={Send} label="Enviados" value={fmtN(c.sent_count)} />
                  <Metric icon={MessageCircle} label="Respostas" value={fmtN(responses)} valueClass="text-emerald-500" />
                  <Metric icon={DollarSign} label="Custo" value={fmtBRL(cost)} />
                  <Metric icon={AlertCircle} label="Erros" value={fmtN(c.failed_count)} valueClass={c.failed_count > 0 ? "text-amber-500" : ""} />
                  <Metric icon={Percent} label="Taxa envio" value={`${sendRate.toFixed(0)}%`} />
                </div>

                {/* Meta info: número | template — divisor centralizado, textos alinhados à esquerda em cada metade */}
                <div className="grid grid-cols-2 items-center border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0 pr-3 border-r border-border/60">
                    <Smartphone size={12} className="shrink-0" />
                    <span className="truncate">{numberLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 pl-3">
                    <FileText size={12} className="shrink-0" />
                    <span className="truncate" title={firstMsg}>{templatePreview}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 border-t border-border/60 pt-3 mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openCampaign(c.id)}>
                    Abrir <ArrowRight size={12} className="ml-1" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto">
                    <MoreHorizontal size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
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

    </MetaLayout>
  );
}

function KpiTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        <Icon size={13} />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
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
        active ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:border-foreground/40"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
