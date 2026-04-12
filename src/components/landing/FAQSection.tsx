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
    answer: "Uma busca estratégica é uma pesquisa inteligente que utiliza nossa IA para analisar empresas no Google Maps e entregar apenas leads qualificados: empresas ativas, com contatos verificados e alto potencial de conversão. Diferente de ferramentas comuns, priorizamos qualidade sobre quantidade."
  },
  {
    question: "Quantos leads recebo por busca?",
    answer: "Cada busca estratégica retorna até 60 leads pré-qualificados. Nossa IA filtra e seleciona apenas empresas com atividade recente, avaliações reais e informações de contato atualizadas."
  },
  {
    question: "Como funciona a geração de mensagens personalizadas com IA?",
    answer: "O Wiize analisa cada lead encontrado — segmento, localização, perfil do negócio — e gera automaticamente uma mensagem única e personalizada usando inteligência artificial. A mensagem segue uma estrutura de 4 parágrafos (saudação, introdução, proposta de valor e CTA), aumentando drasticamente a taxa de resposta."
  },
  {
    question: "O que é o Índice de Fechamento (Índ. Fech.)?",
    answer: "O Índice de Fechamento é uma pontuação gerada pela IA que indica a probabilidade de conversão de cada lead. Ele analisa fatores como avaliações no Google Maps, quantidade de reviews, presença digital e perfil do negócio para priorizar os leads com maior potencial de se tornarem clientes."
  },
  {
    question: "O que é o Diagnóstico com IA?",
    answer: "O Diagnóstico com IA é uma análise automática que o Wiize gera para cada lead prospectado. Ele identifica oportunidades, pontos fracos do negócio e sugere a melhor abordagem comercial. Isso permite que você chegue ao lead com uma proposta relevante e consultiva, não apenas um disparo genérico."
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura quando quiser. Não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago."
  },
  {
    question: "Como funcionam os disparos em massa via WhatsApp?",
    answer: "Cada número WhatsApp conectado pode enviar até 200 mensagens por dia, respeitando as políticas anti-banimento. O limite é resetado automaticamente à meia-noite. Se atingir o limite, as campanhas são pausadas e retomadas no dia seguinte."
  },
  {
    question: "Quantos números WhatsApp posso conectar?",
    answer: "Depende do seu plano: Start permite 1 número (200 disparos/dia), Growth permite 2 números (400 disparos/dia no total), e Scale permite 5 números (1.000 disparos/dia no total). Cada número tem limite individual de 200 disparos."
  },
  {
    question: "Os dados dos leads são atualizados?",
    answer: "Sim. Todos os dados são extraídos diretamente do Google Maps em tempo real no momento da sua busca, garantindo informações sempre atualizadas como telefone, site, endereço e avaliações."
  },
  {
    question: "O que é a Meta API Oficial e como o Wiize a utiliza?",
    answer: "A Meta API Oficial (Cloud API v21.0) é a interface autorizada pelo Meta para envio de mensagens via WhatsApp Business. O Wiize é integrado como Meta Business Partner, o que significa que campanhas de relacionamento (inbound) passam pela API oficial com total conformidade. Para prospecção outbound, utilizamos a Evolution API com estratégias de proteção inteligentes para máxima segurança."
  },
  {
    question: "Qual plano é ideal para mim?",
    answer: "O plano Start (R$197/mês) é ideal para freelancers e autônomos com 1.000 oportunidades e 1 número WhatsApp. O Growth (R$497/mês) é perfeito para vendedores e pequenas equipes com 3.000 oportunidades e 2 números. O Scale (R$1.297/mês) é indicado para agências com 10.000 oportunidades e 5 números WhatsApp."
  },
  {
    question: "Preciso de uma conta Meta Business para usar o Wiize?",
    answer: "Para campanhas via API Oficial (relacionamento/inbound), sim — você conecta sua conta Meta Business diretamente pelo Wiize em poucos cliques. Para prospecção outbound com disparos em massa, não é necessário. Basta conectar seu número WhatsApp pelo QR Code e começar."
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
