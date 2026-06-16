import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { WORKFORCE_NODE_META, type WorkforceNodeKind } from "../nodeTypes";

interface CollectField {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "date";
  required?: boolean;
}

interface NodeData {
  kind: WorkforceNodeKind;
  title?: string;
  summary?: string;
  fields?: CollectField[];
  storage?: string;
  [key: string]: unknown;
}

interface Props {
  node: { id: string; data: NodeData } | null;
  onClose: () => void;
  onChange: (id: string, patch: Partial<NodeData>) => void;
}

export function NodeConfigDrawer({ node, onClose, onChange }: Props) {
  if (!node) return null;
  const meta = WORKFORCE_NODE_META[node.data.kind];
  const isCollect = node.data.kind === "data_collection";
  const fields: CollectField[] = node.data.fields ?? [];

  const addField = () =>
    onChange(node.id, {
      fields: [...fields, { key: "", label: "", type: "text", required: false }],
    });
  const updateField = (i: number, patch: Partial<CollectField>) => {
    const next = fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(node.id, { fields: next });
  };
  const removeField = (i: number) =>
    onChange(node.id, { fields: fields.filter((_, idx) => idx !== i) });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-card overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{meta.label}</SheetTitle>
          <SheetDescription>{meta.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label className="text-xs">Título exibido</Label>
            <Input
              value={node.data.title ?? ""}
              placeholder={meta.label}
              onChange={(e) => onChange(node.id, { title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Resumo / instruções</Label>
            <Textarea
              rows={4}
              value={node.data.summary ?? ""}
              placeholder={meta.description}
              onChange={(e) => onChange(node.id, { summary: e.target.value })}
            />
          </div>

          {isCollect && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Campos a coletar</p>
                  <p className="text-[11px] text-muted-foreground">
                    Dados que a IA deve extrair e salvar durante a conversa.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="size-3.5 mr-1" /> Campo
                </Button>
              </div>

              <div>
                <Label className="text-xs">Salvar em</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={node.data.storage ?? "lead"}
                  onChange={(e) => onChange(node.id, { storage: e.target.value })}
                >
                  <option value="lead">CRM / Lead</option>
                  <option value="conversation">Conversa</option>
                  <option value="custom">Tabela customizada</option>
                </select>
              </div>

              <div className="space-y-2">
                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum campo. Clique em "Campo" para adicionar.
                  </p>
                )}
                {fields.map((f, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2 bg-background/50">
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        placeholder="chave (ex: cnpj)"
                        value={f.key}
                        onChange={(e) => updateField(i, { key: e.target.value })}
                      />
                      <button
                        onClick={() => removeField(i)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Rótulo (ex: CNPJ da empresa)"
                      value={f.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-xs flex-1"
                        value={f.type}
                        onChange={(e) => updateField(i, { type: e.target.value as CollectField["type"] })}
                      >
                        <option value="text">Texto</option>
                        <option value="email">Email</option>
                        <option value="phone">Telefone</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={!!f.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                        />
                        Obrigatório
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
