import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "O que é o teste grátis de 7 dias?",
    answer: "Ao criar sua conta, você recebe 7 dias de acesso completo ao Wiize — sem precisar de cartão de crédito. Durante o teste, você pode gerar até 120 oportunidades, usar o CRM, criar fluxos de automação, configurar Agentes de IA e disparar campanhas. Após os 7 dias, basta escolher um plano para continuar."
  },
  {
    question: "Corro risco de bloqueio no WhatsApp?",
    answer: "O Wiize trabalha com duas APIs distintas. A API Outbound (Evolution API) é usada para prospecção ativa e disparos em massa — como qualquer ferramenta de outbound, existe risco de bloqueio, mas nosso sistema aplica boas práticas como delays aleatórios, variações de texto, pausas inteligentes e limites diários para minimizar esse risco significativamente. Já a API Inbound (Meta Cloud API Oficial) é usada para relacionamento com leads opt-in e tem risco zero de bloqueio, pois segue 100% as regras da Meta."
  },
  {
    question: "O que são as campanhas de mensagens?",
    answer: "Campanhas são disparos em massa organizados pelo Wiize. Você seleciona leads do CRM, escreve variações de mensagem e o sistema envia automaticamente respeitando limites de segurança. Cada número conectado suporta até 200 mensagens/dia. É possível agendar campanhas, usar variações A/B e acompanhar respostas em tempo real."
  },
  {
    question: "Como funciona a SDR IA de Captação com Diagnóstico Automático?",
    answer: "A SDR IA busca empresas no Google Maps usando filtros inteligentes (nicho, cidade, avaliações). Em seguida analisa cada empresa em profundidade — tamanho, demanda, maturidade digital — e faz um diagnóstico automático de necessidades, dores e oportunidades reais de vendas. Você recebe leads pré-qualificados com nome, telefone, endereço, website e contexto de abordagem. No teste grátis você pode gerar até 120 oportunidades."
  },
  {
    question: "O que são os Agentes de IA?",
    answer: "Os Agentes de IA são vendedores virtuais que trabalham 24/7 no seu WhatsApp. Eles respondem mensagens automaticamente, qualificam leads com perguntas inteligentes, detectam spam/bots e organizam tudo no CRM. Você configura a persona, o estilo de comunicação e os critérios de encerramento — a IA faz o resto."
  },
  {
    question: "Como funcionam os Flows de Automação?",
    answer: "Flows são sequências visuais de automação que você monta em um editor drag-and-drop. Cada fluxo pode incluir envio de mensagens, esperas programadas, condições, coleta de dados, testes A/B, integração com Google Sheets, Gmail e Google Calendar. Também é possível gerar fluxos inteiros com IA a partir de uma descrição simples."
  },
  {
    question: "O que é a Meta API Oficial e qual a diferença da Outbound?",
    answer: "A Meta API Oficial (Cloud API) é a interface autorizada pelo Meta para envio de mensagens via WhatsApp Business — risco zero de bloqueio, ideal para relacionamento com leads que deram opt-in. A API Outbound (Evolution) é usada para prospecção ativa e disparos em massa para leads frios. O Wiize integra ambas para que você tenha o melhor dos dois mundos."
  },
  {
    question: "O que é o CRM integrado?",
    answer: "O CRM do Wiize é um pipeline visual (Kanban) onde você gerencia todos os seus leads. Inclui estágios personalizáveis, tags, notas, histórico de atividades, deals com valor e arquivos anexados. Leads capturados ou que respondem campanhas são automaticamente organizados no CRM."
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim! Você pode cancelar quando quiser — não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago. Durante o teste grátis, basta não assinar um plano e o acesso expira automaticamente."
  },
  {
    question: "Quantos números WhatsApp posso conectar?",
    answer: "Depende do seu plano: Start permite 2 números (400 disparos/dia), Growth permite 5 números (1.000 disparos/dia). No plano Scale (Enterprise), números ilimitados. Cada número tem limite individual de 200 mensagens/dia para segurança."
  },
];

// FAQ JSON-LD for Google rich results
export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      id="faq" 
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute left-1/2 top-8 h-40 w-[26rem] -translate-x-1/2 rounded-full bg-gradient-glow opacity-10 blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div 
          className={`text-center mb-10 sm:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-4 sm:mb-6">
            <HelpCircle size={16} className="text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Dúvidas Frequentes</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2 text-foreground">
            Perguntas Frequentes
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Tudo que você precisa saber sobre o Wiize
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`glass rounded-lg sm:rounded-xl px-4 sm:px-6 border-none transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${150 + index * 75}ms` }}
              >
                <AccordionTrigger className="text-left font-display font-semibold hover:no-underline py-4 sm:py-5 text-sm sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 sm:pb-5 leading-relaxed text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex justify-center mt-8">
            <Link to="/ajuda/faq">
              <Button variant="hero" size="lg">
                Ver todas as perguntas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
