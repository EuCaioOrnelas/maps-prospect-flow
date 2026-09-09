import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Building2,
  MessageSquare,
  Target,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Mic,
  History,
  ListChecks,
  ShieldCheck,
  Search,
  Stethoscope,
  LayoutGrid,
  Flame,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const DIMENSIONS = [
  {
    icon: MessageSquare,
    title: "Engajamento",
    desc: "Frequência, ritmo e continuidade da conversa: quem responde, com que velocidade e há quanto tempo a conversa está viva.",
  },
  {
    icon: Target,
    title: "Intenção",
    desc: "Sinais comerciais como preço, prazo, pagamento, proposta, decisão e também objeções e recusas — sempre lidos no contexto da frase.",
  },
  {
    icon: Building2,
    title: "Fit",
    desc: "O quanto a empresa combina com o seu perfil ideal: nicho, região, porte, presença digital e reputação.",
  },
  {
    icon: TrendingUp,
    title: "Momentum",
    desc: "A direção da conversa nos últimos dias: está esquentando, estável ou perdendo força.",
  },
  {
    icon: AlertTriangle,
    title: "Risco",
    desc: "O que pode fazer você perder a venda: mensagem sem resposta, silêncio prolongado, objeção aberta ou queda de interesse.",
  },
  {
    icon: Sparkles,
    title: "Qualidade",
    desc: "Profundidade real da conversa. Dez mensagens de 'ok' não valem mais do que três perguntas comerciais concretas.",
  },
];

const SOURCES = [
  { icon: Search, title: "Prospecção", desc: "Dados da empresa: nicho, cidade, telefone, site, avaliações e presença digital." },
  { icon: Stethoscope, title: "Diagnóstico", desc: "Pontos fortes e lacunas identificadas na análise da empresa antes da conversa." },
  { icon: MessageSquare, title: "Conversas no WhatsApp", desc: "Mensagens recebidas e enviadas, tempo de resposta e continuidade do diálogo." },
  { icon: Mic, title: "Áudios", desc: "Transcritos e analisados exatamente no mesmo caminho de uma mensagem de texto." },
  { icon: LayoutGrid, title: "CRM", desc: "Etapa do funil, responsáveis, histórico e movimentações do lead." },
  { icon: History, title: "Vendas anteriores", desc: "Negócios ganhos e perdidos da sua própria conta viram referência de padrão." },
];

const FLOW = [
  "Empresa",
  "Prospecção",
  "Diagnóstico",
  "Conversa",
  "Análise",
  "Oportunidade",
  "Prioridade",
  "Próxima ação",
  "Venda",
  "Aprendizado",
];

const CONSUMERS = [
  { icon: LayoutGrid, title: "CRM", desc: "O card do lead mostra oportunidade, prioridade e a próxima ação recomendada — sem cálculo próprio." },
  { icon: Bot, title: "Wian", desc: "Responde sobre leads usando os mesmos números da inteligência: o que mudou, qual o risco e o que fazer agora." },
  { icon: Flame, title: "Oportunidades quentes", desc: "Uma visualização da inteligência, não um filtro separado de score." },
  { icon: ListChecks, title: "Automações e painéis", desc: "Alertas, radar de oportunidades e indicadores partem da mesma leitura." },
];

