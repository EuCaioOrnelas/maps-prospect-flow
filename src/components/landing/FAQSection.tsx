import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqs = [
  {
    question: "O que é uma busca estratégica?",
    answer: "Uma busca estratégica é uma pesquisa inteligente que utiliza nossa IA para analisar empresas no Google Maps e entregar apenas leads qualificados — empresas ativas, com contatos verificados e alto potencial de conversão. Diferente de ferramentas comuns, priorizamos qualidade sobre quantidade."
  },
  {
    question: "Quantos leads recebo por busca?",
    answer: "Cada busca estratégica retorna até 50 leads pré-qualificados. Nossa IA filtra e seleciona apenas empresas com atividade recente, avaliações reais e informações de contato atualizadas."
  },
  {
    question: "Como funciona o período gratuito?",
    answer: "Ao criar sua conta, você recebe 10 buscas estratégicas grátis para testar a plataforma. Não é necessário cartão de crédito. Após usar suas buscas gratuitas, você pode fazer upgrade para um dos nossos planos."
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura quando quiser. Não há fidelidade ou taxas de cancelamento. Seu acesso continua ativo até o final do período pago."
  },
  {
    question: "Como funcionam os disparos em massa via WhatsApp?",
    answer: "Cada número WhatsApp conectado pode enviar até 200 mensagens por dia, respeitando as políticas anti-banimento. O limite é resetado automaticamente às 08:00h. Se atingir o limite, as campanhas são pausadas e retomadas no dia seguinte."
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
    question: "Qual plano é ideal para mim?",
    answer: "O plano Start (R$97/mês) é ideal para freelancers e autônomos com 200 buscas e 1 número WhatsApp. O Growth (R$247/mês) é perfeito para vendedores e pequenas equipes com 600 buscas e 2 números. O Scale (R$497/mês) é indicado para agências com 1.200 buscas e 5 números WhatsApp."
  }
];

export const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      id="faq" 
      className="py-16 md:py-24 relative overflow-hidden w-full"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />
      
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
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Tudo que você precisa saber sobre o WiizeProspect
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
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
        </div>
      </div>
    </section>
  );
};
