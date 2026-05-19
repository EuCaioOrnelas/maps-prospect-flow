import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2, Shield, Lock, CreditCard, Server, FileCheck, ShieldCheck, BadgeCheck, RotateCcw, Rocket, TrendingUp, Building2, Table2, ChevronDown, Target, Users, Bot, Headphones } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodModal, type CustomerData } from "@/components/checkout/PaymentMethodModal";
import { Switch } from "@/components/ui/switch";
import type { LucideIcon } from "lucide-react";

const parsePrice = (price: string) => Number(price.replace(/\./g, '').replace(',', '.'));
const formatPrice = (value: number) => {
  const rounded = Math.round(value);
  if (rounded >= 1000) return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded.toString();
};

const AnimatedPrice = ({ targetPrice, anchorPrice, isVisible }: { targetPrice: string; anchorPrice: string; isVisible: boolean }) => {
  const target = parsePrice(targetPrice);
  const start = parsePrice(anchorPrice);
  const [displayValue, setDisplayValue] = useState(start);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(start - (start - target) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    const timeout = setTimeout(() => requestAnimationFrame(animate), 500);
    return () => clearTimeout(timeout);
  }, [isVisible, target, start]);

  return <span>{formatPrice(displayValue)}</span>;
};

const PRICE_IDS: Record<string, Record<string, string>> = {
  monthly: {
    start: "price_1TLZi1K8CM0R6xMMDOg3MSTp",
    growth: "price_1TLZlSK8CM0R6xMMFtvROCby",
    scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
  },
  annual: {
    start: "price_1TLZkSK8CM0R6xMMwr1Ke1IX",
    growth: "price_1TLZn8K8CM0R6xMMaEz5JuVW",
    scale: "price_1SlylcK8CM0R6xMMyHRWAd8G",
  },
};

type PlanFeature = { text: string; disabled?: boolean; highlight?: boolean; subtle?: boolean; subItems?: string[]; sectionHeader?: string; subDetail?: boolean; isNew?: boolean };

const mainPlans = {
  monthly: [
    {
      name: "Atendimento",
      key: "start",
      price: "196",
      anchorPrice: "392",
      opportunities: "1.000", usageLabel: "Até 1.000 contatos no CRM",
      description: "A camada de Inteligência Operacional da Wiize AI para operar e converter no WhatsApp.",
      features: [
        { text: "Chat ao vivo centralizado para todos os números" },
        { text: "Atendimento contínuo com IA operacional no WhatsApp oficial" },
        { text: "CRM Comercial com IA de Intenção de Compra" },
        { text: "Campanhas outbound em escala via Meta e WhatsApp Cloud" },
        { text: "Fluxos Inteligentes com Wiize AI" },
        { text: "Cockpit Executivo de operação comercial" },
        { text: "Até 2 números WhatsApp conectados" },
        { text: "Suporte por email" },
        { text: "SDR IA disponível no Growth IA", disabled: true },
        { text: "Diagnóstico Comercial com IA no Growth IA", disabled: true },
        { text: "Geração de abordagens por IA no Growth IA", disabled: true },
        { text: "Copiloto IA Closer disponível no Growth IA", disabled: true },
      ] as PlanFeature[],
      popular: false,
      icon: Headphones,
    },
    {
      name: "Growth IA",
      key: "growth",
      price: "696",
      anchorPrice: "1.392",
      opportunities: "3.000", usageLabel: "Até 3.000 oportunidades qualificadas com Wiize AI",
      description: "Operação Comercial completa com Wiize AI: prospecção, conversão e fechamento em um só lugar.",
      features: [
        { text: "Tudo do plano Atendimento" },
        { text: "SDR IA para prospecção B2B por nicho e território" },
        { text: "Diagnóstico Comercial com IA de cada lead" },
        { text: "Geração de abordagens personalizadas por contexto" },
        { text: "Follow-up inteligente com contexto comercial" },
        { text: "Copiloto Comercial IA Closer em conversas" },
        { text: "Fluxos Operacionais avançados com Wiize AI" },
        { text: "Até 5 números WhatsApp conectados" },
        { text: "Suporte prioritário" },
        { text: "Operar com Wiize AI ponta a ponta" },
      ] as PlanFeature[],
      popular: true,
      icon: TrendingUp,
      badge: "⭐",
    },
  ],
  annual: [
    {
      name: "Atendimento",
      key: "start",
      price: "157",
      anchorPrice: "392",
      opportunities: "1.000", usageLabel: "Até 1.000 contatos no CRM",
      description: "A camada de Inteligência Operacional da Wiize AI para operar e converter no WhatsApp.",
      features: [
        { text: "Chat ao vivo centralizado para todos os números" },
        { text: "Atendimento contínuo com IA operacional no WhatsApp oficial" },
        { text: "CRM Comercial com IA de Intenção de Compra" },
        { text: "Campanhas outbound em escala via Meta e WhatsApp Cloud" },
        { text: "Fluxos Inteligentes com Wiize AI" },
        { text: "Cockpit Executivo de operação comercial" },
        { text: "Até 2 números WhatsApp conectados" },
        { text: "Suporte por email" },
        { text: "SDR IA disponível no Growth IA", disabled: true },
        { text: "Diagnóstico Comercial com IA no Growth IA", disabled: true },
        { text: "Geração de abordagens por IA no Growth IA", disabled: true },
        { text: "Copiloto IA Closer disponível no Growth IA", disabled: true },
      ] as PlanFeature[],
      popular: false,
      icon: Headphones,
    },
    {
      name: "Growth IA",
      key: "growth",
      price: "596",
      anchorPrice: "1.392",
      opportunities: "3.000", usageLabel: "Até 3.000 oportunidades qualificadas com Wiize AI",
      description: "Operação Comercial completa com Wiize AI: prospecção, conversão e fechamento em um só lugar.",
      features: [
        { text: "Tudo do plano Atendimento" },
        { text: "SDR IA para prospecção B2B por nicho e território" },
        { text: "Diagnóstico Comercial com IA de cada lead" },
        { text: "Geração de abordagens personalizadas por contexto" },
        { text: "Follow-up inteligente com contexto comercial" },
        { text: "Copiloto Comercial IA Closer em conversas" },
        { text: "Fluxos Operacionais avançados com Wiize AI" },
        { text: "Até 5 números WhatsApp conectados" },
        { text: "Suporte prioritário" },
        { text: "Operar com Wiize AI ponta a ponta" },
      ] as PlanFeature[],
      popular: true,
      icon: TrendingUp,
      badge: "⭐",
    },
  ],
};

