import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { 
  Clock, 
  Zap,
  MessageCircle,
  ArrowLeft,
  Bot,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { WianChat } from "@/components/support/WianChat";

const contactInfo = [
  {
    icon: Bot,
    title: "Assistente Inteligente",
    description: "Tire dúvidas 24h com nosso chatbot",
    color: "text-primary"
  },
  {
    icon: Clock,
    title: "Horário de Suporte",
    description: "Seg - Sex: 9h às 18h",
    color: "text-blue-500"
  },
  {
    icon: Zap,
    title: "Resposta Rápida",
    description: "Respondemos em até 24h úteis",
    color: "text-amber-500"
  }
];

const Contact = () => {
  return (
    <>
      <SEO 
        title="Contato e Suporte"
        description="Entre em contato com a equipe Wiize. Suporte 24h via chatbot, atendimento personalizado e ajuda com prospecção de leads, WhatsApp e automação."
        url="https://wiize.com.br/contato"
        keywords="contato Wiize, suporte Wiize, ajuda prospecção, atendimento"
      />
      <div className="min-h-screen bg-background">
        {/* Background decorations with glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-gradient-to-r from-primary/5 to-emerald-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Link to="/">
                <Logo size="md" />
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Voltar</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-4 py-6 sm:py-8 md:py-12">
          {/* Badge */}
          <motion.div
            className="flex justify-center mb-4 sm:mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Estamos aqui para ajudar</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            className="text-center mb-6 sm:mb-8 md:mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 text-foreground">
              Fale Conosco
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-lg mx-auto px-4">
              Tem alguma dúvida ou sugestão? Adoraríamos ouvir você!
            </p>
          </motion.div>

          {/* Content Grid */}
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-stretch">
            {/* Left Column - Contact Info */}
            <motion.div
              className="flex flex-col gap-4 sm:gap-5 md:gap-6 order-2 lg:order-1"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  className="flex-1 flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <info.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${info.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{info.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </motion.div>
              ))}

              {/* Quick Tip */}
              <motion.div
                className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl shadow-[0_0_30px_hsl(var(--primary)/0.15)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-primary mb-1 text-sm sm:text-base">Atendimento instantâneo</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Nosso assistente virtual está disponível 24 horas por dia para tirar suas dúvidas de forma rápida e prática!
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Typebot Chat */}
            <motion.div
              className="relative order-1 lg:order-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Chat Container with unified rounded corners */}
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
                {/* Chat Header */}
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="relative">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Assistente Virtual</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] sm:text-xs text-green-500">Online</span>
                    </div>
                  </div>
                </div>

                {/* Wian Chat */}
                <WianChat />
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Contact;
