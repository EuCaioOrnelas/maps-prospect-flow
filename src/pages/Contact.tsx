import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { 
  Clock, 
  Zap,
  MessageCircle,
  ArrowLeft,
  Bot,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { WianChat } from "@/components/support/WianChat";
import wianAvatar from "@/assets/wian-avatar.png";

const contactInfo = [
  {
    icon: Clock,
    title: "Horário de Suporte",
    description: "Seg - Sex: 9h às 18h",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    icon: Zap,
    title: "Resposta Rápida",
    description: "Respondemos em até 24h úteis",
    color: "text-amber-500",
    bg: "bg-amber-500/10"
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

          {/* Content - cards on top, chat below */}
          <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6 md:gap-8">
            {/* Top Row - Contact Info Cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg ${info.bg} flex items-center justify-center flex-shrink-0`}>
                    <info.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${info.color}`} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">{info.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom - Chat */}
            <motion.div
              className="relative h-[min(640px,calc(100vh-8rem))] lg:h-[min(720px,calc(100vh-6rem))]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.1)] flex flex-col h-full">
                {/* Chat Header */}
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="relative">
                    <img
                      src={wianAvatar}
                      alt="Wian"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm sm:text-base">Wian Assistente Virtual</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] sm:text-xs text-green-500">Online</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.dispatchEvent(new Event("wian:reset"))}
                    title="Reiniciar conversa"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Reiniciar</span>
                  </Button>
                </div>

                {/* Wian Chat */}
                <div className="flex-1 min-h-0">
                  <WianChat />
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Contact;
