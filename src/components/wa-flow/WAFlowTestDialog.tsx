import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot, FlaskConical, List, Loader2, RotateCcw, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  variables: Record<string, string>;
}

const createRuntimeContext = (): RuntimeContext => ({
  lastUserText: "",
  lastButtonId: null,
  lastButtonTitle: null,
  hasFreshUserInput: false,
  variables: {},
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
  // Conditions that require fresh user input before being evaluated.
  // "no_response" also waits, but is resolved by timeout (here we treat it as needing input too,
  // so the test simulator pauses and lets the tester decide whether to reply or not).
  return ["responded", "keyword_match", "button_clicked", "field_equals", "no_response"].includes(
    conditionType || "responded"
  );
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Replace {{variable}} placeholders with saved values */
const interpolateVariables = (text: string, variables: Record<string, string>): string => {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
  });
};

export function WAFlowTestDialog({
  open,
  onOpenChange,
  flowName,
  nodes,
  edges,
  resetVersion,
}: WAFlowTestDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [awaitingNodeId, setAwaitingNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [listPopup, setListPopup] = useState<{ nodeId: string; choices: InteractiveChoice[]; title: string } | null>(null);
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
    // IMPORTANT: do NOT fall back to a default/first edge when the matching branch
    // is not connected. Otherwise a "Não" result could silently jump into the "Sim"
    // branch (and vice-versa), making the condition appear to "advance" without input.
    return (
      getOutgoingEdges(nodeId).find((edge) => edge.sourceHandle === handle)?.target || null
    );
  }, [getOutgoingEdges]);

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
        const keywords = normalizedValue.split(",").map((k) => k.trim()).filter(Boolean);
        return keywords.length === 0 ? !!normalizedText : keywords.some((k) => normalizedText.includes(k));
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

  const formatMessageContent = useCallback((config: any, variables: Record<string, string>) => {
    const messageType = config.message_type || "text";
    switch (messageType) {
      case "image":
        return config.caption ? `🖼️ ${interpolateVariables(config.caption, variables)}` : "🖼️ Imagem enviada";
      case "audio":
        return "🎧 Áudio enviado";
      case "video":
        return config.caption ? `🎬 ${interpolateVariables(config.caption, variables)}` : "🎬 Vídeo enviado";
      case "document":
        return `📄 ${config.filename || "Documento enviado"}`;
      case "template":
        return `📦 Template: ${config.template_name || "template_oficial"}`;
      default:
        return interpolateVariables(config.content || "Mensagem sem conteúdo", variables);
    }
  }, []);

  const formatActionMessage = useCallback((config: any) => {
    const actions = config.actions || [];
    if (actions.length > 0) {
      return actions.map((a: any) => {
        switch (a.type) {
          case "add_tag": return `✅ Tag "${a.value || "tag"}" adicionada`;
          case "remove_tag": return `❌ Tag "${a.value || "tag"}" removida`;
          case "move_kanban": return `📋 Lead movido para "${a.stage_name || a.value || "etapa"}"`;
          case "update_lead": return `📝 Lead atualizado`;
          default: return `⚡ ${a.type || "ação"}`;
        }
      }).join("\n");
    }
    switch (config.action_type) {
      case "add_tag": return `Ação: adicionar tag "${config.tag_value || "tag"}"`;
      case "remove_tag": return `Ação: remover tag "${config.tag_value || "tag"}"`;
      case "move_pipeline": return `Ação: mover lead para "${config.pipeline_stage || "etapa"}"`;
      case "webhook": return `Ação: disparar webhook ${config.webhook_method || "POST"}`;
      default: return `Ação: ${config.action_type || "ação personalizada"}`;
    }
  }, []);

  const formatWaitMessage = useCallback((config: any) => {
    const value = config.delay_value || 0;
    const unitMap: Record<string, string> = {
      minutes: value === 1 ? "minuto" : "minutos",
      hours: value === 1 ? "hora" : "horas",
      days: value === 1 ? "dia" : "dias",
    };
    return `⏳ Espera simulada: ${value} ${unitMap[config.delay_unit || "minutes"] || "minutos"}`;
  }, []);

  const formatButtonsContent = useCallback((node: Node, variables: Record<string, string>) => {
    const config = getNodeConfig(node);
    return [config.header_text, config.body_text || "Escolha uma opção:", config.footer_text]
      .filter((v) => typeof v === "string" && v.trim())
      .map((t) => interpolateVariables(t, variables))
      .join("\n\n");
  }, []);

  const formatAiMessage = useCallback((config: any, runtime: RuntimeContext) => {
    const userExcerpt = runtime.lastUserText.trim();
    if (config.ai_output_type === "route_only") return "";
    if (userExcerpt) {
      return `Entendi sua resposta${userExcerpt.length > 70 ? ":" : ` sobre "${userExcerpt}".`} Vou seguir com o próximo passo do atendimento.`;
    }
    return "Analisei sua mensagem e vou seguir com o próximo passo do atendimento.";
  }, []);

  // ── Integration executors ──

  const executeGoogleSheets = useCallback(async (config: any, variables: Record<string, string>) => {
    if (!user?.id || !config.spreadsheet_id || !config.google_connected) {
      return { success: false, error: "Google Sheets não configurado" };
    }
    const columns = config.columns || [];
    const row = columns.map((col: any) => {
      const val = col.variable ? (variables[col.variable] || "") : "";
      return interpolateVariables(val || col.default_value || "", variables);
    });

    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-action", {
        body: {
          user_id: user.id,
          spreadsheet_id: config.spreadsheet_id,
          sheet_name: config.sheet_name || "Dados",
          data: [row],
        },
      });
      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, error: data.error };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  const executeGoogleCalendar = useCallback(async (config: any, variables: Record<string, string>) => {
    if (!user?.id || !config.google_connected) {
      return { success: false, error: "Google Calendar não configurado" };
    }

    const summary = interpolateVariables(config.event_title || "Evento do fluxo", variables);
    const description = interpolateVariables(config.event_description || "", variables);
    const attendeeEmail = config.invite_attendee ? interpolateVariables(config.attendee_email || "", variables) : undefined;

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-action", {
        body: {
          user_id: user.id,
          summary,
          description,
          start_datetime: config.event_start || new Date().toISOString(),
          duration_minutes: config.event_duration || 30,
          attendee_email: attendeeEmail,
        },
      });
      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, error: data.error };
      return { success: true, eventLink: data?.htmlLink };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  const executeGmail = useCallback(async (config: any, variables: Record<string, string>) => {
    if (!user?.id || !config.google_connected) {
      return { success: false, error: "Gmail não configurado" };
    }

    const to = interpolateVariables(config.to_email || "", variables);
    const subject = interpolateVariables(config.subject || "", variables);
    const bodyField = config.use_html ? "body_html" : "body_text";
    const bodyContent = interpolateVariables(config.body || "", variables);

    try {
      const { data, error } = await supabase.functions.invoke("gmail-send-action", {
        body: {
          user_id: user.id,
          to,
          subject,
          cc: config.cc || [],
          bcc: config.bcc || [],
          [bodyField]: bodyContent,
        },
      });
      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, error: data.error };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  // ── Reset ──

  const resetSimulation = useCallback(() => {
    runVersionRef.current += 1;
    runtimeRef.current = createRuntimeContext();
    setMessages([]);
    setInputText("");
    setAwaitingNodeId(null);
    setIsRunning(false);
  }, []);

  // ── Main advance loop ──

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
      const vars = runtimeRef.current.variables;

      switch (node.type) {
        case "entry": {
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "message": {
          appendMessage({ direction: "sent", content: formatMessageContent(config, vars) });
          await wait(180);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "buttons": {
          const choices = getInteractiveChoices(node);
          appendMessage({
            direction: "sent",
            content: formatButtonsContent(node, vars),
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
          const needsInput = conditionNeedsUserInput(config.condition_type);
          if (needsInput && !runtimeRef.current.hasFreshUserInput) {
            const hint =
              config.condition_type === "keyword_match"
                ? `⌨️ Aguardando resposta do lead (palavras-chave: ${config.condition_value || "(não configurado)"})`
                : config.condition_type === "button_clicked"
                ? "⌨️ Aguardando o lead clicar em um botão"
                : config.condition_type === "no_response"
                ? "⌨️ Aguardando resposta (digite algo ou clique em resetar para simular o timeout)"
                : "⌨️ Aguardando resposta do lead para avaliar a condição";
            appendMessage({ direction: "event", content: hint, nodeId: node.id });
            setAwaitingNodeId(node.id);
            currentNodeId = null;
            break;
          }
          const result = evaluateCondition(config, runtimeRef.current);
          // Consume the fresh input so a single reply doesn't satisfy multiple conditions in a row.
          runtimeRef.current.hasFreshUserInput = false;
          const branch = result ? "Sim" : "Não";
          appendMessage({ direction: "event", content: `🔀 Condição avaliada: ${branch}`, nodeId: node.id });
          currentNodeId = getConditionTarget(node.id, result);
          if (!currentNodeId) {
            appendMessage({
              direction: "event",
              content: `⚠️ A saída "${branch}" da condição não está conectada — fluxo encerrado neste ponto.`,
            });
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
            appendMessage({ direction: "sent", content: interpolateVariables(config.handoff_message, vars) });
          }
          appendMessage({ direction: "event", content: "👤 Atendimento humano acionado." });
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
          appendMessage({ direction: "event", content: "🤖 Agente de IA analisou a resposta e continuou o fluxo." });
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        // ── Data Collect: asks for data, saves as variable ──
        case "data_collect": {
          const varName = config.variable_name || "dado";
          const collectLabels: Record<string, string> = {
            name: "seu nome", email: "seu email", phone: "seu telefone",
            cpf: "seu CPF", address: "seu endereço", custom: varName,
          };
          const prompt = config.prompt_message
            ? interpolateVariables(config.prompt_message, vars)
            : `Por favor, informe ${collectLabels[config.collect_type] || varName}:`;

          appendMessage({ direction: "sent", content: prompt });
          setAwaitingNodeId(node.id);
          currentNodeId = null;
          break;
        }

        // ── A/B Test: randomly picks a variant ──
        case "ab_test": {
          const variants: { id: string; name: string; weight: number }[] = config.variants || [];
          if (variants.length === 0) {
            appendMessage({ direction: "event", content: "⚠️ Teste A/B sem variantes configuradas." });
            currentNodeId = null;
            break;
          }
          const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
          let rand = Math.random() * totalWeight;
          let chosen = variants[0];
          for (const v of variants) {
            rand -= (v.weight || 1);
            if (rand <= 0) { chosen = v; break; }
          }
          appendMessage({ direction: "event", content: `🧪 Teste A/B: variante "${chosen.name}" selecionada aleatoriamente.` });
          const target = getTargetByHandle(node.id, chosen.id);
          currentNodeId = target;
          if (!target) {
            appendMessage({ direction: "event", content: `⚠️ Variante "${chosen.name}" não tem saída conectada.` });
          }
          break;
        }

        // ── Random Split: randomly picks an output ──
        case "random_split": {
          const outputs: { id: string; name: string }[] = config.outputs || [
            { id: "out_0", name: "Saída 1" }, { id: "out_1", name: "Saída 2" },
          ];
          const chosen = outputs[Math.floor(Math.random() * outputs.length)];
          appendMessage({ direction: "event", content: `🔀 Random Split: "${chosen.name}" selecionada.` });
          const target = getTargetByHandle(node.id, chosen.id);
          currentNodeId = target;
          if (!target) {
            appendMessage({ direction: "event", content: `⚠️ Saída "${chosen.name}" não tem conexão.` });
          }
          break;
        }

        // ── Google Sheets: real call ──
        case "google_sheets": {
          appendMessage({ direction: "event", content: "📊 Enviando dados para Google Sheets..." });
          const result = await executeGoogleSheets(config, vars);
          if (result.success) {
            appendMessage({ direction: "event", content: "✅ Dados salvos na planilha com sucesso!" });
          } else {
            appendMessage({ direction: "event", content: `❌ Erro ao salvar na planilha: ${result.error}` });
          }
          await wait(200);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        // ── Google Calendar: real call ──
        case "google_calendar": {
          appendMessage({ direction: "event", content: "📅 Criando evento no Google Agenda..." });
          const result = await executeGoogleCalendar(config, vars);
          if (result.success) {
            appendMessage({ direction: "event", content: `✅ Evento criado com sucesso!${result.eventLink ? ` 🔗` : ""}` });
          } else {
            appendMessage({ direction: "event", content: `❌ Erro ao criar evento: ${result.error}` });
          }
          await wait(200);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        // ── Gmail: real call ──
        case "gmail": {
          appendMessage({ direction: "event", content: "📧 Enviando email via Gmail..." });
          const result = await executeGmail(config, vars);
          if (result.success) {
            appendMessage({ direction: "event", content: "✅ Email enviado com sucesso!" });
          } else {
            appendMessage({ direction: "event", content: `❌ Erro ao enviar email: ${result.error}` });
          }
          await wait(200);
          currentNodeId = getDefaultTarget(node.id);
          break;
        }

        case "end": {
          if (config.end_message) {
            appendMessage({ direction: "sent", content: interpolateVariables(config.end_message, vars) });
          }
          appendMessage({ direction: "event", content: "🏁 Fluxo finalizado." });
          currentNodeId = null;
          break;
        }

        default: {
          appendMessage({ direction: "event", content: `Bloco "${String((node.data as any)?.label || node.type)}" executado.` });
          currentNodeId = getDefaultTarget(node.id);
          break;
        }
      }
    }

    if (safetyCounter >= 60) {
      appendMessage({ direction: "event", content: "⚠️ O teste foi interrompido para evitar loop infinito." });
    }

    if (runVersion === runVersionRef.current) {
      setIsRunning(false);
    }
  }, [
    appendMessage, evaluateCondition, formatActionMessage, formatAiMessage,
    formatButtonsContent, formatMessageContent, formatWaitMessage,
    getConditionTarget, getDefaultTarget, getTargetByHandle, nodeMap,
    executeGoogleSheets, executeGoogleCalendar, executeGmail,
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

    // If this is a data_collect node, save the variable
    const node = nodeMap.get(nodeId);
    if (node?.type === "data_collect") {
      const config = getNodeConfig(node);
      const varName = config.variable_name || "dado";
      runtimeRef.current.variables[varName] = typedText;
      appendMessage({ direction: "event", content: `💾 Variável {{${varName}}} = "${typedText}"` });
    }

    runtimeRef.current = {
      ...runtimeRef.current,
      lastUserText: typedText,
      lastButtonId: null,
      lastButtonTitle: null,
      hasFreshUserInput: true,
    };

    // For data_collect, advance to the next node
    if (node?.type === "data_collect") {
      void advanceFromNode(getDefaultTarget(nodeId), runVersionRef.current);
    } else {
      void advanceFromNode(nodeId, runVersionRef.current);
    }
  }, [advanceFromNode, appendMessage, getDefaultTarget, nodeMap]);

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
  const savedVars = runtimeRef.current.variables;
  const varCount = Object.keys(savedVars).length;

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
                  <Badge variant="outline" className="text-[10px] font-medium">Simulação</Badge>
                  {varCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-medium">{varCount} variáveis</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {flowName || "Fluxo sem nome"} • integrações reais ativas no teste
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
                  <div className="px-3 py-2 rounded-full bg-muted text-muted-foreground text-xs border border-border max-w-[90%] text-center">
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
                  <div className="min-w-[220px]">
                    <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap border border-border/60">
                      {message.meta && (
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{message.meta}</p>
                      )}
                      <p>{message.content}</p>
                    </div>
                    {message.choices && message.choices.length > 0 && message.choicesMode === "list" && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => message.nodeId && setListPopup({ nodeId: message.nodeId, choices: message.choices!, title: getNodeConfig(nodeMap.get(message.nodeId))?.header_text || "Opções" })}
                          disabled={!message.nodeId || awaitingNodeId !== message.nodeId || isRunning}
                          className="w-full rounded-xl border border-border bg-card text-foreground text-center py-2.5 px-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted flex items-center justify-center gap-2"
                        >
                          <List className="h-4 w-4" />
                          Ver opções
                        </button>
                      </div>
                    )}
                    {message.choices && message.choices.length > 0 && message.choicesMode !== "list" && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {message.choices.map((choice) => (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => message.nodeId && consumeInteractiveReply(message.nodeId, choice)}
                            disabled={!message.nodeId || awaitingNodeId !== message.nodeId || isRunning}
                            className="group/btn relative rounded-xl border border-primary/30 bg-primary text-primary-foreground text-left px-3 py-2 transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_4px_16px_hsl(var(--primary)_/_0.35)]"
                          >
                            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
                            <p className="text-sm font-medium relative z-10">{choice.title}</p>
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

        {listPopup && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-md bg-card rounded-t-2xl border-t border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[60%] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">{listPopup.title}</h3>
                <button type="button" onClick={() => setListPopup(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {listPopup.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => {
                      consumeInteractiveReply(listPopup.nodeId, choice);
                      setListPopup(null);
                    }}
                    disabled={awaitingNodeId !== listPopup.nodeId || isRunning}
                    className="group/item w-full text-left rounded-xl px-4 py-3 transition-all hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-medium text-foreground">{choice.title}</p>
                    {choice.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{choice.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
