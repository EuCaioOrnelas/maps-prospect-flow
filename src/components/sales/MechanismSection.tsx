import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import { Search, Brain, MessageSquare, Send, Bot, RefreshCw, CalendarCheck, LayoutGrid, ArrowRight } from "lucide-react";

const steps = [
  { icon: Search, num: "01", title: "Captação inteligente", desc: "Busca empresas ideais no Google com base em nicho, localização e serviço." },
  { icon: Brain, num: "02", title: "Diagnóstico com IA", desc: "Analisa potencial, perfil e aderência de cada lead automaticamente." },
  { icon: MessageSquare, num: "03", title: "Abordagem personalizada", desc: "Cria mensagens únicas por lead com base no contexto do negócio." },
  { icon: Send, num: "04", title: "Envio via WhatsApp oficial", desc: "Escala com segurança usando API oficial do WhatsApp Business." },
  { icon: Bot, num: "05", title: "Atendimento com IA", desc: "Responde, qualifica e conduz conversas automaticamente 24/7." },
  { icon: RefreshCw, num: "06", title: "Follow-up inteligente", desc: "Recupera oportunidades que seriam perdidas com reengajamento automático." },
  { icon: CalendarCheck, num: "07", title: "Conversão", desc: "Gera reuniões, propostas e negociações de forma estruturada." },
  { icon: LayoutGrid, num: "08", title: "CRM integrado", desc: "Organiza pipeline, histórico, score e acompanhamento completo." },
];

export const MechanismSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 sm:py-32 w-full relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4">
            Como funciona
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            A arquitetura de uma<br />
            <span className="text-shimmer-highlight">máquina de vendas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            8 etapas que transformam prospecção manual em geração previsível de oportunidades.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/30 transition-all duration-300"
            >
              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-[14px] top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                  <ArrowRight size={14} className="text-primary" />
                </div>
              )}
              {/* Arrow for row break (4th card → 5th card) */}
              {i === 3 && (
                <div className="hidden lg:flex absolute -bottom-[14px] left-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 items-center justify-center rotate-90">
                  <ArrowRight size={14} className="text-primary" />
                </div>
              )}

              <div className="mb-4">
                <span className="text-3xl font-bold text-primary/70 tracking-tight">{step.num}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <step.icon size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
