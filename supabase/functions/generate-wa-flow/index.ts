import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_NODE_TYPES = [
  "entry", "message", "buttons", "condition", "wait", "action",
  "ai_agent", "handoff", "end", "data_collect", "random_split",
  "ab_test", "google_sheets", "google_calendar", "gmail",
] as const;

const OPENAI_MODEL = "gpt-4o";
const MAX_NODES = 25;
const MAX_GENERATION_ATTEMPTS = 2;

const SYSTEM_PROMPT = `Você é um arquiteto expert em fluxos conversacionais para WhatsApp Business.
Sua missão é transformar o pedido do usuário em um fluxo EXECUTÁVEL no editor, com nós preenchidos, conexões corretas e conteúdo real dentro dos cards.

=== OBJETIVO PRINCIPAL ===
1. O fluxo precisa ficar editável e útil imediatamente após a criação.
2. NUNCA deixe config vazio, exceto no nó end.
3. Gere apenas blocos que façam sentido visual e operacionalmente.
4. Quando o prompt do usuário parecer um prompt interno de agente, SOP, playbook, manual, instrução operacional, estados de IA ou regras de atendimento, NÃO crie um nó para cada etapa abstrata. Compacte essas regras dentro de UM nó ai_agent com system_prompt robusto.

=== TIPOS DE NÓS PERMITIDOS ===
entry, message, buttons, condition, wait, action, ai_agent, handoff, end, data_collect, random_split, ab_test, google_sheets, google_calendar, gmail

=== DESCRIÇÃO DOS NÓS ===
- entry: Ponto de entrada do fluxo. Config: trigger_type, keywords.
- message: Envia mensagem de texto/mídia. Config: message_type, content, body_text.
- buttons: Menu interativo com botões ou lista. Config: interaction_type, body_text, buttons/list_items.
- condition: Lógica condicional. Config: condition_type, condition_value. Handles: yes, no.
- wait: Espera um tempo. Config: delay_value, delay_unit, smart.
- action: Ação de CRM (tag, pipeline, webhook). Config: action_type e detalhes.
- ai_agent: Agente IA conversacional. Config: system_prompt, ai_model, ai_output_type.
- handoff: Transferência para humano. Config: handoff_message, notify_team.
- end: Encerramento do fluxo. Config: end_message (opcional).
- data_collect: Coleta dados do lead com pergunta + IA para extrair. Config: collect_type (name|email|phone|custom), variable_name, question_text, message_type (text|audio), max_retries.
  Variáveis coletadas ficam disponíveis como {{variable_name}} em mensagens posteriores.
- random_split: Divide tráfego aleatoriamente entre 2-5 saídas. Config: splits (array de {label, weight}). Source handles: split_0, split_1, etc.
- ab_test: Teste A/B com 2-3 variantes. Config: variants (array de {label, weight}), metrics. Source handles: variant_0, variant_1, etc.
- google_sheets: Envia dados para planilha (requer conta conectada). Config: sheet_name, write_mode, columns.
- google_calendar: Cria evento (requer conta conectada). Config: event_title, event_description, duration_minutes.
- gmail: Envia email (requer conta conectada). Config: to_email, subject, body_text.

=== REGRAS OBRIGATÓRIAS ===
1. SEMPRE comece com um nó entry.
2. TODO caminho precisa terminar em end ou handoff. SEM EXCEÇÃO.
3. MÁXIMO ${MAX_NODES} nós.
4. Botões conectam DIRETAMENTE ao próximo nó. NUNCA coloque condition imediatamente após buttons.
5. Use condition apenas para lógica real (respondeu, não respondeu, keyword, tag, campo).
6. Use action APENAS para ações reais de CRM/sistema.
7. Use data_collect quando precisar coletar dados antes de prosseguir (nome, email, etc).
8. Use variáveis coletadas {{variable_name}} nas mensagens seguintes para personalizar.
9. Integrações Google (google_sheets, google_calendar, gmail) só quando o contexto exige claramente.
10. message precisa ter content E body_text preenchidos.
11. buttons precisa ter body_text E opções reais.
12. ai_agent precisa ter system_prompt, ai_model e ai_output_type.
13. handoff deve ter handoff_message.
14. data_collect deve ter collect_type, variable_name e question_text.

=== PADRÕES RECOMENDADOS ===
VENDAS: entry → message → buttons(menu) → cada botão → message/action/end
SUPORTE: entry → message → ai_agent(prompt completo) → handoff/end
QUALIFICAÇÃO: entry → data_collect(nome) → data_collect(email) → message(personalizada) → handoff/end  
AGENDAMENTO: entry → data_collect(nome) → data_collect(email) → google_calendar → message(confirmação) → end

=== POSICIONAMENTO ===
- Entry em x:0, y:300
- Próxima coluna: +300 em X
- Ramificações: pelo menos 180 de Y de distância
- Nós nunca podem sobrepor
`;

