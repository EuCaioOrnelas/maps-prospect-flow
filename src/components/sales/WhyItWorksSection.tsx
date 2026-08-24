import { motion } from "framer-motion";
import { Zap, Brain, Search, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SectionHeading } from "@/components/landing/SectionHeading";

const pillars = [
 {
 icon: Search,
 eyebrow: "Dados reais",
 title: "Você fala com quem pode comprar",
 description:
 "A Wiize olha nicho, porte e presença digital de cada empresa antes de indicar. Seu time para de perder tempo com contato frio.",
 },
 {
 icon: Brain,
 eyebrow: "IA contextual",
 title: "A mensagem faz sentido para quem recebe",
 description:
 "Cada abordagem é escrita a partir do que a Wiize descobriu sobre aquela empresa. Não parece disparo em massa, e por isso as pessoas respondem.",
 },
 {
 icon: Zap,
 eyebrow: "Operação autônoma",
 title: "Nada depende de alguém lembrar",
 description:
 "Do primeiro contato ao follow-up, a máquina segue trabalhando enquanto seu time está em reunião. Você configura uma vez e ela executa todos os dias.",
 },
];

const results = [
 { metric: "3x", label: "mais respostas", description: "Mensagem com contexto tem muito mais retorno" },
 { metric: "24/7", label: "sempre trabalhando", description: "O lead é respondido na hora, não no dia seguinte" },
 { metric: "100%", label: "follow-up garantido", description: "Ninguém fica sem retorno por esquecimento" },
 { metric: "Total", label: "visibilidade do pipeline", description: "Você sabe o que vem pela frente no mês" },
];

export const WhyItWorksSection = () => {
 const { ref, isVisible } = useScrollAnimation();

 return (
 <section
 className="py-12 sm:py-20 relative overflow-hidden w-full"
 ref={ref as React.RefObject<HTMLElement>}
 >
 <div className="container mx-auto px-4 relative z-10 max-w-6xl">
 {/* Header padronizado */}
 <SectionHeading
 eyebrow="Por que funciona"
 title="Por que esse sistema gera"
 highlight="mais vendas consistentes"
 description="Não é sobre trabalhar mais. É sobre ter o processo certo em cada etapa e deixar a estrutura fazer o trabalho pesado por você."
 isVisible={isVisible}
 />

 {/* 3 Pilares — mesmo padrão visual dos cards da section anterior */}
 <div className="relative grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
 {pillars.map((pillar, index) => {
 const Icon = pillar.icon;
 return (
 <motion.div
 key={index}
 initial={{ opacity: 0, y: 24 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, amount: 0.2 }}
 transition={{ duration: 0.5, delay: index * 0.12 }}
 className="group relative overflow-hidden rounded-card border border-border/70 bg-card/95 p-4 sm:p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
 >
 <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-primary/[0.06] soft-glow pointer-events-none" />
 <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-primary/[0.04] soft-glow pointer-events-none" />

 <div className="relative z-10">
 <div className="flex items-center gap-2.5 mb-2">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0 group-hover:shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.65)] transition-colors">
 <Icon size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base leading-tight">{pillar.title}</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
 </div>
 </motion.div>
 );
 })}
 </div>

  {/* Bloco de resultados */}
  <motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.5, delay: 0.1 }}
  className="relative mt-4 sm:mt-6 overflow-hidden rounded-card border border-border/70 bg-card/95 p-5 sm:p-8 md:p-10"
  >
  <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-primary/[0.06] soft-glow pointer-events-none" />
  <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-primary/[0.04] soft-glow pointer-events-none" />

  <div className="relative z-10">
  <div className="text-center mb-6 sm:mb-8">
  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white bg-primary px-2.5 py-1 rounded-xs mb-3 uppercase tracking-wider">
  <Sparkles size={11} className="text-white" />
  Resultados na prática
  </span>
  <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
  O que muda no seu dia a dia
  </h3>
  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
  Menos prospecção manual. Mais oportunidades no pipeline.
  </p>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
  {results.map((result, index) => (
  <motion.div
  key={index}
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.4, delay: index * 0.08 }}
  className="text-center p-3 sm:p-5 rounded-card border border-primary/15 bg-card hover:border-primary/30 hover:shadow-[0_10px_28px_-16px_hsl(var(--primary)/0.45)] transition-all duration-300"
  style={{
    background:
      "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--card)) 45%, hsl(var(--primary) / 0.08) 100%)",
  }}
  >
  <span className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary block mb-1">
  {result.metric}
  </span>
  <span className="text-xs sm:text-sm font-semibold text-foreground block mb-1.5">
  {result.label}
  </span>
  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
  {result.description}
  </p>
  </motion.div>
  ))}
  </div>
  </div>
  </motion.div>
 </div>
 </section>
 );
};
