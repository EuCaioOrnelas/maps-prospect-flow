import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { TRIAL_DISABLED, notifyTrialDisabled } from "@/lib/trialStatus";

interface CTASectionProps {
 onSignupClick?: () => void;
}

export const CTASection = ({ onSignupClick }: CTASectionProps) => {
 const { ref, isVisible } = useScrollAnimation();
 
 return (
 <section 
 className="py-16 sm:py-24 relative overflow-hidden w-full cv-auto"
 ref={ref as React.RefObject<HTMLElement>}
 style={{
 background:
 "radial-gradient(ellipse 60% 55% at 50% 50%, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 40%, transparent 75%), radial-gradient(ellipse 45% 40% at 10% 100%, hsl(var(--primary) / 0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 95% 100%, hsl(var(--primary) / 0.05) 0%, transparent 70%)",
 }}
 >
 
 
 <div className="container mx-auto px-4 relative z-10 max-w-6xl">
 <div 
 className={`max-w-4xl mx-auto text-center px-2 transition-all duration-700 ${
 isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
 }`}
 >
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-hover glass mb-6">
 <Zap size={16} className="text-primary" />
 <span className="text-sm text-muted-foreground">Comece em menos de 1 minuto</span>
 </div>
 <h2 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-foreground">
 Ligue sua máquina<br />
 <span className="text-shimmer-highlight">de vendas B2B</span>
 </h2>
 <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
 Teste a Wiize por 7 dias com tudo liberado e veja ela encontrar empresas, iniciar conversas e marcar reuniões para o seu time. Cartão apenas como garantia, sem cobrança no período de teste e cancelamento na própria plataforma.
 </p>
 {TRIAL_DISABLED ? (
 <>
 <Button
 variant="hero"
 size="xl"
 className="group rounded-full opacity-60 cursor-not-allowed"
 disabled
 aria-disabled="true"
 onClick={(e) => { e.preventDefault(); notifyTrialDisabled(); }}
 >
 <Lock className="mr-1" size={18} />
 Teste grátis indisponível
 </Button>
 <p className="text-sm text-muted-foreground mt-6 max-w-md mx-auto">
 Estamos aprimorando a experiência. O teste gratuito será liberado em breve.
 </p>
 </>
 ) : (
 <>
 <Link to="/signup/escolher-plano" onClick={onSignupClick}>
 <Button variant="hero" size="xl" className="group rounded-full">
 Começar gratuitamente
 <ArrowRight className="group-hover:translate-x-1 transition-transform" />
 </Button>
 </Link>
 <p className="text-sm text-muted-foreground mt-6">
 Cartão como garantia • 7 dias sem cobrança • Cancele quando quiser
 </p>
 </>
 )}
 </div>
 </div>
 </section>
 );
};
