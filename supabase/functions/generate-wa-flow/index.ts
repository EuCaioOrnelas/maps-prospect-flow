import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_NODE_TYPES = ["entry", "message", "buttons", "condition", "wait", "action", "ai_agent", "handoff", "end"] as const;
const OPENAI_MODEL = "gpt-4o";
const MAX_NODES = 25;
const MAX_GENERATION_ATTEMPTS = 2;

const SYSTEM_PROMPT = `Você é um arquiteto expert em fluxos conversacionais para WhatsApp Business.
Sua missão é transformar o pedido do usuário em um fluxo EXECUTÁVEL no editor, com nós preenchidos, conexões corretas e conteúdo real dentro dos cards.

=== OBJETIVO PRINCIPAL ===
1. O fluxo precisa ficar editável e útil imediatamente após a criação.
2. NUNCA deixe config vazio, exceto no nó end.
3. Gere apenas blocos que façam sentido visual e operacionalmente.
4. Quando o prompt do usuário parecer um prompt interno de agente, SOP, playbook, manual, instrução operacional, estados de IA ou regras de atendimento, NÃO crie um nó para cada etapa abstrata. Nesse caso, compacte essas regras dentro de UM nó ai_agent com system_prompt robusto, e ao redor dele crie apenas os blocos conversacionais concretos.

=== TIPOS DE NÓS PERMITIDOS ===
entry, message, buttons, condition, wait, action, ai_agent, handoff, end

=== REGRAS OBRIGATÓRIAS ===
1. SEMPRE comece com um nó entry.
2. TODO caminho precisa terminar em end ou handoff.
3. MÁXIMO 25 nós.
4. Botões conectam DIRETAMENTE ao próximo nó. NUNCA coloque condition imediatamente após buttons para verificar clique. Isso é proibido.
5. Use condition apenas para lógica real como respondeu / não respondeu / palavra-chave / tag / campo.
6. Use action APENAS para ações reais de CRM/sistema. Nunca use action para representar etapas abstratas como “diagnóstico”, “coletar dados”, “sugerir solução” ou “aguardar resposta”.
7. Se o usuário descreveu um agente inteligente complexo, prefira: entry → message(saudação) → ai_agent(system_prompt completo) → message/botões/condition/wait/handoff/end.
8. Sempre que houver risco de atendimento travar, inclua continuidade útil: follow-up com wait, handoff, ou encerramento claro.
9. Para suporte, atendimento, triagem ou casos ambíguos, inclua handoff em algum ponto útil.
10. message precisa ter texto real em config.content e também em config.body_text.
11. buttons precisa ter body_text real e opções reais em buttons ou list_items.
12. ai_agent precisa ter system_prompt real, ai_model e ai_output_type.
13. handoff deve ter handoff_message.
14. action deve ter action_type e detalhes coerentes.
15. Não use labels abstratos como se fossem blocos executáveis. Ex.: “Classificação”, “Diagnóstico”, “Coletar dados”, “Sugerir solução” devem virar conteúdo de message ou instruções do ai_agent, não nós action vazios.

=== PADRÕES RECOMENDADOS ===
SUPORTE/ATENDIMENTO COMPLEXO:
entry → message(saudação) → ai_agent(prompt completo) → condition(responded ou keyword, se necessário) → wait(follow-up, se necessário) → handoff ou end

VENDAS COM MENU:
entry → message(saudação) → buttons(menu) → cada botão vai para um message/action/handoff/end útil

QUALIFICAÇÃO:
entry → message(pergunta) → wait → condition(responded?) → yes: action útil ou handoff / no: message follow-up → handoff ou end

=== REGRAS DE CONTEÚDO ===
- As mensagens devem soar humanas, curtas, úteis e prontas para uso.
- Os botões devem ter títulos concretos e curtos.
- Se houver follow-up, a mensagem deve ser coerente com a espera anterior.
- Se houver encerramento, escreva uma mensagem final adequada quando fizer sentido.
- Se houver handoff, escreva a mensagem que o lead verá ao ser transferido.

=== POSICIONAMENTO ===
- Layout esquerda para direita
- Entry em x:0, y:300
- Próxima coluna: +300 em X
- Separe ramificações em pelo menos 180 de Y
- Nós nunca podem sobrepor
`;

