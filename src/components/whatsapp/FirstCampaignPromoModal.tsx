import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Check, AlertTriangle, Flame, Rocket, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface FirstCampaignPromoModalProps {
  open: boolean;
  onClose: () => void;
}

const COUPON_CODE = "50OFF";
const TIMER_SECONDS = 10 * 60;

export const FirstCampaignPromoModal = ({ open, onClose }: FirstCampaignPromoModalProps) => {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [pulse, setPulse] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const savedStart = localStorage.getItem("promo_timer_start");
    if (savedStart) {
      const elapsed = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
      const remaining = TIMER_SECONDS - elapsed;
      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft(0);
        return;
      }
      setTimeLeft(remaining);
    } else {
      localStorage.setItem("promo_timer_start", Date.now().toString());
      setTimeLeft(TIMER_SECONDS);
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (timeLeft <= 120 && timeLeft > 0) {
      const pulseInterval = setInterval(() => {
        setPulse(true);
        setTimeout(() => setPulse(false), 300);
      }, 2000);
      return () => clearInterval(pulseInterval);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { minutes: m.toString().padStart(2, "0"), seconds: s.toString().padStart(2, "0") };
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    toast({
      title: "Cupom copiado!",
      description: `Use ${COUPON_CODE} no checkout para 50% de desconto.`,
    });
    setTimeout(() => setCopied(false), 2000);
  }, [toast]);

  const handleGoToUpgrade = () => {
    onClose();
    navigate(`/upgrade?coupon=${COUPON_CODE}`);
  };

  const time = formatTime(timeLeft);
  const isUrgent = timeLeft <= 120;
  const isWarning = timeLeft <= 300 && timeLeft > 120;

  const progressPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px] border-orange-500/40 bg-card p-0 overflow-hidden gap-0">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {/* Glowing background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-orange-500/15 blur-3xl"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-red-500/10 blur-3xl"
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* === TIMER BANNER === */}
              <motion.div
                className="relative bg-gradient-to-r from-red-600 to-orange-500 px-4 py-4 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />

                {!expired ? (
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-baseline gap-1">
                        <motion.span
                          className="font-mono text-4xl font-black text-white tabular-nums"
                          animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          {time.minutes}
                        </motion.span>
                        <motion.span
                          className="text-3xl font-black text-white/70"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          :
                        </motion.span>
                        <motion.span
                          className="font-mono text-4xl font-black text-white tabular-nums"
                          animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
                        >
                          {time.seconds}
                        </motion.span>
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">
                      {isUrgent ? "⚠️ Últimos segundos!" : "Oferta expira em breve"}
                    </p>
                    {/* Thin progress bar */}
                    <div className="w-3/4 h-1 rounded-full bg-black/20 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${isUrgent ? "bg-yellow-300" : "bg-white/70"}`}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.5, ease: "linear" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center gap-2 py-1">
                    <AlertTriangle className="h-5 w-5 text-white" />
                    <span className="text-sm font-bold text-white">Oferta expirada!</span>
                  </div>
                )}
              </motion.div>

              {/* === HEADLINE === */}
              <div className="relative px-6 pt-5 pb-2 text-center">
                <motion.div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20 ring-2 ring-orange-500/40"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, damping: 12 }}
                >
                  <Rocket className="h-6 w-6 text-orange-400" />
                </motion.div>

                <motion.h2
                  className="text-lg font-bold text-foreground leading-snug"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Sua primeira campanha foi só o começo.
                </motion.h2>
                <motion.p
                  className="mt-1.5 text-sm text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Agora desbloqueie todos os recursos <span className="font-bold text-orange-400">PRO</span> com{" "}
                  <span className="font-bold text-orange-400">50% OFF</span> no primeiro mês e escale seus resultados imediatamente.
                </motion.p>
              </div>

              {/* === BODY === */}
              <div className="relative px-6 pb-6 pt-2 space-y-4">
                {/* Discount banner */}
                <motion.div
                  className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-red-500/10 p-5 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", damping: 15 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Desconto especial
                  </p>
                  <motion.p
                    className="text-5xl font-black text-orange-400 tracking-tight leading-none"
                    animate={pulse ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    50% OFF
                  </motion.p>
                  <p className="text-sm font-medium text-muted-foreground mt-1.5">
                    em <span className="text-foreground font-semibold">qualquer plano</span>
                  </p>
                  <p className="text-xs text-orange-400/80 font-semibold mt-2">
                    Economize até R$ 448,50 no primeiro mês.
                  </p>
                </motion.div>

                {/* Coupon — auto-applied */}
                <motion.div
                  className="space-y-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-3 transition-colors hover:border-orange-400 hover:bg-orange-500/10"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-xs text-muted-foreground">Cupom aplicado automaticamente:</span>
                    <span className="text-base font-mono font-black tracking-[0.15em] text-orange-400">
                      {COUPON_CODE}
                    </span>
                    <motion.div
                      key={copied ? "check" : "copy"}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </motion.div>
                  </motion.button>
                </motion.div>

                {/* Trust signals */}
                <motion.div
                  className="flex flex-col gap-1.5 px-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  {[
                    "Recursos PRO liberados instantaneamente",
                    "Seus dados e campanhas continuam ativos",
                    "Cancele quando quiser",
                  ].map((text) => (
                    <div key={text} className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                  className="flex flex-col gap-2 pt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleGoToUpgrade}
                      className="w-full gap-2 text-base font-bold h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 border-0"
                      size="lg"
                      disabled={expired}
                    >
                      <Crown className="h-5 w-5" />
                      {expired ? "Promoção encerrada" : "Desbloquear PRO com 50% OFF"}
                    </Button>
                  </motion.div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Agora não
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
