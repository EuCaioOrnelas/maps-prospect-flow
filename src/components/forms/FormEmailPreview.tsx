import { ArrowUpRight, Mail } from "lucide-react";

interface Props {
  formName: string;
  fields: Array<{ label: string; placeholder?: string | null; is_active?: boolean }>;
}

export function FormEmailPreview({ formName, fields }: Props) {
  const visibleFields = fields.filter((field) => field.is_active !== false).slice(0, 4);
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <Mail className="h-4 w-4 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Novo lead recebido</p>
          <p className="truncate text-xs text-muted-foreground">{formName || "Nome do formulário"}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">Um novo contato preencheu seu formulário.</p>
        <div className="divide-y divide-border rounded-md border border-border px-3">
          {(visibleFields.length ? visibleFields : [{ label: "Nome completo", placeholder: "Exemplo preenchido" }]).map((field) => (
            <div key={field.label} className="grid grid-cols-[110px_1fr] gap-3 py-2 text-xs">
              <span className="text-muted-foreground">{field.label}</span>
              <span className="truncate font-medium">{field.placeholder || "Resposta do contato"}</span>
            </div>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          Ver no CRM <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}