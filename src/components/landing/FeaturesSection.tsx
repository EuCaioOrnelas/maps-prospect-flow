import { Search, MapPin, Download, Zap, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Busca Inteligente",
    description: "Encontre empresas e profissionais usando palavras-chave estratégicas diretamente do Google Maps.",
  },
  {
    icon: MapPin,
    title: "Segmentação Geográfica",
    description: "Filtre por cidade, bairro ou região para encontrar leads exatamente onde você precisa.",
  },
  {
    icon: Download,
    title: "Exportação Instantânea",
    description: "Baixe todos os leads em planilha Excel pronta para uso, com dados completos e organizados.",
  },
  {
    icon: Zap,
    title: "Resultados em Segundos",
    description: "Economize horas de trabalho manual. Cada busca retorna até 30 leads qualificados.",
  },
  {
    icon: Shield,
    title: "Dados Verificados",
    description: "Informações reais extraídas do Google Maps: telefone, site, avaliações e endereço.",
  },
  {
    icon: Clock,
    title: "Prospecção Previsível",
    description: "Tenha um fluxo constante de novos leads todo mês com buscas estratégicas ilimitadas.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa para{" "}
            <span className="text-gradient">prospectar</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ferramentas profissionais para encontrar e organizar leads de forma eficiente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group glass rounded-2xl p-8 hover:bg-card/90 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
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
