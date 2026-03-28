import { useState } from "react";
import { ArrowLeft, HelpCircle, Search, Brain, MessageSquare, CreditCard, Shield, Flame, Bot, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

const categories = [
  {
    id: "plataforma",
    title: "Plataforma",
    icon: Brain,
    questions: [
      {
        question: "O que é o Wiize?",
        answer: "O Wiize é uma plataforma completa de prospecção inteligente que utiliza IA para encontrar leads qualificados no Google Maps e automatizar o contato via WhatsApp. Combinamos busca estratégica, CRM integrado, agentes de IA e disparos em massa em uma única solução."
      },
      {
        question: "Como funciona o período gratuito?",
        answer: "Ao criar sua conta, você recebe 10 buscas estratégicas grátis para testar a plataforma. Não é necessário cartão de crédito. Após usar suas buscas gratuitas, você pode fazer upgrade para um dos nossos planos."
      },
      {
        question: "O que é uma busca estratégica?",
        answer: "Uma busca estratégica é uma pesquisa inteligente que utiliza nossa IA para analisar empresas no Google Maps e entregar apenas leads qualificados: empresas ativas, com contatos verificados e alto potencial de conversão. Cada busca retorna até 50 leads pré-qualificados."
      },
      {
        question: "Preciso instalar algum software?",
        answer: "Não. O Wiize é 100% online e funciona diretamente no navegador. Basta criar sua conta e começar a usar. Não é necessário instalar extensões, plugins ou softwares adicionais."
      },
      {
        question: "Os dados dos leads são atualizados?",
        answer: "Sim. Todos os dados são extraídos diretamente do Google Maps em tempo real no momento da sua busca, garantindo informações sempre atualizadas como telefone, site, endereço e avaliações."
      },
    ]
  },
  {
    id: "whatsapp",
    title: "WhatsApp e Disparos",
    icon: MessageSquare,
    questions: [
      {
        question: "Como funcionam os disparos em massa via WhatsApp?",
        answer: "Cada número WhatsApp conectado pode enviar até 200 mensagens por dia, respeitando as políticas anti-banimento. O sistema usa delays aleatórios, variações de texto e pausas automáticas para simular comportamento humano. O limite é resetado automaticamente à meia-noite."
      },
      {
        question: "Quantos números WhatsApp posso conectar?",
        answer: "Depende do seu plano: Start permite 1 número (200 disparos/dia), Growth permite 2 números (400 disparos/dia no total), e Scale permite 5 números (1.000 disparos/dia no total). Cada número tem limite individual de 200 disparos."
      },
      {
        question: "Meu número pode ser bloqueado?",
        answer: "O Wiize implementa diversas proteções como delays inteligentes, variações de texto e limites diários. Porém, bloqueios são decisões exclusivas do WhatsApp. Recomendamos usar o Aquecimento de Chips antes de iniciar campanhas e seguir as boas práticas de envio."
      },
      {
        question: "Quais práticas devo evitar para não ser bloqueado?",
        answer: "Evite: enviar mensagens para contatos que não conhecem você, usar textos muito comerciais ou com muitos links, enviar o mesmo texto para muitas pessoas, ignorar solicitações de parada e enviar mensagens fora do horário comercial. Prefira sempre uma abordagem personalizada."
      },
      {
        question: "Posso personalizar as mensagens?",
        answer: "Sim! Você pode criar múltiplas variações de mensagem para cada campanha. O sistema rotaciona automaticamente entre as variações, tornando os envios mais naturais e reduzindo o risco de detecção como spam."
      },
    ]
  },
  {
    id: "meta-api",
    title: "Meta API Oficial",
    icon: Shield,
    questions: [
      {
        question: "O que é a Meta API Oficial?",
        answer: "A Meta API Oficial (Cloud API v21.0) é a interface autorizada pelo Meta/Facebook para envio de mensagens via WhatsApp Business. Ela oferece máxima confiabilidade, criptografia de ponta a ponta e conformidade total com as políticas do WhatsApp."
      },
      {
        question: "O Wiize é um Meta Business Partner?",
        answer: "Sim. O Wiize é integrado como Meta Business Partner, o que garante acesso à API oficial com suporte direto da Meta e total conformidade com as diretrizes de uso da plataforma."
      },
      {
        question: "Qual a diferença entre API Oficial e Evolution API?",
        answer: "A API Oficial do Meta é usada para campanhas de relacionamento (inbound), com templates aprovados e máxima segurança. A Evolution API é utilizada para prospecção outbound com estratégias de aquecimento. O Wiize combina ambas para oferecer a melhor experiência em cada cenário."
      },
      {
        question: "Preciso de uma conta Meta Business?",
        answer: "Para campanhas via API Oficial (relacionamento/inbound), sim — você conecta sua conta Meta Business diretamente pelo Wiize em poucos cliques. Para prospecção outbound com disparos em massa, não é necessário. Basta conectar seu número WhatsApp pelo QR Code."
      },
      {
        question: "As mensagens pela API Oficial são criptografadas?",
        answer: "Sim. Todas as mensagens enviadas pela Meta API Oficial possuem criptografia de ponta a ponta, garantindo que apenas você e o destinatário tenham acesso ao conteúdo. Nem o Wiize nem o WhatsApp podem ler o conteúdo criptografado."
      },
    ]
  },
  {
    id: "aquecimento",
    title: "Aquecimento de Chips",
    icon: Flame,
    questions: [
      {
        question: "O que é o Aquecimento de Chips?",
        answer: "O Aquecimento de Chips é um sistema inteligente que prepara números novos ou inativos para uso comercial em 20 dias. Funciona em 4 níveis progressivos: nos primeiros 5 dias envia mensagens simples, depois evolui para interações mais naturais e mensagens pré-comerciais."
      },
      {
        question: "O aquecimento garante que meu número não será bloqueado?",
        answer: "Não. O aquecimento reduz significativamente o risco de bloqueio ao construir reputação gradualmente, mas não elimina completamente essa possibilidade. O WhatsApp utiliza algoritmos próprios e nenhuma ferramenta pode garantir 100% de proteção."
      },
      {
        question: "Quantos chips posso aquecer simultaneamente?",
        answer: "Você pode conectar e aquecer até 10 chips simultaneamente, dependendo do seu plano. O processo é 100% automatizado — basta conectar o número e o sistema cuida de todo o restante."
      },
      {
        question: "Quanto tempo dura o aquecimento?",
        answer: "O processo completo leva 20 dias. É dividido em 4 níveis de 5 dias cada, com intensidade progressiva. Após o aquecimento, o número está preparado para campanhas de maior volume com segurança."
      },
    ]
  },
  {
    id: "agentes-ia",
    title: "Agentes de IA",
    icon: Bot,
    questions: [
      {
        question: "O que são os Agentes de IA?",
        answer: "Os Agentes de IA são vendedores virtuais que trabalham 24/7 no seu WhatsApp. Eles respondem mensagens automaticamente, qualificam leads com perguntas inteligentes e organizam tudo no CRM — sem precisar de prompts complexos."
      },
      {
        question: "Como configuro um Agente de IA?",
        answer: "A configuração é simples: escolha um número WhatsApp conectado, defina o objetivo do agente (vendas, suporte, qualificação), ajuste o estilo de comunicação e pronto. O assistente de configuração guia você em cada etapa."
      },
      {
        question: "O agente responde a qualquer mensagem?",
        answer: "O agente responde dentro do horário de operação configurado e segue as regras que você definir. Você pode configurar limites de respostas por conversa, critérios de encerramento e comportamento pós-resposta."
      },
      {
        question: "Posso pausar o agente a qualquer momento?",
        answer: "Sim. Você pode pausar e retomar o agente quando quiser, tanto manualmente quanto automaticamente baseado em horários de operação definidos."
      },
    ]
  },
  {
    id: "crm",
    title: "CRM e Leads",
    icon: Target,
    questions: [
      {
        question: "O que é o CRM do Wiize?",
        answer: "O CRM integrado permite gerenciar todos os seus leads em um pipeline visual estilo Kanban. Acompanhe cada lead desde a prospecção até o fechamento, adicione notas, tags e acompanhe o histórico completo de interações."
      },
      {
        question: "Posso importar leads de outras fontes?",
        answer: "Sim. Além dos leads prospectados pelo Wiize, você pode adicionar leads manualmente com nome, telefone e informações de contato. Todos os leads são organizados no mesmo pipeline."
      },
      {
        question: "Os leads são compartilhados entre usuários?",
        answer: "Não. Cada usuário tem acesso exclusivo aos seus próprios leads. Implementamos políticas de segurança em nível de linha (RLS) que garantem total isolamento dos dados."
      },
      {
        question: "Posso exportar meus leads?",
        answer: "Sim. Você pode exportar seus leads em formato Excel (.xlsx) a qualquer momento, incluindo todas as informações de contato, status e histórico de interações."
      },
    ]
  },
  {
    id: "planos",
    title: "Planos e Pagamentos",
    icon: CreditCard,
    questions: [
      {
        question: "Qual plano é ideal para mim?",
        answer: "O plano Start (R$97/mês) é ideal para freelancers e autônomos com 200 buscas e 1 número WhatsApp. O Growth (R$247/mês) é perfeito para vendedores e pequenas equipes com 600 buscas e 2 números. O Scale (R$497/mês) é indicado para agências com 1.200 buscas e 5 números."
      },
      {
        question: "Posso cancelar minha assinatura a qualquer momento?",
        answer: "Sim! Você pode cancelar sua assinatura quando quiser. Não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago."
      },
      {
        question: "Quais formas de pagamento são aceitas?",
        answer: "Aceitamos cartão de crédito (Visa, Mastercard, Amex) e PIX. Todos os pagamentos são processados de forma segura pelo Stripe, com certificação PCI DSS Level 1."
      },
      {
        question: "Meus dados de pagamento são seguros?",
        answer: "Sim. Não armazenamos dados de cartão de crédito em nossos servidores. Todos os pagamentos são processados pelo Stripe, uma das plataformas mais seguras do mundo."
      },
      {
        question: "Como funciona a política de reembolso?",
        answer: "Reembolsos são avaliados caso a caso, considerando o uso da plataforma e possíveis falhas técnicas. Consulte nossa Política de Reembolso completa para mais detalhes."
      },
    ]
  },
  {
    id: "seguranca",
    title: "Segurança e Privacidade",
    icon: Shield,
    questions: [
      {
        question: "Como meus dados são protegidos?",
        answer: "Utilizamos criptografia de ponta a ponta, controle de acesso rigoroso e monitoramento contínuo. Todos os dados sensíveis são criptografados em repouso e em trânsito usando TLS 1.3. Nossa infraestrutura possui certificações de segurança reconhecidas internacionalmente."
      },
      {
        question: "O Wiize está em conformidade com a LGPD?",
        answer: "Sim. Seguimos todas as diretrizes da Lei Geral de Proteção de Dados. Você tem direito a acessar, corrigir, solicitar exclusão e portabilidade dos seus dados a qualquer momento."
      },
      {
        question: "Vocês vendem meus dados?",
        answer: "Não. O Wiize nunca vende, aluga ou compartilha seus dados pessoais com terceiros para fins de marketing. Dados são compartilhados apenas com processadores essenciais para o serviço."
      },
      {
        question: "Meus contatos e leads ficam expostos?",
        answer: "Não. Seus contatos são armazenados de forma segura e acessíveis apenas para você. Implementamos políticas de segurança em nível de linha que garantem isolamento total dos dados de cada usuário."
      },
    ]
  },
  {
    id: "relatorios",
    title: "Relatórios e Métricas",
    icon: BarChart3,
    questions: [
      {
        question: "Quais métricas posso acompanhar?",
        answer: "O Wiize oferece dashboards completos com taxa de entrega, taxa de resposta, performance por número, evolução diária, funil de conversão e muito mais. Tudo em tempo real para você otimizar sua estratégia."
      },
      {
        question: "Posso compartilhar relatórios?",
        answer: "Sim. Você pode gerar links de relatórios compartilháveis protegidos por senha para apresentar resultados a clientes ou equipe."
      },
      {
        question: "Os relatórios são atualizados em tempo real?",
        answer: "Sim. Todos os dashboards e métricas são atualizados em tempo real conforme as campanhas são processadas e as respostas chegam."
      },
    ]
  },
];

const HelpCenter = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("plataforma");
  const [searchQuery, setSearchQuery] = useState("");

  const activeData = categories.find(c => c.id === activeCategory);

  const filteredQuestions = searchQuery.trim()
    ? categories.flatMap(cat =>
        cat.questions
          .filter(q =>
            q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(q => ({ ...q, category: cat.title }))
      )
    : null;

  return (
    <>
      <SEO
        title="Central de Ajuda - FAQ"
        description="Encontre respostas para todas as suas dúvidas sobre o Wiize. Prospecção, WhatsApp, API Oficial, planos, segurança e muito mais."
        keywords="FAQ, ajuda, suporte, perguntas frequentes, wiize, prospecção, WhatsApp, API oficial"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="gap-2 text-sm px-3"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Logo size="md" />
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
          {/* Title */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Central de Ajuda
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Tire suas dúvidas sobre a plataforma, funcionalidades e muito mais.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar pergunta..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          {filteredQuestions ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum resultado encontrado para "{searchQuery}"
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredQuestions.length} resultado(s) encontrado(s)
                  </p>
                  {filteredQuestions.map((q, i) => (
                    <div key={i} className="border border-border/50 rounded-lg p-5 bg-card/50">
                      <span className="text-xs text-primary font-medium mb-1 block">{q.category}</span>
                      <h3 className="font-semibold text-base mb-2">{q.question}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{q.answer}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Sidebar + Content Layout */
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
              {/* Sidebar */}
              <aside className="md:w-64 lg:w-72 shrink-0">
                <div className="md:sticky md:top-24">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                    Tópicos
                  </h3>
                  <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            activeCategory === cat.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon size={16} className="shrink-0" />
                          {cat.title}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {activeData && (
                  <>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                      <activeData.icon size={22} className="text-primary shrink-0" />
                      <h2 className="text-xl sm:text-2xl font-bold">{activeData.title}</h2>
                    </div>

                    <div className="space-y-5">
                      {activeData.questions.map((q, i) => (
                        <div key={i} className="group">
                          <h3 className="font-semibold text-base sm:text-lg mb-2 text-foreground">
                            {q.question}
                          </h3>
                          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed pl-0 border-l-2 border-primary/30 ml-0 pl-4">
                            {q.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="mt-12 p-6 bg-card/50 border border-border/50 rounded-xl text-center">
            <h3 className="text-lg font-semibold mb-2">Ainda tem dúvidas?</h3>
            <p className="text-muted-foreground mb-4">
              Nossa equipe está pronta para ajudar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contato">Fale Conosco</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/seguranca-faq">FAQ de Segurança</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HelpCenter;