const FLOW_NODE_CONFIG_PROPERTIES: Record<string, any> = {
  // Entry
  trigger_type: { type: "string", enum: ["first_message", "keyword", "campaign_reply", "button_click", "webhook", "qr_code", "re_entry", "template_reply"] },
  keywords: { type: "array", items: { type: "string" } },
  // Message
  message_type: { type: "string", enum: ["text", "image", "audio", "video", "document", "template"] },
  content: { type: "string", description: "Texto principal da mensagem" },
  body_text: { type: "string", description: "Texto espelhado da mensagem" },
  preview_url: { type: "boolean" },
  media_url: { type: "string" },
  caption: { type: "string" },
  template_name: { type: "string" },
  template_language: { type: "string" },
  // Buttons
  interaction_type: { type: "string", enum: ["reply_buttons", "list"] },
  header_text: { type: "string" },
  footer_text: { type: "string" },
  buttons: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } }, required: ["id", "title"] } },
  list_items: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" } }, required: ["id", "title"] } },
  list_button_text: { type: "string" },
  // Condition
  condition_type: { type: "string", enum: ["button_clicked", "keyword_match", "has_tag", "field_equals", "responded", "no_response", "score_above", "is_customer", "pipeline_stage"] },
  condition_value: { type: "string" },
  timeout_minutes: { type: "number" },
  field_name: { type: "string" },
  // Wait
  delay_value: { type: "number" },
  delay_unit: { type: "string", enum: ["minutes", "hours", "days"] },
  smart: { type: "boolean" },
  business_hours_only: { type: "boolean" },
  // Action
  action_type: { type: "string", enum: ["add_tag", "remove_tag", "update_field", "move_pipeline", "send_to_crm", "webhook", "mark_hot", "mark_cold", "mark_converted", "update_score"] },
  tag_value: { type: "string" },
  field_value: { type: "string" },
  pipeline_stage: { type: "string" },
  webhook_url: { type: "string" },
  score_delta: { type: "number" },
  // Handoff
  stop_automation: { type: "boolean" },
  notify_team: { type: "boolean" },
  notification_message: { type: "string" },
  handoff_message: { type: "string" },
  // End
  end_message: { type: "string" },
  mark_completed: { type: "boolean" },
  // AI Agent
  system_prompt: { type: "string" },
  ai_model: { type: "string", enum: ["gpt-4o-mini", "gpt-4o", "gemini-2.5-flash"] },
  ai_output_type: { type: "string", enum: ["message_only", "route_only", "message_and_route"] },
  ai_routes: { type: "string" },
  ai_context: { type: "string" },
  // Data Collect
  collect_type: { type: "string", enum: ["name", "email", "phone", "custom"], description: "Tipo de dado a coletar" },
  variable_name: { type: "string", description: "Nome da variável (ex: lead_name)" },
  question_text: { type: "string", description: "Pergunta enviada ao lead" },
  max_retries: { type: "number", description: "Número de tentativas (1-3)" },
  // Random Split
  splits: { type: "array", items: { type: "object", properties: { label: { type: "string" }, weight: { type: "number" } }, required: ["label", "weight"] } },
  // AB Test
  variants: { type: "array", items: { type: "object", properties: { label: { type: "string" }, weight: { type: "number" } }, required: ["label", "weight"] } },
  metrics: { type: "array", items: { type: "string" } },
  // Google Sheets
  sheet_name: { type: "string" },
  write_mode: { type: "string", enum: ["append", "overwrite"] },
  columns: { type: "array", items: { type: "object", properties: { header: { type: "string" }, value: { type: "string" } }, required: ["header", "value"] } },
  // Google Calendar
  event_title: { type: "string" },
  event_description: { type: "string" },
  duration_minutes: { type: "number" },
  reminder_minutes: { type: "number" },
  // Gmail
  to_email: { type: "string" },
  subject: { type: "string" },
  body_html: { type: "boolean" },
  cc: { type: "array", items: { type: "string" } },
  bcc: { type: "array", items: { type: "string" } },
};

