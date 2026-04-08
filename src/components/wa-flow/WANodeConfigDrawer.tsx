import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X, Upload, Info, MessageSquare, Image, FileAudio, Video, FileText, FileUp, AlertTriangle } from "lucide-react";
import type { Node } from "@xyflow/react";

function EntryNodeConfig({ config, updateConfig, renderInfoBanner }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element }) {
  const { user } = useAuth();
  const { data: numbers = [] } = useQuery({
    queryKey: ["wa-numbers-for-flow"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_numbers")
        .select("id, phone_number, name, api_tier")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const selectedNumber = numbers.find((n: any) => n.id === config.whatsapp_number_id);
  const isEvolution = selectedNumber?.api_tier !== "paid" && selectedNumber?.api_tier !== "meta";

  return (
    <div className="space-y-4">
      {renderInfoBanner("Defina como o lead entra neste fluxo e qual número será utilizado.")}

      <div className="space-y-2">
        <Label className="text-xs font-medium">Número do WhatsApp</Label>
        <Select
          value={config.whatsapp_number_id || ""}
          onValueChange={(v) => {
            const num = numbers.find((n: any) => n.id === v);
            updateConfig("whatsapp_number_id", v);
            updateConfig("whatsapp_number_name", num?.name || num?.phone_number || "");
            updateConfig("api_type", num?.api_tier === "paid" || num?.api_tier === "meta" ? "meta" : "evolution");
          }}
        >
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar número..." /></SelectTrigger>
          <SelectContent>
            {numbers.map((n: any) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name || n.phone_number}
                {n.api_tier !== "paid" && n.api_tier !== "meta" && " (Outbound)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedNumber && isEvolution && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-500 leading-relaxed">
            Esse tipo de API é recomendada para prospecção fria. Devido ao risco de bloqueio por spam, recomendamos o uso da API Inbound de relacionamento para esse fluxo.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium">Tipo de gatilho</Label>
        <Select value={config.trigger_type || ""} onValueChange={(v) => updateConfig("trigger_type", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Palavra-chave</SelectItem>
            <SelectItem value="campaign_reply">Resposta de campanha</SelectItem>
            <SelectItem value="button_click">Clique em botão interativo</SelectItem>
            <SelectItem value="webhook">Webhook/API externa</SelectItem>
            <SelectItem value="qr_code">QR Code</SelectItem>
            <SelectItem value="first_message">1ª mensagem recebida</SelectItem>
            <SelectItem value="re_entry">Reentrada de lead existente</SelectItem>
            <SelectItem value="template_reply">Resposta a template HSM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.trigger_type === "keyword" && (
        <div className="space-y-2">
          <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
          <Input
            value={config.keywords || ""}
            onChange={(e) => updateConfig("keywords", e.target.value)}
            placeholder="preço, comprar, orçamento, quero"
            className="h-9 text-sm"
          />
          <div className="flex items-center gap-2 mt-1">
            <Switch
              checked={config.exact_match || false}
              onCheckedChange={(v) => updateConfig("exact_match", v)}
            />
            <Label className="text-[11px] text-muted-foreground">Correspondência exata</Label>
          </div>
        </div>
      )}
      {config.trigger_type === "campaign_reply" && (
        <div className="space-y-2">
          <Label className="text-xs">ID ou nome da campanha (opcional)</Label>
          <Input
            value={config.campaign_filter || ""}
            onChange={(e) => updateConfig("campaign_filter", e.target.value)}
            placeholder="Qualquer campanha"
            className="h-9 text-sm"
          />
        </div>
      )}
      {config.trigger_type === "webhook" && (
        <div className="space-y-2">
          <Label className="text-xs">URL de callback (será gerada automaticamente)</Label>
          <div className="flex gap-2">
            <Input
              value={config.webhook_url || "Será gerado ao ativar o fluxo"}
              readOnly
              className="h-9 text-sm bg-muted/30 flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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

  const getNextInteractiveId = (items: any[], prefix: "btn" | "item") => {
    const highestIndex = items.reduce((max: number, item: any) => {
      const rawId = typeof item === "string" ? "" : String(item?.id || "");
      const match = rawId.match(new RegExp(`^${prefix}[_-](\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, -1);

    return `${prefix}_${highestIndex + 1}`;
  };

  const renderInfoBanner = (text: string) => (
    <div className="flex gap-2 items-start p-2.5 rounded-lg bg-muted/60 border border-border/40">
      <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base flex items-center gap-2">
            Configurar Bloco
            <Badge variant="outline" className="text-[10px] font-normal">Meta Partners</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Nome do bloco</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* ===== ENTRY NODE ===== */}
          {node.type === "entry" && (
            <EntryNodeConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== MESSAGE NODE ===== */}
          {node.type === "message" && (
            <div className="space-y-4">
              {renderInfoBanner("Envie mensagens via Meta Cloud API. Suporta texto, mídia e templates oficiais HSM.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de mensagem</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "text", icon: MessageSquare, label: "Texto" },
                    { value: "image", icon: Image, label: "Imagem" },
                    { value: "audio", icon: FileAudio, label: "Áudio" },
                    { value: "video", icon: Video, label: "Vídeo" },
                    { value: "document", icon: FileText, label: "Documento" },
                    { value: "template", icon: FileUp, label: "Template" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                        (config.message_type || "text") === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                      onClick={() => updateConfig("message_type", opt.value)}
                    >
                      <opt.icon size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text message */}
              {(!config.message_type || config.message_type === "text") && (
                <div className="space-y-2">
                  <Label className="text-xs">Conteúdo da mensagem</Label>
                  <Textarea
                    value={config.content || ""}
                    onChange={(e) => updateConfig("content", e.target.value)}
                    placeholder="Olá {nome}! Como posso te ajudar?&#10;&#10;Use {nome}, {telefone}, {empresa} para variáveis"
                    className="text-sm min-h-[100px]"
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: {"{nome}"}, {"{telefone}"}, {"{empresa}"}, {"{email}"}</p>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.preview_url || false}
                      onCheckedChange={(v) => updateConfig("preview_url", v)}
                    />
                    <Label className="text-[11px] text-muted-foreground">Habilitar preview de link</Label>
                  </div>
                </div>
              )}

              {/* Image */}
              {config.message_type === "image" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">URL da imagem</Label>
                    <Input
                      value={config.media_url || ""}
                      onChange={(e) => updateConfig("media_url", e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Formatos: JPEG, PNG. Máx: 5MB (Meta Cloud API)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Legenda (opcional)</Label>
                    <Textarea
                      value={config.caption || ""}
                      onChange={(e) => updateConfig("caption", e.target.value)}
                      placeholder="Descrição da imagem..."
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              )}

              {/* Audio */}
              {config.message_type === "audio" && (
                <div className="space-y-3">
                  {renderInfoBanner("O áudio será enviado como mensagem nativa (não encaminhado), simulando gravação de voz no WhatsApp.")}
                  <div className="space-y-2">
                    <Label className="text-xs">URL do áudio</Label>
                    <Input
                      value={config.media_url || ""}
                      onChange={(e) => updateConfig("media_url", e.target.value)}
                      placeholder="https://exemplo.com/audio.ogg"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Formato recomendado: OGG/OPUS. Máx: 16MB</p>
                  </div>
                </div>
              )}

              {/* Video */}
              {config.message_type === "video" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">URL do vídeo</Label>
                    <Input
                      value={config.media_url || ""}
                      onChange={(e) => updateConfig("media_url", e.target.value)}
                      placeholder="https://exemplo.com/video.mp4"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Formato: MP4 (H.264). Máx: 16MB</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Legenda (opcional)</Label>
                    <Textarea
                      value={config.caption || ""}
                      onChange={(e) => updateConfig("caption", e.target.value)}
                      placeholder="Descrição do vídeo..."
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              )}

              {/* Document */}
              {config.message_type === "document" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">URL do documento</Label>
                    <Input
                      value={config.media_url || ""}
                      onChange={(e) => updateConfig("media_url", e.target.value)}
                      placeholder="https://exemplo.com/proposta.pdf"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Formatos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX. Máx: 100MB</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Nome do arquivo</Label>
                    <Input
                      value={config.filename || ""}
                      onChange={(e) => updateConfig("filename", e.target.value)}
                      placeholder="proposta-comercial.pdf"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Legenda (opcional)</Label>
                    <Input
                      value={config.caption || ""}
                      onChange={(e) => updateConfig("caption", e.target.value)}
                      placeholder="Segue a proposta comercial"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Template HSM */}
              {config.message_type === "template" && (
                <div className="space-y-3">
                  {renderInfoBanner("Templates HSM são obrigatórios para iniciar conversas ou enviar fora da janela de 24h. Devem ser aprovados pela Meta.")}
                  <div className="space-y-2">
                    <Label className="text-xs">Nome do template</Label>
                    <Input
                      value={config.template_name || ""}
                      onChange={(e) => updateConfig("template_name", e.target.value)}
                      placeholder="nome_do_template"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Idioma</Label>
                    <Select value={config.template_language || "pt_BR"} onValueChange={(v) => updateConfig("template_language", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt_BR">Português (BR)</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Variáveis do template (JSON)</Label>
                    <Textarea
                      value={config.template_variables || ""}
                      onChange={(e) => updateConfig("template_variables", e.target.value)}
                      placeholder={'[{"type": "text", "text": "{nome}"}]'}
                      className="text-sm min-h-[60px] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">URL do header (imagem/documento, se houver)</Label>
                    <Input
                      value={config.template_header_url || ""}
                      onChange={(e) => updateConfig("template_header_url", e.target.value)}
                      placeholder="https://..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== BUTTONS NODE ===== */}
          {node.type === "buttons" && (
            <div className="space-y-4">
              {renderInfoBanner("Botões interativos da WhatsApp API. Até 3 botões de resposta rápida ou 1 lista com até 10 opções.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de interação</Label>
                <Select value={config.interaction_type || "reply_buttons"} onValueChange={(v) => updateConfig("interaction_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reply_buttons">Botões de resposta rápida (máx. 3)</SelectItem>
                    <SelectItem value="list">Lista interativa (menu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Mensagem do corpo</Label>
                <Textarea
                  value={config.body_text || ""}
                  onChange={(e) => updateConfig("body_text", e.target.value)}
                  placeholder="Escolha uma opção abaixo:"
                  className="text-sm min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Cabeçalho (opcional)</Label>
                <Input
                  value={config.header_text || ""}
                  onChange={(e) => updateConfig("header_text", e.target.value)}
                  placeholder="Menu de opções"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Rodapé (opcional)</Label>
                <Input
                  value={config.footer_text || ""}
                  onChange={(e) => updateConfig("footer_text", e.target.value)}
                  placeholder="Powered by Wiize"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Cabeçalho e rodapé são opcionais e só aparecem em blocos interativos; para mensagem comum use o bloco de mensagem.
                </p>
              </div>

              {/* Reply buttons */}
              {(config.interaction_type || "reply_buttons") === "reply_buttons" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Botões (máx. 3)</Label>
                  <div className="space-y-2">
                    {(config.buttons || []).map((btn: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{i + 1}</div>
                        <Input
                          value={typeof btn === "string" ? btn : btn.title || ""}
                          onChange={(e) => {
                            const updated = [...(config.buttons || [])];
                              const currentButton = updated[i];
                              updated[i] = {
                                id: typeof currentButton === "string" ? `btn_${i}` : currentButton?.id || `btn_${i}`,
                                title: e.target.value,
                              };
                            updateConfig("buttons", updated);
                          }}
                          placeholder={`Botão ${i + 1}`}
                          className="h-8 text-sm flex-1"
                          maxLength={20}
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
                        onClick={() =>
                          updateConfig("buttons", [
                            ...(config.buttons || []),
                            { id: getNextInteractiveId(config.buttons || [], "btn"), title: "" },
                          ])
                        }
                      >
                        <Plus size={12} className="mr-1" /> Adicionar botão
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Máx. 20 caracteres por botão. Cada botão gera uma saída no fluxo.</p>
                </div>
              )}

              {/* List */}
              {config.interaction_type === "list" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Texto do botão de menu</Label>
                  <Input
                    value={config.list_button_text || ""}
                    onChange={(e) => updateConfig("list_button_text", e.target.value)}
                    placeholder="Ver opções"
                    className="h-9 text-sm"
                    maxLength={20}
                  />
                  <Label className="text-xs font-medium mt-3">Itens da lista (máx. 10)</Label>
                  <div className="space-y-2">
                    {(config.list_items || []).map((item: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.title || ""}
                            onChange={(e) => {
                              const updated = [...(config.list_items || [])];
                              updated[i] = {
                                ...updated[i],
                                id: updated[i]?.id || `item_${i}`,
                                title: e.target.value,
                              };
                              updateConfig("list_items", updated);
                            }}
                            placeholder="Título"
                            className="h-7 text-xs flex-1"
                            maxLength={24}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              const updated = (config.list_items || []).filter((_: any, j: number) => j !== i);
                              updateConfig("list_items", updated);
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                        <Input
                          value={item.description || ""}
                          onChange={(e) => {
                            const updated = [...(config.list_items || [])];
                            updated[i] = { ...updated[i], description: e.target.value };
                            updateConfig("list_items", updated);
                          }}
                          placeholder="Descrição (opcional)"
                          className="h-7 text-xs"
                          maxLength={72}
                        />
                      </div>
                    ))}
                    {(config.list_items || []).length < 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() =>
                          updateConfig("list_items", [
                            ...(config.list_items || []),
                            { id: getNextInteractiveId(config.list_items || [], "item"), title: "", description: "" },
                          ])
                        }
                      >
                        <Plus size={12} className="mr-1" /> Adicionar item
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CONDITION NODE ===== */}
          {node.type === "condition" && (
            <div className="space-y-4">
              {renderInfoBanner("Crie bifurcações no fluxo baseadas em respostas, tags ou dados do lead.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de condição</Label>
                <Select value={config.condition_type || ""} onValueChange={(v) => updateConfig("condition_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button_clicked">Clicou botão específico</SelectItem>
                    <SelectItem value="keyword_match">Contém palavra-chave</SelectItem>
                    <SelectItem value="responded">Respondeu qualquer coisa</SelectItem>
                    <SelectItem value="no_response">Não respondeu (timeout)</SelectItem>
                    <SelectItem value="has_tag">Possui tag</SelectItem>
                    <SelectItem value="field_equals">Campo do lead = valor</SelectItem>
                    <SelectItem value="score_above">Score acima de</SelectItem>
                    <SelectItem value="is_customer">É cliente</SelectItem>
                    <SelectItem value="pipeline_stage">Está na etapa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.condition_type === "button_clicked" && (
                <div className="space-y-2">
                  <Label className="text-xs">ID ou texto do botão</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="btn_0 ou texto do botão"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.condition_type === "keyword_match" && (
                <div className="space-y-2">
                  <Label className="text-xs">Palavras (separadas por vírgula)</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="sim, quero, comprar"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {(config.condition_type === "has_tag" || config.condition_type === "pipeline_stage") && (
                <div className="space-y-2">
                  <Label className="text-xs">{config.condition_type === "has_tag" ? "Nome da tag" : "Nome da etapa"}</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.condition_type === "score_above" && (
                <div className="space-y-2">
                  <Label className="text-xs">Score mínimo</Label>
                  <Input
                    type="number"
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="500"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.condition_type === "field_equals" && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome do campo</Label>
                  <Input
                    value={config.field_name || ""}
                    onChange={(e) => updateConfig("field_name", e.target.value)}
                    placeholder="cidade"
                    className="h-9 text-sm"
                  />
                  <Label className="text-xs">Valor esperado</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="São Paulo"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.condition_type === "no_response" && (
                <div className="space-y-2">
                  <Label className="text-xs">Timeout (minutos)</Label>
                  <Input
                    type="number"
                    value={config.timeout_minutes || ""}
                    onChange={(e) => updateConfig("timeout_minutes", parseInt(e.target.value) || 0)}
                    placeholder="60"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Saída <span className="text-primary font-semibold">Sim</span> = condição verdadeira · <span className="text-destructive font-semibold">Não</span> = falsa</p>
            </div>
          )}

          {/* ===== WAIT NODE ===== */}
          {node.type === "wait" && (
            <div className="space-y-4">
              {renderInfoBanner("Pause o fluxo por um período. A espera inteligente verifica se o lead respondeu antes de continuar.")}
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Tempo</Label>
                  <Input
                    type="number"
                    value={config.delay_value || ""}
                    onChange={(e) => updateConfig("delay_value", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Unidade</Label>
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
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.smart || false}
                    onCheckedChange={(v) => updateConfig("smart", v)}
                  />
                  <Label className="text-xs font-medium">Espera inteligente</Label>
                </div>
                {config.smart && (
                  <p className="text-[10px] text-muted-foreground">Se o lead responder antes do tempo, o fluxo avança imediatamente. Se não responder, segue após o timeout.</p>
                )}
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.business_hours_only || false}
                    onCheckedChange={(v) => updateConfig("business_hours_only", v)}
                  />
                  <Label className="text-xs font-medium">Apenas horário comercial</Label>
                </div>
                {config.business_hours_only && (
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Início</Label>
                      <Input
                        type="time"
                        value={config.bh_start || "09:00"}
                        onChange={(e) => updateConfig("bh_start", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Fim</Label>
                      <Input
                        type="time"
                        value={config.bh_end || "18:00"}
                        onChange={(e) => updateConfig("bh_end", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ACTION NODE ===== */}
          {node.type === "action" && (
            <div className="space-y-4">
              {renderInfoBanner("Execute ações no sistema: CRM, tags, pipeline, webhooks.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de ação</Label>
                <Select value={config.action_type || ""} onValueChange={(v) => updateConfig("action_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_tag">Adicionar tag</SelectItem>
                    <SelectItem value="remove_tag">Remover tag</SelectItem>
                    <SelectItem value="update_field">Atualizar campo do lead</SelectItem>
                    <SelectItem value="move_pipeline">Mover para etapa do pipeline</SelectItem>
                    <SelectItem value="send_to_crm">Criar/atualizar lead no CRM</SelectItem>
                    <SelectItem value="webhook">Disparar webhook externo</SelectItem>
                    <SelectItem value="mark_hot">Marcar como quente 🔥</SelectItem>
                    <SelectItem value="mark_cold">Marcar como frio ❄️</SelectItem>
                    <SelectItem value="mark_converted">Marcar como convertido ✅</SelectItem>
                    <SelectItem value="update_score">Atualizar score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(config.action_type === "add_tag" || config.action_type === "remove_tag") && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome da tag</Label>
                  <Input
                    value={config.tag_value || ""}
                    onChange={(e) => updateConfig("tag_value", e.target.value)}
                    placeholder="qualificado, interessado, etc."
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "update_field" && (
                <div className="space-y-2">
                  <Label className="text-xs">Campo</Label>
                  <Select value={config.field_name || ""} onValueChange={(v) => updateConfig("field_name", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact_name">Nome</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="company_name">Empresa</SelectItem>
                      <SelectItem value="city">Cidade</SelectItem>
                      <SelectItem value="origin">Origem</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">Novo valor</Label>
                  <Input
                    value={config.field_value || ""}
                    onChange={(e) => updateConfig("field_value", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "move_pipeline" && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome da etapa de destino</Label>
                  <Input
                    value={config.pipeline_stage || ""}
                    onChange={(e) => updateConfig("pipeline_stage", e.target.value)}
                    placeholder="Em negociação"
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
                    placeholder="https://seu-webhook.com/endpoint"
                    className="h-9 text-sm"
                  />
                  <Label className="text-xs">Método</Label>
                  <Select value={config.webhook_method || "POST"} onValueChange={(v) => updateConfig("webhook_method", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">Headers extras (JSON, opcional)</Label>
                  <Textarea
                    value={config.webhook_headers || ""}
                    onChange={(e) => updateConfig("webhook_headers", e.target.value)}
                    placeholder='{"Authorization": "Bearer ..."}'
                    className="text-xs min-h-[50px] font-mono"
                  />
                </div>
              )}
              {config.action_type === "update_score" && (
                <div className="space-y-2">
                  <Label className="text-xs">Pontos a adicionar (+) ou remover (-)</Label>
                  <Input
                    type="number"
                    value={config.score_delta || ""}
                    onChange={(e) => updateConfig("score_delta", parseInt(e.target.value) || 0)}
                    placeholder="50"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* ===== HANDOFF NODE ===== */}
          {node.type === "handoff" && (
            <div className="space-y-4">
              {renderInfoBanner("Transfere a conversa para atendimento humano e pausa a automação neste lead.")}
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.stop_automation !== false}
                    onCheckedChange={(v) => updateConfig("stop_automation", v)}
                  />
                  <Label className="text-xs font-medium">Parar automação neste lead</Label>
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.notify_team || false}
                    onCheckedChange={(v) => updateConfig("notify_team", v)}
                  />
                  <Label className="text-xs font-medium">Notificar equipe</Label>
                </div>
                {config.notify_team && (
                  <div className="space-y-2">
                    <Label className="text-[10px]">Mensagem de notificação</Label>
                    <Input
                      value={config.notification_message || ""}
                      onChange={(e) => updateConfig("notification_message", e.target.value)}
                      placeholder="Lead qualificado aguardando atendimento"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mensagem ao lead (opcional)</Label>
                <Textarea
                  value={config.handoff_message || ""}
                  onChange={(e) => updateConfig("handoff_message", e.target.value)}
                  placeholder="Um de nossos especialistas vai te atender em breve!"
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
          )}

          {/* ===== END NODE ===== */}
          {node.type === "end" && (
            <div className="space-y-4">
              {renderInfoBanner("Encerra o fluxo para este lead. Opcionalmente envie uma mensagem final.")}
              <div className="space-y-2">
                <Label className="text-xs">Mensagem de encerramento (opcional)</Label>
                <Textarea
                  value={config.end_message || ""}
                  onChange={(e) => updateConfig("end_message", e.target.value)}
                  placeholder="Obrigado pelo contato! Até a próxima."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.mark_completed || false}
                  onCheckedChange={(v) => updateConfig("mark_completed", v)}
                />
                <Label className="text-xs">Marcar lead como "atendido" no CRM</Label>
              </div>
            </div>
          )}

          {/* ===== AI AGENT NODE ===== */}
          {node.type === "ai_agent" && (
            <div className="space-y-4">
              {renderInfoBanner("Configure um agente de IA que analisa a resposta do lead e decide o próximo passo automaticamente.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prompt do sistema (instrução para a IA)</Label>
                <Textarea
                  value={config.system_prompt || ""}
                  onChange={(e) => updateConfig("system_prompt", e.target.value)}
                  placeholder="Você é um assistente de vendas. Analise a resposta do lead e classifique como: INTERESSADO, INDECISO ou NÃO_INTERESSADO. Responda de forma natural e direcione para o fechamento."
                  className="text-sm min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Modelo de IA</Label>
                <Select value={config.ai_model || "gpt-4o-mini"} onValueChange={(v) => updateConfig("ai_model", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (rápido)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (avançado)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini Flash (rápido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">O que a IA deve retornar?</Label>
                <Select value={config.ai_output_type || "message_and_route"} onValueChange={(v) => updateConfig("ai_output_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message_only">Apenas responder ao lead</SelectItem>
                    <SelectItem value="route_only">Apenas direcionar (sem resposta)</SelectItem>
                    <SelectItem value="message_and_route">Responder e direcionar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Direcionamentos possíveis (um por linha)</Label>
                <Textarea
                  value={config.ai_routes || ""}
                  onChange={(e) => updateConfig("ai_routes", e.target.value)}
                  placeholder={"INTERESSADO → seguir para proposta\nINDECISO → enviar mais informações\nNÃO_INTERESSADO → encerrar fluxo"}
                  className="text-sm min-h-[80px] font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Cada direcionamento gera uma saída no nó. Conecte ao próximo bloco no canvas.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Contexto extra (opcional)</Label>
                <Textarea
                  value={config.ai_context || ""}
                  onChange={(e) => updateConfig("ai_context", e.target.value)}
                  placeholder="Informações sobre a empresa, produtos, preços, etc."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.ai_memory || false}
                    onCheckedChange={(v) => updateConfig("ai_memory", v)}
                  />
                  <Label className="text-xs font-medium">Memória de conversa</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">A IA recebe todo o histórico da conversa para contexto.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Máx. caracteres na resposta</Label>
                <Input
                  type="number"
                  value={config.max_chars || "500"}
                  onChange={(e) => updateConfig("max_chars", parseInt(e.target.value) || 500)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* ===== A/B TEST NODE ===== */}
          {node.type === "ab_test" && (
            <div className="space-y-4">
              {renderInfoBanner("Divide os leads igualmente entre variantes e metrifica qual performa melhor no objetivo escolhido.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nome do teste</Label>
                <Input
                  value={config.test_name || ""}
                  onChange={(e) => updateConfig("test_name", e.target.value)}
                  placeholder="Mensagem inicial de boas-vindas"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Objetivo de medição</Label>
                <Select value={config.objective || ""} onValueChange={(v) => updateConfig("objective", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="response_rate">Taxa de resposta</SelectItem>
                    <SelectItem value="click_rate">Taxa de clique em botão</SelectItem>
                    <SelectItem value="conversion">Conversão (chegou ao fim)</SelectItem>
                    <SelectItem value="handoff_rate">Taxa de transferência para humano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Variantes</Label>
                <div className="space-y-2">
                  {(config.variants || []).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <Input
                        value={v.name || ""}
                        onChange={(e) => {
                          const updated = [...(config.variants || [])];
                          updated[i] = { ...updated[i], name: e.target.value };
                          updateConfig("variants", updated);
                        }}
                        placeholder={`Variante ${String.fromCharCode(65 + i)}`}
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        type="number"
                        value={v.weight || 0}
                        onChange={(e) => {
                          const updated = [...(config.variants || [])];
                          updated[i] = { ...updated[i], weight: parseInt(e.target.value) || 0 };
                          updateConfig("variants", updated);
                        }}
                        className="h-8 text-sm w-16 text-center"
                        min={1}
                        max={100}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      {(config.variants || []).length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const updated = (config.variants || []).filter((_: any, j: number) => j !== i);
                            updateConfig("variants", updated);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(config.variants || []).length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const current = config.variants || [];
                        const letter = String.fromCharCode(65 + current.length);
                        const equalWeight = Math.floor(100 / (current.length + 1));
                        const updated = current.map((v: any) => ({ ...v, weight: equalWeight }));
                        updated.push({ id: `var_${letter.toLowerCase()}`, name: `Variante ${letter}`, weight: 100 - equalWeight * current.length });
                        updateConfig("variants", updated);
                      }}
                    >
                      <Plus size={12} className="mr-1" /> Adicionar variante
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">A soma dos pesos deve ser 100%. Os leads são distribuídos proporcionalmente. Cada variante gera uma saída no fluxo.</p>
              </div>
            </div>
          )}

          {/* ===== RANDOM SPLIT NODE ===== */}
          {node.type === "random_split" && (
            <div className="space-y-4">
              {renderInfoBanner("Distribui os leads aleatoriamente entre as saídas configuradas. Ideal para dividir fluxo sem critério específico.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Saídas ({(config.outputs || []).length})</Label>
                <div className="space-y-2">
                  {(config.outputs || []).map((o: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-[10px] font-bold text-sky-400 shrink-0">
                        {i + 1}
                      </div>
                      <Input
                        value={o.name || ""}
                        onChange={(e) => {
                          const updated = [...(config.outputs || [])];
                          updated[i] = { ...updated[i], name: e.target.value };
                          updateConfig("outputs", updated);
                        }}
                        placeholder={`Saída ${i + 1}`}
                        className="h-8 text-sm flex-1"
                      />
                      {(config.outputs || []).length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const updated = (config.outputs || []).filter((_: any, j: number) => j !== i);
                            updateConfig("outputs", updated);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(config.outputs || []).length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const current = config.outputs || [];
                        updateConfig("outputs", [
                          ...current,
                          { id: `out_${current.length}`, name: `Saída ${current.length + 1}` },
                        ]);
                      }}
                    >
                      <Plus size={12} className="mr-1" /> Adicionar saída
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Cada lead é direcionado aleatoriamente para uma das saídas. Máximo de 5 saídas.</p>
              </div>
            </div>
          )}

          {/* ===== GOOGLE SHEETS NODE ===== */}
          {node.type === "google_sheets" && (
            <GoogleSheetsConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== GOOGLE CALENDAR NODE ===== */}
          {node.type === "google_calendar" && (
            <div className="space-y-4">
              {renderInfoBanner("Crie eventos automáticos no Google Agenda quando o lead chegar neste ponto do fluxo.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">URL do Webhook</Label>
                <Input
                  value={config.webhook_url || ""}
                  onChange={(e) => updateConfig("webhook_url", e.target.value)}
                  placeholder="https://hooks.zapier.com/... ou n8n webhook"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Cole a URL gerada pelo Zapier, Make ou n8n.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Título do evento</Label>
                  <Input
                    value={config.event_title || ""}
                    onChange={(e) => updateConfig("event_title", e.target.value)}
                    placeholder="Reunião com {nome}"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Use {"{nome}"}, {"{telefone}"}, {"{empresa}"} como variáveis.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Duração (minutos)</Label>
                  <Input
                    type="number"
                    value={config.event_duration || "30"}
                    onChange={(e) => updateConfig("event_duration", parseInt(e.target.value) || 30)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Descrição do evento (opcional)</Label>
                  <Textarea
                    value={config.event_description || ""}
                    onChange={(e) => updateConfig("event_description", e.target.value)}
                    placeholder="Lead: {nome} | Tel: {telefone}"
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-[11px] text-primary font-medium mb-1">💡 Como configurar</p>
                <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>No <strong>Zapier</strong>: Trigger "Webhooks" → Action "Google Calendar - Create Event"</li>
                  <li>No <strong>Make</strong>: Webhook → Google Calendar "Create an Event"</li>
                  <li>O título e duração serão enviados junto com os dados do lead</li>
                  <li>Copie a URL do webhook e cole acima</li>
                </ol>
              </div>
            </div>
          )}

          {/* ===== GMAIL NODE ===== */}
          {node.type === "gmail" && (
            <div className="space-y-4">
              {renderInfoBanner("Envie um email automático pelo Gmail quando o lead chegar neste ponto do fluxo.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">URL do Webhook</Label>
                <Input
                  value={config.webhook_url || ""}
                  onChange={(e) => updateConfig("webhook_url", e.target.value)}
                  placeholder="https://hooks.zapier.com/... ou Make webhook"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Cole a URL gerada pelo Zapier, Make ou n8n.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Email destinatário</Label>
                  <Input
                    value={config.email_to || ""}
                    onChange={(e) => updateConfig("email_to", e.target.value)}
                    placeholder="vendas@suaempresa.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Assunto do email</Label>
                  <Input
                    value={config.email_subject || ""}
                    onChange={(e) => updateConfig("email_subject", e.target.value)}
                    placeholder="Novo lead: {nome}"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Corpo do email</Label>
                  <Textarea
                    value={config.email_body || ""}
                    onChange={(e) => updateConfig("email_body", e.target.value)}
                    placeholder={"Novo lead capturado!\n\nNome: {nome}\nTelefone: {telefone}\nEmpresa: {empresa}"}
                    className="text-sm min-h-[80px]"
                  />
                  <p className="text-[10px] text-muted-foreground">Use {"{nome}"}, {"{telefone}"}, {"{empresa}"}, {"{email}"} como variáveis.</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-[11px] text-primary font-medium mb-1">💡 Como configurar</p>
                <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>No <strong>Zapier</strong>: Trigger "Webhooks" → Action "Gmail - Send Email"</li>
                  <li>No <strong>Make</strong>: Webhook → Gmail "Send an Email"</li>
                  <li>Configure o assunto e corpo no Zapier/Make ou use os dados enviados daqui</li>
                  <li>Copie a URL do webhook e cole acima</li>
                </ol>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSave} className="flex-1 h-9 text-sm">
              Salvar configuração
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
