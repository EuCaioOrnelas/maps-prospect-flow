import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um arquiteto de fluxos conversacionais para WhatsApp. Você cria fluxos JSON PERFEITOS para um editor visual drag-and-drop.

=== REGRAS ABSOLUTAS (VIOLAÇÃO = ERRO FATAL) ===

1. PROIBIDO: "condition" depois de "buttons". Botões JÁ SÃO escolhas! Cada botão conecta DIRETAMENTE ao próximo nó via sourceHandle (btn_0, btn_1, btn_2).
   - Condition serve APENAS para: verificar se respondeu (responded/no_response), verificar tag (has_tag), verificar campo (field_equals).

2. ZERO NÓS SOLTOS: Todo nó DEVE ter conexão de entrada E saída. Exceção: "entry" (só saída) e "end"/"handoff" (só entrada).

3. TODO CAMINHO TERMINA: Cada ramificação do fluxo DEVE terminar em "end" ou "handoff". Sem exceção.

4. FLUXO LINEAR SIMPLES: Para prompts complexos com muitas categorias/intenções, use um ÚNICO nó "ai_agent" que processa tudo, em vez de criar dezenas de nós separados. O agente IA já classifica e responde automaticamente.

5. MÁXIMO 15 NÓS: Mantenha fluxos concisos. Se o prompt tem muitas categorias, use "ai_agent" para processar — NÃO crie um nó message para cada categoria.

=== TIPOS DE NÓS ===
- entry: Gatilho (config: {trigger_type: "first_message"|"keyword"|"campaign_reply"|"webhook"|"qr_code", keywords: []})
- message: Mensagem (config: {message_type: "text"|"image"|"audio"|"video", content: "texto"})
- buttons: Botões interativos (config: {interaction_type: "reply_buttons", body_text: "texto", buttons: [{id: "btn_0", title: "Opção 1"}, {id: "btn_1", title: "Opção 2"}]})
- condition: Condição (config: {condition_type: "responded"|"no_response"|"has_tag"|"field_equals", condition_value: "valor"})
- wait: Espera (config: {delay_value: 5, delay_unit: "minutes"|"hours"|"days"})
- action: Ação CRM (config: {action_type: "add_tag"|"remove_tag"|"move_pipeline"|"mark_hot"|"mark_cold"|"mark_converted"|"webhook", tag_name: "nome"})
- ai_agent: Agente IA (config: {system_prompt: "instruções completas do agente", ai_model: "gpt-4o-mini"})
- handoff: Transferir para humano (config: {notify_team: true})
- end: Fim do fluxo (config: {})

=== CONEXÕES (EDGES) ===
- Nós normais: sourceHandle = null, targetHandle = null
- Botões: sourceHandle = "btn_0", "btn_1", "btn_2" (um por botão)
- Condição: sourceHandle = "yes" ou "no"

=== POSICIONAMENTO (CRÍTICO!) ===
- Layout esquerda→direita, espaçamento de 300px em X
- Primeira linha Y=200
- Bifurcações: cada ramo +200px em Y
- Entry sempre em x:0, y:200
- NÓS NUNCA DEVEM SOBREPOR! Calcule Y com cuidado.

=== PADRÃO PARA PROMPTS DE SUPORTE/ATENDIMENTO ===
Quando o prompt descreve um agente de suporte com múltiplas categorias (login, pagamento, técnico, etc.):

NÃO FAÇA: Criar um nó message separado para cada categoria → isso gera fluxo gigante e desconexo!
FAÇA: Use ai_agent com o prompt completo do usuário.

Estrutura ideal:
entry → message(saudação) → ai_agent(com todo o prompt do usuário como system_prompt) → condition(responded?) → yes→message(confirmação) → condition(resolveu?) → yes→action(mark_converted)→end / no→handoff
                                                                                                                                                                                              → no→wait(1h)→message(follow-up)→end

=== PADRÃO PARA FLUXOS SIMPLES (vendas, agendamento) ===
entry → message(saudação) → buttons(opções) → btn_0→message→action→end
                                             → btn_1→message→handoff
                                             → btn_2→message→end

