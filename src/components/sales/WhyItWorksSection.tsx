import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const points = [
  {
    title: "Prospecção baseada em dados, não em volume",
    description:
      "O sistema filtra empresas com atividade recente, aderência ao seu produto e potencial real de compra. Você não gasta tempo com listas frias — cada lead que chega já passou por critérios objetivos de qualificação.",
  },
  {
    title: "Contexto define a abordagem, não templates",
    description:
      "A primeira mensagem é construída a partir do nicho, porte e situação real de cada empresa. Isso elimina a percepção de mensagem em massa e cria uma interação que parece genuína desde o primeiro contato.",
  },
  {
    title: "O timing deixa de ser um gargalo",
    description:
      "Leads são contatados no momento certo, sem depender da disponibilidade da sua equipe. O sistema age dentro da janela de atenção do prospect, quando a probabilidade de resposta é mais alta.",
  },
  {
    title: "Follow-up estruturado substitui lembretes manuais",
    description:
      "Cada oportunidade recebe acompanhamento consistente, na frequência certa, sem depender de disciplina individual. O processo garante que nenhum lead qualificado seja esquecido no meio do funil.",
  },
  {
    title: "Processo replicável em vez de esforço individual",
    description:
      "A operação comercial passa a funcionar com base em um fluxo definido. O resultado deixa de depender de quem executa e passa a ser consequência de uma estrutura que funciona independentemente.",
  },
  {
    title: "Decisões orientadas por métricas reais",
    description:
      "Cada etapa do funil é visível e mensurável. Você sabe exatamente onde estão os gargalos, qual canal converte mais e o que precisa ser ajustado — sem achismo, sem relatórios manuais.",
  },
];

export const WhyItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="relative py-24 md:py-32 overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <span className="block text-[11px] font-semibold tracking-[0.2em] uppercase text-primary/60 mb-4">
            Lógica do sistema
          </span>
          <h2 className="text-3xl md:text-[2.5rem] font-bold text-foreground leading-[1.15] mb-5">
            Por que esse modelo gera mais vendas
          </h2>
          <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed">
            Não é sobre trabalhar mais. É sobre aplicar o processo certo em cada etapa da venda — e deixar a estrutura fazer o trabalho pesado.
          </p>
        </motion.div>

        {/* Editorial list */}
        <div className="space-y-12 md:space-y-14">
          {points.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
            >
              <h3 className="text-[15px] md:text-base font-semibold text-foreground mb-2 leading-snug">
                {point.title}
              </h3>
              <p className="text-[14px] md:text-[15px] text-muted-foreground leading-[1.75]">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
