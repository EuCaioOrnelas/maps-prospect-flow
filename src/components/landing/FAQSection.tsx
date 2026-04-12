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
    question: "O que é uma busca estratégica?",
    answer: "Uma busca estratégica é uma pesquisa inteligente que utiliza nossa IA para analisar empresas no Google Maps e entregar apenas leads qualificados: empresas ativas, com contatos verificados e alto potencial de conversão. Cada busca retorna até 60 leads pré-qualificados."
  },
  {
    question: "Como funcionam os Flows de Automação?",
    answer: "Flows são sequências visuais de automação que você monta em um editor drag-and-drop. Cada fluxo pode incluir envio de mensagens, esperas programadas, condições, coleta de dados, testes A/B, integração com Google Sheets, Gmail e Google Calendar. O sistema executa tudo automaticamente."
  },
  {
    question: "O que é o Flow com IA?",
    answer: "O Flow com IA permite que a inteligência artificial gere fluxos de automação completos a partir de uma descrição simples. Basta descrever seu objetivo (ex: 'follow-up para leads que não responderam em 48h') e a IA cria o fluxo com nós, mensagens e condições já configurados."
  },
  {
    question: "O que são os Agentes de IA?",
    answer: "Os Agentes de IA são vendedores virtuais que trabalham 24/7 no seu WhatsApp. Eles respondem mensagens automaticamente, qualificam leads com perguntas inteligentes e organizam tudo no CRM — sem precisar de prompts complexos."
  },
  {
    question: "Como funcionam os disparos em massa via WhatsApp?",
    answer: "Cada número WhatsApp conectado pode enviar até 200 mensagens por dia, respeitando as políticas anti-banimento. O sistema usa delays aleatórios, variações de texto e pausas automáticas para simular comportamento humano. O limite é resetado automaticamente à meia-noite."
  },
  {
    question: "O que é a Meta API Oficial e como o Wiize a utiliza?",
    answer: "A Meta API Oficial (Cloud API v21.0) é a interface autorizada pelo Meta para envio de mensagens via WhatsApp Business. O Wiize é integrado como Meta Business Partner. Para prospecção outbound, utilizamos a Evolution API com estratégias de proteção inteligentes."
  },
  {
    question: "O que é o Índice de Fechamento (Índ. Fech.)?",
    answer: "O Índice de Fechamento é uma pontuação gerada pela IA que indica a probabilidade de conversão de cada lead. Ele analisa fatores como avaliações no Google Maps, quantidade de reviews, presença digital e perfil do negócio para priorizar os leads com maior potencial."
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura quando quiser. Não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago."
  },
  {
    question: "Quantos números WhatsApp posso conectar?",
    answer: "Depende do seu plano: Start permite 2 números (400 disparos/dia), Growth permite 5 números (1.000 disparos/dia no total). No plano Scale (Enterprise), números ilimitados."
  },
  {
    question: "Qual plano é ideal para mim?",
    answer: "O plano Start é ideal para quem está começando com até 1.000 oportunidades/mês. O Growth é perfeito para quem quer escalar com automação, agentes de IA e 3.000 oportunidades. O Scale é para operações empresariais com volume e estrutura personalizados."
  },
  {
    question: "Preciso de uma conta Meta Business para usar o Wiize?",
    answer: "Para campanhas via API Oficial (relacionamento/inbound), sim — você conecta sua conta Meta Business diretamente pelo Wiize em poucos cliques. Para prospecção outbound com disparos em massa, não é necessário. Basta conectar seu número WhatsApp pelo QR Code."
  },
  {
    question: "Posso integrar Flows com Google Sheets e Gmail?",
    answer: "Sim. Os Flows suportam integração nativa com Google Sheets (para leitura/escrita de dados), Gmail (para envio de emails automáticos) e Google Calendar (para criação de eventos). Basta conectar sua conta Google pelo Wiize."
  }
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
            {faqs.slice(0, 8).map((faq, index) => (
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
