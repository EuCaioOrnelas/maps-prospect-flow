import { motion } from "framer-motion";
import { Heart, Gift, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";

const ThankYou = () => {
  const [copied, setCopied] = useState(false);
  const couponCode = "WZRET20";

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <SEO 
        title="Obrigado por fazer parte da Wiize"
        description="Agradecemos por ter sido nosso cliente. Esperamos te ver em breve!"
        noIndex={true}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg z-10"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo size="lg" asLink />
          </div>

          {/* Main Card */}
          <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 px-6 text-center">
              {/* Heart Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6"
              >
                <div className="w-20 h-20 mx-auto bg-primary/10 rounded-[22px] flex items-center justify-center">
                  <Heart className="w-10 h-10 text-primary" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-4"
              >
                Obrigado por ter sido nosso cliente!
              </motion.h1>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6 leading-relaxed"
              >
                Ficamos tristes com a sua decisão, mas respeitamos e agradecemos por 
                todo o tempo que esteve conosco. Foi uma honra fazer parte da sua jornada 
                comercial.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground mb-8 leading-relaxed"
              >
                Saiba que estaremos sempre à disposição caso queira voltar. 
                E para facilitar seu retorno, preparamos um presente especial:
              </motion.p>

              {/* Coupon Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Cupom Exclusivo</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Use este cupom e ganhe <span className="font-bold text-primary">20% de desconto</span> no 
                    primeiro mês ao reativar sua assinatura:
                  </p>

                  {/* Coupon Code Box */}
                  <div 
                    onClick={handleCopyCoupon}
                    className="bg-background border-2 border-dashed border-primary/40 rounded-lg py-4 px-6 cursor-pointer hover:border-primary/60 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl font-mono font-bold tracking-wider text-foreground">
                        {couponCode}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground group-hover:text-primary"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Clique para copiar
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button 
                  asChild
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link to="/">
                    Reativar Assinatura
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>

              {/* Footer note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs text-muted-foreground mt-6"
              >
                O cupom é válido apenas para o primeiro mês após a reativação.
              </motion.p>
            </CardContent>
          </Card>

          {/* Back to home link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-6"
          >
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar para a página inicial
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default ThankYou;
