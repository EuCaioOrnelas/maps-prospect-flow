import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { createWiizePayEmbedTicket, WIIZEPAY_ORIGIN, type WiizePayEmbedKind } from "@/hooks/useWiizePayCharges";

export type WiizePayEmbedEvent =
  | { type: "wiizepay:service.selected"; service_id: string }
  | { type: "wiizepay:contract.selected"; contract_id: string }
  | { type: "wiizepay:charge.created"; charge_group_id: string; checkout_url: string };

interface Props {
  kind: WiizePayEmbedKind;
  leadId?: string;
  customerDocument?: string;
  onEvent: (e: WiizePayEmbedEvent) => void;
}

/** Abre a janela segura da WiizePay. Gera um passe novo a cada abertura. */
export function WiizePayEmbedFrame({ kind, leadId, customerDocument, onEvent }: Props) {
  const { resolvedTheme } = useTheme();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  useEffect(() => {
    let alive = true;
    setUrl(null); setReady(false); setError(null);
    createWiizePayEmbedTicket({ kind, lead_id: leadId, theme: themeRef.current, customer_document: customerDocument })
      .then((r) => { if (alive) setUrl(r.url); })
      .catch((e) => { if (alive) setError((e as Error).message || "Não foi possível abrir a WiizePay."); });
    return () => { alive = false; };
  }, [kind, leadId, customerDocument, attempt]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== WIIZEPAY_ORIGIN) return;
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
    frameRef.current?.contentWindow?.postMessage({ type: "wiizepay:theme.set", theme: resolvedTheme }, WIIZEPAY_ORIGIN);
  }, [resolvedTheme, ready]);

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <p>{error}</p>
        <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {(!url || !ready) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-card text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Abrindo a WiizePay…
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
          className="block h-[560px] w-full"
          onLoad={() => setTimeout(() => setReady(true), 4000)}
        />
      )}
    </div>
  );
}
