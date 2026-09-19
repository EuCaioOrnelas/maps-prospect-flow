import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Pencil, Trash2, AlertTriangle, Code2, RefreshCw, Info, Hash, Phone, Building2,
  Tag, Languages, Gauge, CalendarPlus, Clock,
} from "lucide-react";

import { TemplateStatusBadge } from "./TemplateStatusBadge";
import { TemplatePreview } from "./TemplatePreview";
import {
  categoryLabel, languageLabel, rowToDraft, statusMeta, type MetaTemplateRow,
} from "@/lib/metaTemplates";

interface Props {
  template: MetaTemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onEdit: (t: MetaTemplateRow) => void;
  onDelete: (t: MetaTemplateRow) => void;
  onSync: () => void;
  numberLabel?: (wabaId: string) => string;
}

const fmt = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/40 py-2 last:border-0">
    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
      {label}
    </span>
    <span className="text-xs font-medium text-foreground text-right break-all">{value}</span>
  </div>
);

export function TemplateDetailsSheet({
  template, open, onOpenChange, isAdmin, onEdit, onDelete, onSync, numberLabel,
}: Props) {
  const [showRaw, setShowRaw] = useState(false);
  if (!template) return null;

  const draft = rowToDraft(template);
  const meta = statusMeta(template.status);
  const editable = ["APPROVED", "REJECTED", "PAUSED", "DRAFT"].includes(template.status);


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 flex-wrap">
            <SheetTitle className="font-mono text-base break-all">{template.name}</SheetTitle>
            <TemplateStatusBadge status={template.status} />
          </div>
          <SheetDescription>{meta.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {template.status === "REJECTED" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Template rejeitado
              </p>
              {template.rejected_reason && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mt-2">Motivo da rejeição</p>
                  <p className="text-xs text-foreground mt-0.5">{template.rejected_reason}</p>
                </>
              )}
            </div>
          )}

          {template.status === "PENDING" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              Este template está sendo analisado pela Meta.
              {template.submitted_at && ` Enviado em ${fmt(template.submitted_at)}.`}
            </div>
          )}

          <TemplatePreview draft={draft} />

          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" aria-hidden /> Informações
            </h4>
            <Row icon={Hash} label="ID na Meta" value={template.meta_template_id || "—"} />
            <Row icon={Phone} label="Número" value={numberLabel ? numberLabel(template.waba_id) : template.waba_id} />
            <Row icon={Building2} label="WABA" value={template.waba_id} />
            <Row icon={Tag} label="Categoria" value={categoryLabel(template.category)} />
            <Row icon={Languages} label="Idioma" value={`${languageLabel(template.language)} (${template.language})`} />
            <Row icon={Gauge} label="Qualidade" value={template.quality_score || "—"} />
            <Row icon={CalendarPlus} label="Criado em" value={fmt(template.created_at)} />
            <Row icon={Clock} label="Última atualização" value={fmt(template.updated_at)} />
            <Row icon={RefreshCw} label="Última sincronização" value={fmt(template.last_synced_at)} />

          </div>

          {isAdmin && (
            <div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowRaw((v) => !v)}>
                <Code2 className="h-3.5 w-3.5" /> {showRaw ? "Ocultar" : "Ver"} resposta técnica
              </Button>
              {showRaw && (
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] font-mono">
                  {JSON.stringify(template.raw, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onSync}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar status
            </Button>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              disabled={!editable}
              title={editable ? undefined : "A Meta só permite editar templates aprovados, rejeitados ou pausados."}
              onClick={() => onEdit(template)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {template.status === "REJECTED" ? "Editar e reenviar" : "Editar"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => onDelete(template)}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
          {!editable && (
            <p className="text-[11px] text-muted-foreground">
              A Meta não permite alterar um template enquanto ele está em análise. Aguarde o resultado ou crie
              uma nova versão com outro nome.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
