import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot, FlaskConical, RotateCcw, Send } from "lucide-react";

interface WAFlowTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowName: string;
  nodes: Node[];
  edges: Edge[];
  resetVersion: number;
}

interface InteractiveChoice {
  id: string;
  title: string;
  description?: string;
}

interface ChatMessage {
  id: string;
  direction: "sent" | "received" | "event";
  content: string;
  meta?: string;
  nodeId?: string;
  choices?: InteractiveChoice[];
  choicesMode?: "reply_buttons" | "list";
}

interface RuntimeContext {
  lastUserText: string;
  lastButtonId: string | null;
  lastButtonTitle: string | null;
  hasFreshUserInput: boolean;
}

const createRuntimeContext = (): RuntimeContext => ({
  lastUserText: "",
  lastButtonId: null,
  lastButtonTitle: null,
  hasFreshUserInput: false,
});

const normalizeHandle = (value?: string | null) => {
  if (!value) return null;
  if (/^(btn|item)-\d+$/i.test(value)) return value.replace("-", "_");
  return value;
};

const normalizeChoice = (item: any, index: number, prefix: "btn" | "item"): InteractiveChoice => {
  if (typeof item === "string") {
    return { id: `${prefix}_${index}`, title: item };
  }

  return {
    id: item?.id || `${prefix}_${index}`,
    title: item?.title || `Opção ${index + 1}`,
    description: item?.description || "",
  };
};

const getNodeConfig = (node?: Node | null) => ((node?.data as any)?.config || {});

const getInteractiveChoices = (node: Node): InteractiveChoice[] => {
  const cfg = getNodeConfig(node);
  const isListMode = cfg.interaction_type === "list";
  const rawItems = isListMode ? (cfg.list_items || []) : (cfg.buttons || []);
  const prefix = isListMode ? "item" : "btn";

  return rawItems.map((item: any, index: number) => normalizeChoice(item, index, prefix));
};

