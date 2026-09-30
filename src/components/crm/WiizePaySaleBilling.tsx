import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, RefreshCw, Link2, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  chargeStatusLabel, chargeStatusTone, isWiizePayEra, newWiizePayLink, useWiizePayChargeMutations,
  type WiizePayCharge, type WiizePayListMeta,
} from "@/hooks/useWiizePayCharges";
import { WiizePayChargeDialog } from "./WiizePayChargeDialog";
import { WiizePayLinkShare } from "./WiizePayLinkShare";

interface Props {
  sale: { id: string; lead_id: string; created_at: string; title?: string | null };
  charge?: WiizePayCharge;
  meta?: WiizePayListMeta | null;
  phone?: string | null;
  email?: string | null;
  compact?: boolean;
}

/**
 * Situação de cobrança de uma venda.
 * - Sem Wiize Pay conectado: não mostra nada (estrutura antiga).
 * - Venda anterior à conexão: selo "Controle interno".
 * - Venda nova: cria cobrança, mostra status, link, atualizar e cancelar.
 */
export function WiizePaySaleBilling({ sale, charge, meta, phone, email, compact }: Props) {
  const [chargeOpen, setChargeOpen] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const { refresh, cancel } = useWiizePayChargeMutations(sale.lead_id);

  if (!meta?.connected && !charge) return null;
  const era = isWiizePayEra(sale.created_at, meta);

  if (!charge && !era) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground" title="Venda registrada antes da conexão com o Wiize Pay">
        <Archive className="w-3 h-3" /> Controle interno
      </Badge>
    );
  }

  const failed = charge && ["cancelled", "error"].includes(charge.status);
  const pending = charge && ["sent", "awaiting_payment", "overdue"].includes(charge.status);
  const btn = compact ? "h-7 px-2 text-xs" : "h-7 text-xs";

  const getLink = async () => {
    if (!charge) return;
    setLinkBusy(true);
    try { const r = await newWiizePayLink(charge.id); setLink({ url: r.checkout_url, expiresAt: r.checkout_expires_at }); }
    catch (e) { toast.error((e as Error).message || "Não foi possível gerar o link."); refresh.mutate(charge.id); }
    finally { setLinkBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {charge && (
        <Badge variant="outline" className={chargeStatusTone[charge.status]} title={charge.status === "error" ? charge.error_message || undefined : undefined}>
          Wiize Pay: {chargeStatusLabel[charge.status]}
        </Badge>
      )}
      {pending && meta?.can_charge && (
        <Button size="sm" variant="outline" className={btn} onClick={getLink} disabled={linkBusy}>
          {linkBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2 className="w-3 h-3 mr-1" />} Link de pagamento
        </Button>
      )}
      {pending && (
        <Button size="sm" variant="ghost" className={btn} onClick={() => refresh.mutate(charge!.id)} disabled={refresh.isPending}>
          <RefreshCw className={`w-3 h-3 mr-1 ${refresh.isPending ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      )}
      {pending && meta?.can_charge && (
        <Button size="sm" variant="ghost" className={btn} onClick={() => {
          if (confirm("Cancelar esta cobrança no Wiize Pay?")) cancel.mutate(charge!.id, {
            onSuccess: () => toast.success("Cobrança cancelada"),
            onError: (e) => toast.error((e as Error).message || "Não foi possível cancelar"),
          });
        }}>Cancelar cobrança</Button>
      )}
      {era && meta?.connected && meta.can_charge && (!charge || failed) && (
        <Button size="sm" className={btn} onClick={() => setChargeOpen(true)}>
          <CreditCard className="w-3 h-3 mr-1" /> {failed ? "Criar nova cobrança" : "Criar cobrança"}
        </Button>
      )}

      {chargeOpen && (
        <WiizePayChargeDialog open onOpenChange={(o) => !o && setChargeOpen(false)} leadId={sale.lead_id} dealId={sale.id} />
      )}
      {link && (
        <Dialog open onOpenChange={(o) => !o && setLink(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Link de pagamento</DialogTitle>
              <DialogDescription>Envie para o cliente pagar pelo Wiize Pay.</DialogDescription>
            </DialogHeader>
            <WiizePayLinkShare url={link.url} expiresAt={link.expiresAt} phone={phone} email={email} title={sale.title} />
            <DialogFooter><Button onClick={() => setLink(null)}>Fechar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
