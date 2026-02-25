import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Clock, Flame, Rocket, Shield, Zap, Star, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface FirstCampaignPromoModalProps {
  open: boolean;
  onClose: () => void;
}

const TIMER_SECONDS = 10 * 60;

const PLANS = [
  {
    id: "start",
    name: "Start",
    originalPrice: 197,
    discountedPrice: 98.5,
    popular: true,
    benefit: "Ideal para começar a escalar",
  },
  {
    id: "growth",
    name: "Growth",
    originalPrice: 497,
    discountedPrice: 248.5,
    popular: false,
    benefit: "Para quem quer acelerar resultados",
  },
  {
    id: "scale",
    name: "Scale",
    originalPrice: 897,
    discountedPrice: 448.5,
    popular: false,
    benefit: "Para operações em alta demanda",
  },
];

export const FirstCampaignPromoModal = ({ open, onClose }: FirstCampaignPromoModalProps) => {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("start");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const savedStart = localStorage.getItem("promo_timer_start");
    if (savedStart) {
      const elapsed = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
      const remaining = TIMER_SECONDS - elapsed;
      if (remaining <= 0) { setExpired(true); setTimeLeft(0); return; }
      setTimeLeft(remaining);
    } else {
      localStorage.setItem("promo_timer_start", Date.now().toString());
      setTimeLeft(TIMER_SECONDS);
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); setExpired(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleGoToUpgrade = () => {
    onClose();
    navigate("/upgrade");
  };

  const progressPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100);
  const isUrgent = timeLeft <= 120;
  const selected = PLANS.find((p) => p.id === selectedPlan)!;
  const savings = (selected.originalPrice - selected.discountedPrice).toFixed(2).replace(".", ",");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] border-border/60 bg-card p-0 overflow-hidden gap-0 rounded-2xl shadow-2xl">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
            >
              {/* ── TIMER BANNER ── */}
              <div className="relative bg-gradient-to-r from-orange-600/90 via-red-600/80 to-orange-700/90 px-5 py-3.5 overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative flex flex-col items-center gap-1">
                  <p className="text-[11px] font-medium text-white/70 uppercase tracking-widest">
                    Oferta exclusiva após sua 1ª campanha
                  </p>
                  {!expired ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-yellow-300" />
                        <span className="text-sm font-bold text-white">50% OFF expira em</span>
                        <Flame className="h-4 w-4 text-yellow-300" />
                      </div>
                      <motion.span
                        className="font-mono text-3xl font-black text-white tabular-nums tracking-wider"
                        animate={isUrgent ? { scale: [1, 1.06, 1] } : {}}
                        transition={{ duration: 0.7, repeat: Infinity }}
                      >
                        {formatTime(timeLeft)}
                      </motion.span>
                      <div className="w-full h-1 rounded-full bg-black/30 mt-1 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isUrgent ? "bg-yellow-300" : "bg-white/70"}`}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: "linear" }}
                        />
                      </div>
                      <p className="text-[10px] text-white/50 mt-0.5">
                        Após o tempo, os valores voltam ao normal.
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 py-1">
                      <AlertTriangle className="h-4 w-4 text-white" />
                      <span className="text-sm font-bold text-white">Oferta expirada</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── HEADLINE ── */}
              <div className="px-6 pt-5 pb-3 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15, damping: 14 }}
                  className="text-3xl mb-2"
                >
                  🚀
                </motion.div>
                <h2 className="text-lg font-bold text-foreground">
                  Parabéns pela sua primeira campanha!
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Agora desbloqueie recursos <span className="font-semibold text-primary">PRO</span> com{" "}
                  <span className="font-semibold text-primary">50% OFF</span> no primeiro mês.
                </p>
              </div>

              {/* ── PLANS ── */}
              <div className="px-5 pb-2 grid grid-cols-3 gap-2.5">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`relative rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                        plan.popular && isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                          : isSelected
                            ? "border-primary/60 bg-primary/5"
                            : "border-border/50 bg-muted/30 hover:border-border"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground flex items-center gap-1">
                          <Star className="h-3 w-3" /> Mais Popular
                        </span>
                      )}
                      <p className="font-bold text-sm text-foreground mt-1">{plan.name}</p>
                      <p className="text-[11px] text-muted-foreground line-through mt-1">
                        R$ {plan.originalPrice}
                      </p>
                      <p className="text-xl font-black text-primary leading-tight">
                        R$ {plan.discountedPrice.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">no 1º mês</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Depois R$ {plan.originalPrice}/mês
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                        {plan.benefit}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {/* ── SAVINGS ── */}
              <motion.div
                key={selectedPlan}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-2"
              >
                <span className="text-sm font-semibold text-primary">
                  Você economiza R$ {savings} hoje
                </span>
              </motion.div>

              {/* ── COUPON ── */}
              <div className="text-center pb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-primary" />
                  Cupom aplicado automaticamente: <span className="font-mono font-bold text-primary">50OFF</span>
                </span>
              </div>

              {/* ── MICRO BULLETS ── */}
              <div className="px-6 pb-3 flex flex-col gap-1">
                {[
                  "Recursos PRO liberados instantaneamente",
                  "Suporte prioritário (dependendo do plano)",
                  "Seus dados e campanhas permanecem ativos",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              {/* ── CTA ── */}
              <div className="px-6 pb-5 flex flex-col gap-1.5">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleGoToUpgrade}
                    className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-0"
                    size="lg"
                    disabled={expired}
                  >
                    <Zap className="h-5 w-5 mr-2" />
                    {expired ? "Promoção encerrada" : "Desbloquear com 50% OFF agora"}
                  </Button>
                </motion.div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Ativação imediata • Cancele quando quiser
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs text-muted-foreground/60 hover:text-foreground"
                >
                  Agora não
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
