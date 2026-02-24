import { motion } from "framer-motion";
import { Construction, Rocket, BookOpen } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

const Consultoria = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 lg:ml-[72px] relative">
        <BackgroundGlow />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg space-y-8"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto"
            >
              <Construction size={44} className="text-primary" />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Em Desenvolvimento</span>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Consultoria Wiize
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Estamos preparando uma <strong className="text-foreground">consultoria completa e exclusiva</strong> para
                assinantes Wiize. Em breve você terá acesso a conteúdos estratégicos para maximizar seus resultados.
              </p>
            </motion.div>

            {/* Features preview */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 border border-border/50 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Rocket size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Metodologia completa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estratégias avançadas de prospecção, ativação e conversão de leads com a Wiize.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 border border-border/50 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Conteúdo exclusivo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vídeos, guias práticos e material de apoio para assinantes dos planos pagos.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground/70"
            >
              Será lançada em breve. Fique atento às novidades! 🚀
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Consultoria;
