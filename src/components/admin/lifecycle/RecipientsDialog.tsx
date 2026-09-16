import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LifecycleDelivery, LifecycleStep } from "@/hooks/useLifecycleCampaign";

type Filter =
  | "all" | "sent" | "delivered" | "opened" | "not_opened"
  | "clicked" | "not_clicked" | "converted" | "not_converted" | "bounced" | "unsubscribed" | "failed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: "Enviados" },
  { key: "delivered", label: "Entregues" },
  { key: "opened", label: "Abertos" },
  { key: "not_opened", label: "Não abertos" },
  { key: "clicked", label: "Clicaram" },
  { key: "not_clicked", label: "Não clicaram" },
  { key: "converted", label: "Converteram" },
  { key: "not_converted", label: "Não converteram" },
  { key: "bounced", label: "Bounce" },
  { key: "unsubscribed", label: "Descadastros" },
  { key: "failed", label: "Falhas" },
];

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: LifecycleStep | null;
  deliveries: LifecycleDelivery[];
  convertedUserIds: Set<string>;
  initialFilter?: Filter;
}

export function RecipientsDialog({ open, onOpenChange, step, deliveries, convertedUserIds, initialFilter = "all" }: Props) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const rows = useMemo(() => {
    const base = step ? deliveries.filter((d) => d.step_id === step.id) : deliveries;
    return base.filter((d) => {
      const converted = d.user_id ? convertedUserIds.has(d.user_id) : false;
      switch (filter) {
        case "sent": return !!d.sent_at;
        case "delivered": return !!d.delivered_at;
        case "opened": return !!d.opened_at;
        case "not_opened": return !!d.sent_at && !d.opened_at;
        case "clicked": return !!d.clicked_at;
        case "not_clicked": return !!d.sent_at && !d.clicked_at;
        case "converted": return converted;
        case "not_converted": return !converted;
        case "bounced": return !!d.bounced_at;
        case "unsubscribed": return !!d.unsubscribed_at;
        case "failed": return d.status === "failed";
        default: return true;
      }
    });
  }, [deliveries, step, filter, convertedUserIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>
            Destinatários {step ? `— Dia ${step.day_offset}: ${step.name}` : "— todos os e-mails"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Nenhum registro para este filtro.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead>Entregue</TableHead>
                <TableHead>Aberto</TableHead>
                <TableHead>Clique</TableHead>
                <TableHead>Assinou</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 500).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{d.recipient_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(d.sent_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(d.delivered_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(d.opened_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(d.clicked_at)}</TableCell>
                  <TableCell className="text-xs">
                    {d.user_id && convertedUserIds.has(d.user_id) ? "Sim" : "Não"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 500 && (
          <p className="text-[11px] text-muted-foreground">Mostrando os 500 primeiros de {rows.length}.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
