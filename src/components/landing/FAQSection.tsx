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
    question: "Os dados dos leads são atualizados?",
    answer: "Sim. Todos os dados são extraídos diretamente do Google Maps em tempo real no momento da sua busca, garantindo informações sempre atualizadas como telefone, site, endereço e avaliações."
  },
  {
    question: "Posso exportar os leads para Excel?",
    answer: "Sim! Todos os leads podem ser exportados instantaneamente em formato CSV/Excel, com dados organizados em colunas separadas: nome da empresa, categoria, endereço, telefone, site, avaliação e link do Google Maps."
  },
  {
    question: "Como a IA identifica leads qualificados?",
    answer: "Nossa IA analisa diversos fatores: atividade recente da empresa, qualidade e quantidade de avaliações, presença de informações de contato completas, e outros indicadores que sugerem um negócio ativo e receptivo a novas parcerias."
  },
  {
    question: "Qual plano é ideal para mim?",
    answer: "O plano Start (R$69/mês) é ideal para freelancers e profissionais autônomos. O Growth (R$197/mês) é perfeito para vendedores e pequenas equipes. O Scale (R$397/mês) é indicado para agências e empresas com alto volume de prospecção."
  }
];

export const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      id="faq" 
      className="py-24 relative"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <HelpCircle size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Dúvidas Frequentes</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa saber sobre o Prospex
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`glass rounded-xl px-6 border-none transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${150 + index * 75}ms` }}
              >
                <AccordionTrigger className="text-left font-display font-semibold hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
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
