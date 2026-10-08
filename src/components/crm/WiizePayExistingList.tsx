import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileSignature, Layers3, Loader2 } from "lucide-react";
import { listWiizePayEmbed, type WiizePayEmbedResource } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  one_time: "Venda única",
  installment: "Parcelado",
  recurring: "Recorrente",
};
const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  pending: "Pendente",
  awaiting_approval: "Aguardando aprovação",
  cancelled: "Cancelado",
  expired: "Encerrado",
};

const brl = (cents?: number | null) =>
  typeof cents === "number" && Number.isFinite(cents)
    ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

/**
 * Mostra o que já existe na WiizePay antes de a pessoa escolher na janela.
 * Só consulta quando abre, e some quando não há nada cadastrado.
 */
export function WiizePayExistingList({
  resource,
  leadId,
  className,
}: {
  resource: WiizePayEmbedResource;
  leadId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["wiize-pay-embed-list", resource, leadId ?? ""],
    queryFn: () => listWiizePayEmbed({ resource, lead_id: leadId }),
    staleTime: 60_000,
    enabled: open,
  });
  const items = q.data ?? [];
  const isService = resource === "services";
  const Icon = isService ? Layers3 : FileSignature;

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {isService ? "Ver serviços já cadastrados" : "Ver contratos deste cliente"}
        </span>
        {!open && items.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {items.length}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform motion-safe:duration-200", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto border-t border-border px-3 py-2">
          {q.isFetching ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Consultando a WiizePay…
            </p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isService
                ? "Nenhum serviço cadastrado ainda. Dá para criar direto na janela abaixo."
                : "Nenhum contrato para este cliente ainda. Dá para criar direto na janela abaixo."}
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => (
                <li key={it.id} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-foreground">{(isService ? it.name : it.title) || "Sem nome"}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {brl(it.amount_cents)}
                    {isService && it.type ? ` · ${SERVICE_TYPE_LABEL[it.type] ?? it.type}` : ""}
                    {!isService && it.status ? ` · ${CONTRACT_STATUS_LABEL[it.status] ?? it.status}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
