import { Search, MapPin, Download, Zap, Shield, Brain, Target, TrendingUp, CheckCircle, MessageSquare, BarChart3, ShieldCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Brain,
    title: "Curadoria com IA",
    description: "Nossa inteligência artificial analisa e filtra resultados para entregar apenas empresas ativas com maior potencial de conversão.",
  },
  {
    icon: Target,
    title: "Leads Pré-Qualificados",
    description: "Cada lead é estrategicamente selecionado: contatos verificados, avaliações reais e histórico de atividade recente.",
  },
  {
    icon: MapPin,
    title: "Segmentação Geográfica",
    description: "Filtre por cidade, bairro ou região para encontrar leads exatamente onde você precisa atuar.",
  },
  {
    icon: Download,
    title: "Até 50 Leads por Busca",
    description: "Cada busca estratégica retorna até 50 leads qualificados, prontos para download em planilha Excel.",
  },
  {
    icon: MessageSquare,
    title: "Disparos em Massa via WhatsApp",
    description: "Envie mensagens automatizadas para seus leads com limite de 200 disparos/dia. Estratégia anti-bloqueio com API oficial.",
    badge: "Novo",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Acompanhe métricas de campanhas, taxa de conversão e performance dos leads com dashboards visuais completos.",
    badge: "Novo",
  },
  {
    icon: Shield,
    title: "Dados Verificados",
    description: "Informações reais extraídas do Google Maps: telefone, site, avaliações e endereço atualizados.",
  },
  {
    icon: TrendingUp,
    title: "Maior Taxa de Conversão",
    description: "Leads curados significam menos tempo desperdiçado e mais oportunidades reais de negócio fechado.",
  },
];

export const FeaturesSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  
  return (
    <section 
      id="features" 
      className="py-12 md:py-24 relative"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-30 hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div 
          className={`text-center mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass mb-4 sm:mb-6">
            <Brain size={16} className="text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Tecnologia de Prospecção Inteligente</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-2">
            Por que leads{" "}
            <span className="text-gradient">estratégicos</span>?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Quantidade não é qualidade. Nossa IA analisa milhares de empresas e entrega apenas as que têm 
            maior probabilidade de se tornarem seus clientes.
          </p>
        </div>

        {/* AI Value Block */}
        <div 
          className={`glass rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-10 sm:mb-16 transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">
                Menos leads, mais resultados
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Em vez de entregar centenas de contatos desatualizados, o WiizeProspect entrega até 50 leads 
                estrategicamente selecionados por busca. Empresas com atividade recente, 
                avaliações positivas e informações de contato verificadas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Empresas com atividade recente</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Contatos ativos e verificados</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 sm:p-4">
              <CheckCircle size={18} className="text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm">Alto potencial de conversão</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group glass rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:bg-card/90 transition-all duration-500 hover:-translate-y-1 relative ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              {'badge' in feature && feature.badge && (
                <span className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  {feature.badge}
                </span>
              )}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