const FLOW_NODE_CONFIG_PROPERTIES = {
  trigger_type: {
    type: "string",
    enum: ["first_message", "keyword", "campaign_reply", "button_click", "webhook", "qr_code", "re_entry", "template_reply"],
    description: "Tipo de gatilho do nó entry",
  },
  keywords: {
    type: "array",
    items: { type: "string" },
    description: "Palavras-chave do entry quando trigger_type for keyword",
  },
  whatsapp_number_name: { type: "string" },
  api_type: { type: "string", enum: ["meta", "evolution"] },
  message_type: {
    type: "string",
    enum: ["text", "image", "audio", "video", "document", "template"],
    description: "Tipo do nó message",
  },
  content: {
    type: "string",
    description: "Texto principal da mensagem. Para message text, é obrigatório.",
  },
  body_text: {
    type: "string",
    description: "Texto espelhado da mensagem ou do bloco interativo. Em message text, repita o conteúdo aqui também.",
  },
  preview_url: { type: "boolean" },
  media_url: { type: "string" },
  caption: { type: "string" },
  filename: { type: "string" },
  template_name: { type: "string" },
  template_language: { type: "string" },
  template_variables: { type: "string" },
  template_header_url: { type: "string" },
  interaction_type: {
    type: "string",
    enum: ["reply_buttons", "list"],
    description: "Tipo do bloco buttons",
  },
  header_text: { type: "string" },
  footer_text: { type: "string" },
  buttons: {
    type: "array",
    description: "Botões de resposta rápida",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
      },
      required: ["id", "title"],
    },
  },
  list_items: {
    type: "array",
    description: "Itens da lista interativa",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["id", "title"],
    },
  },
  list_button_text: { type: "string" },
  condition_type: {
    type: "string",
    enum: ["button_clicked", "keyword_match", "has_tag", "field_equals", "responded", "no_response", "score_above", "is_customer", "pipeline_stage"],
  },
  condition_value: { type: "string" },
  timeout_minutes: { type: "number" },
  field_name: { type: "string" },
  delay_value: { type: "number" },
  delay_unit: {
    type: "string",
    enum: ["minutes", "hours", "days"],
  },
  smart: { type: "boolean" },
  business_hours_only: { type: "boolean" },
  bh_start: { type: "string" },
  bh_end: { type: "string" },
  action_type: {
    type: "string",
    enum: ["add_tag", "remove_tag", "update_field", "move_pipeline", "send_to_crm", "webhook", "mark_hot", "mark_cold", "mark_converted", "update_score"],
  },
  tag_value: { type: "string" },
  field_value: { type: "string" },
  pipeline_stage: { type: "string" },
  webhook_url: { type: "string" },
  webhook_method: {
    type: "string",
    enum: ["POST", "GET", "PUT"],
  },
  webhook_headers: { type: "string" },
  score_delta: { type: "number" },
  stop_automation: { type: "boolean" },
  notify_team: { type: "boolean" },
  notification_message: { type: "string" },
  handoff_message: { type: "string" },
  end_message: { type: "string" },
  mark_completed: { type: "boolean" },
  system_prompt: { type: "string" },
  ai_model: {
    type: "string",
    enum: ["gpt-4o-mini", "gpt-4o", "gemini-2.5-flash"],
  },
  ai_output_type: {
    type: "string",
    enum: ["message_only", "route_only", "message_and_route"],
  },
  ai_routes: { type: "string" },
  ai_context: { type: "string" },
};

const FLOW_TOOL = {
  type: "function",
  function: {
    name: "create_whatsapp_flow",
    description: "Cria um fluxo conversacional completo para WhatsApp com nós e conexões já prontas para editar no builder. Cada nó deve vir com config preenchido de forma real e útil.",
    parameters: {
      type: "object",
      properties: {
        flow_name: {
          type: "string",
          description: "Nome descritivo do fluxo",
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID único como node_1, node_2" },
              type: { type: "string", enum: [...VALID_NODE_TYPES] },
              label: { type: "string", description: "Nome visível do nó no editor" },
              position_x: { type: "number" },
              position_y: { type: "number" },
              config: {
                type: "object",
                properties: FLOW_NODE_CONFIG_PROPERTIES,
                description: `Config preenchido conforme o tipo do nó.
Regras:
- entry: usar trigger_type e keywords quando necessário
- message: preencher message_type e texto real em content; para texto, repetir também em body_text
- buttons: preencher interaction_type, body_text e buttons/list_items reais
- condition: preencher condition_type e condition_value quando aplicável
- wait: preencher delay_value e delay_unit
- action: preencher action_type e seus detalhes reais
- ai_agent: preencher system_prompt completo, ai_model e ai_output_type
- handoff: preencher handoff_message
- end: pode ser {} ou conter end_message`,
              },
            },
            required: ["id", "type", "label", "position_x", "position_y", "config"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              source_handle: { type: "string", description: "btn_0, btn_1, item_0, yes, no ou null" },
              target_handle: { type: "string" },
            },
            required: ["source", "target"],
          },
        },
      },
      required: ["flow_name", "nodes", "edges"],
    },
  },
};

type FlowNodeDraft = {
  id: string;
  type: string;
  label: string;
  position_x: number;
  position_y: number;
  config: Record<string, any>;
};