const InteligenciaWiize = () => {
  return (
    <>
      <SEO
        title="Como funciona a Inteligência Comercial do Wiize"
        description="Entenda como o Wiize analisa empresas, conversas de WhatsApp, comportamento e histórico de vendas para identificar intenção de compra, priorizar oportunidades e recomendar a próxima ação."
        keywords="inteligência comercial, CRM inteligente, qualificação de leads, intenção de compra, prospecção inteligente, WhatsApp CRM, priorização de oportunidades, inteligência de vendas"
        url="https://wiize.com.br/inteligencia"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: "Como funciona a Inteligência Comercial do Wiize",
            description:
              "Explicação do funcionamento da inteligência comercial do Wiize: dados analisados, dimensões de leitura, priorização de oportunidades e recomendação de próxima ação.",
            about: "Inteligência comercial aplicada a prospecção, conversas de WhatsApp e CRM",
          },
        ]}
      />

      <div className="landing-light min-h-screen bg-background">
        <Navbar />

        <main className="pt-28 sm:pt-32 pb-20">
          {/* HERO */}
          <section className="container mx-auto px-4 max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Brain className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Wiize Central Intelligence
            </span>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl leading-tight mt-5 mb-5 text-foreground">
              Uma única inteligência lendo empresa, conversa, comportamento e histórico
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
              O Wiize não tem várias inteligências desconectadas. Existe um único cérebro comercial que reúne o que se
              sabe sobre a empresa, o que acontece na conversa e o que já aconteceu nas suas vendas anteriores — e
              transforma isso em prioridade e próxima ação.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button asChild size="lg">
                <Link to="/signup">
                  Começar agora <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/demonstracao">Ver demonstração</Link>
              </Button>
            </div>
          </section>

          {/* ANTES E DEPOIS */}
          <section className="container mx-auto px-4 max-w-5xl mt-20">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-8 text-center">
              O que muda na prática
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Leitura simples</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Mensagem recebida</li>
                  <li>Soma de pontos</li>
                  <li>Um número de score</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Quem fala muito aparece na frente, mesmo sem avançar comercialmente.
                </p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-4">Inteligência do Wiize</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li>Empresa e diagnóstico</li>
                  <li>Conversas, áudios e comportamento</li>
                  <li>Intenção lida no contexto</li>
                  <li>Histórico de vendas ganhas e perdidas</li>
                  <li>Oportunidade, prioridade e próxima ação</li>
                </ul>
                <p className="text-sm text-foreground/80 mt-4">
                  Não basta saber que um lead conversou muito. O Wiize avalia se essa conversa está realmente avançando.
                </p>
              </div>
            </div>
          </section>

          {/* DADOS ANALISADOS */}
          <section className="container mx-auto px-4 max-w-6xl mt-20">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3 text-center">
              O que entra na análise
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              A inteligência começa antes da primeira mensagem e continua depois da venda.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOURCES.map((s) => (
                <article key={s.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* DIMENSÕES */}
          <section className="container mx-auto px-4 max-w-6xl mt-20">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3 text-center">
              As seis leituras de cada oportunidade
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              O Engagement Score continua existindo — agora como uma das dimensões, não como resposta final.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DIMENSIONS.map((d) => (
                <article key={d.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <d.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* FLUXO */}
          <section className="container mx-auto px-4 max-w-5xl mt-20">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-8 text-center">
              O ciclo completo
            </h2>
            <ol className="flex flex-wrap justify-center gap-2">
              {FLOW.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                    {step}
                  </span>
                  {i < FLOW.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground text-center mt-6 max-w-2xl mx-auto">
              Cada venda ganha ou perdida volta para a inteligência. Com o tempo, ela reconhece quais combinações de
              sinais costumam terminar em contrato dentro da sua operação — e quais costumam esfriar.
            </p>
          </section>

          {/* OPPORTUNITY SCORE */}
          <section className="container mx-auto px-4 max-w-5xl mt-20">
            <div className="rounded-xl border border-border bg-card p-6 sm:p-10">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
                O que é o Opportunity Score
              </h2>
              <p className="text-muted-foreground mb-6">
                Não é a quantidade de mensagens trocadas. É a combinação entre engajamento, intenção, qualidade da
                conversa, fit da empresa, momentum, recência, comportamento, risco, etapa e comparação com o seu
                histórico de vendas. A partir dele o Wiize define a prioridade (de P0 a P4) e sugere a próxima ação:
                responder agora, enviar proposta, tratar objeção, cobrar retorno, reativar ou apenas nutrir.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { t: "Explicável", d: "Cada leitura mostra os fatores que aumentaram e os riscos que reduziram a oportunidade." },
                  { t: "Auditável", d: "Toda mudança relevante fica registrada com data, motivo e valor anterior." },
                  { t: "Por conta", d: "Os padrões aprendidos são da sua operação e não são compartilhados entre empresas." },
                ].map((x) => (
                  <div key={x.t} className="rounded-lg border border-border p-4">
                    <p className="font-semibold text-foreground text-sm mb-1">{x.t}</p>
                    <p className="text-sm text-muted-foreground">{x.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* QUEM CONSOME */}
          <section className="container mx-auto px-4 max-w-6xl mt-20">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3 text-center">
              Uma fonte, vários lugares
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              CRM, Wian, oportunidades quentes, automações e painéis leem exatamente a mesma leitura.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CONSUMERS.map((c) => (
                <article key={c.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <c.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* HONESTIDADE */}
          <section className="container mx-auto px-4 max-w-4xl mt-20">
            <div className="rounded-xl border border-border bg-muted/40 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground mb-2">O que a inteligência não faz</h2>
                  <p className="text-sm text-muted-foreground">
                    O Wiize não adivinha quem vai comprar nem garante conversão. Ele identifica sinais, compara com
                    padrões da sua própria operação, aponta riscos e mostra onde a atenção do time rende mais hoje. A
                    decisão continua sendo do vendedor. Semelhança com clientes convertidos indica um padrão parecido —
                    nunca uma venda garantida.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="container mx-auto px-4 max-w-4xl mt-20 text-center">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
              Veja a inteligência funcionando na sua operação
            </h2>
            <p className="text-muted-foreground mb-8">
              Conecte seu WhatsApp, prospecte empresas e acompanhe as oportunidades priorizadas no CRM.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/signup">
                  Criar minha conta <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contato">Falar com o time</Link>
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default InteligenciaWiize;
