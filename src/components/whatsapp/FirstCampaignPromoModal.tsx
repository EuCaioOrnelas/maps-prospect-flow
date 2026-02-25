import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Check, Clock, Gift, Sparkles, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface FirstCampaignPromoModalProps {
  open: boolean;
  onClose: () => void;
}

const COUPON_CODE = "YOUT50OFF";
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

  // Pulse effect when time is low
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
    navigate("/upgrade");
  };

  const time = formatTime(timeLeft);
  const isUrgent = timeLeft <= 120;
  const isWarning = timeLeft <= 300 && timeLeft > 120;

  const timerColor = isUrgent
    ? "text-destructive"
    : isWarning
      ? "text-amber-400"
      : "text-emerald-400";

  const timerBg = isUrgent
    ? "bg-destructive/10 border-destructive/30"
    : isWarning
      ? "bg-amber-500/10 border-amber-500/30"
      : "bg-emerald-500/10 border-emerald-500/30";

  const progressPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100);
  const progressColor = isUrgent
    ? "bg-destructive"
    : isWarning
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] border-primary/30 bg-card p-0 overflow-hidden gap-0">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-6 pb-5 text-center">
                {/* Sparkles */}
                <motion.div
                  className="absolute top-3 right-4"
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <motion.div
                  className="absolute top-5 left-4"
                  animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                >
                  <Zap className="h-4 w-4 text-primary/60" />
                </motion.div>

                <motion.div
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/40"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, damping: 12 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    <Gift className="h-8 w-8 text-primary" />
                  </motion.div>
                </motion.div>

                <motion.h2
                  className="text-xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Está gostando da Wiize? 🎉
                </motion.h2>
                <motion.p
                  className="mt-1.5 text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Preparamos uma oferta <span className="font-bold text-primary">EXCLUSIVA</span> só pra você!
                </motion.p>
              </div>

              {/* Body */}
              <div className="relative px-6 pb-6 pt-4 space-y-4">
                {/* Discount banner */}
                <motion.div
                  className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", damping: 15 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Desconto especial
                  </p>
                  <motion.p
                    className="text-5xl font-black text-primary tracking-tight leading-none"
                    animate={pulse ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    50% OFF
                  </motion.p>
                  <p className="text-sm font-medium text-muted-foreground mt-1.5">
                    em <span className="text-foreground font-semibold">qualquer plano</span>
                  </p>
                </motion.div>

                {/* Coupon */}
                <motion.div
                  className="space-y-1.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-xs text-muted-foreground text-center">
                    Copie o cupom e use no checkout:
                  </p>
                  <motion.button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 transition-colors hover:border-primary hover:bg-primary/10"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-xl font-mono font-black tracking-[0.2em] text-primary">
                      {COUPON_CODE}
                    </span>
                    <motion.div
                      key={copied ? "check" : "copy"}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                    </motion.div>
                  </motion.button>
                </motion.div>

                {/* Timer */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {!expired ? (
                    <div className="space-y-2">
                      <div className={`flex items-center justify-center gap-3 rounded-xl border ${timerBg} p-3`}>
                        {isUrgent && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                          >
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </motion.div>
                        )}
                        <Clock className={`h-4 w-4 ${timerColor}`} />
                        <span className="text-xs text-muted-foreground">
                          {isUrgent ? "Oferta expirando!" : "Expira em"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`font-mono text-2xl font-black tabular-nums ${timerColor}`}>
                            {time.minutes}
                          </span>
                          <motion.span
                            className={`text-lg font-bold ${timerColor}`}
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            :
                          </motion.span>
                          <span className={`font-mono text-2xl font-black tabular-nums ${timerColor}`}>
                            {time.seconds}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${progressColor}`}
                          initial={{ width: "100%" }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: "linear" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">Oferta expirada</span>
                    </div>
                  )}
                </motion.div>

                {/* CTA */}
                <motion.div
                  className="flex flex-col gap-2 pt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleGoToUpgrade}
                      className="w-full gap-2 text-base font-bold h-12"
                      size="lg"
                      disabled={expired}
                    >
                      <Crown className="h-5 w-5" />
                      {expired ? "Promoção encerrada" : "Garantir 50% OFF agora"}
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
