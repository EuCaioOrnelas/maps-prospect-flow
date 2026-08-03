import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Rocket,
  Search,
  Send,
  Sparkles,
  Target,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";

/* ------------------------------------------------------------------ */
/*  Mock screens                                                      */
/* ------------------------------------------------------------------ */

const Frame = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
      <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
      <span className="ml-2 text-xs font-medium text-muted-foreground">{label}</span>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-border bg-background p-3">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    {hint && <p className="text-[11px] text-primary">{hint}</p>}
  </div>
);

const Bars = () => (
  <div className="flex h-24 items-end gap-1.5">
    {[35, 48, 40, 62, 55, 78, 70, 92, 85, 100].map((h, i) => (
      <motion.div
        key={i}
        initial={{ height: 0 }}
        animate={{ height: `${h}%` }}
        transition={{ delay: i * 0.05, duration: 0.4 }}
        className="flex-1 rounded-t-md bg-primary/70"
      />
    ))}
  </div>
);

const CockpitMock = () => (
  <Frame label="Cockpit de Crescimento">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Receita potencial" value="R$ 184k" hint="+32% no mês" />
      <Stat label="Leads quentes" value="47" hint="hoje" />
      <Stat label="Reuniões" value="12" hint="agendadas pela IA" />
      <Stat label="Horas salvas" value="86h" hint="pela automação" />
    </div>
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Leads captados nos últimos 10 dias</p>
      <Bars />
    </div>
  </Frame>
);

