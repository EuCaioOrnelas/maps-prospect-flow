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
    q: "Como o Wiize encontra leads qualificados?",
    a: "O Wiize utiliza IA para analisar empresas no Google Maps em tempo real. Nossa tecnologia cruza dados como avaliações, presença digital, localização e segmento para entregar apenas leads com alto potencial de conversão — não é uma lista genérica, é prospecção inteligente.",
  },
  {
    q: "Qual a diferença entre prospecção outbound e campanhas inbound?",
    a: "Prospecção outbound são mensagens enviadas proativamente para leads novos (via Evolution API com aquecimento de chips). Campanhas inbound são mensagens de relacionamento para quem já interagiu com você (via Meta API Oficial com templates aprovados). O Wiize integra ambos os modelos em uma única plataforma.",
  },
  {
    q: "Como funcionam os Fluxos de Automação (Flows)?",
    a: "Os Flows são sequências visuais de automação que você monta no editor drag-and-drop. Cada fluxo pode incluir envio de mensagens, esperas programadas, condições (se respondeu/não respondeu), coleta de dados, integração com Google Sheets, Gmail e Calendário. O sistema executa tudo automaticamente após o disparo.",
  },
  {
    q: "O que é o Flow com IA?",
    a: "O Flow com IA permite que a inteligência artificial gere fluxos de automação completos a partir de uma descrição simples. Basta descrever seu objetivo (ex: 'follow-up para leads que não responderam em 48h') e a IA cria o fluxo com nós, mensagens e condições já configurados.",
  },
  {
    q: "Como funciona o Agente de IA no WhatsApp?",
    a: "O Agente de IA é um vendedor virtual que responde automaticamente no WhatsApp 24/7. Ele qualifica leads com perguntas inteligentes, segue o estilo de comunicação da sua empresa e organiza tudo no CRM. Você define regras de operação, limites de respostas e critérios de transferência para atendimento humano.",
  },
  {
    q: "O sistema é seguro para enviar mensagens em escala?",
    a: "Sim. Para outbound, o Wiize implementa aquecimento progressivo de chips em 4 níveis (20 dias), delays aleatórios, variações automáticas de texto e pausas inteligentes. Para inbound, operamos via API oficial do Meta com total conformidade. A combinação dessas camadas reduz drasticamente riscos de bloqueio.",
  },
  {
    q: "Preciso de equipe técnica para implementar?",
    a: "Não. O Wiize foi desenhado para simplificar a execução. Conecte seu número por QR Code, configure buscas e campanhas em minutos, e a plataforma cuida de toda a automação. Nosso time de suporte ajuda no onboarding sem custo adicional.",
  },
  {
    q: "O CRM é realmente integrado com tudo?",
    a: "Sim. Cada lead prospectado, mensagem enviada, resposta recebida e interação do agente de IA é registrada automaticamente no CRM Kanban. Você visualiza o pipeline completo, move leads entre etapas, adiciona notas e tags, e acompanha métricas de conversão em tempo real.",
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
            Entenda como o sistema<br />
            <span className="text-muted-foreground">funciona na prática</span>
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
