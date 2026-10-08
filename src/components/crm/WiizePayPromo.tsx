import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAllWiizePayCharges } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";
import wiizePayEntry from "@/assets/wiizepay-entrada.png.asset.json";
import wiizePayTaxaZero from "@/assets/wiizepay-taxa-zero.png.asset.json";
import wiizePayAtiveAgora from "@/assets/wiizepay-ative-agora.png.asset.json";
import { useAuth } from "@/contexts/AuthContext";
import { dismissPromoEntry, readPromoEntry, recordPromoEntry, type PromoEntry } from "@/lib/wiizepayPromoRotation";

export type WiizePayPromoVariant = "modal" | "strip" | "card";

const WIIZEPAY_SITE = "https://wiizepay.com.br";
const ENTRY_IMAGES = [
  { url: wiizePayEntry.url, alt: "WiizePay — receba seus pagamentos de forma simples e automática" },
  { url: wiizePayTaxaZero.url, alt: "WiizePay — taxa 0% por 3 meses no Pix e Boleto" },
  { url: wiizePayAtiveAgora.url, alt: "Ative agora o WiizePay e receba pagamentos no automático" },
];
// One-time browser-cache reset requested by this account; never bypasses connection checks.
const RESET_REVISIONS: Record<string, string> = { "62ba5c53-a297-49cd-9ca3-b44302fc59f4": "preview-2026-10-08" };

interface Props {
  variant: WiizePayPromoVariant;
  /** Quando já se sabe o status de conexão (evita nova consulta). */
  connected?: boolean | null;
  dismissible?: boolean;
  className?: string;
}

/** Recomenda a WiizePay só para quem ainda não conectou. */
export function WiizePayPromo({ variant, connected, dismissible = false, className }: Props) {
  const own = useAllWiizePayCharges();
  const { user } = useAuth();
  const userId = user?.id;
  const revision = userId ? RESET_REVISIONS[userId] ?? "1" : "1";
  const [hidden, setHidden] = useState(false);
  const [entry, setEntry] = useState<PromoEntry | null>(null);

  // Preview-only: ?ver-anuncio=1 (or =2/=3) shows an image without touching history or connection rules.
  const previewParam = variant === "modal" && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("ver-anuncio") : null;
  const previewIndex = previewParam ? Math.min(Math.max(Number(previewParam) || 1, 1), ENTRY_IMAGES.length) - 1 : null;
  const isConnected = previewIndex !== null ? false : connected !== undefined ? connected : own.data?.connected === true;
  const statusResolved = previewIndex !== null || connected != null || own.isSuccess;
  useEffect(() => {
    if (previewIndex !== null) { setEntry({ index: previewIndex, shownAt: Date.now() }); return; }
    if (variant !== "modal" || !statusResolved || isConnected || !userId) return;
    const next = readPromoEntry(userId, ENTRY_IMAGES.length, revision);
    setHidden(false);
    setEntry(next);
    if (next) recordPromoEntry(userId, next, ENTRY_IMAGES.length, revision);
  }, [variant, statusResolved, isConnected, userId, revision, previewIndex]);
  if (!statusResolved || isConnected || hidden || (variant === "modal" && !entry)) return null;

  const go = () => window.open(WIIZEPAY_SITE, "_blank", "noopener,noreferrer");
  const dismiss = () => {
    if (userId && entry && previewIndex === null) dismissPromoEntry(userId, entry, revision);
    setHidden(true);
  };
  const image = ENTRY_IMAGES[entry?.index ?? 0] ?? ENTRY_IMAGES[0];

  if (variant === "modal") {
    return (
      <Dialog open={!hidden} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent
          hideCloseButton
          overlayClassName="bg-black/70 backdrop-blur-sm"
          className={cn("w-fit max-w-[min(64rem,calc(100vw-2rem))] overflow-visible border-0 bg-transparent p-0 shadow-2xl", className)}
        >
          <DialogTitle className="sr-only">Conheça a WiizePay</DialogTitle>
          <DialogDescription className="sr-only">
            Receba seus pagamentos de forma simples e automática com a WiizePay.
          </DialogDescription>
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={dismiss}
              aria-label="Fechar anúncio da WiizePay"
              title="Fechar"
              className="!absolute -right-3 -top-3 z-10 h-10 w-10 rounded-full border border-border shadow-lg"
            >
              <X className="h-5 w-5" />
            </Button>
            <a
              href={WIIZEPAY_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Conhecer a WiizePay — abre wiizepay.com.br em uma nova aba"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="block h-auto max-h-[78vh] w-auto max-w-full"
                loading="eager"
              />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const closeBtn = dismissible && (
    <div className="absolute right-2 top-2 z-10">
      <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Dispensar recomendação" title="Dispensar" className="h-8 w-8 bg-background/80 text-muted-foreground">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (variant === "strip") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm", className)}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><QrCode className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-foreground">Receba com simplicidade pela WiizePay</p>
            <p className="text-xs text-muted-foreground">PIX automático e cobranças recorrentes, com tudo acompanhado na Wiize.</p>
          </div>
          <Button type="button" size="sm" className="group/btn" onClick={go}>
            Conhecer a WiizePay
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("group relative overflow-hidden rounded-xl border border-primary/20 bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md", className)}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/[0.07] blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">Transforme a venda em recebimento</p>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">WiizePay</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Com a WiizePay, você cria PIX e cobranças automáticas e oferece um painel organizado ao cliente.
            </p>
            <Button type="button" size="sm" className="group/btn mt-3" onClick={go}>
              Conhecer a WiizePay
              <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return closeBtn;
}
