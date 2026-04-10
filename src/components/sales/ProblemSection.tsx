import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Clock, UserX, MessageSquareOff, AlertTriangle, BarChart3 } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Prospecção manual",
    description: "Horas perdidas buscando leads sem critério. Tempo alto, produtividade baixa.",
  },
  {
    icon: UserX,
    title: "Leads frios",
    description: "Contatos sem aderência ao seu negócio. Baixa resposta, alto desperdício.",
  },
  {
    icon: MessageSquareOff,
    title: "Mensagens genéricas",
    description: "Abordagens iguais para todos. Sem contexto, sem personalização, sem resultado.",
  },
  {
    icon: AlertTriangle,
    title: "Follow-up inconsistente",
    description: "Oportunidades perdidas por falta de cadência e continuidade no contato.",
  },
  {
    icon: BarChart3,
    title: "Funil desorganizado",
    description: "Sem visibilidade do pipeline. Sem dados. Sem previsibilidade de receita.",
  },
];

export const ProblemSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-destructive/10 text-destructive mb-4">
            O problema
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Sua operação comercial<br />
            <span className="text-muted-foreground">não foi feita para escalar</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Empresas não deixam de crescer por falta de mercado. Elas param porque sua operação comercial é lenta, manual e estruturalmente ineficiente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 hover:border-destructive/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-destructive/20 transition-colors">
                <problem.icon size={20} className="text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{problem.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
