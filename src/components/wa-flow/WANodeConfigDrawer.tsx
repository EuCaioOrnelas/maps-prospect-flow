import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, X } from "lucide-react";
import type { Node } from "@xyflow/react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node;
  onUpdate: (nodeId: string, config: any, label?: string) => void;
  onDelete: (nodeId: string) => void;
}

export function WANodeConfigDrawer({ open, onOpenChange, node, onUpdate, onDelete }: Props) {
  const [config, setConfig] = useState<any>({});
  const [label, setLabel] = useState("");

  useEffect(() => {
    setConfig((node.data as any).config || {});
    setLabel(String((node.data as any).label || ""));
  }, [node]);

  const handleSave = () => {
    onUpdate(node.id, config, label);
    onOpenChange(false);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Configurar Bloco</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-xs">Nome do bloco</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Entry node config */}
          {node.type === "entry" && (
            <div className="space-y-3">
              <Label className="text-xs">Tipo de gatilho</Label>
              <Select value={config.trigger_type || ""} onValueChange={(v) => updateConfig("trigger_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="campaign_reply">Resposta de campanha</SelectItem>
                  <SelectItem value="button_click">Clique em botão</SelectItem>
                  <SelectItem value="webhook">Webhook/API</SelectItem>
                  <SelectItem value="qr_code">QR Code</SelectItem>
                  <SelectItem value="first_message">1ª mensagem</SelectItem>
                  <SelectItem value="re_entry">Reentrada</SelectItem>
                </SelectContent>
              </Select>
              {config.trigger_type === "keyword" && (
                <div className="space-y-2">
                  <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={config.keywords || ""}
                    onChange={(e) => updateConfig("keywords", e.target.value)}
                    placeholder="preço, comprar, orçamento"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Message node config */}
          {node.type === "message" && (
            <div className="space-y-3">
              <Label className="text-xs">Tipo de mensagem</Label>
              <Select value={config.message_type || "text"} onValueChange={(v) => updateConfig("message_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="template">Template HSM</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={config.content || ""}
                  onChange={(e) => updateConfig("content", e.target.value)}
                  placeholder="Use {nome} para variáveis..."
                  className="text-sm min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Buttons node config */}
          {node.type === "buttons" && (
            <div className="space-y-3">
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={config.header_text || ""}
                onChange={(e) => updateConfig("header_text", e.target.value)}
                placeholder="Escolha uma opção:"
                className="text-sm min-h-[60px]"
              />
              <Label className="text-xs">Botões (máx. 3)</Label>
              <div className="space-y-2">
                {(config.buttons || []).map((btn: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={btn}
                      onChange={(e) => {
                        const updated = [...(config.buttons || [])];
                        updated[i] = e.target.value;
                        updateConfig("buttons", updated);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const updated = (config.buttons || []).filter((_: any, j: number) => j !== i);
                        updateConfig("buttons", updated);
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                {(config.buttons || []).length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => updateConfig("buttons", [...(config.buttons || []), ""])}
                  >
                    <Plus size={12} className="mr-1" /> Adicionar botão
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Condition node config */}
          {node.type === "condition" && (
            <div className="space-y-3">
              <Label className="text-xs">Tipo de condição</Label>
              <Select value={config.condition_type || ""} onValueChange={(v) => updateConfig("condition_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="button_clicked">Clicou botão</SelectItem>
                  <SelectItem value="keyword_match">Contém palavra</SelectItem>
                  <SelectItem value="responded">Respondeu</SelectItem>
                  <SelectItem value="no_response">Não respondeu</SelectItem>
                  <SelectItem value="has_tag">Tem tag</SelectItem>
                  <SelectItem value="field_equals">Campo = valor</SelectItem>
                </SelectContent>
              </Select>
              {(config.condition_type === "keyword_match" || config.condition_type === "has_tag" || config.condition_type === "field_equals") && (
                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Wait node config */}
          {node.type === "wait" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Tempo</Label>
                  <Input
                    type="number"
                    value={config.delay_value || ""}
                    onChange={(e) => updateConfig("delay_value", parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={config.delay_unit || "minutes"} onValueChange={(v) => updateConfig("delay_unit", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.smart || false}
                  onCheckedChange={(v) => updateConfig("smart", v)}
                />
                <Label className="text-xs">Espera inteligente (continuar se não respondeu)</Label>
              </div>
            </div>
          )}

          {/* Action node config */}
          {node.type === "action" && (
            <div className="space-y-3">
              <Label className="text-xs">Tipo de ação</Label>
              <Select value={config.action_type || ""} onValueChange={(v) => updateConfig("action_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_tag">Adicionar tag</SelectItem>
                  <SelectItem value="remove_tag">Remover tag</SelectItem>
                  <SelectItem value="update_field">Atualizar campo</SelectItem>
                  <SelectItem value="move_pipeline">Mover pipeline</SelectItem>
                  <SelectItem value="send_to_crm">Enviar ao CRM</SelectItem>
                  <SelectItem value="webhook">Disparar webhook</SelectItem>
                  <SelectItem value="mark_hot">Marcar quente</SelectItem>
                  <SelectItem value="mark_cold">Marcar frio</SelectItem>
                  <SelectItem value="mark_converted">Marcar convertido</SelectItem>
                </SelectContent>
              </Select>
              {(config.action_type === "add_tag" || config.action_type === "remove_tag") && (
                <div className="space-y-2">
                  <Label className="text-xs">Tag</Label>
                  <Input
                    value={config.tag_value || ""}
                    onChange={(e) => updateConfig("tag_value", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "webhook" && (
                <div className="space-y-2">
                  <Label className="text-xs">URL do Webhook</Label>
                  <Input
                    value={config.webhook_url || ""}
                    onChange={(e) => updateConfig("webhook_url", e.target.value)}
                    placeholder="https://..."
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Handoff node config */}
          {node.type === "handoff" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.notify_team || false}
                  onCheckedChange={(v) => updateConfig("notify_team", v)}
                />
                <Label className="text-xs">Notificar equipe</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.stop_automation || true}
                  onCheckedChange={(v) => updateConfig("stop_automation", v)}
                />
                <Label className="text-xs">Parar automação</Label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSave} className="flex-1 h-9 text-sm">
              Salvar
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
