import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Shield, Cpu, MessageSquare, BarChart3 } from "lucide-react";

const stats = [
  { value: "50K+", label: "Leads processados" },
  { value: "1M+", label: "Mensagens enviadas" },
  { value: "500+", label: "Empresas ativas" },
  { value: "98%", label: "Uptime da plataforma" },
];

const pillars = [
  { icon: Shield, title: "API Oficial do WhatsApp", desc: "Operação segura, sem risco de banimento. Parceiro oficial Meta Business." },
  { icon: Cpu, title: "IA proprietária", desc: "Modelos treinados para qualificação, personalização e atendimento B2B." },
  { icon: MessageSquare, title: "CRM nativo", desc: "Pipeline, score, histórico e automação integrados sem ferramentas externas." },
  { icon: BarChart3, title: "Métricas em tempo real", desc: "Dashboards com visibilidade total sobre performance e conversão." },
];

export const AuthoritySection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Infraestrutura robusta
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tecnologia de empresa<br />
            <span className="text-shimmer-highlight">de verdade</span>
          </h2>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center p-6 rounded-2xl border border-border bg-card/30">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + 0.1 * i }}
              className="p-6 rounded-2xl border border-border bg-card/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <p.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