type FlowEdgeDraft = {
  source: string;
  target: string;
  source_handle?: string | null;
  target_handle?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type FlowDraft = {
  flow_name?: string;
  nodes?: FlowNodeDraft[];
  edges?: FlowEdgeDraft[];
};

const normalizeHandle = (value?: string | null) => {
  if (!value) return null;
  if (/^(btn|item)-\d+$/i.test(value)) return value.replace("-", "_");
  return value;
};

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const truncateText = (value: string, max = 160) => {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

const unique = <T>(items: T[]) => Array.from(new Set(items));

const normalizeButtonsConfig = (config: any = {}) => {
  const nodeConfig = { ...config };

  if (!nodeConfig.interaction_type || nodeConfig.interaction_type === "buttons") {
    nodeConfig.interaction_type = "reply_buttons";
  }

  nodeConfig.header_text = normalizeText(nodeConfig.header_text || nodeConfig.header);
  nodeConfig.footer_text = normalizeText(nodeConfig.footer_text || nodeConfig.footer);

  if (nodeConfig.interaction_type === "list") {
    const rawItems = Array.isArray(nodeConfig.list_items)
      ? nodeConfig.list_items
      : Array.isArray(nodeConfig.items)
        ? nodeConfig.items
        : [];

    nodeConfig.list_items = rawItems.map((item: any, i: number) => ({
      id: normalizeHandle(item?.id) || `item_${i}`,
      title: truncateText(typeof item === "string" ? item : item?.title || `Item ${i + 1}`, 24),
      description: truncateText(item?.description || "", 72),
    }));
    nodeConfig.list_button_text = normalizeText(nodeConfig.list_button_text) || "Ver opções";
    delete nodeConfig.buttons;
  } else {
    nodeConfig.interaction_type = "reply_buttons";
    const rawButtons = Array.isArray(nodeConfig.buttons)
      ? nodeConfig.buttons
      : Array.isArray(nodeConfig.options)
        ? nodeConfig.options
        : [];

    nodeConfig.buttons = rawButtons.map((btn: any, i: number) => ({
      id: normalizeHandle(btn?.id) || `btn_${i}`,
      title: truncateText(typeof btn === "string" ? btn : btn?.title || `Opção ${i + 1}`, 20),
    }));
    delete nodeConfig.list_items;
  }

  delete nodeConfig.header;
  delete nodeConfig.footer;
  delete nodeConfig.items;
  delete nodeConfig.options;

  return nodeConfig;
};

const slugifyTag = (value: string) =>
  normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "etapa_fluxo";

const sortInteractiveHandle = (a: string, b: string) => {
  const [prefixA, indexA] = a.split("_");
  const [prefixB, indexB] = b.split("_");
  if (prefixA === prefixB) return Number(indexA || 0) - Number(indexB || 0);
  return a.localeCompare(b);
};

const looksLikeAgentPlaybook = (prompt: string) =>
  /papel do modelo|regras|estados do fluxo|classifica[cç][aã]o|diagn[oó]stico|resolu[cç][aã]o|escalar_atendimento|aguardar_resposta_usuario|coletar_dados|sugerir_solucao/i.test(prompt);

const inferMessageText = (label: string, prompt: string) => {
  const normalizedLabel = normalizeText(label).toLowerCase();
  const normalizedPrompt = prompt.toLowerCase();

  if (/sauda|boas-vindas|in[ií]cio/.test(normalizedLabel)) {
    return "Olá! 👋 Seja bem-vindo(a). Me conte em poucas palavras como posso te ajudar hoje.";
  }

  if (/diagn[oó]st|triagem|classifica/.test(normalizedLabel)) {
    return "Entendi. Para te direcionar corretamente, descreva em uma frase o que aconteceu ou qual é a sua dúvida.";
  }

  if (/confirma/.test(normalizedLabel) && /resolu|solu/.test(normalizedLabel)) {
    return "Consegui te ajudar com isso ou você ainda precisa de suporte humano?";
  }

  if (/escalon|humano|transfer/.test(normalizedLabel)) {
    return "Vou encaminhar seu atendimento para um especialista humano e ele continuará com você em instantes.";
  }

  if (/aguard/.test(normalizedLabel)) {
    return "Fico aguardando sua resposta para continuar o atendimento.";
  }

  if (/follow|retorno|lembrete/.test(normalizedLabel)) {
    return "Passando para confirmar se você ainda precisa de ajuda. Se quiser, posso continuar por aqui agora.";
  }

  if (/suporte|ajuda|problema/.test(normalizedPrompt)) {
    return "Estou aqui para ajudar. Me explique rapidamente o problema para eu analisar a melhor solução.";
  }

  if (/venda|proposta|or[cç]amento|comprar/.test(normalizedPrompt)) {
    return "Perfeito! Para te orientar melhor, me diga seu objetivo principal e a faixa de investimento ideal.";
  }

  const fallback = normalizeText(label).replace(/[_-]+/g, " ");
  if (!fallback) return "Mensagem automática pronta para uso.";
  return /[.!?]$/.test(fallback) ? fallback : `${fallback}.`;
};

const inferButtonsBodyText = (label: string, prompt: string) => {
  const normalizedLabel = normalizeText(label).toLowerCase();
  const normalizedPrompt = prompt.toLowerCase();

  if (/menu|op[cç][aã]o|escolha/.test(normalizedLabel)) return "Escolha uma opção abaixo para continuar:";
  if (/suporte|ajuda|problema/.test(normalizedPrompt)) return "Para te direcionar mais rápido, escolha o tipo de assunto:";
  if (/venda|comprar|proposta|or[cç]amento/.test(normalizedPrompt)) return "Qual dessas opções faz mais sentido para você agora?";
  return "Escolha uma opção abaixo:";
};

const inferHandoffMessage = (prompt: string) => {
  if (/suporte|problema|ajuda|erro/.test(prompt.toLowerCase())) {
    return "Vou transferir seu atendimento para um especialista humano para continuar com você, tudo bem?";
  }
  return "Vou te encaminhar para um atendente humano para seguir com o atendimento.";
};

const inferConditionType = (label: string, existingType: string) => {
  if (existingType) return existingType;
  const normalizedLabel = normalizeText(label).toLowerCase();
  if (/bot[aã]o|op[cç][aã]o|menu/.test(normalizedLabel)) return "button_clicked";
  if (/sem resposta|n[aã]o respondeu|timeout/.test(normalizedLabel)) return "no_response";
  if (/palavra|keyword|chave/.test(normalizedLabel)) return "keyword_match";
  if (/tag/.test(normalizedLabel)) return "has_tag";
  if (/campo|valor/.test(normalizedLabel)) return "field_equals";
  return "responded";
};

const inferActionConfig = (label: string, prompt: string, config: Record<string, any>) => {
  if (normalizeText(config.action_type)) return config;

  const basis = `${label} ${prompt}`.toLowerCase();

  if (/quente|hot|prioridade/.test(basis)) {
    return { ...config, action_type: "mark_hot" };
  }
  if (/frio|cold/.test(basis)) {
    return { ...config, action_type: "mark_cold" };
  }
  if (/convert|fech|ganho|encerrar atendimento/.test(basis)) {
    return { ...config, action_type: "mark_converted" };
  }
  if (/pipeline|etapa|funil|crm/.test(basis)) {
    return {
      ...config,
      action_type: "move_pipeline",
      pipeline_stage: normalizeText(config.pipeline_stage) || "Em atendimento",
    };
  }
  if (/score|pontua/.test(basis)) {
    return {
      ...config,
      action_type: "update_score",
      score_delta: typeof config.score_delta === "number" ? config.score_delta : 25,
    };
  }
  if (/webhook|integra/.test(basis)) {
    return {
      ...config,
      action_type: "webhook",
      webhook_method: normalizeText(config.webhook_method) || "POST",
    };
  }

  return {
    ...config,
    action_type: "add_tag",
    tag_value: normalizeText(config.tag_value || config.tag_name) || slugifyTag(label),
  };
};

const sanitizeSemanticType = (node: FlowNodeDraft, prompt: string) => {
  const label = normalizeText(node.label).toLowerCase();
  const currentType = VALID_NODE_TYPES.includes(node.type as any) ? node.type : "message";

  if (currentType === "action" && /colet(ar)? dados|suger(ir)? solu[cç][aã]o|diagn[oó]stico|classifica[cç][aã]o|sauda[cç][aã]o/i.test(label)) {
    return "message";
  }

  if (currentType === "message" && /transfer|escalon|humano/.test(label) && looksLikeAgentPlaybook(prompt)) {
    return "handoff";
  }

  return currentType;
};

const ensureNodeConfig = (
  node: FlowNodeDraft,
  prompt: string,
  edgesBySource: Map<string, FlowEdgeDraft[]>,
  nodeById: Map<string, FlowNodeDraft>,
) => {
  const config = { ...(node.config || {}) };
  const label = normalizeText(node.label) || node.type;
  const outgoingEdges = edgesBySource.get(node.id) || [];

  if (node.type === "entry") {
    return {
      ...config,
      trigger_type: normalizeText(config.trigger_type) || "first_message",
      keywords: Array.isArray(config.keywords) ? config.keywords : [],
    };
  }

  if (node.type === "message") {
    const messageType = normalizeText(config.message_type) || "text";
    if (messageType === "text") {
      const content = normalizeText(config.content || config.body_text) || inferMessageText(label, prompt);
      return {
        ...config,
        message_type: "text",
        content,
        body_text: content,
      };
    }

    if (messageType === "template") {
      return {
        ...config,
        message_type: "template",
        template_name: normalizeText(config.template_name) || slugifyTag(label),
        template_language: normalizeText(config.template_language) || "pt_BR",
      };
    }

    const caption = normalizeText(config.caption || config.content || config.body_text) || inferMessageText(label, prompt);
    return {
      ...config,
      message_type: messageType,
      caption,
      content: caption,
      body_text: caption,
    };
  }

  if (node.type === "buttons") {
    const nodeConfig = normalizeButtonsConfig(config);
    const interactionType = nodeConfig.interaction_type || "reply_buttons";
    const outgoingHandles = unique(
      outgoingEdges
        .map((edge) => normalizeHandle(edge.source_handle || edge.sourceHandle))
        .filter((value): value is string => !!value),
    ).sort(sortInteractiveHandle);

    if (interactionType === "list") {
      if (!Array.isArray(nodeConfig.list_items) || nodeConfig.list_items.length === 0) {
        const listItems = outgoingHandles
          .filter((handle) => handle.startsWith("item_"))
          .map((handle, index) => {
            const edge = outgoingEdges.find((item) => normalizeHandle(item.source_handle || item.sourceHandle) === handle);
            const target = edge ? nodeById.get(edge.target) : null;
            return {
              id: handle,
              title: truncateText(normalizeText(target?.label) || `Opção ${index + 1}`, 24),
              description: "",
            };
          });

        nodeConfig.list_items = listItems.length > 0
          ? listItems
          : [
              { id: "item_0", title: "Atendimento", description: "" },
              { id: "item_1", title: "Comercial", description: "" },
            ];
      }

      nodeConfig.list_button_text = normalizeText(nodeConfig.list_button_text) || "Ver opções";
    } else {
      if (!Array.isArray(nodeConfig.buttons) || nodeConfig.buttons.length === 0) {
        const buttons = outgoingHandles
          .filter((handle) => handle.startsWith("btn_"))
          .map((handle, index) => {
            const edge = outgoingEdges.find((item) => normalizeHandle(item.source_handle || item.sourceHandle) === handle);
            const target = edge ? nodeById.get(edge.target) : null;
            const rawTitle = normalizeText(target?.label).replace(/^(mensagem|bloco|etapa|ação|acao)\s*[:-]?\s*/i, "");
            return {
              id: handle,
              title: truncateText(rawTitle || `Opção ${index + 1}`, 20),
            };
          });

        nodeConfig.buttons = buttons.length > 0
          ? buttons
          : [
              { id: "btn_0", title: "Continuar" },
              { id: "btn_1", title: "Falar com humano" },
            ];
      }
    }

    nodeConfig.body_text = normalizeText(nodeConfig.body_text) || inferButtonsBodyText(label, prompt);
    return nodeConfig;
  }

  if (node.type === "condition") {
    const conditionType = inferConditionType(label, normalizeText(config.condition_type));
    const conditionValue = normalizeText(config.condition_value)
      || (conditionType === "button_clicked"
        ? "btn_0"
        : conditionType === "keyword_match"
          ? "sim, quero, preciso"
          : conditionType === "field_equals"
            ? "preenchido"
            : "true");

    return {
      ...config,
      condition_type: conditionType,
      condition_value: conditionValue,
      timeout_minutes: conditionType === "no_response"
        ? (typeof config.timeout_minutes === "number" && config.timeout_minutes > 0 ? config.timeout_minutes : 60)
        : config.timeout_minutes,
    };
  }

  if (node.type === "wait") {
    let delayValue = typeof config.delay_value === "number" && config.delay_value > 0 ? config.delay_value : 0;
    let delayUnit = normalizeText(config.delay_unit) || "minutes";

    if (!delayValue) {
      const lower = `${label} ${prompt}`.toLowerCase();
      if (/24h|24 h|1 dia|amanh[ãa]/.test(lower)) {
        delayValue = 1;
        delayUnit = "days";
      } else if (/1h|1 h|60 min|uma hora/.test(lower)) {
        delayValue = 1;
        delayUnit = "hours";
      } else {
        delayValue = 15;
        delayUnit = "minutes";
      }
    }

    return {
      ...config,
      delay_value: delayValue,
      delay_unit: ["minutes", "hours", "days"].includes(delayUnit) ? delayUnit : "minutes",
      smart: typeof config.smart === "boolean" ? config.smart : true,
    };
  }

  if (node.type === "action") {
    const actionConfig = inferActionConfig(label, prompt, config);
    if (actionConfig.action_type === "add_tag" || actionConfig.action_type === "remove_tag") {
      actionConfig.tag_value = normalizeText(actionConfig.tag_value || actionConfig.tag_name) || slugifyTag(label);
      delete actionConfig.tag_name;
    }
    if (actionConfig.action_type === "update_field") {
      actionConfig.field_name = normalizeText(actionConfig.field_name) || "contact_name";
      actionConfig.field_value = normalizeText(actionConfig.field_value) || "Preenchido automaticamente";
    }
    return actionConfig;
  }

  if (node.type === "ai_agent") {
    return {
      ...config,
      system_prompt: normalizeText(config.system_prompt) || truncateText(prompt, 4000),
      ai_model: normalizeText(config.ai_model) || "gpt-4o",
      ai_output_type: normalizeText(config.ai_output_type) || "message_and_route",
      ai_routes: normalizeText(config.ai_routes) || `CONTINUAR → seguir para o próximo bloco
ESCALAR_ATENDIMENTO → encaminhar para handoff
ENCERRAR_ATENDIMENTO → seguir para end`,
      ai_context: normalizeText(config.ai_context) || truncateText(prompt, 800),
    };
  }

  if (node.type === "handoff") {
    return {
      ...config,
      stop_automation: config.stop_automation !== false,
      notify_team: typeof config.notify_team === "boolean" ? config.notify_team : true,
      notification_message: normalizeText(config.notification_message) || "Lead aguardando atendimento humano",
      handoff_message: normalizeText(config.handoff_message) || inferHandoffMessage(prompt),
    };
  }

  if (node.type === "end") {
    const endMessage = normalizeText(config.end_message);
    return endMessage
      ? { ...config, end_message: endMessage, mark_completed: config.mark_completed ?? true }
      : { ...config, mark_completed: config.mark_completed ?? true };
  }

  return config;
};

const validateFlowDraft = (draft: FlowDraft, prompt: string) => {
  const nodes = Array.isArray(draft.nodes) ? draft.nodes : [];
  const edges = Array.isArray(draft.edges) ? draft.edges : [];
  const issues: string[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgesBySource = new Map<string, FlowEdgeDraft[]>();

  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source)!.push(edge);
  }

  if (!nodes.some((node) => node.type === "entry")) {
    issues.push("O fluxo precisa ter um nó entry.");
  }

  if (!nodes.some((node) => node.type === "end" || node.type === "handoff")) {
    issues.push("O fluxo precisa terminar em end ou handoff.");
  }

  if (/suporte|atendimento|ajuda|problema|duvida|dúvida/i.test(prompt) && !nodes.some((node) => node.type === "handoff")) {
    issues.push("Fluxos de suporte precisam incluir handoff em algum ponto útil.");
  }

  if (nodes.length > MAX_NODES) {
    issues.push(`O fluxo excedeu o limite de ${MAX_NODES} nós.`);
  }

  for (const node of nodes) {
    const config = node.config || {};
    switch (node.type) {
      case "message":
        if (!normalizeText(config.content || config.body_text || config.template_name || config.caption)) {
          issues.push(`O nó message ${node.id} está sem conteúdo.`);
        }
        break;
      case "buttons":
        if (!normalizeText(config.body_text)) {
          issues.push(`O nó buttons ${node.id} está sem body_text.`);
        }
        if ((config.interaction_type === "list" && (!Array.isArray(config.list_items) || config.list_items.length === 0))
          || ((config.interaction_type !== "list") && (!Array.isArray(config.buttons) || config.buttons.length === 0))) {
          issues.push(`O nó buttons ${node.id} está sem opções reais.`);
        }
        break;
      case "condition":
        if (!normalizeText(config.condition_type)) {
          issues.push(`O nó condition ${node.id} está sem condition_type.`);
        }
        break;
      case "wait":
        if (!(typeof config.delay_value === "number" && config.delay_value > 0)) {
          issues.push(`O nó wait ${node.id} está sem delay válido.`);
        }
        break;
      case "action":
        if (!normalizeText(config.action_type)) {
          issues.push(`O nó action ${node.id} está sem action_type.`);
        }
        break;
      case "ai_agent":
        if (!normalizeText(config.system_prompt)) {
          issues.push(`O nó ai_agent ${node.id} está sem system_prompt.`);
        }
        break;
      case "handoff":
        if (!normalizeText(config.handoff_message) && config.notify_team !== true) {
          issues.push(`O nó handoff ${node.id} está sem handoff_message.`);
        }
        break;
    }

    if (node.type !== "end" && node.type !== "handoff") {
      const outgoing = edgesBySource.get(node.id) || [];
      if (outgoing.length === 0) {
        issues.push(`O nó ${node.id} (${node.type}) está sem saída.`);
      }
    }
  }

  for (const node of nodes.filter((item) => item.type === "buttons")) {
    const outgoing = edgesBySource.get(node.id) || [];
    const buttonTargets = outgoing
      .map((edge) => nodeById.get(edge.target))
      .filter(Boolean);

    if (buttonTargets.some((target) => target?.type === "condition")) {
      issues.push(`O nó buttons ${node.id} não pode apontar diretamente para condition.`);
    }
  }

  if (looksLikeAgentPlaybook(prompt)) {
    const suspiciousActions = nodes.filter((node) =>
      node.type === "action" && /colet(ar)? dados|suger(ir)? solu[cç][aã]o|diagn[oó]stico|classifica[cç][aã]o/i.test(node.label || ""),
    );
    if (suspiciousActions.length > 0) {
      issues.push("O fluxo transformou etapas abstratas do playbook em nós action; compacte isso em ai_agent ou message.");
    }
  }

  return issues;
};

const buildFlowRequestMessage = (prompt: string, feedback?: string) => {
  const parts = [
    `Objetivo do usuário:
${prompt}`,
    "Crie o fluxo completo usando SOMENTE o tool create_whatsapp_flow.",
    "Todos os nós precisam vir com config útil e preenchido. Não deixe cards vazios.",
    "Se o prompt do usuário parecer um manual interno de agente, compacte esse manual dentro de um único ai_agent.system_prompt e gere apenas os blocos externos necessários.",
    "Nunca crie condition depois de buttons só para detectar clique.",
    "Se usar message text, preencha config.content e config.body_text com o mesmo texto.",
    "Se usar buttons, gere botões reais com textos curtos.",
  ];

  if (feedback) {
    parts.push(`O rascunho anterior ficou inválido. Corrija estes pontos obrigatoriamente:
${feedback}`);
  }

  return parts.join("\n\n");
};

const callOpenAIForFlow = async (apiKey: string, prompt: string, feedback?: string): Promise<FlowDraft> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildFlowRequestMessage(prompt, feedback) },
      ],
      tools: [FLOW_TOOL],
      tool_choice: { type: "function", function: { name: "create_whatsapp_flow" } },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na OpenAI: ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function?.name !== "create_whatsapp_flow") {
    throw new Error("A OpenAI não retornou o fluxo estruturado.");
  }

  try {
    return JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    throw new Error("A resposta estruturada da OpenAI não era um JSON válido.");
  }
};

