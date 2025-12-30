import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, MapPin, Download, MessageSquare, Send, CheckCircle, Clock, Users, Smartphone, Play } from "lucide-react";

const prospectingSteps = [
  { icon: Search, label: "Buscar", description: "restaurantes italianos" },
  { icon: MapPin, label: "Localizar", description: "São Paulo, SP" },
  { icon: Users, label: "Encontrar", description: "50 leads qualificados" },
  { icon: Download, label: "Exportar", description: "Download Excel" },
];

const whatsappSteps = [
  { icon: Users, label: "Selecionar", description: "150 leads" },
  { icon: MessageSquare, label: "Criar", description: "3 variações" },
  { icon: Send, label: "Disparar", description: "Envio automático" },
  { icon: CheckCircle, label: "Concluir", description: "98% entregues" },
];

const mockLeads = [
  { name: "Ristorante Milano", phone: "(11) 9****-1234", rating: "4.8" },
  { name: "Cantina Toscana", phone: "(11) 9****-5678", rating: "4.6" },
  { name: "La Pasta Fresca", phone: "(11) 9****-9012", rating: "4.9" },
  { name: "Trattoria Roma", phone: "(11) 9****-3456", rating: "4.7" },
];

const mockMessages = [
  "Olá! Vi que vocês são referência em culinária italiana...",
  "Oi! Tenho uma proposta especial para restaurantes...",
  "Bom dia! Trabalho com soluções para gastronomia...",
];

export const DemoSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [activeDemo, setActiveDemo] = useState<"prospecting" | "whatsapp">("prospecting");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const steps = activeDemo === "prospecting" ? prospectingSteps : whatsappSteps;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });

      if (activeDemo === "whatsapp") {
        setSentCount((prev) => Math.min(prev + 25, 150));
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length, activeDemo]);

  const handlePlay = () => {
    setCurrentStep(0);
    setSentCount(0);
    setIsPlaying(true);
  };

  const handleDemoChange = (demo: "prospecting" | "whatsapp") => {
    setActiveDemo(demo);
    setCurrentStep(0);
    setSentCount(0);
    setIsPlaying(false);
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 md:py-24 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-20" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div
          className={`text-center mb-10 sm:mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Play size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Veja na prática</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Como <span className="text-gradient">funciona</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Demonstração interativa das principais funcionalidades
          </p>
        </div>

        {/* Demo Tabs */}
        <div
          className={`flex justify-center gap-4 mb-8 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={() => handleDemoChange("prospecting")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
              activeDemo === "prospecting"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "glass hover:bg-card/80"
            }`}
          >
            <Search size={18} />
            <span className="hidden sm:inline">Prospecção</span>
          </button>
          <button
            onClick={() => handleDemoChange("whatsapp")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
              activeDemo === "whatsapp"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "glass hover:bg-card/80"
            }`}
          >
            <MessageSquare size={18} />
            <span className="hidden sm:inline">Disparos WhatsApp</span>
          </button>
        </div>

        {/* Demo Container */}
        <div
          className={`glass rounded-2xl p-6 sm:p-8 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Steps Progress */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex flex-col items-center min-w-[80px] transition-all duration-500 ${
                  index <= currentStep ? "opacity-100" : "opacity-40"
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: index === currentStep ? 1.2 : 1,
                    backgroundColor: index <= currentStep ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                >
                  <step.icon size={20} className={index <= currentStep ? "text-primary-foreground" : "text-muted-foreground"} />
                </motion.div>
                <span className="text-xs font-medium">{step.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{step.description}</span>
              </div>
            ))}
          </div>

          {/* Demo Content */}
          <div className="bg-background/50 rounded-xl p-4 sm:p-6 min-h-[300px]">
            <AnimatePresence mode="wait">
              {activeDemo === "prospecting" ? (
                <motion.div
                  key="prospecting"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Search Bar Simulation */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.div
                      animate={{ 
                        borderColor: currentStep >= 0 ? "hsl(var(--primary))" : "hsl(var(--border))"
                      }}
                      className="flex-1 bg-secondary rounded-lg px-4 py-3 flex items-center gap-3 border-2"
                    >
                      <Search size={18} className="text-primary" />
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: currentStep >= 0 ? "auto" : 0 }}
                        className="text-foreground overflow-hidden whitespace-nowrap"
                      >
                        {currentStep >= 0 ? "restaurantes italianos" : ""}
                      </motion.span>
                    </motion.div>
                    <motion.div
                      animate={{ 
                        borderColor: currentStep >= 1 ? "hsl(var(--primary))" : "hsl(var(--border))"
                      }}
                      className="flex-1 bg-secondary rounded-lg px-4 py-3 flex items-center gap-3 border-2"
                    >
                      <MapPin size={18} className="text-primary" />
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: currentStep >= 1 ? "auto" : 0 }}
                        className="text-foreground overflow-hidden whitespace-nowrap"
                      >
                        {currentStep >= 1 ? "São Paulo, SP" : ""}
                      </motion.span>
                    </motion.div>
                  </div>

                  {/* Results Simulation */}
                  <AnimatePresence>
                    {currentStep >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-muted-foreground">Resultados encontrados</span>
                          <span className="text-primary font-semibold">50 leads</span>
                        </div>
                        {mockLeads.map((lead, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between bg-secondary/50 rounded-lg p-3"
                          >
                            <div>
                              <p className="font-medium text-sm">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone}</p>
                            </div>
                            <div className="flex items-center gap-1 text-primary">
                              <span className="text-sm">⭐</span>
                              <span className="text-sm font-medium">{lead.rating}</span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Download Button */}
                  <AnimatePresence>
                    {currentStep >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-center pt-4"
                      >
                        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium">
                          <Download size={18} />
                          <span>Exportar 50 leads para Excel</span>
                          <CheckCircle size={18} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="whatsapp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Lead Selection */}
                  <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-primary" />
                      <div>
                        <p className="font-medium text-sm">Leads selecionados</p>
                        <p className="text-xs text-muted-foreground">Da última busca</p>
                      </div>
                    </div>
                    <motion.span
                      animate={{ scale: currentStep >= 0 ? [1, 1.1, 1] : 1 }}
                      className="text-2xl font-bold text-primary"
                    >
                      {currentStep >= 0 ? "150" : "0"}
                    </motion.span>
                  </div>

                  {/* Message Variations */}
                  <AnimatePresence>
                    {currentStep >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <p className="text-sm text-muted-foreground mb-2">Variações de mensagem</p>
                        {mockMessages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.15 }}
                            className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">{index + 1}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{msg}</p>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sending Progress */}
                  <AnimatePresence>
                    {currentStep >= 2 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-secondary/50 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Smartphone size={18} className="text-primary" />
                            <span className="text-sm font-medium">Enviando mensagens...</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {sentCount}/150
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${(sentCount / 150) * 100}%` }}
                          />
                        </div>
                        {currentStep >= 2 && sentCount < 150 && (
                          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <Clock size={14} className="animate-pulse" />
                            <span>Intervalo de 30s entre mensagens (anti-ban)</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Completion */}
                  <AnimatePresence>
                    {currentStep >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-4"
                      >
                        <CheckCircle size={24} className="text-green-500" />
                        <div>
                          <p className="font-medium text-green-500">Campanha concluída!</p>
                          <p className="text-sm text-muted-foreground">147/150 mensagens entregues (98%)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Play Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isPlaying
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              }`}
            >
              <Play size={18} />
              <span>{isPlaying ? "Reproduzindo..." : "Ver demonstração"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