const scalePlan = {
  name: "Enterprise",
  key: "scale",
  price: "1.496",
  opportunities: "Personalizado",
  description: "Infraestrutura operacional de IA sob medida para empresas que escalam a operação comercial com Wiize AI.",
  features: [
    { text: "Tudo do plano Growth IA" },
    { text: "Operação Comercial dedicada com Wiize AI", isNew: true },
    { text: "Volume de oportunidades sob demanda" },
    { text: "Fluxos e Inteligências sob medida" },
    { text: "Onboarding com especialista Wiize" },
    { text: "Processamento com prioridade máxima" },
    { text: "Números WhatsApp ilimitados" },
    { text: "Gerente de conta exclusivo" },
  ] as PlanFeature[],
  icon: Building2,
};


export const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; key: string; price: string } | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const plans = isAnnual ? mainPlans.annual : mainPlans.monthly;

  const handleShowComparison = () => {
    setExpanded(true);
    setTimeout(() => {
      comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // Comparison matrix: feature -> { start, growth, scale } where value is boolean or string
  const comparisonGroups: Array<{
    title: string;
    icon: LucideIcon;
    rows: Array<{ label: React.ReactNode; start: boolean | string; growth: boolean | string; scale: boolean | string }>;
  }> = [
    {
      title: "SDR IA · Captação e Diagnóstico",
      icon: Target,
      rows: [
        { label: "Captação automática de leads por nicho e localização", start: false, growth: true, scale: true },
        { label: "Diagnóstico de leads com IA (porte, dores, maturidade digital)", start: false, growth: true, scale: true },
        { label: "Geração de mensagens personalizadas por contexto (IA)", start: false, growth: true, scale: true },
        { label: "Enriquecimento automático (site, contatos, redes sociais)", start: false, growth: true, scale: true },
        { label: "Segmentação por nicho, região e porte da empresa", start: false, growth: true, scale: true },
        { label: "Oportunidades com alto potencial de fechamento", start: false, growth: true, scale: true },
        { label: "Volume de oportunidades captadas / mês", start: "Não incluso", growth: "3.000", scale: "Sob demanda" },
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
      title: "Automação e fluxos",
      icon: Bot,
      rows: [
        { label: "Construtor visual de fluxos (drag & drop)", start: true, growth: true, scale: true },
        { label: "Follow-up inteligente com contexto comercial", start: true, growth: true, scale: true },
        { label: "Gatilhos por palavra-chave, status e evento", start: true, growth: true, scale: true },
        { label: <span className="inline-flex items-center gap-1.5">Fluxos completos gerados com Wiize AI <Sparkles size={13} className="text-primary" /></span>, start: false, growth: true, scale: true },
        { label: "Coleta de dados estruturados via conversa (IA)", start: false, growth: true, scale: true },
        { label: "A/B testing de mensagens e fluxos", start: false, growth: true, scale: true },
        { label: "Fluxos sob medida desenhados pela Wiize", start: false, growth: false, scale: true },
      ],
    },
    {
      title: "IA Closer Wiize",
      icon: Bot,
      rows: [
        { label: "IA Closer treinada com seu negócio", start: false, growth: true, scale: true },
        { label: "Qualifica, agenda e tira dúvidas sozinha", start: false, growth: true, scale: true },
        { label: "Contexto comercial contínuo por conversa", start: false, growth: true, scale: true },
        { label: "Testes e simulações antes de ativar", start: false, growth: true, scale: true },
        { label: "Múltiplas IAs Closer para diferentes produtos e times", start: false, growth: false, scale: true },
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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(comparisonGroups.map((g) => [g.title, true]))
  );
  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  const allOpen = comparisonGroups.every((g) => openGroups[g.title]);
  const setAllGroups = (open: boolean) =>
    setOpenGroups(Object.fromEntries(comparisonGroups.map((g) => [g.title, open])));

  const renderCell = (v: boolean | string) => {
    if (typeof v === "string") return <span className="text-sm font-medium text-foreground">{v}</span>;
    return v ? (
      <Check size={18} className="text-primary mx-auto" strokeWidth={2.5} />
    ) : (
      <span className="text-muted-foreground/40 text-base">—</span>
    );
  };

  const handleCardCheckout = async (customerData: CustomerData) => {
    if (!selectedPlan) return;
    setLoadingPlan(selectedPlan.key);
    try {
      const billingKey = isAnnual ? "annual" : "monthly";
      const priceId = PRICE_IDS[billingKey][selectedPlan.key];
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId, guestEmail: user ? undefined : customerData.email },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.url) {
        window.open(response.data.url, "_blank");
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      toast({ title: "Erro ao iniciar checkout", description: error.message || "Tente novamente mais tarde", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
      setPaymentModalOpen(false);
    }
  };

  const handlePixCheckout = async (_customerData: CustomerData) => {};

  const handlePlanClick = (plan: { name: string; key: string; price: string }) => {
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  return (
    <>
      <section 
        id="pricing" 
        className="py-16 sm:py-24 relative overflow-hidden w-full"
        ref={ref as React.RefObject<HTMLElement>}
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div 
            className={`text-center mb-12 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Planos que <br className="md:hidden" /><span className="text-shimmer-highlight">cabem no bolso</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Um único cliente fechado já paga o plano inteiro.
              Invista em prospecção previsível.
            </p>

            {/* Toggle Annual / Monthly - fixed height container */}
            <div className="flex items-center justify-center gap-3 h-8">
              <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Mensal
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Anual
              </span>
              {/* Always reserve space for the badge */}
              <span className={`bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded-full ml-1 transition-opacity duration-200 ${isAnnual ? 'opacity-100' : 'opacity-0'}`}>
                Economize até 30%
              </span>
            </div>
          </div>

          {/* Start + Growth + Enterprise */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-8">
            {plans.map((plan, index) => (
              <motion.div
                key={`${plan.key}-${isAnnual ? 'annual' : 'monthly'}`}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ 
                  y: -8, 
                  scale: plan.popular ? 1.02 : 1.03,
                  transition: { duration: 0.3 }
                }}
                className={`group relative rounded-2xl flex flex-col overflow-hidden ${
                  plan.popular
                    ? "bg-gradient-card border-2 border-primary shadow-glow p-5 md:p-6 md:z-10"
                    : "glass p-5 md:p-6"
                }`}
                style={{
                  boxShadow: plan.popular
                    ? "inset 0 1px 0 0 hsl(var(--primary) / 0.25), inset 0 0 80px -20px hsl(var(--primary) / 0.35), 0 10px 40px -10px hsl(var(--primary) / 0.35)"
                    : "inset 0 1px 0 0 hsl(var(--primary) / 0.12), inset 0 0 60px -30px hsl(var(--primary) / 0.18)",
                }}
              >
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <plan.icon className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl">{plan.name}</h3>
                    {plan.popular && (
                      <span className="ml-auto inline-flex items-center gap-1 bg-primary/15 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                        <Sparkles size={11} />
                        mais popular
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm min-h-[2.5rem] md:min-h-[2.75rem]">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-muted-foreground line-through decoration-muted-foreground/50 decoration-2 text-sm">R$ {plan.anchorPrice}</span>
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - parsePrice(plan.price) / parsePrice(plan.anchorPrice)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-medium text-muted-foreground">R$</span>
                    <span className="font-display font-bold text-[2.75rem] md:text-[3.5rem] tabular-nums text-foreground leading-none">
                      <AnimatedPrice targetPrice={plan.price} anchorPrice={plan.anchorPrice} isVisible={isVisible} />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/ mês</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground/80 mt-1">cobrado anualmente</p>
                  )}
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      Total R$ {formatPrice(parsePrice(plan.price) * 12)}/ano
                    </p>
                  )}
                  <p className="text-primary mt-2 text-xs sm:text-sm font-medium">
                    {plan.usageLabel}
                  </p>
                </div>

                {expanded && (
                  <ul className="space-y-3 mb-8 text-sm flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${feature.disabled ? 'opacity-50' : ''}`}>
                        {feature.disabled ? (
                          <X size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-muted-foreground">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {!expanded && <div className="flex-grow" />}

                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full mt-auto"
                  onClick={() => handlePlanClick(plan)}
                  disabled={loadingPlan === plan.key}
                >
                  {loadingPlan === plan.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : plan.popular ? (
                    "Escalar com IA"
                  ) : (
                    "Começar Agora"
                  )}
                </Button>
              </motion.div>
            ))}

            {/* Enterprise — inline com Start e Growth */}
            <motion.div
              key={`enterprise-${isAnnual ? 'annual' : 'monthly'}`}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.3 } }}
              className="group relative rounded-2xl flex flex-col overflow-hidden glass p-5 md:p-6"
              style={{
                boxShadow:
                  "inset 0 1px 0 0 hsl(var(--primary) / 0.12), inset 0 0 60px -30px hsl(var(--primary) / 0.18)",
              }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                    <Building2 className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                  </div>
                  <h3 className="font-display font-bold text-lg md:text-xl">Enterprise</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm min-h-[2.5rem] md:min-h-[2.75rem]">
                  {scalePlan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="invisible flex items-center gap-2 mb-2" aria-hidden="true">
                  <span className="text-sm">R$ 0</span>
                  <span className="text-xs font-bold px-2 py-0.5">-0%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-[2rem] md:text-[2.5rem] tabular-nums text-foreground leading-none whitespace-nowrap">
                    Sob medida
                  </span>
                </div>
                <p className="text-primary mt-2 text-xs sm:text-sm font-medium">
                  Oportunidades sob demanda
                </p>
              </div>

              {expanded && (
                <ul className="space-y-3 mb-8 text-sm flex-grow">
                  {scalePlan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!expanded && <div className="flex-grow" />}

              <Button
                variant="outline"
                size="lg"
                className="w-full mt-auto"
                onClick={() => navigate("/enterprise")}
              >
                Falar com Especialista
              </Button>
            </motion.div>
          </div>

          {/* Toggle comparison link */}
          <div className="flex justify-center mb-10">
            {!expanded ? (
              <button
                onClick={handleShowComparison}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
              >
                <Table2 size={15} />
                Veja a comparação detalhada dos planos
              </button>
            ) : (
              <button
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:text-foreground transition-colors"
              >
                <Table2 size={15} />
                Ocultar comparação detalhada
              </button>
            )}
          </div>

          {/* Detailed comparison table */}
          <div ref={comparisonRef} className="scroll-mt-24">
            {expanded && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-16 rounded-3xl border border-border/60 bg-gradient-to-b from-card/60 to-card/20 backdrop-blur-sm overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]"
              >
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
                    onClick={() => setAllGroups(!allOpen)}
                    className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 hover:border-border"
                  >
                    <ChevronDown size={14} className={`transition-transform ${allOpen ? '' : '-rotate-90'}`} />
                    {allOpen ? "Recolher todos" : "Expandir todos"}
                  </button>
                </div>

                {/* Plans header row */}
                <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 md:px-6 py-5 md:py-6 border-b border-border/60 bg-background/40">
                  <div className="flex items-end">
                    <span className="font-display text-base md:text-lg font-bold text-foreground">Planos</span>
                  </div>
                  {[
                    { name: "Atendimento", price: plans[0].price, popular: false },
                    { name: "Growth IA", price: plans[1].price, popular: true },
                    { name: "Enterprise", price: "Sob medida", popular: false, custom: true },
                  ].map((col) => (
                    <div key={col.name} className="text-center px-1 relative">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs md:text-sm font-semibold text-foreground/80">{col.name}</span>
                        {col.popular && (
                          <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                            popular
                          </span>
                        )}
                      </div>
                      {col.custom ? (
                        <div>
                          <p className="font-display text-lg md:text-2xl font-bold text-foreground tracking-tight">Sob medida</p>
                          
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-display text-xl md:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                              R$ {col.price}
                            </span>
                            <span className="text-[10px] md:text-xs font-medium text-muted-foreground">/ mês</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Groups */}
                <div className="divide-y divide-border/60">
                  {comparisonGroups.map((group) => {
                    const isOpen = openGroups[group.title];
                    const Icon = group.icon;
                    return (
                      <div key={group.title}>
                        <button
                          onClick={() => toggleGroup(group.title)}
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
                              className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        <motion.div
                          initial={false}
                          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="pb-2">
                            {group.rows.map((row, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center px-4 md:px-6 py-3 text-sm hover:bg-muted/20 transition-colors"
                              >
                                <span className="text-foreground/90 text-xs md:text-sm pl-12">{row.label}</span>
                                <div className="text-center">{renderCell(row.start)}</div>
                                <div className="text-center bg-primary/[0.04] rounded-md py-1.5">{renderCell(row.growth)}</div>
                                <div className="text-center">{renderCell(row.scale)}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Trust & Security Section */}
          <div 
            className={`transition-all duration-700 delay-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 p-6 md:p-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                    <Shield className="h-4 w-4" />
                    Infraestrutura Profissional
                  </div>
                  
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Segurança e confiança em cada etapa
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Sua operação protegida por padrões de mercado, com transparência total e suporte dedicado.
                  </p>
                </div>
                
                <div className="hidden md:grid md:grid-cols-4 gap-4">
                  {[
                    { icon: Lock, title: "Dados Protegidos", description: "Criptografia ponta a ponta" },
                    { icon: CreditCard, title: "Pagamento Seguro", description: "Processamento certificado" },
                    { icon: Server, title: "Uptime 99.9%", description: "Disponibilidade contínua" },
                    { icon: FileCheck, title: "LGPD Compliant", description: "Proteção de dados" },
                  ].map((item, i) => (
                    <div key={i} className="group p-5 rounded-xl bg-background/60 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-sm text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                        <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      </div>
                      <p className="font-semibold text-foreground mb-1.5 text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:grid md:grid-cols-3 gap-4 mt-4">
                  {[
                    { icon: ShieldCheck, title: "100% Seguro", description: "Pagamento certificado" },
                    { icon: BadgeCheck, title: "Cancele quando quiser", description: "Sem fidelidade" },
                    { icon: RotateCcw, title: "Garantia 7 dias", description: "Devolução sem burocracia" },
                  ].map((item, i) => (
                    <div key={i} className="group p-5 rounded-xl bg-background/60 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-sm text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                        <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      </div>
                      <p className="font-semibold text-foreground mb-1.5 text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="md:hidden space-y-3">
                  {[
                    { icon: Lock, title: "Dados Protegidos", description: "Criptografia ponta a ponta" },
                    { icon: CreditCard, title: "Pagamento Seguro", description: "Processamento certificado" },
                    { icon: Server, title: "Uptime 99.9%", description: "Disponibilidade contínua" },
                    { icon: FileCheck, title: "LGPD Compliant", description: "Proteção de dados" },
                    { icon: ShieldCheck, title: "100% Seguro", description: "Pagamento certificado" },
                    { icon: BadgeCheck, title: "Cancele quando quiser", description: "Sem fidelidade" },
                    { icon: RotateCcw, title: "Garantia 7 dias", description: "Devolução sem burocracia" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        planName={selectedPlan?.name || ""}
        planPrice={selectedPlan?.price || ""}
        planKey={selectedPlan?.key || ""}
        billingPeriod={isAnnual ? "annual" : "monthly"}
        onSelectCard={handleCardCheckout}
        onSelectPix={handlePixCheckout}
        loading={loadingPlan !== null}
        defaultEmail={user?.email || ""}
      />
    </>
  );
};
