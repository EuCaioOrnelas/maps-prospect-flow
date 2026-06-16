import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  onDelete?: (id: string) => void;
}

export function NodeConfigDrawer({ node, onClose, onChange, onDelete }: Props) {
  const open = !!node;
  const isCollect = node?.data.kind === "data_collection";
  const meta = node ? WORKFORCE_NODE_META[node.data.kind] : null;
  const fields: CollectField[] = node?.data.fields ?? [];
  const Icon = meta?.icon;
  const isCore = node?.data.kind === "core";

  const addField = () =>
    node && onChange(node.id, {
      fields: [...fields, { key: "", label: "", type: "text", required: false }],
    });
  const updateField = (i: number, patch: Partial<CollectField>) => {
    if (!node) return;
    const next = fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(node.id, { fields: next });
  };
  const removeField = (i: number) =>
    node && onChange(node.id, { fields: fields.filter((_, idx) => idx !== i) });

  return (
    <>
      {open && (
        <div className="absolute inset-0 z-40" onClick={onClose} />
      )}
      <div
        className={cn(
          "absolute top-0 left-0 z-50 h-full w-[400px] sm:w-[440px] bg-card border-r border-border flex flex-col transition-all duration-300 ease-out",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full pointer-events-none",
        )}
        style={!open ? { boxShadow: "none" } : undefined}
      >
        {node && meta && Icon && (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
              <div className={cn("rounded-lg bg-muted/60 border border-border/40 w-9 h-9 flex items-center justify-center", meta.color)}>
                <Icon size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={node.data.title ?? ""}
                  onChange={(e) => onChange(node.id, { title: e.target.value })}
                  placeholder={meta.label}
                  className="h-8 text-sm font-semibold border-transparent bg-transparent px-1 hover:border-border focus:border-border transition-colors"
                />
                <p className="text-[11px] text-muted-foreground px-1 truncate">{meta.description}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div>
                <Label className="text-xs">Resumo / instruções</Label>
                <Textarea
                  rows={5}
                  value={node.data.summary ?? ""}
                  placeholder={meta.description}
                  onChange={(e) => onChange(node.id, { summary: e.target.value })}
                  className="text-sm"
                />
              </div>

              {isCollect && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Campos a coletar</p>
                      <p className="text-[11px] text-muted-foreground">
                        Dados que a IA deve extrair durante a conversa.
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
                        Nenhum campo. Clique em "Campo".
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

              {!isCore && onDelete && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => { onDelete(node.id); onClose(); }}
                  >
                    <Trash2 size={14} className="mr-2" /> Remover card
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
