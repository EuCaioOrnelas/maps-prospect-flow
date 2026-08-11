import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  XCircle, 
  ArrowLeft, 
  RefreshCcw, 
  CreditCard, 
  AlertTriangle,
  HelpCircle,
  Shield,
  Wifi,
  Clock,
  DollarSign,
  Mail,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

const possibleReasons = [
  {
    icon: CreditCard,
    title: "Dados do cartão incorretos",
    description: "Verifique se o número do cartão, data de validade e CVV estão corretos.",
    color: "text-red-500"
  },
  {
    icon: DollarSign,
    title: "Saldo ou limite insuficiente",
    description: "Seu cartão pode não ter saldo ou limite disponível para esta compra.",
    color: "text-amber-500"
  },
  {
    icon: Shield,
    title: "Bloqueio de segurança",
    description: "Seu banco pode ter bloqueado a transação por segurança. Entre em contato com seu banco.",
    color: "text-blue-500"
  },
  {
    icon: Wifi,
    title: "Problema de conexão",
    description: "Houve uma falha na comunicação durante o processamento do pagamento.",
    color: "text-purple-500"
  },
  {
    icon: Clock,
    title: "Sessão expirada",
    description: "O tempo limite para completar o pagamento foi excedido. Tente novamente.",
    color: "text-orange-500"
  },
  {
    icon: AlertTriangle,
    title: "Cartão recusado pelo emissor",
    description: "O banco emissor do cartão recusou a transação. Pode ser necessário autorizar.",
    color: "text-rose-500"
  }
];

const CheckoutFailed = () => {
  const navigate = useNavigate();
  const [expandedReason, setExpandedReason] = useState<number | null>(null);
  useAutoScoreTracking("checkout_failed");

  const handleTryAgain = () => {
    navigate("/upgrade");
  };

  return (
    <div className="landing-light min-h-screen bg-background text-foreground">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <Link to="/">
              <Logo size="md" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-12 max-w-2xl">
        {/* Error Header */}
        <motion.div 
          className="text-center mb-10"
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
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-amber-500/20 rounded-full animate-pulse" />
            <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-amber-500 rounded-[18px] flex items-center justify-center">
                <XCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ops! O pagamento não foi concluído
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Não se preocupe, isso pode acontecer por diversos motivos e nenhuma cobrança foi feita no seu cartão.
            </p>
          </motion.div>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          className="relative mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-lg">
            {/* Notice */}
            <div className="flex items-start gap-4 mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <HelpCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Por que isso aconteceu?
                </p>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  Infelizmente, não temos acesso aos detalhes específicos do motivo da recusa, pois essa informação é protegida pelo seu banco. Abaixo listamos as causas mais comuns.
                </p>
              </div>
            </div>

            {/* Possible Reasons */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                Possíveis causas do problema:
              </h2>
              
              <div className="space-y-3">
                {possibleReasons.map((reason, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <button
                      onClick={() => setExpandedReason(expandedReason === index ? null : index)}
                      className="w-full text-left"
                    >
                      <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                        expandedReason === index 
                          ? 'bg-muted/50 border-border' 
                          : 'bg-background hover:bg-muted/30 border-border/50'
                      }`}>
                        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                          <reason.icon className={`w-5 h-5 ${reason.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{reason.title}</p>
                          <AnimatePresence>
                            {expandedReason === index && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-sm text-muted-foreground mt-1"
                              >
                                {reason.description}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        {expandedReason === index ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <Button 
                onClick={handleTryAgain}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <RefreshCcw className="w-5 h-5 mr-2" />
                Tentar novamente
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Link to="/" className="w-full">
                  <Button variant="outline" className="w-full h-11">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao início
                  </Button>
                </Link>
                <Link to="/contato" className="w-full">
                  <Button variant="outline" className="w-full h-11">
                    <Mail className="w-4 h-4 mr-2" />
                    Falar com suporte
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Tips Card */}
        <motion.div 
          className="bg-muted/30 border border-border/50 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Dicas para uma nova tentativa:
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Verifique se há saldo ou limite suficiente no cartão
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Tente usar um cartão de crédito diferente
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Certifique-se de que o cartão está desbloqueado para compras online
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Entre em contato com seu banco para verificar se há bloqueio de segurança
            </li>
          </ul>
        </motion.div>

        {/* Footer */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          Se o problema persistir,{" "}
          <Link to="/contato" className="text-primary hover:underline">
            entre em contato conosco
          </Link>
        </motion.p>
      </main>
    </div>
  );
};

export default CheckoutFailed;