=== EXEMPLO COMPLETO DE SUPORTE ===
{
  "flow_name": "Suporte Automatizado",
  "nodes": [
    {"id":"node_1","type":"entry","label":"Entrada","position":{"x":0,"y":300},"config":{"trigger_type":"first_message","keywords":[]}},
    {"id":"node_2","type":"message","label":"Boas-vindas","position":{"x":300,"y":300},"config":{"message_type":"text","content":"Olá! 👋 Bem-vindo ao suporte. Como posso ajudar?"}},
    {"id":"node_3","type":"ai_agent","label":"Agente IA","position":{"x":600,"y":300},"config":{"system_prompt":"COLE_AQUI_O_PROMPT_DO_USUARIO","ai_model":"gpt-4o-mini"}},
    {"id":"node_4","type":"condition","label":"Respondeu?","position":{"x":900,"y":300},"config":{"condition_type":"responded","condition_value":"true"}},
    {"id":"node_5","type":"message","label":"Confirmação","position":{"x":1200,"y":200},"config":{"message_type":"text","content":"Fico feliz em ajudar! Posso ajudar em mais alguma coisa?"}},
    {"id":"node_6","type":"action","label":"Tag Resolvido","position":{"x":1500,"y":200},"config":{"action_type":"add_tag","tag_name":"suporte_resolvido"}},
    {"id":"node_7","type":"end","label":"Fim do Fluxo","position":{"x":1800,"y":200},"config":{}},
    {"id":"node_8","type":"wait","label":"Espera 1h","position":{"x":1200,"y":450},"config":{"delay_value":1,"delay_unit":"hours"}},
    {"id":"node_9","type":"handoff","label":"Escalar Atendimento","position":{"x":1500,"y":450},"config":{"notify_team":true}}
  ],
  "edges": [
    {"source":"node_1","target":"node_2","sourceHandle":null,"targetHandle":null},
    {"source":"node_2","target":"node_3","sourceHandle":null,"targetHandle":null},
    {"source":"node_3","target":"node_4","sourceHandle":null,"targetHandle":null},
    {"source":"node_4","target":"node_5","sourceHandle":"yes","targetHandle":null},
    {"source":"node_4","target":"node_8","sourceHandle":"no","targetHandle":null},
    {"source":"node_5","target":"node_6","sourceHandle":null,"targetHandle":null},
    {"source":"node_6","target":"node_7","sourceHandle":null,"targetHandle":null},
    {"source":"node_8","target":"node_9","sourceHandle":null,"targetHandle":null}
  ]
}

=== EXEMPLO COM BOTÕES (VENDAS) ===
{
  "flow_name": "Atendimento Vendas",
  "nodes": [
    {"id":"node_1","type":"entry","label":"Entrada","position":{"x":0,"y":300},"config":{"trigger_type":"first_message","keywords":[]}},
    {"id":"node_2","type":"message","label":"Saudação","position":{"x":300,"y":300},"config":{"message_type":"text","content":"Olá! Seja bem-vindo 😊"}},
    {"id":"node_3","type":"buttons","label":"Menu Principal","position":{"x":600,"y":300},"config":{"interaction_type":"reply_buttons","body_text":"Como posso ajudar?","buttons":[{"id":"btn_0","title":"Ver produtos"},{"id":"btn_1","title":"Falar com vendedor"},{"id":"btn_2","title":"Suporte"}]}},
    {"id":"node_4","type":"message","label":"Catálogo","position":{"x":900,"y":100},"config":{"message_type":"text","content":"Confira nosso catálogo: link.com/catalogo"}},
    {"id":"node_5","type":"action","label":"Tag Interessado","position":{"x":1200,"y":100},"config":{"action_type":"add_tag","tag_name":"interessado"}},
    {"id":"node_6","type":"end","label":"Fim","position":{"x":1500,"y":100},"config":{}},
    {"id":"node_7","type":"handoff","label":"Vendedor","position":{"x":900,"y":300},"config":{"notify_team":true}},
    {"id":"node_8","type":"ai_agent","label":"Suporte IA","position":{"x":900,"y":500},"config":{"system_prompt":"Responda dúvidas de suporte de forma clara e objetiva.","ai_model":"gpt-4o-mini"}},
    {"id":"node_9","type":"end","label":"Fim Suporte","position":{"x":1200,"y":500},"config":{}}
  ],
  "edges": [
    {"source":"node_1","target":"node_2","sourceHandle":null,"targetHandle":null},
    {"source":"node_2","target":"node_3","sourceHandle":null,"targetHandle":null},
    {"source":"node_3","target":"node_4","sourceHandle":"btn_0","targetHandle":null},
    {"source":"node_3","target":"node_7","sourceHandle":"btn_1","targetHandle":null},
    {"source":"node_3","target":"node_8","sourceHandle":"btn_2","targetHandle":null},
    {"source":"node_4","target":"node_5","sourceHandle":null,"targetHandle":null},
    {"source":"node_5","target":"node_6","sourceHandle":null,"targetHandle":null},
    {"source":"node_8","target":"node_9","sourceHandle":null,"targetHandle":null}
  ]
}