const normalizeFlowDraft = (draft: FlowDraft, prompt: string): { flow_name: string; nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] } => {
  const rawNodes = Array.isArray(draft.nodes) ? draft.nodes : [];
  const rawEdges = Array.isArray(draft.edges) ? draft.edges : [];
  const seenIds = new Set<string>();

  const nodes = rawNodes
    .map((node: any, index: number) => {
      const id = normalizeText(node?.id) || `node_${index + 1}`;
      const dedupedId = seenIds.has(id) ? `${id}_${index + 1}` : id;
      seenIds.add(dedupedId);
      const type = sanitizeSemanticType({
        id: dedupedId,
        type: normalizeText(node?.type) || "message",
        label: normalizeText(node?.label) || "Bloco",
        position_x: Number(node?.position_x) || index * 300,
        position_y: Number(node?.position_y) || 300,
        config: typeof node?.config === "object" && node?.config ? node.config : {},
      }, prompt);

      return {
        id: dedupedId,
        type,
        label: normalizeText(node?.label) || "Bloco",
        position_x: Number(node?.position_x) || index * 300,
        position_y: Number(node?.position_y) || 300,
        config: typeof node?.config === "object" && node?.config ? node.config : {},
      } as FlowNodeDraft;
    })
    .filter((node) => VALID_NODE_TYPES.includes(node.type as any))
    .slice(0, MAX_NODES);

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = rawEdges
    .map((edge: any) => ({
      source: normalizeText(edge?.source),
      target: normalizeText(edge?.target),
      source_handle: normalizeHandle(edge?.source_handle || edge?.sourceHandle),
      target_handle: normalizeHandle(edge?.target_handle || edge?.targetHandle),
    }))
    .filter((edge) => edge.source && edge.target && nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target));

  return {
    flow_name: normalizeText(draft.flow_name) || "Fluxo IA",
    nodes,
    edges,
  };
};

