import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Check, Clock, Gift, Zap, AlertTriangle, Flame } from "lucide-react";
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
    ? "text-red-400"
    : isWarning
      ? "text-amber-400"
      : "text-orange-300";

  const progressPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100);
  const progressColor = isUrgent
    ? "bg-red-500"
    : isWarning
      ? "bg-amber-500"
      : "bg-orange-500";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] border-orange-500/40 bg-card p-0 overflow-hidden gap-0">
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

              {/* === TIMER ON TOP — URGENT BANNER === */}
              <motion.div
                className="relative bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-4 py-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Animated shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {!expired ? (
                  <div className="relative flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        <Flame className="h-4 w-4 text-yellow-200" />
                      </motion.div>
                      <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                        ⚡ Oferta expira em
                      </span>
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                      >
                        <Flame className="h-4 w-4 text-yellow-200" />
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        className="font-mono text-3xl font-black text-white tabular-nums drop-shadow-lg"
                        animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      >
                        {time.minutes}
                      </motion.span>
                      <motion.span
                        className="text-2xl font-black text-yellow-200"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        :
                      </motion.span>
                      <motion.span
                        className="font-mono text-3xl font-black text-white tabular-nums drop-shadow-lg"
                        animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      >
                        {time.seconds}
                      </motion.span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden mt-1">
                      <motion.div
                        className={`h-full rounded-full ${isUrgent ? "bg-yellow-300" : "bg-white/80"}`}
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

              {/* === HEADER === */}
              <div className="relative px-6 pt-5 pb-3 text-center">
                <motion.div
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/20 ring-2 ring-orange-500/40"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, damping: 12 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    <Gift className="h-7 w-7 text-orange-400" />
                  </motion.div>
                </motion.div>

                <motion.h2
                  className="text-xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  🔥 Oportunidade ÚNICA!
                </motion.h2>
                <motion.p
                  className="mt-1.5 text-sm text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Essa oferta é <span className="font-bold text-orange-400">exclusiva</span> e só está disponível pelos próximos <span className="font-bold text-orange-400">10 minutos</span>. Depois disso, o desconto será removido permanentemente.
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
                    className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-3.5 transition-colors hover:border-orange-400 hover:bg-orange-500/10"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-xl font-mono font-black tracking-[0.2em] text-orange-400">
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
