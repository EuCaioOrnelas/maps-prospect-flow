import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { motion } from "framer-motion";
import {
 Search,
 MessageCircle,
 Send,
 LayoutDashboard,
 Zap,
 Bot,
 ChevronRight,
 Clock,
 RefreshCw,
 Target,
 CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import flowBuilderPreview from "@/assets/flow-builder-preview.png";
import { SectionHeading } from "@/components/landing/SectionHeading";

const cardBase =
 "group rounded-card border border-border/70 bg-card/95 transition-shadow duration-500 ease-out p-3 sm:p-3.5 h-full flex flex-col relative overflow-hidden hover:shadow-lg hover:shadow-primary/5";
const cardGlowMain =
 "absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-primary/[0.06] soft-glow pointer-events-none";
const cardGlowSecondary =
 "absolute -top-8 -left-8 w-36 h-36 rounded-full bg-primary/[0.04] soft-glow pointer-events-none";

/* Pipeline steps for horizontal flow inside Operação Comercial */
const pipelineSteps = [
 { icon: Clock, label: "Follow-up automático" },
 { icon: RefreshCw, label: "Pipeline atualizado" },
 { icon: Target, label: "Lead qualificado" },
 { icon: CheckCircle, label: "Venda fechada" },
];

const containerVariants = {
 hidden: { opacity: 0 },
 visible: {
 opacity: 1,
 transition: { staggerChildren: 0.1, delayChildren: 0.1 },
 },
};

const itemVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: {
 opacity: 1,
 y: 0,
 transition: { type: "spring" as const, stiffness: 100, damping: 10 },
 },
};

export const FeaturesOverviewSection = () => {
 const { ref, isVisible } = useScrollAnimation();

 return (
 <section
 id="features"
 ref={ref as React.RefObject<HTMLElement>}
 className="py-12 sm:py-20 w-full relative scroll-mt-24"
 >
 <div className="container mx-auto px-4 max-w-6xl">
 <SectionHeading
 eyebrow="A máquina por dentro"
 title="As peças que abastecem o"
 highlight="seu pipeline B2B"
 highlightFit="tight"
 description="Encontrar, abordar, conversar, acompanhar e agendar. Cada peça faz uma parte do trabalho comercial que hoje é feito na mão."
 isVisible={isVisible}
 />

 <motion.div
 variants={containerVariants}
 initial="hidden"
  animate={isVisible ? "visible" : "hidden"}
 className={cn(
 "grid w-full grid-cols-1 gap-4 md:grid-cols-[2fr_2fr_3fr]",
 "md:grid-rows-3",
 "auto-rows-[minmax(110px,auto)]"
 )}
 >
 {/* Top-left: Prospecção */}
 <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
 <div className={cardBase}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider">Abordagem</span>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <MessageCircle size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">Fale com cada empresa do jeito certo</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 A Wiize escreve a mensagem com base no nicho, no porte e no que descobriu sobre a empresa. Mais gente responde e mais conversas entram no pipeline.
 </p>
 </div>
 </div>
 </motion.div>

 {/* Top-center: Campanhas */}
 <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
 <div className={cardBase}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider">Infraestrutura</span>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <Send size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">Converse pelo WhatsApp oficial</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 Sua operação conectada ao WhatsApp Business oficial da Meta. Você fala em volume com tranquilidade, sem risco de bloqueio.
 </p>
 </div>
 </div>
 </motion.div>

 {/* Right tall: Agente de IA - with flow builder image */}
 <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3">
 <div className={`${cardBase} !p-0`}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10 p-3 sm:p-3.5 flex flex-col">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider w-fit">Automações</span>
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-hover bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <Bot size={20} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">A conversa segue o caminho certo</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 Você define como a conversa deve andar e a IA conduz. Ela qualifica, tira dúvidas e leva o potencial cliente até o próximo passo, sem alguém precisar acompanhar.
 </p>
 </div>
 {/* Flow builder background image */}
 <div className="pointer-events-none relative flex-1 min-h-[240px] overflow-hidden mt-6">
 <img
 src={flowBuilderPreview}
 alt="Visualização do editor de fluxos"
 loading="eager"
 decoding="async"
 className="w-[110%] ml-[2%] object-contain drop-shadow-lg"
 />
 </div>
 </div>
 </motion.div>

 {/* Mid-left: CRM */}
 <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
 <div className={cardBase}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider">Organização</span>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <LayoutDashboard size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">Tenha todas as oportunidades sob controle</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 Conversas, histórico e etapa comercial ficam organizados automaticamente. Sua equipe sabe quem merece atenção agora.
 </p>
 </div>
 </div>
 </motion.div>

 {/* Mid-center: Captação */}
 <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
 <div className={cardBase}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider">Prospecção</span>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <Search size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">Encontre empresas do seu ICP</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 A Wiize encontra empresas por nicho, localização e características do seu cliente ideal, analisa cada uma e mostra quais têm mais potencial de virar reunião.
 </p>
 </div>
 </div>
 </motion.div>

 {/* Bottom wide: Automação with horizontal timeline */}
 <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-1 md:col-start-1">
 <div className={`${cardBase} !flex-col`}>
 <div className={cardGlowSecondary} />
 <div className={cardGlowMain} />
 <div className="relative z-10">
 <span className="inline-block text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-xs mb-2 uppercase tracking-wider">Continuidade</span>
 <div className="flex items-center gap-2.5 mb-1.5">
 <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary to-primary/80 shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center flex-shrink-0">
 <Zap size={16} className="text-primary-foreground" />
 </div>
 <h3 className="font-semibold text-foreground text-base">A máquina continua quando o time para</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">
 Follow-ups, atualização do pipeline e tarefas repetitivas acontecem sozinhos. Ninguém fica sem resposta, mesmo com a equipe ocupada.
 </p>
 </div>

 {/* Horizontal pipeline sequence with arrows */}
 <div className="relative z-10 mt-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-0 px-1">
 {pipelineSteps.map((step, i) => {
 const StepIcon = step.icon;
 return (
 <div key={i} className="flex items-center flex-1 min-w-0 last:flex-none">
 <motion.div
 className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-sm px-2 sm:px-2.5 py-1.5 sm:py-2 whitespace-nowrap"
 initial={{ opacity: 0, x: -15, scale: 0.9 }}
 animate={isVisible ? { opacity: 1, x: 0, scale: 1 } : {}}
 transition={{ duration: 0.5, delay: 0.6 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
 >
 <StepIcon size={13} className="text-primary flex-shrink-0" />
 <span className="text-[9px] sm:text-[11px] font-medium text-foreground/80">{step.label}</span>
 </motion.div>
 {i < pipelineSteps.length - 1 && (
 <motion.div
 className="hidden sm:flex items-center justify-center flex-1 mx-0.5"
 initial={{ opacity: 0, scaleX: 0 }}
 animate={isVisible ? { opacity: 1, scaleX: 1 } : {}}
 transition={{ duration: 0.35, delay: 0.75 + i * 0.25 }}
 style={{ transformOrigin: "left" }}
 >
 <div className="flex-1 h-px bg-primary/20" />
 <ChevronRight size={14} className="text-primary/40 -mx-0.5 flex-shrink-0" />
  </motion.div>
  )}
 </div>
 );
 })}
 </div>
 </div>
 </motion.div>
  </motion.div>
 </div>
 </section>
 );
};
