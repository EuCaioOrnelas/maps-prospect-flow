import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { 
  Mail, 
  Clock, 
  Zap,
  MessageCircle,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const contactInfo = [
  {
    icon: Mail,
    title: "E-mail",
    description: "contato@prospex.com",
    color: "text-primary"
  },
  {
    icon: Clock,
    title: "Horário",
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
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-12">
        {/* Badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Estamos aqui para ajudar</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Fale Conosco
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Tem alguma dúvida ou sugestão? Adoraríamos ouvir você!
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Contact Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {contactInfo.map((info, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-4 p-5 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <info.icon className={`w-5 h-5 ${info.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{info.title}</p>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
              </motion.div>
            ))}

            {/* Quick Tip */}
            <motion.div
              className="p-5 bg-primary/5 border border-primary/20 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="font-semibold text-primary mb-1">Dica rápida</p>
              <p className="text-sm text-muted-foreground">
                Use nosso assistente virtual ao lado para tirar suas dúvidas de forma rápida e prática!
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column - Typebot Chat */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Chat Header */}
            <div className="flex items-center gap-3 mb-4 p-4 bg-card border border-border/50 rounded-t-xl border-b-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Assistente Virtual</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-500">Online</span>
                </div>
              </div>
            </div>

            {/* Typebot iframe */}
            <div className="bg-card border border-border/50 rounded-b-xl overflow-hidden">
              <iframe
                src="https://typebot.co/my-typebot-obap8ag"
                style={{ border: "none", width: "100%", height: "500px" }}
                title="Assistente Virtual Prospex"
              />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