const conditionNeedsUserInput = (conditionType?: string) => {
  return ["responded", "keyword_match", "button_clicked"].includes(conditionType || "responded");
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function WAFlowTestDialog({
  open,
  onOpenChange,
  flowName,
  nodes,
  edges,
  resetVersion,
}: WAFlowTestDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [awaitingNodeId, setAwaitingNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<RuntimeContext>(createRuntimeContext());
  const runVersionRef = useRef(0);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const edgesBySource = useMemo(() => {
    const grouped = new Map<string, Edge[]>();

    edges.forEach((edge) => {
      if (!grouped.has(edge.source)) grouped.set(edge.source, []);
      grouped.get(edge.source)!.push(edge);
    });

    return grouped;
  }, [edges]);

  const entryNodeId = useMemo(() => {
    return nodes.find((node) => node.type === "entry")?.id || nodes[0]?.id || null;
  }, [nodes]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRunning]);

  const appendMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...message }]);
  }, []);

  const getOutgoingEdges = useCallback((nodeId: string) => {
    return edgesBySource.get(nodeId) || [];
  }, [edgesBySource]);

  const getDefaultTarget = useCallback((nodeId: string) => {
    const edge = getOutgoingEdges(nodeId).find((item) => !item.sourceHandle) || getOutgoingEdges(nodeId)[0];
    return edge?.target || null;
  }, [getOutgoingEdges]);

  const getTargetByHandle = useCallback((nodeId: string, handleId?: string | null) => {
    const normalizedHandle = normalizeHandle(handleId);

    return (
      getOutgoingEdges(nodeId).find((edge) => normalizeHandle(edge.sourceHandle) === normalizedHandle)?.target || null
    );
  }, [getOutgoingEdges]);

  const getConditionTarget = useCallback((nodeId: string, result: boolean) => {
    const handle = result ? "yes" : "no";

    return (
      getOutgoingEdges(nodeId).find((edge) => edge.sourceHandle === handle)?.target ||
      getDefaultTarget(nodeId)
    );
  }, [getDefaultTarget, getOutgoingEdges]);

  const evaluateCondition = useCallback((config: any, runtime: RuntimeContext) => {
    const conditionType = config.condition_type || "responded";
    const rawValue = String(config.condition_value || "").trim();
    const normalizedValue = rawValue.toLowerCase();
    const normalizedText = runtime.lastUserText.toLowerCase();
    const normalizedButtonId = normalizeHandle(runtime.lastButtonId);
    const normalizedConditionHandle = normalizeHandle(rawValue);

    switch (conditionType) {
      case "button_clicked":
        return (
          (normalizedConditionHandle && normalizedConditionHandle === normalizedButtonId) ||
          (!!runtime.lastButtonTitle && runtime.lastButtonTitle.toLowerCase() === normalizedValue)
        );

      case "keyword_match": {
        const keywords = normalizedValue
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean);

        return keywords.length === 0 ? !!normalizedText : keywords.some((keyword) => normalizedText.includes(keyword));
      }

      case "responded":
        return !!runtime.lastUserText.trim();

      case "no_response":
        return !runtime.lastUserText.trim();

      case "field_equals":
        return !!normalizedValue && normalizedText.includes(normalizedValue);

      default:
        return false;
    }
  }, []);

  const formatMessageContent = useCallback((config: any) => {
    const messageType = config.message_type || "text";

    switch (messageType) {
      case "image":
        return config.caption ? `🖼️ ${config.caption}` : "🖼️ Imagem enviada";
      case "audio":
        return "🎧 Áudio enviado";
      case "video":
        return config.caption ? `🎬 ${config.caption}` : "🎬 Vídeo enviado";
      case "document":
        return `📄 ${config.filename || "Documento enviado"}`;
      case "template":
        return `📦 Template: ${config.template_name || "template_oficial"}`;
      default:
        return config.content || "Mensagem sem conteúdo";
    }
  }, []);

  const formatActionMessage = useCallback((config: any) => {
    switch (config.action_type) {
      case "add_tag":
        return `Ação simulada: adicionar tag \"${config.tag_value || "tag"}\"`;
      case "remove_tag":
        return `Ação simulada: remover tag \"${config.tag_value || "tag"}\"`;
      case "update_field":
        return `Ação simulada: atualizar ${config.field_name || "campo"} para \"${config.field_value || "valor"}\"`;
      case "move_pipeline":
        return `Ação simulada: mover lead para \"${config.pipeline_stage || "etapa"}\"`;
      case "webhook":
        return `Ação simulada: disparar webhook ${config.webhook_method || "POST"}`;
      case "mark_hot":
        return "Ação simulada: lead marcado como quente";
      case "mark_cold":
        return "Ação simulada: lead marcado como frio";
      case "mark_converted":
        return "Ação simulada: lead marcado como convertido";
      case "update_score":
        return `Ação simulada: score alterado em ${config.score_delta || 0} pontos`;
      default:
        return `Ação simulada: ${config.action_type || "ação personalizada"}`;
    }
  }, []);

  const formatWaitMessage = useCallback((config: any) => {
    const value = config.delay_value || 0;
    const unitMap: Record<string, string> = {
      minutes: value === 1 ? "minuto" : "minutos",
      hours: value === 1 ? "hora" : "horas",
      days: value === 1 ? "dia" : "dias",
    };

    return `Espera simulada: ${value} ${unitMap[config.delay_unit || "minutes"] || "minutos"}`;
  }, []);

  const formatButtonsContent = useCallback((node: Node) => {
    const config = getNodeConfig(node);
    return [config.header_text, config.body_text || "Escolha uma opção:", config.footer_text]
      .filter((value) => typeof value === "string" && value.trim())
      .join("\n\n");
  }, []);

  const formatAiMessage = useCallback((config: any, runtime: RuntimeContext) => {
    const userExcerpt = runtime.lastUserText.trim();

    if (config.ai_output_type === "route_only") return "";

    if (userExcerpt) {
      return `Entendi sua resposta${userExcerpt.length > 70 ? ":" : ` sobre \"${userExcerpt}\".`} Vou seguir com o próximo passo do atendimento.`;
    }

    return "Analisei sua mensagem e vou seguir com o próximo passo do atendimento.";
  }, []);

  const resetSimulation = useCallback(() => {
    runVersionRef.current += 1;
    runtimeRef.current = createRuntimeContext();
    setMessages([]);
    setInputText("");
    setAwaitingNodeId(null);
    setIsRunning(false);
  }, []);

  const advanceFromNode = useCallback(async (startNodeId: string | null, runVersion = runVersionRef.current) => {
    if (!startNodeId) return;

    let currentNodeId: string | null = startNodeId;
    let safetyCounter = 0;
    setIsRunning(true);

    while (currentNodeId && safetyCounter < 60 && runVersion === runVersionRef.current) {
      safetyCounter += 1;

      const node = nodeMap.get(currentNodeId);
      if (!node) break;

      const config = getNodeConfig(node);

      switch (node.type) {
        case "entry": {
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "message": {
          appendMessage({ direction: "sent", content: formatMessageContent(config) });
          await wait(180);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "buttons": {
          const choices = getInteractiveChoices(node);
          appendMessage({
            direction: "sent",
            content: formatButtonsContent(node),
            meta: config.interaction_type === "list" ? `Lista • ${choices.length} itens` : `Botões • ${choices.length} opções`,
            nodeId: node.id,
            choices,
            choicesMode: config.interaction_type === "list" ? "list" : "reply_buttons",
          });
          setAwaitingNodeId(node.id);
          currentNodeId = null;
          break;
        }

        case "condition": {
          if (conditionNeedsUserInput(config.condition_type) && !runtimeRef.current.hasFreshUserInput) {
            setAwaitingNodeId(node.id);
            currentNodeId = null;
            break;
          }

          const result = evaluateCondition(config, runtimeRef.current);
          runtimeRef.current.hasFreshUserInput = false;
          currentNodeId = getConditionTarget(node.id, result);

          if (!currentNodeId) {
            appendMessage({ direction: "event", content: `Condição sem saída configurada para ${result ? "SIM" : "NÃO"}.` });
          }
          break;
        }

        case "wait": {
          appendMessage({ direction: "event", content: formatWaitMessage(config) });
          await wait(160);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "action": {
          appendMessage({ direction: "event", content: formatActionMessage(config) });
          await wait(120);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "handoff": {
          if (config.handoff_message) {
            appendMessage({ direction: "sent", content: config.handoff_message });
          }
          appendMessage({ direction: "event", content: "Atendimento humano acionado na simulação." });
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "ai_agent": {
          if (!runtimeRef.current.hasFreshUserInput) {
            setAwaitingNodeId(node.id);
            currentNodeId = null;
            break;
          }

          runtimeRef.current.hasFreshUserInput = false;
          const aiMessage = formatAiMessage(config, runtimeRef.current);

          if (aiMessage) {
            appendMessage({ direction: "sent", content: aiMessage });
          }

          appendMessage({ direction: "event", content: "Agente de IA analisou a resposta e continuou o fluxo." });
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "end": {
          if (config.end_message) {
            appendMessage({ direction: "sent", content: config.end_message });
          }
          appendMessage({ direction: "event", content: "Fluxo finalizado." });
          currentNodeId = null;
          break;
        }

        default: {
          appendMessage({ direction: "event", content: `Bloco \"${String((node.data as any)?.label || node.type)}\" sem simulador específico.` });
          currentNodeId = getDefaultTarget(node.id);
          break;
        }
      }
    }

    if (safetyCounter >= 60) {
      appendMessage({ direction: "event", content: "O teste foi interrompido para evitar loop infinito." });
    }

    if (runVersion === runVersionRef.current) {
      setIsRunning(false);
    }
  }, [
    appendMessage,
    evaluateCondition,
    formatActionMessage,
    formatAiMessage,
    formatButtonsContent,
    formatMessageContent,
    formatWaitMessage,
    getConditionTarget,
    getDefaultTarget,
    nodeMap,
  ]);

  const bootstrapSimulation = useCallback(() => {
    resetSimulation();

    if (!entryNodeId) return;

    const nextRunVersion = runVersionRef.current + 1;
    runVersionRef.current = nextRunVersion;
    runtimeRef.current = createRuntimeContext();
    void advanceFromNode(entryNodeId, nextRunVersion);
  }, [advanceFromNode, entryNodeId, resetSimulation]);

  useEffect(() => {
    if (open) {
      bootstrapSimulation();
    }
  }, [open, resetVersion, bootstrapSimulation]);

  const consumeInteractiveReply = useCallback(async (nodeId: string, choice?: InteractiveChoice, rawText?: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const typedText = rawText?.trim() || "";
    const detectedChoice = choice || getInteractiveChoices(node).find((item) => {
      const normalizedTitle = item.title.toLowerCase();
      const normalizedTypedText = typedText.toLowerCase();
      return normalizedTitle === normalizedTypedText || normalizeHandle(item.id) === normalizeHandle(typedText);
    });

    const contentToDisplay = detectedChoice?.title || typedText;
    if (!contentToDisplay) return;

    appendMessage({ direction: "received", content: contentToDisplay });
    setInputText("");

    if (!detectedChoice) {
      appendMessage({ direction: "event", content: "Escolha uma das opções do bloco para continuar o teste." });
      return;
    }

    runtimeRef.current = {
      ...runtimeRef.current,
      lastUserText: contentToDisplay,
      lastButtonId: detectedChoice.id,
      lastButtonTitle: detectedChoice.title,
      hasFreshUserInput: true,
    };

    setAwaitingNodeId(null);
    const nextTarget = getTargetByHandle(nodeId, detectedChoice.id);

    if (!nextTarget) {
      appendMessage({ direction: "event", content: "Esta opção ainda não está conectada no fluxo." });
      return;
    }

    void advanceFromNode(nextTarget, runVersionRef.current);
  }, [advanceFromNode, appendMessage, getTargetByHandle, nodeMap]);

  const consumeTextReply = useCallback(async (nodeId: string, rawText: string) => {
    const typedText = rawText.trim();
    if (!typedText) return;

    appendMessage({ direction: "received", content: typedText });
    setInputText("");
    setAwaitingNodeId(null);

    runtimeRef.current = {
      ...runtimeRef.current,
      lastUserText: typedText,
      lastButtonId: null,
      lastButtonTitle: null,
      hasFreshUserInput: true,
    };

    void advanceFromNode(nodeId, runVersionRef.current);
  }, [advanceFromNode, appendMessage]);

  const handleSend = useCallback(() => {
    const typedText = inputText.trim();
    if (!typedText) return;

    if (!awaitingNodeId) {
      appendMessage({ direction: "event", content: "O fluxo não está aguardando resposta agora. Use resetar para reiniciar o teste." });
      setInputText("");
      return;
    }

    const node = nodeMap.get(awaitingNodeId);
    if (!node) return;

    if (node.type === "buttons") {
      void consumeInteractiveReply(awaitingNodeId, undefined, typedText);
      return;
    }

    void consumeTextReply(awaitingNodeId, typedText);
  }, [appendMessage, awaitingNodeId, consumeInteractiveReply, consumeTextReply, inputText, nodeMap]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const hasFlow = nodes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 h-[86vh] max-h-[780px] flex flex-col overflow-hidden border-border focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card pr-12">
          <DialogHeader className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">Testar fluxo</DialogTitle>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    Simulação
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {flowName || "Fluxo sem nome"} • o chat segue a lógica montada no canvas
                </p>
              </div>
            </div>
          </DialogHeader>

          <Button variant="ghost" size="sm" onClick={bootstrapSimulation} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Resetar
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-background space-y-3">
          {!hasFlow && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-70">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sem blocos para testar</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione nós no canvas para iniciar a simulação.</p>
              </div>
            </div>
          )}

          {hasFlow && messages.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-70">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pronto para testar</p>
                <p className="text-xs text-muted-foreground mt-1">Abra o fluxo e interaja como se fosse um lead.</p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.direction === "event") {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="px-3 py-2 rounded-full bg-muted text-muted-foreground text-xs border border-border">
                    {message.content}
                  </div>
                </div>
              );
            }

            if (message.direction === "received") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[82%] flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap border border-border/60 min-w-[220px]">
                    {message.meta && (
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{message.meta}</p>
                    )}
                    <p>{message.content}</p>

                    {message.choices && message.choices.length > 0 && (
                      <div className={cn("mt-3", message.choicesMode === "list" ? "space-y-2" : "flex flex-wrap gap-2") }>
                        {message.choices.map((choice) => (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => message.nodeId && consumeInteractiveReply(message.nodeId, choice)}
                            disabled={!message.nodeId || awaitingNodeId !== message.nodeId || isRunning}
                            className={cn(
                              "rounded-xl border border-border bg-background text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                              message.choicesMode === "list"
                                ? "w-full px-3 py-2 hover:bg-accent"
                                : "px-3 py-2 hover:bg-accent"
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">{choice.title}</p>
                            {choice.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{choice.description}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isRunning && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md border border-border/60">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-card">
          {awaitingNodeId ? (
            <p className="text-xs text-muted-foreground mb-2 text-center">
              O fluxo está aguardando sua próxima mensagem para seguir as regras.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {hasFlow ? "Quando o fluxo pausar, você poderá responder aqui." : "Monte o fluxo primeiro para testar."}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={awaitingNodeId ? "Digite como se fosse o lead..." : "Aguardando o fluxo pedir uma resposta..."}
              disabled={!hasFlow}
              className="flex-1 h-10"
            />
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend} disabled={!inputText.trim() || !hasFlow}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}