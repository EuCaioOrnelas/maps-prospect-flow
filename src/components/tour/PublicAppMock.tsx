import {
  Bot,
  Calendar,
  CalendarDays,
  Kanban,
  LayoutDashboard,
  MessageCircle,
  Megaphone,
  Phone,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export type MockScreen = "cockpit" | "search" | "gestao";
export type MockSection = "oportunidades" | "meta" | "crm" | "automacao" | null;

/* ------------------------------------------------------------------ */
/*  Sidebar                                                           */
/* ------------------------------------------------------------------ */

const NavItem = ({
  icon: Icon,
  label,
  tour,
  active,
}: {
  icon: any;
  label: string;
  tour?: string;
  active?: boolean;
}) => (
  <li data-ptour={tour} className="relative">
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
      }`}
    >
      {active && <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-primary" />}
      <Icon size={17} />
      <span className="truncate">{label}</span>
    </div>
  </li>
);

const SubItem = ({ label, tour, active }: { label: string; tour?: string; active?: boolean }) => (
  <li data-ptour={tour}>
    <div
      className={`rounded-lg py-1.5 pl-11 pr-3 text-[13px] transition-colors ${
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </div>
  </li>
);

export function MockSidebar({
  openSection,
  activeItem,
}: {
  openSection: MockSection;
  activeItem?: string;
}) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <Logo size="sm" asLink={false} />
      </div>
      <nav className="flex-1 overflow-hidden p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Visão Geral
        </p>
        <ul className="space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" tour="sidebar-dashboard" active={activeItem === "dashboard"} />
          <NavItem icon={CalendarDays} label="Agenda" tour="sidebar-agenda" active={activeItem === "agenda"} />

          <NavItem
            icon={Target}
            label="Prospecção IA"
            tour="sidebar-oportunidades"
            active={openSection === "oportunidades"}
          />
          {openSection === "oportunidades" && (
            <>
              <SubItem label="Buscar" tour="sidebar-oportunidades-buscar" active={activeItem === "buscar"} />
              <SubItem label="Gestão" tour="sidebar-oportunidades-gestao" active={activeItem === "gestao"} />
              <SubItem label="SDR Inteligente" tour="sidebar-oportunidades-sdr" active={activeItem === "sdr"} />
            </>
          )}

          <NavItem icon={Zap} label="Meta • WhatsApp" tour="sidebar-meta" active={openSection === "meta"} />
          {openSection === "meta" && (
            <>
              <SubItem label="Dashboard" tour="sidebar-meta-dashboard" />
              <SubItem label="Campanhas" tour="sidebar-meta-campanhas" />
              <SubItem label="Números & WABA" tour="sidebar-meta-numeros" />
              <SubItem label="Configurações" tour="sidebar-meta-configuracoes" />
            </>
          )}

          <NavItem icon={MessageCircle} label="Atendimento" tour="sidebar-chat" />

          <NavItem icon={Workflow} label="Automação" tour="sidebar-automacao" active={openSection === "automacao"} />
          {openSection === "automacao" && (
            <>
              <SubItem label="Fluxos" tour="sidebar-automacao-fluxos" />
              <SubItem label="Agentes de IA" tour="sidebar-automacao-agentes" />
            </>
          )}

          <NavItem icon={Kanban} label="CRM" tour="sidebar-crm" active={openSection === "crm"} />
          {openSection === "crm" && (
            <>
              <SubItem label="Pipeline" tour="sidebar-crm-pipeline" />
              <SubItem label="Score de contatos" tour="sidebar-crm-score" />
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Screens                                                           */
/* ------------------------------------------------------------------ */

const Bars = () => (
  <div className="flex h-28 items-end gap-1.5">
    {[35, 48, 40, 62, 55, 78, 70, 92, 85, 100, 88, 96].map((h, i) => (
      <div key={i} className="flex-1 rounded-t-md bg-primary/70" style={{ height: `${h}%` }} />
    ))}
  </div>
);

const Kpi = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon size={16} />
    </div>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
    <p className="text-[11px] text-primary">{hint}</p>
  </div>
);

export function CockpitScreen() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bom dia, Você 👋</h1>
          <p className="text-sm text-muted-foreground">Cockpit de Crescimento • últimos 30 dias</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
          Últimos 30 dias
        </div>
      </div>

      {/* Hero */}
      <div data-ptour="cockpit-hero" className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Impacto financeiro gerado</p>
        <div className="mt-1 flex items-end gap-3">
          <p className="text-3xl font-bold text-foreground">R$ 152.340</p>
          <span className="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            +38,4%
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Leads gerados</p>
            <p className="font-semibold text-foreground">1.840</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Conversas ativas</p>
            <p className="font-semibold text-foreground">412</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Oportunidades quentes</p>
            <p className="font-semibold text-foreground">130</p>
          </div>
        </div>
        <div className="mt-4">
          <Bars />
        </div>
      </div>

      {/* KPIs */}
      <div data-ptour="cockpit-kpis" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Receita potencial" value="R$ 325k" hint="+42,7% no período" />
        <Kpi icon={Sparkles} label="Leads quentes hoje" value="130" hint="ontem: 108" />
        <Kpi icon={Star} label="Saúde da operação" value="Saudável" hint="score médio 642" />
        <Kpi icon={Bot} label="Horas salvas pela IA" value="52h" hint="no período" />
      </div>

      {/* Forecast + funil */}
      <div data-ptour="cockpit-forecast" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Projeção de receita por score</p>
          <div className="space-y-2">
            {[
              ["Quente (801-1000)", 130, "R$ 117.300", 100],
              ["Alto (601-800)", 350, "R$ 124.200", 88],
              ["Médio (401-600)", 460, "R$ 55.200", 55],
              ["Baixo (201-400)", 520, "R$ 20.700", 28],
            ].map(([label, count, revenue, w]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {label} · {count} leads
                  </span>
                  <span className="font-medium text-foreground">{revenue}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary/70" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Funil operacional</p>
          <div className="space-y-2">
            {[
              ["Leads prospectados", "1.840", 100],
              ["Mensagens enviadas", "1.420", 78],
              ["Respostas recebidas", "386", 42],
              ["Oportunidades geradas", "47", 18],
            ].map(([label, value, w]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-background p-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchScreen({ typed, loading }: { typed: boolean; loading: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Buscar oportunidades</h1>
        <p className="text-sm text-muted-foreground">
          Encontre empresas reais do Google Maps prontas para prospecção.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nicho / palavra-chave</label>
            <div
              data-ptour="search-keyword"
              className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <Search size={15} className="text-muted-foreground" />
              {typed ? (
                <span className="text-foreground">Clínicas de estética</span>
              ) : (
                <span className="text-muted-foreground/60">Ex.: clínicas, contabilidades, restaurantes…</span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Localização</label>
            <div
              data-ptour="search-location"
              className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <Users size={15} className="text-muted-foreground" />
              {typed ? (
                <span className="text-foreground">São Paulo, SP</span>
              ) : (
                <span className="text-muted-foreground/60">Cidade, estado ou país</span>
              )}
            </div>
          </div>
        </div>

        <div
          data-ptour="search-button"
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          style={
            loading
              ? { boxShadow: "0 0 0 4px hsl(var(--primary) / 0.18), 0 0 40px hsl(var(--primary) / 0.45)" }
              : undefined
          }
        >
          <Search size={16} />
          {loading ? "Buscando empresas…" : "Prospectar oportunidades"}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Prospecções recentes</p>
        <div className="space-y-2">
          {[
            ["Clínicas de estética · São Paulo, SP", "60 empresas"],
            ["Clínicas odontológicas · Belo Horizonte, MG", "60 empresas"],
            ["Academias · Curitiba, PR", "42 empresas"],
          ].map(([label, count]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GestaoScreen({ showLead }: { showLead: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gestão da Prospecção IA</h1>
        <p className="text-sm text-muted-foreground">
          Cada empresa captada recebe score, diagnóstico e abordagem pronta.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-2">
          {[
            ["Studio Glow Estética & Spa", "São Paulo, SP", 87, "Alta"],
            ["Estética Bella Pelle", "Rio de Janeiro, RJ", 91, "Alta"],
            ["DentalCare Premium", "Belo Horizonte, MG", 84, "Alta"],
            ["FitLife Academia", "Curitiba, PR", 76, "Média"],
          ].map(([name, city, score, level], i) => (
            <div
              key={String(name)}
              className={`rounded-xl border bg-card px-3.5 py-3 ${
                i === 0 ? "border-primary/50" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {score}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {city} · oportunidade {String(level).toLowerCase()}
              </p>
            </div>
          ))}
        </div>

        {showLead && (
          <div className="space-y-4">
            <div data-ptour="lead-score-summary" className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Studio Glow Estética & Spa</p>
                  <p className="text-xs text-muted-foreground">Clínica de Estética · São Paulo, SP</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">87</p>
                  <p className="text-[11px] text-muted-foreground">probabilidade 78%</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["Estrutura digital", 22, 25],
                  ["Reputação", 24, 25],
                  ["Acessibilidade", 18, 25],
                  ["Potencial de venda", 13, 25],
                ].map(([label, v, max]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-medium text-foreground">
                        {v}/{max}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary/70"
                        style={{ width: `${(Number(v) / Number(max)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-ptour="lead-approach-card" className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Abordagem gerada por IA</p>
              </div>
              <p className="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-[13px] leading-relaxed text-muted-foreground">
                {`Olá! Vi o trabalho do Studio Glow no Google e fiquei impressionado com as 184 avaliações 5 estrelas.

Trabalho com clínicas de estética implementando atendimento por IA no WhatsApp que responde em segundos, qualifica e já agenda o horário.

Faz sentido eu te mostrar em 10 minutos como funcionaria aí?`}
              </p>
              <div className="mt-3 flex gap-2">
                <div className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Enviar no WhatsApp
                </div>
                <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                  Copiar mensagem
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MockHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar size={15} />
        <span>Demonstração interativa da Wiize</span>
      </div>
      <div className="flex items-center gap-3">
        <Megaphone size={16} className="text-muted-foreground" />
        <Phone size={16} className="text-muted-foreground" />
        <Settings size={16} className="text-muted-foreground" />
        <div className="h-8 w-8 rounded-lg bg-primary/15" />
      </div>
    </header>
  );
}