const FLOW_TOOL = {
  type: "function",
  function: {
    name: "create_whatsapp_flow",
    description: "Cria um fluxo conversacional completo para WhatsApp com nós e conexões prontas. Cada nó deve vir com config preenchido.",
    parameters: {
      type: "object",
      properties: {
        flow_name: { type: "string", description: "Nome descritivo do fluxo" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID único como node_1, node_2" },
              type: { type: "string", enum: [...VALID_NODE_TYPES] },
              label: { type: "string", description: "Nome visível do nó" },
              position_x: { type: "number" },
              position_y: { type: "number" },
              config: {
                type: "object",
                properties: FLOW_NODE_CONFIG_PROPERTIES,
                description: "Config preenchido conforme o tipo do nó.",
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
              source_handle: { type: "string", description: "btn_0, btn_1, item_0, yes, no, split_0, variant_0 ou null" },
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
  if (/^(btn|item|split|variant)-\d+$/i.test(value)) return value.replace("-", "_");
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
    const rawItems = Array.isArray(nodeConfig.list_items) ? nodeConfig.list_items : Array.isArray(nodeConfig.items) ? nodeConfig.items : [];
    nodeConfig.list_items = rawItems.map((item: any, i: number) => ({
      id: normalizeHandle(item?.id) || `item_${i}`,
      title: truncateText(typeof item === "string" ? item : item?.title || `Item ${i + 1}`, 24),
      description: truncateText(item?.description || "", 72),
    }));
    nodeConfig.list_button_text = normalizeText(nodeConfig.list_button_text) || "Ver opções";
    delete nodeConfig.buttons;
  } else {
    nodeConfig.interaction_type = "reply_buttons";
    const rawButtons = Array.isArray(nodeConfig.buttons) ? nodeConfig.buttons : Array.isArray(nodeConfig.options) ? nodeConfig.options : [];
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
  normalizeText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "etapa_fluxo";

const sortInteractiveHandle = (a: string, b: string) => {
  const [prefixA, indexA] = a.split("_");
  const [prefixB, indexB] = b.split("_");
  if (prefixA === prefixB) return Number(indexA || 0) - Number(indexB || 0);
  return a.localeCompare(b);
};

const looksLikeAgentPlaybook = (prompt: string) =>
  /papel do modelo|regras|estados do fluxo|classifica[cç][aã]o|diagn[oó]stico|resolu[cç][aã]o|escalar_atendimento|aguardar_resposta_usuario|coletar_dados|sugerir_solucao/i.test(prompt);

const inferMessageText = (label: string, prompt: string) => {
  const nl = normalizeText(label).toLowerCase();
  if (/sauda|boas-vindas|in[ií]cio/.test(nl)) return "Olá! 👋 Seja bem-vindo(a). Me conte em poucas palavras como posso te ajudar hoje.";
  if (/diagn[oó]st|triagem|classifica/.test(nl)) return "Entendi. Para te direcionar corretamente, descreva em uma frase o que aconteceu ou qual é a sua dúvida.";
  if (/confirma/.test(nl) && /resolu|solu/.test(nl)) return "Consegui te ajudar com isso ou você ainda precisa de suporte humano?";
  if (/escalon|humano|transfer/.test(nl)) return "Vou encaminhar seu atendimento para um especialista humano e ele continuará com você em instantes.";
  if (/follow|retorno|lembrete/.test(nl)) return "Passando para confirmar se você ainda precisa de ajuda. Se quiser, posso continuar por aqui agora.";
  if (/suporte|ajuda|problema/.test(prompt.toLowerCase())) return "Estou aqui para ajudar. Me explique rapidamente o problema para eu analisar a melhor solução.";
  if (/venda|proposta|or[cç]amento|comprar/.test(prompt.toLowerCase())) return "Perfeito! Para te orientar melhor, me diga seu objetivo principal e a faixa de investimento ideal.";
  const fallback = normalizeText(label).replace(/[_-]+/g, " ");
  if (!fallback) return "Mensagem automática pronta para uso.";
  return /[.!?]$/.test(fallback) ? fallback : `${fallback}.`;
};

const inferButtonsBodyText = (label: string, prompt: string) => {
  const nl = normalizeText(label).toLowerCase();
  const np = prompt.toLowerCase();
  if (/menu|op[cç][aã]o|escolha/.test(nl)) return "Escolha uma opção abaixo para continuar:";
  if (/suporte|ajuda|problema/.test(np)) return "Para te direcionar mais rápido, escolha o tipo de assunto:";
  if (/venda|comprar|proposta/.test(np)) return "Qual dessas opções faz mais sentido para você agora?";
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
  const nl = normalizeText(label).toLowerCase();
  if (/bot[aã]o|op[cç][aã]o|menu/.test(nl)) return "button_clicked";
  if (/sem resposta|n[aã]o respondeu|timeout/.test(nl)) return "no_response";
  if (/palavra|keyword|chave/.test(nl)) return "keyword_match";
  if (/tag/.test(nl)) return "has_tag";
  if (/campo|valor/.test(nl)) return "field_equals";
  return "responded";
};

const inferActionConfig = (label: string, prompt: string, config: Record<string, any>) => {
  if (normalizeText(config.action_type)) return config;
  const basis = `${label} ${prompt}`.toLowerCase();
  if (/quente|hot|prioridade/.test(basis)) return { ...config, action_type: "mark_hot" };
  if (/frio|cold/.test(basis)) return { ...config, action_type: "mark_cold" };
  if (/convert|fech|ganho/.test(basis)) return { ...config, action_type: "mark_converted" };
  if (/pipeline|etapa|funil|crm/.test(basis)) return { ...config, action_type: "move_pipeline", pipeline_stage: normalizeText(config.pipeline_stage) || "Em atendimento" };
  if (/score|pontua/.test(basis)) return { ...config, action_type: "update_score", score_delta: typeof config.score_delta === "number" ? config.score_delta : 25 };
  if (/webhook|integra/.test(basis)) return { ...config, action_type: "webhook", webhook_method: normalizeText(config.webhook_method) || "POST" };
  return { ...config, action_type: "add_tag", tag_value: normalizeText(config.tag_value || config.tag_name) || slugifyTag(label) };
};

const sanitizeSemanticType = (node: FlowNodeDraft, prompt: string) => {
  const label = normalizeText(node.label).toLowerCase();
  const currentType = VALID_NODE_TYPES.includes(node.type as any) ? node.type : "message";
  if (currentType === "action" && /colet(ar)? dados|suger(ir)? solu[cç][aã]o|diagn[oó]stico|classifica[cç][aã]o|sauda[cç][aã]o/i.test(label)) return "message";
  if (currentType === "message" && /transfer|escalon|humano/.test(label) && looksLikeAgentPlaybook(prompt)) return "handoff";
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

  switch (node.type) {
    case "entry":
      return { ...config, trigger_type: normalizeText(config.trigger_type) || "first_message", keywords: Array.isArray(config.keywords) ? config.keywords : [] };

    case "message": {
      const messageType = normalizeText(config.message_type) || "text";
      // Build the contents array that the frontend MessageContentBuilder expects
      const existingContents = Array.isArray(config.contents) ? config.contents : [];
      
      if (existingContents.length > 0) {
        // AI already provided contents array - normalize it
        const normalizedContents = existingContents.map((item: any, i: number) => ({
          id: item.id || `item_${i}_${Date.now()}`,
          type: normalizeText(item.type) || "text",
          content: normalizeText(item.content) || undefined,
          caption: normalizeText(item.caption) || undefined,
          media_url: normalizeText(item.media_url) || undefined,
          media_filename: normalizeText(item.media_filename) || undefined,
          delay_seconds: typeof item.delay_seconds === "number" ? item.delay_seconds : undefined,
          delay_min: typeof item.delay_min === "number" ? item.delay_min : undefined,
          delay_max: typeof item.delay_max === "number" ? item.delay_max : undefined,
        }));
        return { ...config, contents: normalizedContents };
      }

      // Build contents from legacy fields
      const contents: any[] = [];
      
      if (messageType === "text") {
        const textContent = normalizeText(config.content || config.body_text) || inferMessageText(label, prompt);
        contents.push({
          id: `item_0_${Date.now()}`,
          type: "text",
          content: textContent,
        });
      } else if (messageType === "template") {
        return { ...config, message_type: "template", template_name: normalizeText(config.template_name) || slugifyTag(label), template_language: normalizeText(config.template_language) || "pt_BR" };
      } else {
        // image, audio, video, document
        const caption = normalizeText(config.caption || config.content || config.body_text) || inferMessageText(label, prompt);
        contents.push({
          id: `item_0_${Date.now()}`,
          type: messageType,
          caption,
          media_url: normalizeText(config.media_url) || "",
          media_filename: "",
        });
      }

      // Add smart delay between message nodes for natural feel
      contents.push({
        id: `delay_${Date.now()}`,
        type: "delay",
        delay_min: 2,
        delay_max: 5,
      });

      return { ...config, contents, message_type: messageType, content: contents[0]?.content || "", body_text: contents[0]?.content || "" };
    }

    case "buttons": {
      const nodeConfig = normalizeButtonsConfig(config);
      const interactionType = nodeConfig.interaction_type || "reply_buttons";
      const outgoingHandles = unique(
        outgoingEdges.map((e) => normalizeHandle(e.source_handle || e.sourceHandle)).filter((v): v is string => !!v),
      ).sort(sortInteractiveHandle);

      if (interactionType === "list") {
        if (!Array.isArray(nodeConfig.list_items) || nodeConfig.list_items.length === 0) {
          const listItems = outgoingHandles.filter((h) => h.startsWith("item_")).map((h, i) => {
            const edge = outgoingEdges.find((e) => normalizeHandle(e.source_handle || e.sourceHandle) === h);
            const target = edge ? nodeById.get(edge.target) : null;
            return { id: h, title: truncateText(normalizeText(target?.label) || `Opção ${i + 1}`, 24), description: "" };
          });
          nodeConfig.list_items = listItems.length > 0 ? listItems : [{ id: "item_0", title: "Atendimento", description: "" }, { id: "item_1", title: "Comercial", description: "" }];
        }
        nodeConfig.list_button_text = normalizeText(nodeConfig.list_button_text) || "Ver opções";
      } else {
        if (!Array.isArray(nodeConfig.buttons) || nodeConfig.buttons.length === 0) {
          const buttons = outgoingHandles.filter((h) => h.startsWith("btn_")).map((h, i) => {
            const edge = outgoingEdges.find((e) => normalizeHandle(e.source_handle || e.sourceHandle) === h);
            const target = edge ? nodeById.get(edge.target) : null;
            const rawTitle = normalizeText(target?.label).replace(/^(mensagem|bloco|etapa|ação|acao)\s*[:-]?\s*/i, "");
            return { id: h, title: truncateText(rawTitle || `Opção ${i + 1}`, 20) };
          });
          nodeConfig.buttons = buttons.length > 0 ? buttons : [{ id: "btn_0", title: "Continuar" }, { id: "btn_1", title: "Falar com humano" }];
        }
      }
      nodeConfig.body_text = normalizeText(nodeConfig.body_text) || inferButtonsBodyText(label, prompt);
      return nodeConfig;
    }

    case "condition": {
      const conditionType = inferConditionType(label, normalizeText(config.condition_type));
      const conditionValue = normalizeText(config.condition_value) || (conditionType === "button_clicked" ? "btn_0" : conditionType === "keyword_match" ? "sim, quero, preciso" : "true");
      return { ...config, condition_type: conditionType, condition_value: conditionValue, timeout_minutes: conditionType === "no_response" ? (typeof config.timeout_minutes === "number" && config.timeout_minutes > 0 ? config.timeout_minutes : 60) : config.timeout_minutes };
    }

    case "wait": {
      let delayValue = typeof config.delay_value === "number" && config.delay_value > 0 ? config.delay_value : 0;
      let delayUnit = normalizeText(config.delay_unit) || "minutes";
      if (!delayValue) {
        const lower = `${label} ${prompt}`.toLowerCase();
        if (/24h|1 dia|amanh[ãa]/.test(lower)) { delayValue = 1; delayUnit = "days"; }
        else if (/1h|60 min|uma hora/.test(lower)) { delayValue = 1; delayUnit = "hours"; }
        else { delayValue = 15; delayUnit = "minutes"; }
      }
      return { ...config, delay_value: delayValue, delay_unit: ["minutes", "hours", "days"].includes(delayUnit) ? delayUnit : "minutes", smart: typeof config.smart === "boolean" ? config.smart : true };
    }

    case "action": {
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

    case "ai_agent":
      return {
        ...config,
        system_prompt: normalizeText(config.system_prompt) || truncateText(prompt, 4000),
        ai_model: normalizeText(config.ai_model) || "gpt-4o",
        ai_output_type: normalizeText(config.ai_output_type) || "message_and_route",
        ai_routes: normalizeText(config.ai_routes) || "CONTINUAR → seguir para o próximo bloco\nESCALAR_ATENDIMENTO → encaminhar para handoff\nENCERRAR_ATENDIMENTO → seguir para end",
        ai_context: normalizeText(config.ai_context) || truncateText(prompt, 800),
      };

    case "handoff":
      return {
        ...config,
        stop_automation: config.stop_automation !== false,
        notify_team: typeof config.notify_team === "boolean" ? config.notify_team : true,
        notification_message: normalizeText(config.notification_message) || "Lead aguardando atendimento humano",
        handoff_message: normalizeText(config.handoff_message) || inferHandoffMessage(prompt),
      };

    case "end": {
      const endMessage = normalizeText(config.end_message);
      return endMessage ? { ...config, end_message: endMessage, mark_completed: config.mark_completed ?? true } : { ...config, mark_completed: config.mark_completed ?? true };
    }

    case "data_collect": {
      const collectType = normalizeText(config.collect_type) || "name";
      const variableDefaults: Record<string, { variable: string; question: string }> = {
        name: { variable: "lead_name", question: "Qual é o seu nome completo?" },
        email: { variable: "lead_email", question: "Qual é o seu e-mail para contato?" },
        phone: { variable: "lead_phone", question: "Qual é o seu número de telefone?" },
        custom: { variable: normalizeText(config.variable_name) || "custom_field", question: normalizeText(config.question_text) || "Por favor, informe o dado solicitado:" },
      };
      const defaults = variableDefaults[collectType] || variableDefaults.custom;
      return {
        ...config,
        collect_type: collectType,
        variable_name: normalizeText(config.variable_name) || defaults.variable,
        question_text: normalizeText(config.question_text) || defaults.question,
        message_type: normalizeText(config.message_type) || "text",
        max_retries: typeof config.max_retries === "number" ? config.max_retries : 2,
      };
    }

    case "random_split": {
      const splits = Array.isArray(config.splits) && config.splits.length >= 2
        ? config.splits.map((s: any, i: number) => ({ label: normalizeText(s.label) || `Caminho ${i + 1}`, weight: typeof s.weight === "number" ? s.weight : 50 }))
        : [{ label: "Caminho A", weight: 50 }, { label: "Caminho B", weight: 50 }];
      return { ...config, splits };
    }

    case "ab_test": {
      const variants = Array.isArray(config.variants) && config.variants.length >= 2
        ? config.variants.map((v: any, i: number) => ({ label: normalizeText(v.label) || `Variante ${String.fromCharCode(65 + i)}`, weight: typeof v.weight === "number" ? v.weight : 50 }))
        : [{ label: "Variante A", weight: 50 }, { label: "Variante B", weight: 50 }];
      const metrics = Array.isArray(config.metrics) && config.metrics.length > 0 ? config.metrics : ["Taxa de resposta"];
      return { ...config, variants, metrics };
    }

    case "google_sheets":
      return {
        ...config,
        sheet_name: normalizeText(config.sheet_name) || "Leads",
        write_mode: normalizeText(config.write_mode) || "append",
        columns: Array.isArray(config.columns) && config.columns.length > 0 ? config.columns : [{ header: "Nome", value: "{{lead_name}}" }, { header: "Telefone", value: "{{lead_phone}}" }],
      };

    case "google_calendar":
      return {
        ...config,
        event_title: normalizeText(config.event_title) || "Reunião com {{lead_name}}",
        event_description: normalizeText(config.event_description) || "Agendamento automático via fluxo WhatsApp",
        duration_minutes: typeof config.duration_minutes === "number" ? config.duration_minutes : 30,
        reminder_minutes: typeof config.reminder_minutes === "number" ? config.reminder_minutes : 15,
      };

    case "gmail":
      return {
        ...config,
        to_email: normalizeText(config.to_email) || "{{lead_email}}",
        subject: normalizeText(config.subject) || "Contato - {{lead_name}}",
        body_text: normalizeText(config.body_text) || "Olá {{lead_name}},\n\nObrigado pelo contato!\n\nAtenciosamente.",
        body_html: typeof config.body_html === "boolean" ? config.body_html : false,
        cc: Array.isArray(config.cc) ? config.cc : [],
        bcc: Array.isArray(config.bcc) ? config.bcc : [],
      };

    default:
      return config;
  }
};

const validateFlowDraft = (draft: FlowDraft, prompt: string) => {
  const nodes = Array.isArray(draft.nodes) ? draft.nodes : [];
  const edges = Array.isArray(draft.edges) ? draft.edges : [];
  const issues: string[] = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgesBySource = new Map<string, FlowEdgeDraft[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source)!.push(edge);
  }

  if (!nodes.some((n) => n.type === "entry")) issues.push("O fluxo precisa ter um nó entry.");
  if (!nodes.some((n) => n.type === "end" || n.type === "handoff")) issues.push("O fluxo precisa terminar em end ou handoff.");
  if (/suporte|atendimento|ajuda|problema|duvida|dúvida/i.test(prompt) && !nodes.some((n) => n.type === "handoff")) {
    issues.push("Fluxos de suporte precisam incluir handoff em algum ponto útil.");
  }
  if (nodes.length > MAX_NODES) issues.push(`O fluxo excedeu o limite de ${MAX_NODES} nós.`);

  for (const node of nodes) {
    const config = node.config || {};
    switch (node.type) {
      case "message":
        if (!normalizeText(config.content || config.body_text || config.template_name || config.caption)) issues.push(`O nó message ${node.id} está sem conteúdo.`);
        break;
      case "buttons":
        if (!normalizeText(config.body_text)) issues.push(`O nó buttons ${node.id} está sem body_text.`);
        if ((config.interaction_type === "list" && (!Array.isArray(config.list_items) || config.list_items.length === 0)) || ((config.interaction_type !== "list") && (!Array.isArray(config.buttons) || config.buttons.length === 0))) issues.push(`O nó buttons ${node.id} está sem opções.`);
        break;
      case "condition":
        if (!normalizeText(config.condition_type)) issues.push(`O nó condition ${node.id} está sem condition_type.`);
        break;
      case "wait":
        if (!(typeof config.delay_value === "number" && config.delay_value > 0)) issues.push(`O nó wait ${node.id} está sem delay.`);
        break;
      case "action":
        if (!normalizeText(config.action_type)) issues.push(`O nó action ${node.id} está sem action_type.`);
        break;
      case "ai_agent":
        if (!normalizeText(config.system_prompt)) issues.push(`O nó ai_agent ${node.id} está sem system_prompt.`);
        break;
      case "handoff":
        if (!normalizeText(config.handoff_message) && config.notify_team !== true) issues.push(`O nó handoff ${node.id} está sem handoff_message.`);
        break;
      case "data_collect":
        if (!normalizeText(config.variable_name)) issues.push(`O nó data_collect ${node.id} está sem variable_name.`);
        if (!normalizeText(config.question_text)) issues.push(`O nó data_collect ${node.id} está sem question_text.`);
        break;
    }

    // Check for dead ends (nodes without outgoing edges that aren't terminal)
    const terminalTypes = ["end", "handoff"];
    if (!terminalTypes.includes(node.type)) {
      const outgoing = edgesBySource.get(node.id) || [];
      if (outgoing.length === 0) issues.push(`O nó ${node.id} (${node.type}) está sem saída.`);
    }
  }

  // Buttons → condition forbidden
  for (const node of nodes.filter((n) => n.type === "buttons")) {
    const outgoing = edgesBySource.get(node.id) || [];
    const buttonTargets = outgoing.map((e) => nodeById.get(e.target)).filter(Boolean);
    if (buttonTargets.some((t) => t?.type === "condition")) issues.push(`O nó buttons ${node.id} não pode apontar diretamente para condition.`);
  }

  if (looksLikeAgentPlaybook(prompt)) {
    const suspiciousActions = nodes.filter((n) => n.type === "action" && /colet(ar)? dados|suger(ir)? solu[cç][aã]o|diagn[oó]stico|classifica[cç][aã]o/i.test(n.label || ""));
    if (suspiciousActions.length > 0) issues.push("O fluxo transformou etapas abstratas em nós action; compacte em ai_agent ou message.");
  }

  return issues;
};

const buildFlowRequestMessage = (prompt: string, feedback?: string) => {
  const parts = [
    `Objetivo do usuário:\n${prompt}`,
    "Crie o fluxo completo usando SOMENTE o tool create_whatsapp_flow.",
    "Todos os nós precisam vir com config preenchido. Não deixe cards vazios.",
    "Se o prompt do usuário parecer um manual interno de agente, compacte dentro de um único ai_agent.system_prompt.",
    "Nunca crie condition depois de buttons.",
    "Se usar message text, preencha content e body_text com o mesmo texto.",
    "Se usar buttons, gere botões reais com textos curtos.",
    "Se precisar coletar dados do lead (nome, email, telefone), use data_collect com variable_name e question_text.",
    "Use {{variable_name}} nas mensagens seguintes para personalizar (ex: Olá {{lead_name}}!).",
    "TODOS os caminhos devem terminar em end ou handoff. Sem exceção.",
  ];

  if (feedback) {
    parts.push(`O rascunho anterior ficou inválido. Corrija estes pontos obrigatoriamente:\n${feedback}`);
  }

  return parts.join("\n\n");
};

const callOpenAIForFlow = async (apiKey: string, prompt: string, feedback?: string): Promise<FlowDraft> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
  if (!toolCall || toolCall.function?.name !== "create_whatsapp_flow") throw new Error("A OpenAI não retornou o fluxo estruturado.");

  try {
    return JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    throw new Error("A resposta da OpenAI não era um JSON válido.");
  }
};

const normalizeFlowDraft = (draft: FlowDraft, prompt: string) => {
  const rawNodes = Array.isArray(draft.nodes) ? draft.nodes : [];
  const rawEdges = Array.isArray(draft.edges) ? draft.edges : [];
  const seenIds = new Set<string>();

  const nodes = rawNodes.map((node: any, index: number) => {
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
  }).filter((n) => VALID_NODE_TYPES.includes(n.type as any)).slice(0, MAX_NODES);

  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const edges = rawEdges.map((edge: any) => ({
    source: normalizeText(edge?.source),
    target: normalizeText(edge?.target),
    source_handle: normalizeHandle(edge?.source_handle || edge?.sourceHandle),
    target_handle: normalizeHandle(edge?.target_handle || edge?.targetHandle),
  })).filter((e) => e.source && e.target && nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

  return { flow_name: normalizeText(draft.flow_name) || "Fluxo IA", nodes, edges };
};

const enrichFlowDraft = (draft: { flow_name: string; nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] }, prompt: string) => {
  const nodes = [...draft.nodes];
  const edges = [...draft.edges];

  // Ensure entry
  if (!nodes.some((n) => n.type === "entry")) {
    nodes.unshift({ id: "node_entry", type: "entry", label: "Entrada", position_x: 0, position_y: 300, config: { trigger_type: "first_message", keywords: [] } });
  }

  // Ensure end/handoff
  if (!nodes.some((n) => n.type === "end" || n.type === "handoff")) {
    const maxX = Math.max(...nodes.map((n) => n.position_x || 0), 0);
    nodes.push({ id: "node_end", type: "end", label: "Encerrar fluxo", position_x: maxX + 300, position_y: 300, config: {} });
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
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
    return { ...cleanNode, config: ensureNodeConfig(cleanNode, prompt, edgesBySource, nodeById) };
  });

  return { flow_name: draft.flow_name, nodes: enrichedNodes, edges };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, flow_id } = await req.json();
    if (!prompt || !flow_id) {
      return new Response(JSON.stringify({ error: "prompt e flow_id são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let flowDraft: { flow_name: string; nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] } | null = null;
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      console.log(`[generate-wa-flow] Calling OpenAI attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}...`);
      const rawDraft = await callOpenAIForFlow(OPENAI_API_KEY, prompt, attempt > 1 && lastIssues.length > 0 ? lastIssues.map((i) => `- ${i}`).join("\n") : undefined);
      const normalizedDraft = normalizeFlowDraft(rawDraft, prompt);
      const enrichedDraft = enrichFlowDraft(normalizedDraft, prompt);
      const issues = validateFlowDraft(enrichedDraft, prompt);

      flowDraft = enrichedDraft;
      lastIssues = issues;
      console.log(`[generate-wa-flow] Attempt ${attempt}: ${enrichedDraft.nodes.length} nodes, ${enrichedDraft.edges.length} edges, issues=${issues.length}`);
      if (issues.length === 0) break;
    }

    if (!flowDraft) throw new Error("Não foi possível gerar o fluxo.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Clean old data
    await sb.from("wa_flow_edges").delete().eq("flow_id", flow_id);
    await sb.from("wa_flow_nodes").delete().eq("flow_id", flow_id);

    // Insert nodes
    const nodeIdMap: Record<string, string> = {};
    for (const node of flowDraft.nodes) {
      let nodeConfig = node.config || {};
      if (node.type === "buttons") nodeConfig = normalizeButtonsConfig(nodeConfig);

      const { data, error } = await sb.from("wa_flow_nodes").insert({
        flow_id,
        node_type: node.type,
        name: node.label || node.type,
        config: nodeConfig,
        position_x: node.position_x || 0,
        position_y: node.position_y || 200,
      }).select("id").single();

      if (error) { console.error(`[generate-wa-flow] Node insert error for ${node.id}:`, error); continue; }
      nodeIdMap[node.id] = data.id;
    }

    console.log(`[generate-wa-flow] Inserted ${Object.keys(nodeIdMap).length} nodes`);

    // Insert edges
    let edgesInserted = 0;
    for (const edge of flowDraft.edges || []) {
      const sourceId = nodeIdMap[edge.source];
      const targetId = nodeIdMap[edge.target];
      if (!sourceId || !targetId) { console.warn(`[generate-wa-flow] Skipping edge ${edge.source}->${edge.target}: missing node`); continue; }

      const { error } = await sb.from("wa_flow_edges").insert({
        flow_id,
        source_node_id: sourceId,
        target_node_id: targetId,
        source_handle: normalizeHandle(edge.source_handle || edge.sourceHandle) || null,
        target_handle: normalizeHandle(edge.target_handle || edge.targetHandle) || null,
        label: null,
      });
      if (error) console.error("[generate-wa-flow] Edge insert error:", error);
      else edgesInserted++;
    }

    console.log(`[generate-wa-flow] Inserted ${edgesInserted} edges. Flow complete!`);

    // Auto-connect loose nodes to end
    const connectedSources = new Set((flowDraft.edges || []).map((e) => e.source));
    const connectedTargets = new Set((flowDraft.edges || []).map((e) => e.target));
    const terminalTypes = ["end", "handoff"];
    const looseNodes = flowDraft.nodes.filter((n) =>
      !connectedSources.has(n.id) && !terminalTypes.includes(n.type) && n.type !== "entry" && nodeIdMap[n.id],
    );
    const endNode = flowDraft.nodes.find((n) => n.type === "end" && nodeIdMap[n.id]);
    if (endNode && looseNodes.length > 0) {
      for (const looseNode of looseNodes) {
        if (connectedTargets.has(looseNode.id)) {
          await sb.from("wa_flow_edges").insert({
            flow_id,
            source_node_id: nodeIdMap[looseNode.id],
            target_node_id: nodeIdMap[endNode.id],
            source_handle: null, target_handle: null, label: null,
          });
          console.log(`[generate-wa-flow] Auto-connected loose node ${looseNode.id} to end`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, flow_name: flowDraft.flow_name || "Fluxo IA", validation_issues: lastIssues }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[generate-wa-flow] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
