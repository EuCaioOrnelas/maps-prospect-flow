import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Confetti } from "@/components/ui/confetti";
import { motion } from "framer-motion";
import { Check, PartyPopper, Sparkles, Crown, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const planNames: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Enterprise",
};

const RenewalSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti] = useState(true);

  const email = searchParams.get("email") || "";
  const plan = searchParams.get("plan") || "start";

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Confetti trigger={showConfetti} />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link to="/"><Logo size="md" /></Link>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-16 max-w-lg">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="relative w-24 h-24 mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-primary rounded-full animate-pulse" />
            <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-primary rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </div>
            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <PartyPopper className="w-8 h-8 text-amber-500" />
            </motion.div>
          </motion.div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
              Renovação Confirmada!
            </span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>

          <h1 className="font-display text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Plano renovado com sucesso!
          </h1>

          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Seu plano <span className="font-semibold text-emerald-600">{planNames[plan] || plan}</span> foi renovado e já está ativo.
          </p>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 rounded-3xl blur-xl" />

          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    Tudo certo! 🎉
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Seu plano foi renovado por mais 30 dias. Todas as funcionalidades continuam disponíveis.
                    {email && (
                      <span className="block mt-1 text-xs text-muted-foreground/70">
                        Conta: <strong className="text-foreground">{email}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-700 hover:to-primary/90"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Acessar minha conta
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Faça login para continuar usando a plataforma.
            </p>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-sm text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Obrigado por continuar com a Wiize! 💚
        </motion.p>
      </main>
    </div>
  );
};

export default RenewalSuccess;