const enrichFlowDraft = (draft: { flow_name: string; nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] }, prompt: string) => {
  const nodes = [...draft.nodes];
  const edges = [...draft.edges];

  if (!nodes.some((node) => node.type === "entry")) {
    nodes.unshift({
      id: "node_entry",
      type: "entry",
      label: "Entrada",
      position_x: 0,
      position_y: 300,
      config: { trigger_type: "first_message", keywords: [] },
    });
  }

  if (!nodes.some((node) => node.type === "end" || node.type === "handoff")) {
    const maxX = Math.max(...nodes.map((node) => node.position_x || 0), 0);
    nodes.push({
      id: "node_end",
      type: "end",
      label: "Encerrar fluxo",
      position_x: maxX + 300,
      position_y: 300,
      config: {},
    });
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgesBySource = new Map<string, FlowEdgeDraft[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source)!.push(edge);
  }

  const enrichedNodes = nodes.map((node, index) => {
    const cleanNode: FlowNodeDraft = {
      ...node,
      label: normalizeText(node.label) || node.type,
      position_x: Number.isFinite(node.position_x) ? node.position_x : index * 300,
      position_y: Number.isFinite(node.position_y) ? node.position_y : 300,
    };

    return {
      ...cleanNode,
      config: ensureNodeConfig(cleanNode, prompt, edgesBySource, nodeById),
    };
  });

  return {
    flow_name: draft.flow_name,
    nodes: enrichedNodes,
    edges,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, flow_id } = await req.json();

    if (!prompt || !flow_id) {
      return new Response(JSON.stringify({ error: "prompt e flow_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let flowDraft: { flow_name: string; nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] } | null = null;
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      console.log(`[generate-wa-flow] Calling OpenAI attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}...`);
      const rawDraft = await callOpenAIForFlow(
        OPENAI_API_KEY,
        prompt,
        attempt > 1 && lastIssues.length > 0 ? lastIssues.map((issue) => `- ${issue}`).join("\n") : undefined,
      );

      const normalizedDraft = normalizeFlowDraft(rawDraft, prompt);
      const enrichedDraft = enrichFlowDraft(normalizedDraft, prompt);
      const issues = validateFlowDraft(enrichedDraft, prompt);

      flowDraft = enrichedDraft;
      lastIssues = issues;

      console.log(`[generate-wa-flow] Attempt ${attempt}: ${enrichedDraft.nodes.length} nodes, ${enrichedDraft.edges.length} edges, issues=${issues.length}`);

      if (issues.length === 0) break;
    }

    if (!flowDraft) {
      throw new Error("Não foi possível gerar o fluxo.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    await sb.from("wa_flow_edges").delete().eq("flow_id", flow_id);
    await sb.from("wa_flow_nodes").delete().eq("flow_id", flow_id);

    const nodeIdMap: Record<string, string> = {};

    for (const node of flowDraft.nodes) {
      let nodeConfig = node.config || {};

      if (node.type === "buttons") {
        nodeConfig = normalizeButtonsConfig(nodeConfig);
      }

      const { data, error } = await sb
        .from("wa_flow_nodes")
        .insert({
          flow_id,
          node_type: node.type,
          name: node.label || node.type,
          config: nodeConfig,
          position_x: node.position_x || 0,
          position_y: node.position_y || 200,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[generate-wa-flow] Node insert error for ${node.id} (${node.type}):`, error);
        continue;
      }

      nodeIdMap[node.id] = data.id;
    }

    console.log(`[generate-wa-flow] Inserted ${Object.keys(nodeIdMap).length} nodes`);

    let edgesInserted = 0;
    for (const edge of flowDraft.edges || []) {
      const sourceId = nodeIdMap[edge.source];
      const targetId = nodeIdMap[edge.target];
      if (!sourceId || !targetId) {
        console.warn(`[generate-wa-flow] Skipping edge ${edge.source}->${edge.target}: missing node`);
        continue;
      }

      const { error } = await sb.from("wa_flow_edges").insert({
        flow_id,
        source_node_id: sourceId,
        target_node_id: targetId,
        source_handle: normalizeHandle(edge.source_handle || edge.sourceHandle) || null,
        target_handle: normalizeHandle(edge.target_handle || edge.targetHandle) || null,
        label: null,
      });

      if (error) {
        console.error("[generate-wa-flow] Edge insert error:", error);
      } else {
        edgesInserted += 1;
      }
    }

    console.log(`[generate-wa-flow] Inserted ${edgesInserted} edges. Flow complete!`);

    const connectedSources = new Set((flowDraft.edges || []).map((edge) => edge.source));
    const connectedTargets = new Set((flowDraft.edges || []).map((edge) => edge.target));
    const looseNodes = flowDraft.nodes.filter((node) =>
      !connectedSources.has(node.id)
      && node.type !== "end"
      && node.type !== "handoff"
      && node.type !== "entry"
      && nodeIdMap[node.id],
    );

    const endNode = flowDraft.nodes.find((node) => node.type === "end" && nodeIdMap[node.id]);
    if (endNode && looseNodes.length > 0) {
      for (const looseNode of looseNodes) {
        if (connectedTargets.has(looseNode.id)) {
          await sb.from("wa_flow_edges").insert({
            flow_id,
            source_node_id: nodeIdMap[looseNode.id],
            target_node_id: nodeIdMap[endNode.id],
            source_handle: null,
            target_handle: null,
            label: null,
          });
          console.log(`[generate-wa-flow] Auto-connected loose node ${looseNode.id} to end`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        flow_name: flowDraft.flow_name || "Fluxo IA",
        validation_issues: lastIssues,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-wa-flow] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
