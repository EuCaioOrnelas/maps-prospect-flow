import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Headphones,
  Users,
  Bot,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Row = {
  label: ReactNode;
  start: boolean | string;
  growth: boolean | string;
  scale: boolean | string;
};

const GROUPS: Array<{ title: string; icon: LucideIcon; rows: Row[] }> = [
  {
    title: "Atendimento e chat",
    icon: Headphones,
    rows: [
      { label: "Chat ao vivo centralizado (todos os números)", start: true, growth: true, scale: true },
      { label: "Atendimento contínuo com IA operacional", start: true, growth: true, scale: true },
      { label: "Respostas automáticas com contexto do lead", start: true, growth: true, scale: true },
      { label: "Múltiplos atendentes no mesmo número", start: true, growth: true, scale: true },
      { label: "Áudio, imagem, documentos e mídias", start: true, growth: true, scale: true },
      { label: "Templates aprovados na Meta", start: true, growth: true, scale: true },
      { label: "Janela de 24h e reabertura automática via template", start: true, growth: true, scale: true },
      { label: "Handoff inteligente: IA passa para humano na hora certa", start: false, growth: true, scale: true },
      { label: "Atendimento dedicado com IA treinada para seu negócio", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "CRM e priorização",
    icon: Users,
    rows: [
      { label: "Contatos totais no CRM", start: "1.000", growth: "3.000", scale: "Ilimitado" },
      { label: "CRM completo com kanban e pipeline visual", start: true, growth: true, scale: true },
      { label: "Score de Intenção de Compra prioriza quem está pronto pra fechar", start: true, growth: true, scale: true },
      { label: "Controle de engajamento por lead em tempo real", start: true, growth: true, scale: true },
      { label: "Identifica leads prontos para upgrade e recompra", start: true, growth: true, scale: true },
      { label: "Detecção de leads frios e reativação automática", start: true, growth: true, scale: true },
      { label: "Tags, filtros avançados e segmentação dinâmica", start: true, growth: true, scale: true },
      { label: "Histórico unificado de conversas e interações", start: true, growth: true, scale: true },
      { label: "Importação e exportação de leads (CSV)", start: true, growth: true, scale: true },
      { label: "Funis personalizados por time e produto", start: false, growth: true, scale: true },
      { label: "Múltiplos pipelines simultâneos", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "Automação e fluxos",
    icon: Bot,
    rows: [
      { label: "Construtor visual de fluxos (drag & drop)", start: true, growth: true, scale: true },
      { label: "Follow-up inteligente com contexto comercial", start: true, growth: true, scale: true },
      { label: "Gatilhos por palavra-chave, status e evento", start: true, growth: true, scale: true },
      {
        label: (
          <span className="inline-flex items-center gap-1.5">
            Fluxos completos gerados com Wiize AI <Sparkles size={13} className="text-primary" />
          </span>
        ),
        start: false,
        growth: true,
        scale: true,
      },
      { label: "Coleta de dados estruturados via conversa (IA)", start: false, growth: true, scale: true },
      { label: "A/B testing de mensagens e fluxos", start: false, growth: true, scale: true },
      { label: "Fluxos sob medida desenhados pela Wiize", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "Campanhas WhatsApp e Meta Ads",
    icon: Target,
    rows: [
      { label: "Campanhas via Meta Cloud API (WhatsApp oficial)", start: true, growth: true, scale: true },
      { label: "Campanhas outbound em escala", start: true, growth: true, scale: true },
      { label: "Integração com Meta Ads", start: true, growth: true, scale: true },
      { label: "Disparos agendados e em lote com delays seguros", start: true, growth: true, scale: true },
      { label: "Campanhas geradas e otimizadas por IA", start: false, growth: true, scale: true },
      { label: "Volume de disparos sob medida", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "SDR IA · Captação e Diagnóstico",
    icon: Target,
    rows: [
      { label: "SDR IA para captação de empresas por nicho e região", start: false, growth: true, scale: true },
      { label: "Diagnóstico de leads com IA (porte, dores, maturidade digital)", start: false, growth: true, scale: true },
      { label: "Geração de mensagens personalizadas por contexto (IA)", start: false, growth: true, scale: true },
      { label: "Enriquecimento inteligente de empresas e contatos", start: false, growth: true, scale: true },
      { label: "Segmentação por nicho, região e porte da empresa", start: false, growth: true, scale: true },
      { label: "Oportunidades com alto potencial de fechamento", start: false, growth: true, scale: true },
      { label: "Contatos totais no CRM", start: "Até 1.000", growth: "Até 10.000", scale: "Ilimitado" },
      { label: "Volume de oportunidades captadas / mês", start: "Não incluso", growth: "3.000", scale: "Sob demanda" },
    ],
  },
  {
    title: "IA Closer Wiize",
    icon: Bot,
    rows: [
      { label: "IA Closer treinada com seu negócio", start: false, growth: true, scale: true },
      { label: "Qualifica, agenda e conduz conversas com contexto comercial", start: false, growth: true, scale: true },
      { label: "Contexto comercial contínuo por conversa", start: false, growth: true, scale: true },
      { label: "Testes e simulações antes de ativar", start: false, growth: true, scale: true },
      { label: "Múltiplas IAs Closer para diferentes produtos e times", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "Análises e crescimento",
    icon: Users,
    rows: [
      { label: "Dashboard de crescimento (cockpit executivo)", start: true, growth: true, scale: true },
      { label: "Funil de conversão por etapa do CRM", start: true, growth: true, scale: true },
      { label: "Relatórios por número, campanha e fluxo", start: true, growth: true, scale: true },
      { label: "Alertas inteligentes de oportunidades quentes", start: false, growth: true, scale: true },
      { label: "Projeção de receita por probabilidade", start: false, growth: true, scale: true },
      { label: "Métricas detalhadas da IA Closer", start: false, growth: true, scale: true },
      { label: "Relatórios personalizados e exportação avançada", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "Integrações",
    icon: Target,
    rows: [
      { label: "Meta Business e WhatsApp Cloud API oficial", start: true, growth: true, scale: true },
      { label: "Google Drive nas oportunidades e negócios", start: true, growth: true, scale: true },
      { label: "Integração com Google Calendar (agendamento automático)", start: false, growth: true, scale: true },
      { label: "Integração com Google Sheets (entrada e saída de dados)", start: false, growth: true, scale: true },
      { label: "Integração com Gmail (envio de e-mails pelo fluxo)", start: false, growth: true, scale: true },
      { label: "Integrações personalizadas sob demanda", start: false, growth: false, scale: true },
    ],
  },
  {
    title: "Infraestrutura e suporte",
    icon: Headphones,
    rows: [
      { label: "Números WhatsApp conectados", start: "Até 2", growth: "Até 5", scale: "Ilimitados" },
      { label: "Proxy dedicado e rotação automática", start: true, growth: true, scale: true },
      { label: "Backup de conversas e dados", start: true, growth: true, scale: true },
      { label: "Suporte", start: "Email", growth: "Prioritário", scale: "Gerente dedicado" },
      { label: "Onboarding com especialista", start: false, growth: false, scale: true },
      { label: "Treinamento da equipe ao vivo", start: false, growth: false, scale: true },
      { label: "SLA garantido e estrutura personalizada", start: false, growth: false, scale: true },
      { label: "Processamento com prioridade máxima", start: false, growth: false, scale: true },
    ],
  },
];

function renderCell(v: boolean | string) {
  if (typeof v === "string")
    return <span className="text-sm font-medium text-foreground">{v}</span>;
  return v ? (
    <Check size={18} className="text-primary mx-auto" strokeWidth={2.5} />
  ) : (
    <span className="text-muted-foreground/40 text-base">—</span>
  );
}

export default function PlanComparisonTable() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.title, true])),
  );
  const allOpen = GROUPS.every((g) => openGroups[g.title]);
  const setAll = (open: boolean) =>
    setOpenGroups(Object.fromEntries(GROUPS.map((g) => [g.title, open])));
  const toggle = (t: string) =>
    setOpenGroups((p) => ({ ...p, [t]: !p[t] }));

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/60 to-card/20 overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 p-6 md:p-8 border-b border-border/60">
        <div>
          <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Comparação detalhada
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5">
            Compare cada recurso, lado a lado, e escolha o plano ideal.
          </p>
        </div>
        <button
          onClick={() => setAll(!allOpen)}
          className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 hover:border-border"
        >
          <ChevronDown size={14} className={`transition-transform ${allOpen ? "" : "-rotate-90"}`} />
          {allOpen ? "Recolher todos" : "Expandir todos"}
        </button>
      </div>

      {/* Plans header row */}
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 md:px-6 py-5 md:py-6 border-b border-border/60 bg-background/40">
        <div className="flex items-end">
          <span className="font-display text-base md:text-lg font-bold text-foreground">Planos</span>
        </div>
        {[
          { name: "Atendimento", price: "196", popular: false },
          { name: "Growth IA", price: "696", popular: true },
          { name: "Enterprise", price: "Sob medida", popular: false, custom: true as const },
        ].map((col) => (
          <div key={col.name} className="text-center px-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs md:text-sm font-semibold text-foreground/80">{col.name}</span>
              {col.popular && (
                <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  popular
                </span>
              )}
            </div>
            {"custom" in col && col.custom ? (
              <p className="font-display text-lg md:text-2xl font-bold text-foreground tracking-tight">
                Sob medida
              </p>
            ) : (
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-xl md:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                  R$ {col.price}
                </span>
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground">/ mês</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Groups */}
      <div className="divide-y divide-border/60">
        {GROUPS.map((group) => {
          const isOpen = openGroups[group.title];
          const Icon = group.icon;
          return (
            <div key={group.title}>
              <button
                onClick={() => toggle(group.title)}
                className="w-full grid grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center px-4 md:px-6 py-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Icon size={16} />
                  </div>
                  <span className="font-display font-bold text-sm md:text-base text-foreground">
                    {group.title}
                  </span>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-3">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {isOpen ? "Recolher" : `${group.rows.length} recursos`}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="pb-2">
                  {group.rows.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center px-4 md:px-6 py-3 text-sm hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-foreground/90 text-xs md:text-sm pl-12">{row.label}</span>
                      <div className="text-center">{renderCell(row.start)}</div>
                      <div className="text-center bg-primary/[0.04] rounded-md py-1.5">
                        {renderCell(row.growth)}
                      </div>
                      <div className="text-center">{renderCell(row.scale)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
