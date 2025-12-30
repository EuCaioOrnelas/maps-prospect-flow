import { Search, MapPin, Download, Zap, Shield, Brain, Target, TrendingUp, CheckCircle } from "lucide-react";
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
      className="py-24 relative"
      ref={ref as React.RefObject<HTMLElement>}
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div 
          className={`text-center mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Brain size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Tecnologia de Prospecção Inteligente</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Por que leads{" "}
            <span className="text-gradient">estratégicos</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Quantidade não é qualidade. Nossa IA analisa milhares de empresas e entrega apenas as que têm 
            maior probabilidade de se tornarem seus clientes.
          </p>
        </div>

        {/* AI Value Block */}
        <div 
          className={`glass rounded-2xl p-8 mb-16 transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold mb-2">
                Menos leads, mais resultados
              </h3>
              <p className="text-muted-foreground">
                Em vez de entregar centenas de contatos desatualizados, o Prospex entrega até 50 leads 
                estrategicamente selecionados por busca. Empresas com atividade recente, 
                avaliações positivas e informações de contato verificadas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-4">
              <CheckCircle size={20} className="text-primary" />
              <span className="text-sm">Empresas com atividade recente</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-4">
              <CheckCircle size={20} className="text-primary" />
              <span className="text-sm">Contatos ativos e verificados</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-4">
              <CheckCircle size={20} className="text-primary" />
              <span className="text-sm">Alto potencial de conversão</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group glass rounded-2xl p-8 hover:bg-card/90 transition-all duration-500 hover:-translate-y-1 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon size={28} className="text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