const ProspectMock = () => (
  <Frame label="Prospecção IA — Buscar">
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Nicho</p>
        <div className="rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm text-foreground">
          Clínicas de estética
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Localização</p>
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          São Paulo, SP
        </div>
      </div>
      <div className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
        Buscar oportunidades
      </div>
      <div className="space-y-2 pt-1">
        {[
          ["Clínica Bella Derme", "Score 92", "Alta chance"],
          ["Studio Vitha Estética", "Score 88", "Alta chance"],
          ["Espaço Renove", "Score 74", "Média"],
        ].map(([name, score, tag]) => (
          <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-sm text-foreground">{name}</span>
            <span className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{score}</span>
              <span className="text-muted-foreground">{tag}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const DiagnosisMock = () => (
  <Frame label="Diagnóstico + abordagem por IA">
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Estrutura digital" value="28/35" />
      <Stat label="Reputação" value="31/35" />
      <Stat label="Potencial" value="24/30" />
    </div>
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Mensagem gerada para o primeiro contato</p>
      <p className="text-sm leading-relaxed text-foreground">
        Olá, Bella Derme! Vi que vocês têm 4,8 estrelas com mais de 300 avaliações, mas o site não tem agendamento
        online. Consigo mostrar em 10 minutos como transformar esse tráfego em consultas marcadas. Faz sentido
        conversarmos?
      </p>
    </div>
  </Frame>
);

const SdrMock = () => (
  <Frame label="SDR Inteligente — conversa real">
    <div className="space-y-2.5">
      {[
        ["out", "Oi Marcos! Aqui é a Ana, da Bella Derme. Vi seu interesse em otimizar as vendas. Posso te fazer 2 perguntas rápidas?"],
        ["in", "Pode sim, mas já uso uma agência hoje."],
        ["out", "Perfeito — e como está a previsibilidade de leads com ela hoje? Muitos clientes vinham exatamente desse cenário."],
        ["in", "É bem instável, na verdade."],
        ["out", "Entendi. Tenho quinta às 14h ou sexta às 10h30 para te mostrar um plano. Qual fica melhor?"],
      ].map(([dir, text], i) => (
        <div key={i} className={`flex ${dir === "out" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              dir === "out"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}
          >
            {text}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-4 space-y-1.5 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary">Raciocínio da IA em tempo real</p>
      {["Nome coletado: Marcos", "Objeção identificada: já tem agência", "Dor confirmada: falta de previsibilidade", "Etapa do funil: qualificado → agendamento"].map(
        (t) => (
          <p key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={13} className="text-primary" /> {t}
          </p>
        ),
      )}
    </div>
  </Frame>
);

const AgendaMock = () => (
  <Frame label="Agenda comercial">
    <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-muted-foreground">
      {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
        <div key={d} className="pb-1 font-medium">
          {d}
        </div>
      ))}
      {[
        [null, "09:00 Follow-up", null, "14:00 Bella Derme", "10:30 Studio Vitha"],
        ["11:00 Reunião interna", null, "16:00 Demo", null, "15:00 Fechamento"],
      ]
        .flat()
        .map((slot, i) => (
          <div key={i} className="min-h-[52px] rounded-lg border border-dashed border-border p-1">
            {slot && (
              <div className="rounded-md bg-primary/10 px-1.5 py-1 text-left text-[10px] font-medium leading-tight text-primary">
                {slot}
              </div>
            )}
          </div>
        ))}
    </div>
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background p-3">
      <CalendarDays size={16} className="mt-0.5 text-primary" />
      <p className="text-xs text-muted-foreground">
        O SDR consulta a disponibilidade real do time, oferece só horários livres e cria a reunião sozinho — com
        lembrete por e-mail para você e para o lead.
      </p>
    </div>
  </Frame>
);

const WhatsappMock = () => (
  <Frame label="WhatsApp — API Oficial da Meta">
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Enviadas" value="4.820" />
      <Stat label="Entregues" value="98,4%" />
      <Stat label="Respostas" value="27,1%" />
    </div>
    <div className="mt-4 space-y-2">
      {[
        ["Campanha reativação", "Concluída"],
        ["Prospecção clínicas SP", "Enviando"],
        ["Nutrição pós-demo", "Agendada"],
      ].map(([n, s]) => (
        <div key={n} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
          <span className="text-sm text-foreground">{n}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s}</span>
        </div>
      ))}
    </div>
  </Frame>
);

const CrmMock = () => (
  <Frame label="CRM — pipeline de vendas">
    <div className="grid grid-cols-4 gap-2">
      {[
        ["Prospectado", ["Bella Derme", "Espaço Renove"]],
        ["Contato", ["Studio Vitha"]],
        ["Negociação", ["Clínica Aura"]],
        ["Ganho", ["Derma Vida"]],
      ].map(([col, items]) => (
        <div key={col as string} className="rounded-xl border border-border bg-background p-2">
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{col as string}</p>
          <div className="space-y-1.5">
            {(items as string[]).map((it) => (
              <div key={it} className="rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-foreground">
                {it}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-4 rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">
        Score de 0 a 1.000 por contato: engajamento, intenção de compra e respostas no WhatsApp — os leads quentes
        sobem sozinhos para o topo.
      </p>
    </div>
  </Frame>
);

const FlowMock = () => (
  <Frame label="Fluxos de automação">
    <div className="space-y-2">
      {[
        ["Gatilho", "Lead responde a campanha"],
        ["Mensagem", "Apresentação + pergunta de qualificação"],
        ["IA", "Coleta de dados e classificação"],
        ["Condição", "Qualificado? → SDR / Nutrição"],
        ["Ação CRM", "Move para Negociação"],
      ].map(([tag, text], i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-center text-[11px] font-semibold text-primary">
            {tag}
          </span>
          <span className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {text}
          </span>
        </div>
      ))}
    </div>
  </Frame>
);

/* ------------------------------------------------------------------ */
/*  Steps                                                             */
/* ------------------------------------------------------------------ */

type Step = {
  id: string;
  icon: typeof Search;
  chapter: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    id: "cockpit",
    icon: BarChart3,
    chapter: "Cockpit",
    title: "Sua operação comercial em uma tela",
    body: "O Cockpit reúne receita potencial, leads quentes, reuniões agendadas e o tempo que a IA devolveu para o seu time — atualizado em tempo real.",
    bullets: ["Projeção de receita por score", "Funil operacional completo", "KPIs executivos do dia"],
    visual: <CockpitMock />,
  },
  {
    id: "prospeccao",
    icon: Search,
    chapter: "Captação",
    title: "Prospecção IA: empresas reais em segundos",
    body: "Você escolhe o nicho e a cidade. A Wiize encontra empresas reais, valida os dados e devolve uma lista pronta para abordagem.",
    bullets: ["Busca local, nacional ou internacional", "Dados validados de contato", "Score automático por empresa"],
    visual: <ProspectMock />,
  },
  {
    id: "diagnostico",
    icon: Target,
    chapter: "Inteligência",
    title: "Diagnóstico e abordagem escritos pela IA",
    body: "Cada empresa recebe uma análise de estrutura digital, reputação e potencial — e uma mensagem de primeiro contato personalizada.",
    bullets: ["Score 0–100 por dimensão", "Pontos fortes e fracos do lead", "Mensagem pronta para o WhatsApp"],
    visual: <DiagnosisMock />,
  },
  {
    id: "sdr",
    icon: Bot,
    chapter: "Novidade",
    title: "SDR Inteligente: um pré-vendedor que não dorme",
    body: "O SDR de IA assume a conversa no WhatsApp, qualifica, quebra objeções, faz follow-up e agenda a reunião com o seu time — 24 horas por dia.",
    bullets: [
      "Raciocínio em camadas: contexto, objeção, intenção",
      "Pausa inteligente quando um humano assume",
      "Notificação por e-mail para o vendedor responsável",
    ],
    visual: <SdrMock />,
  },
  {
    id: "agenda",
    icon: CalendarDays,
    chapter: "Novidade",
    title: "Agenda integrada ao SDR",
    body: "A Agenda nativa conhece a disponibilidade real do time. O SDR só oferece horários livres e cria a reunião sozinho, com lembretes automáticos.",
    bullets: ["Visões de dia, semana, mês e lista", "Reuniões comerciais e internas", "Lembretes por e-mail e na plataforma"],
    visual: <AgendaMock />,
  },
  {
    id: "whatsapp",
    icon: Send,
    chapter: "Alcance",
    title: "WhatsApp pela API Oficial da Meta",
    body: "Campanhas com templates aprovados, entregabilidade oficial e acompanhamento de cada envio, resposta e conversa iniciada.",
    bullets: ["Sem risco de bloqueio informal", "Agendamento e limites de segurança", "Métricas de entrega e resposta"],
    visual: <WhatsappMock />,
  },
  {
    id: "crm",
    icon: Users,
    chapter: "Gestão",
    title: "CRM com score automático",
    body: "Todo lead que conversa com a IA cai no pipeline já classificado. Você enxerga onde está o dinheiro sem planilha nenhuma.",
    bullets: ["Kanban com arrastar e soltar", "Score de 0 a 1.000 por contato", "Histórico completo da conversa"],
    visual: <CrmMock />,
  },
  {
    id: "fluxos",
    icon: Workflow,
    chapter: "Automação",
    title: "Fluxos que conectam tudo",
    body: "Monte jornadas completas com mensagens, esperas, condições, nós de IA e integrações com Google Agenda, Sheets e Gmail.",
    bullets: ["Editor visual de fluxos", "Nós de IA e testes A/B", "Ações direto no CRM"],
    visual: <FlowMock />,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

const TourGuiado = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const total = STEPS.length;
  const isFinal = index === total; // extra final step = offer

  const step = STEPS[Math.min(index, total - 1)];
  const progress = useMemo(() => Math.round(((index + 1) / (total + 1)) * 100), [index, total]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [index]);

  const StepIcon = step.icon;

  return (
    <LightThemeWrapper>
      <SEO
        title="Tour Guiado da Wiize — veja a plataforma funcionando"
        description="Percorra o tour guiado da Wiize sem cadastro: prospecção com IA, SDR Inteligente, Agenda, WhatsApp oficial, CRM e automação de vendas B2B."
        keywords="tour guiado wiize, demonstração wiize, sdr inteligente, agenda comercial, prospecção b2b, crm com ia"
        url="https://wiize.com.br/tour-guiado"
      />

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95">
          <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" aria-label="Voltar para a página inicial">
              <Logo />
            </Link>
            <div className="hidden flex-1 items-center gap-3 sm:flex">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {Math.min(index + 1, total + 1)} de {total + 1}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <X size={16} className="mr-1" />
              Sair
            </Button>
          </div>
        </header>

        <main className="container mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
          <AnimatePresence mode="wait">
            {!isFinal ? (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
              >
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <StepIcon size={14} />
                    {step.chapter}
                  </span>
                  <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                    {step.title}
                  </h1>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{step.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={prev} disabled={index === 0}>
                      <ArrowLeft size={16} className="mr-1" />
                      Voltar
                    </Button>
                    <Button onClick={next} className="group">
                      {index === total - 1 ? "Ver o próximo passo" : "Continuar"}
                      <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIndex(total)}
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Pular tour
                    </button>
                  </div>
                </div>

                <div>{step.visual}</div>
              </motion.div>
            ) : (
              <motion.div
                key="offer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto max-w-3xl text-center"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles size={14} />
                  Fim do tour
                </span>
                <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">
                  Agora é hora de otimizar o seu comercial
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Você acabou de ver a operação inteira: captação com IA, SDR Inteligente conversando e agendando,
                  Agenda integrada, WhatsApp oficial, CRM e automação. Ative tudo isso na sua empresa e teste por 7
                  dias com acesso total.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    [Rocket, "Ativação em minutos", "Sem instalação e sem time técnico"],
                    [Clock, "7 dias de teste", "Cartão apenas como garantia, sem cobrança"],
                    [MessageSquare, "Suporte humano", "Time acompanha sua primeira campanha"],
                  ].map(([Icon, title, desc]) => {
                    const I = Icon as typeof Rocket;
                    return (
                      <div key={title as string} className="rounded-xl border border-border bg-card p-4 text-left">
                        <I size={18} className="text-primary" />
                        <p className="mt-2 text-sm font-semibold text-foreground">{title as string}</p>
                        <p className="text-xs text-muted-foreground">{desc as string}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-9 flex flex-col items-center gap-3">
                  {TRIAL_DISABLED ? (
                    <>
                      <Button size="xl" className="rounded-full opacity-60" disabled onClick={notifyTrialDisabled}>
                        Teste grátis indisponível
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Estamos aprimorando a experiência. O teste gratuito será liberado em breve.
                      </p>
                    </>
                  ) : (
                    <>
                      <Link to="/signup/escolher-plano">
                        <Button variant="hero" size="xl" className="group rounded-full">
                          Começar meu teste de 7 dias
                          <ArrowRight className="ml-1 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Cartão como garantia • 7 dias sem cobrança • Cancele quando quiser
                      </p>
                    </>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => setIndex(0)}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Rever o tour
                    </button>
                    <Link to="/" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      Voltar ao site
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isFinal && (
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ir para ${s.title}`}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </LightThemeWrapper>
  );
};

export default TourGuiado;
