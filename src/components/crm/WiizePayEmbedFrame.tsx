import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { createWiizePayEmbedTicket, WIIZEPAY_ORIGIN, type WiizePayEmbedKind } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";

export type WiizePayServiceType = "one_time" | "installment" | "recurring";
const SERVICE_TYPES: WiizePayServiceType[] = ["one_time", "installment", "recurring"];

export type WiizePayEmbedEvent =
  | { type: "wiizepay:service.selected"; service_id: string; name?: string; amount_cents?: number; service_type?: WiizePayServiceType; created?: boolean }
  | { type: "wiizepay:contract.selected"; contract_id: string }
  | { type: "wiizepay:charge.created"; charge_group_id: string; checkout_url: string };

interface Props {
  kind: WiizePayEmbedKind;
  leadId?: string;
  customerDocument?: string;
  onEvent: (e: WiizePayEmbedEvent) => void;
  className?: string;
}

/** Abre a janela segura da WiizePay. Gera um passe novo a cada abertura. */
export function WiizePayEmbedFrame({ kind, leadId, customerDocument, onEvent, className }: Props) {
  const { resolvedTheme } = useTheme();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const originRef = useRef(WIIZEPAY_ORIGIN);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  useEffect(() => {
    let alive = true;
    setUrl(null); setReady(false); setError(null); setSlow(false);
    createWiizePayEmbedTicket({ kind, lead_id: leadId, theme: themeRef.current, customer_document: customerDocument })
      .then((r) => {
        if (!alive) return;
        const target = new URL(r.url);
        if (target.protocol !== "https:" || !["wiizepay.com", "www.wiizepay.com", "wiizepay.com.br", "www.wiizepay.com.br"].includes(target.hostname)) {
          throw new Error("Endereço da WiizePay não reconhecido.");
        }
        originRef.current = target.origin;
        setUrl(r.url);
      })
      .catch((e) => { if (alive) setError((e as Error).message || "Não foi possível abrir a WiizePay."); });
    return () => { alive = false; };
  }, [kind, leadId, customerDocument, attempt]);

  useEffect(() => {
    if (ready || error) return;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [ready, error, kind, leadId, customerDocument, attempt]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== originRef.current) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const d = event.data as Record<string, unknown> | null;
      if (!d || d.source !== "wiizepay" || typeof d.type !== "string") return;
      const str = (v: unknown) => (typeof v === "string" && v.length <= 2000 ? v : null);
      switch (d.type) {
        case "wiizepay:ready": setReady(true); break;
        case "wiizepay:error": setError(str(d.message) || "A WiizePay informou um erro."); break;
        case "wiizepay:service.selected": { const id = str(d.service_id); if (id) onEventRef.current({ type: d.type, service_id: id }); break; }
        case "wiizepay:contract.selected": { const id = str(d.contract_id); if (id) onEventRef.current({ type: d.type, contract_id: id }); break; }
        case "wiizepay:charge.created": {
          const id = str(d.charge_group_id); const link = str(d.checkout_url);
          if (id && link) onEventRef.current({ type: d.type, charge_group_id: id, checkout_url: link });
          break;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({ type: "wiizepay:theme.set", theme: resolvedTheme }, originRef.current);
  }, [resolvedTheme, ready]);

  if (error) {
    return (
      <div className={cn("flex h-[clamp(360px,60dvh,720px)] flex-col items-center justify-center gap-3 bg-background p-6 text-center text-sm text-destructive", className)} role="alert">
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className={cn("relative h-[clamp(360px,60dvh,720px)] w-full min-w-0 overflow-hidden bg-background", className)} aria-busy={!ready}>
      {(!url || !ready) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background p-6 text-center" role="status" aria-live="polite">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary/30 motion-reduce:animate-none" aria-hidden="true" />
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">{url ? "Carregando" : "Conectando à"} WiizePay…</p>
            <p className="text-sm text-muted-foreground">{slow ? "A conexão está levando mais tempo que o habitual." : url ? "Preparando " + ({ contract: "o contrato", service: "os serviços", charge: "a cobrança" }[kind]) + "." : "Preparando seu acesso seguro."}</p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2 motion-safe:animate-pulse">
            <div className="h-2 w-full rounded bg-muted" />
            <div className="h-2 w-2/3 self-center rounded bg-muted" />
          </div>
          {slow && <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente</Button>}
        </div>
      )}
      {url && (
        <iframe
          ref={frameRef}
          key={url}
          src={url}
          title="WiizePay"
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          className="block h-full w-full border-0"
          onLoad={() => setReady(true)}
        />
      )}
    </div>
  );
}
