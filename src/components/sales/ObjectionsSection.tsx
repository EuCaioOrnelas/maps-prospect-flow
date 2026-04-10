import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const objections = [
  {
    q: "Isso funciona para o meu nicho?",
    a: "A Wiize é adaptável a qualquer segmento B2B. A captação e personalização são configuradas por nicho, localização e perfil de cliente ideal. Empresas de tecnologia, agências, consultorias, serviços locais e indústrias já utilizam a plataforma.",
  },
  {
    q: "Preciso de equipe técnica para implementar?",
    a: "Não. A operação foi desenhada para simplificar execução. Você configura em minutos e a plataforma cuida de toda a automação. Nosso time de suporte ajuda no onboarding sem custo adicional.",
  },
  {
    q: "É seguro usar WhatsApp para prospecção?",
    a: "A Wiize opera via API oficial do WhatsApp Business (parceiro Meta). Isso garante conformidade, segurança e zero risco de banimento quando usado seguindo as diretrizes.",
  },
  {
    q: "Vou perder o controle da operação?",
    a: "O contrário. Tudo fica registrado no CRM integrado: histórico de conversas, pipeline de vendas, score de leads e métricas em tempo real. Você tem mais visibilidade, não menos.",
  },
  {
    q: "A IA responde qualquer coisa para os leads?",
    a: "Não. O fluxo de IA é orientado e configurável. Ele segue diretrizes definidas por você para qualificação e avanço comercial, com possibilidade de transferência para atendimento humano a qualquer momento.",
  },
  {
    q: "Quanto tempo leva para ver resultados?",
    a: "A maioria das empresas vê as primeiras oportunidades na primeira semana. Com a automação rodando, o volume de leads qualificados e reuniões agendadas cresce consistentemente mês a mês.",
  },
];

export const ObjectionsSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Dúvidas frequentes
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Respostas diretas<br />
            <span className="text-muted-foreground">para decisões rápidas</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {objections.map((o, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border rounded-2xl px-6 bg-card/30 data-[state=open]:border-primary/20"
              >
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-5">
                  {o.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {o.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