=== INSTRUÇÕES FINAIS ===
- Analise o prompt do usuário e decida: se é complexo com muitas categorias → use ai_agent. Se é simples com poucas opções → use buttons.
- SEMPRE inclua pelo menos 1 handoff e 1 end.
- SEMPRE adicione action nodes para CRM quando fizer sentido.
- Use wait antes de follow-ups.
- RESPONDA APENAS JSON PURO, sem markdown, sem texto, sem explicações.`;

const normalizeHandle = (value?: string | null) => {
  if (!value) return null;
  if (/^(btn|item)-\d+$/i.test(value)) return value.replace("-", "_");
  return value;
};

const normalizeInteractiveItem = (item: any, index: number, prefix: "btn" | "item") => {
  if (typeof item === "string") {
    return {
      id: `${prefix}_${index}`,
      title: item,
      ...(prefix === "item" ? { description: "" } : {}),
    };
  }

  return {
    id: item?.id || `${prefix}_${index}`,
    title: item?.title || `${prefix === "item" ? "Item" : "Opção"} ${index + 1}`,
    ...(prefix === "item" ? { description: item?.description || "" } : {}),
  };
};

const normalizeButtonsConfig = (config: any = {}) => {
  const nodeConfig = { ...config };

  if (nodeConfig.interaction_type === "buttons" || !nodeConfig.interaction_type) {
    nodeConfig.interaction_type = "reply_buttons";
  }

  if (!nodeConfig.header_text) {
    nodeConfig.header_text =
      typeof nodeConfig.header === "string"
        ? nodeConfig.header
        : typeof nodeConfig.header?.text === "string"
          ? nodeConfig.header.text
          : "";
  }

  if (!nodeConfig.footer_text) {
    nodeConfig.footer_text =
      typeof nodeConfig.footer === "string"
        ? nodeConfig.footer
        : typeof nodeConfig.footer?.text === "string"
          ? nodeConfig.footer.text
          : "";
  }

  nodeConfig.header_text = typeof nodeConfig.header_text === "string" ? nodeConfig.header_text.trim() : "";
  nodeConfig.footer_text = typeof nodeConfig.footer_text === "string" ? nodeConfig.footer_text.trim() : "";

  if (nodeConfig.interaction_type === "list") {
    const rawItems = Array.isArray(nodeConfig.list_items)
      ? nodeConfig.list_items
      : Array.isArray(nodeConfig.items)
        ? nodeConfig.items
        : [];

    nodeConfig.list_items = rawItems.map((item: any, index: number) => normalizeInteractiveItem(item, index, "item"));
    nodeConfig.list_button_text =
      typeof nodeConfig.list_button_text === "string" && nodeConfig.list_button_text.trim()
        ? nodeConfig.list_button_text.trim()
        : "Ver opções";
    delete nodeConfig.buttons;
  } else {
    nodeConfig.interaction_type = "reply_buttons";
    const rawButtons = Array.isArray(nodeConfig.buttons)
      ? nodeConfig.buttons
      : Array.isArray(nodeConfig.options)
        ? nodeConfig.options
        : [];

    nodeConfig.buttons = rawButtons.map((button: any, index: number) => normalizeInteractiveItem(button, index, "btn"));
    delete nodeConfig.list_items;
  }

  delete nodeConfig.header;
  delete nodeConfig.footer;
  delete nodeConfig.items;
  delete nodeConfig.options;

  return nodeConfig;
};

const getAllowedButtonHandles = (config: any = {}) => {
  const isListMode = config.interaction_type === "list";
  const rawItems = isListMode ? (config.list_items || []) : (config.buttons || []);
  const prefix = isListMode ? "item" : "btn";

  return rawItems.map((item: any, index: number) => {
    if (typeof item === "string") return `${prefix}_${index}`;
    return item?.id || `${prefix}_${index}`;
  });
};

const normalizeEdgeSourceHandle = (sourceHandle: string | null, sourceNode: any) => {
  if (!sourceHandle || !sourceNode || sourceNode.type !== "buttons") {
    return normalizeHandle(sourceHandle);
  }

  const normalizedHandle = normalizeHandle(sourceHandle);
  const allowedHandles = getAllowedButtonHandles(sourceNode.config || {});
  const matchedHandle = allowedHandles.find((handle: string) => normalizeHandle(handle) === normalizedHandle);

  return matchedHandle || normalizedHandle;
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

    // Call OpenAI
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "Erro na geração com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let flowData: any;
    try {
      flowData = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ error: "Resposta da IA não é JSON válido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Insert nodes
    const nodeIdMap: Record<string, string> = {};
    const normalizedNodesMap: Record<string, any> = {};
    const validTypes = ["entry", "message", "buttons", "condition", "wait", "action", "handoff", "end", "ai_agent"];

    for (const node of flowData.nodes || []) {
      const nodeType = validTypes.includes(node.type) ? node.type : "message";
      let nodeConfig = node.config || {};

      // Normalize buttons node config
      if (nodeType === "buttons") {
        nodeConfig = normalizeButtonsConfig(nodeConfig);
      }

      normalizedNodesMap[node.id] = { ...node, type: nodeType, config: nodeConfig };

      const { data, error } = await sb
        .from("wa_flow_nodes")
        .insert({
          flow_id,
          node_type: nodeType,
          name: node.label || node.type,
          config: nodeConfig,
          position_x: node.position?.x || 0,
          position_y: node.position?.y || 200,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Node insert error:", error);
        continue;
      }
      nodeIdMap[node.id] = data.id;
    }

    // Insert edges
    for (const edge of flowData.edges || []) {
      const sourceId = nodeIdMap[edge.source];
      const targetId = nodeIdMap[edge.target];
      if (!sourceId || !targetId) continue;

      await sb.from("wa_flow_edges").insert({
        flow_id,
        source_node_id: sourceId,
        target_node_id: targetId,
        source_handle: normalizeEdgeSourceHandle(edge.sourceHandle || null, normalizedNodesMap[edge.source]) || null,
        target_handle: edge.targetHandle || null,
        label: edge.label || null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, flow_name: flowData.flow_name || "Fluxo IA" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-wa-flow error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
