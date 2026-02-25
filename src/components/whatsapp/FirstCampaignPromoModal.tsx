import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Check, Clock, Gift, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FirstCampaignPromoModalProps {
  open: boolean;
  onClose: () => void;
}

const COUPON_CODE = "YOUT50OFF";
const TIMER_SECONDS = 10 * 60; // 10 minutes

export const FirstCampaignPromoModal = ({ open, onClose }: FirstCampaignPromoModalProps) => {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    // Check if there's a saved start time
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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

  const urgencyColor = timeLeft <= 60 ? "text-destructive" : timeLeft <= 180 ? "text-yellow-400" : "text-emerald-400";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-card p-0 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4 text-center">
          <div className="absolute top-3 right-3">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/30">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Está gostando da Wiize? 🎉
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preparamos uma promoção <span className="font-semibold text-primary">exclusiva</span> pra você!
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Discount banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Aproveite</p>
            <p className="text-4xl font-black text-primary tracking-tight">50% OFF</p>
            <p className="text-sm text-muted-foreground mt-1">em qualquer plano</p>
          </div>

          {/* Coupon */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Copie o cupom e use no checkout:</p>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.98]"
            >
              <span className="text-lg font-mono font-bold tracking-widest text-primary">
                {COUPON_CODE}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Timer */}
          {!expired ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-3">
              <Clock className={`h-4 w-4 ${urgencyColor}`} />
              <span className="text-sm text-muted-foreground">Cupom válido por</span>
              <span className={`font-mono text-lg font-bold tabular-nums ${urgencyColor}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 p-3">
              <Clock className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Cupom expirado</span>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleGoToUpgrade}
              className="w-full gap-2"
              size="lg"
              disabled={expired}
            >
              <Crown className="h-4 w-4" />
              {expired ? "Promoção encerrada" : "Fazer Upgrade com 50% OFF"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
