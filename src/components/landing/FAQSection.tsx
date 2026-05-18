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
    question: "O que é a Wiize?",
    answer: "A Wiize é uma plataforma de inteligência comercial com IA onde a Wiize atua como copiloto da operação comercial, ajudando empresas B2B a prospectar, qualificar, atender e acompanhar leads em tempo real do primeiro contato ao fechamento."
  },
  {
    question: "Como funciona o SDR IA de Captação?",
    answer: "O SDR IA capta empresas por localização e nicho de atuação, encontrando negócios com perfil ideal de cliente em qualquer região e segmento. Em seguida, faz uma análise completa de cada lead: endereço, site, redes sociais, presença digital, tamanho, demanda e maturidade comercial, gerando um diagnóstico automático de dores, necessidades e oportunidades reais de vendas. Com esse contexto, o SDR IA cria abordagens personalizadas por lead e entrega oportunidades prontas para o time comercial agir."
  },
  {
    question: "O que é a IA de Intenção de Compra?",
    answer: "É a camada de Inteligência Comercial da Wiize que lê engajamento, comportamento e sinais de compra em tempo real. Cada lead recebe uma leitura dinâmica de intenção, mostrando quem está quente e pronto para a venda, quem precisa de atenção agora, quem está esfriando e quem ainda está em fase de nutrição. Assim, sua equipe prioriza o lead certo, no momento certo, e para de perder tempo com quem não está pronto para comprar."
  },
  {
    question: "Como funciona o Atendimento Operacional com IA?",
    answer: "O Atendimento Operacional com IA responde, qualifica e conduz conversas no WhatsApp 24/7, com tom de copiloto comercial. Integrado ao CRM e aos fluxos, ele entende contexto, atualiza estágios e passa o bastão para o humano no momento certo, operando como um SDR sênior, sem pausas."
  },
  {
    question: "O que são os Fluxos Inteligentes com IA?",
    answer: "São fluxos operacionais visuais que orquestram cada etapa da jornada do lead: mensagens, esperas, condições, coleta de dados e ações no CRM. A IA entra quando necessário para qualificar, conduzir e avançar o lead, garantindo operação comercial consistente, sem depender de execução manual."
  },
  {
    question: "O que são as campanhas inteligentes de mensagens?",
    answer: "Campanhas com IA que personalizam abordagens em escala. Você seleciona o público no CRM e a Wiize gera mensagens contextuais por lead, dispara dentro dos limites de segurança e devolve respostas e métricas em tempo real. Outbound com inteligência, não disparo cego."
  },
  {
    question: "O que é o CRM com Inteligência Comercial?",
    answer: "Não é um CRM comum. É um cockpit comercial com visão completa do funil, oportunidades, IA de Intenção de Compra, leitura de engajamento e acompanhamento em tempo real. Toda interação de captação, atendimento e campanha aterrissa centralizada, com inteligência para decidir o próximo passo."
  },
  {
    question: "O que é a Meta API Oficial?",
    answer: "É a interface oficial do WhatsApp Business para operações em escala, com estabilidade, segurança e zero risco de bloqueio quando usada para relacionamento com leads opt-in. A Wiize integra a Meta API Oficial para que sua operação comercial rode com a robustez de uma infraestrutura enterprise."
  },
  {
    question: "Corro risco de bloqueio no WhatsApp?",
    answer: "A Wiize opera com duas camadas: Meta API Oficial (relacionamento com leads opt-in) com risco zero, e infraestrutura outbound para prospecção ativa, com boas práticas operacionais como delays inteligentes, variações de mensagem, pausas adaptativas e limites diários para proteger seus números em cada disparo."
  },
  {
    question: "Quantos números WhatsApp posso conectar?",
    answer: "Como a Wiize opera com a Meta API Oficial, não existe limite de disparos por número. O que define o seu uso é o volume de oportunidades geradas dentro do plano contratado. Atendimento, Growth IA e Enterprise liberam diferentes capacidades de oportunidades e números conectados, com a robustez e estabilidade da infraestrutura oficial do WhatsApp Business."
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. Sem fidelidade, sem taxa de cancelamento. Você cancela direto na plataforma e mantém o acesso até o fim do período pago."
  },
  {
    question: "Como funciona o teste grátis?",
    answer: "São 7 dias de acesso total ao plano escolhido. No cadastro, você seleciona o plano desejado (Atendimento, Growth IA ou Enterprise) e informa um cartão de crédito, mas nenhuma cobrança é feita durante o período de teste. Durante os 7 dias, você tem acesso completo a tudo que o plano oferece. A cobrança só acontece no 8º dia, caso você não cancele antes. Sem fidelidade e cancelamento direto na plataforma."
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
            Tudo sobre a Wiize e a operação comercial com Inteligência Operacional
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
