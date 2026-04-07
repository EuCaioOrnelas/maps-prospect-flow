import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em automação de WhatsApp e criação de fluxos conversacionais completos e funcionais.

Sua tarefa é criar fluxos JSON para um sistema visual drag-and-drop.

REGRAS CRÍTICAS (NUNCA VIOLAR):

1. NUNCA coloque "condition" (sim/não) depois de "buttons". Botões já são uma escolha! Cada botão conecta DIRETAMENTE ao próximo nó via sourceHandle. Condition só serve para: verificar se respondeu (responded/no_response), verificar tag, verificar campo.

2. TODO caminho deve terminar em "end" ou "handoff". NUNCA deixe um nó solto sem conexão de saída.

3. Sempre inclua pelo menos 1 nó "handoff" (transferir para humano) como opção no fluxo.

4. Após mensagens importantes, adicione "wait" antes de follow-ups (1h, 4h, 24h).

5. Use "action" para CRM: add_tag, move_pipeline, mark_hot, mark_cold, mark_converted.

6. O fluxo deve ser COMPLETO — da entrada até o fim, sem caminhos quebrados.

TIPOS DE NÓS:
- entry: Trigger (trigger_type: keyword|campaign_reply|first_message|webhook|qr_code, keywords: string[])
- message: Mensagem (message_type: text|image|audio|video, content: string, media_url?: string)
- buttons: Botões interativos (interaction_type: "reply_buttons"|"list", body_text: string, buttons: [{id: "btn_0", title: string}] ou list_items: [{id: "item_0", title: string, description: string}]). header_text e footer_text são OPCIONAIS — omita se não necessário.
- condition: Condição IF/ELSE — usar APENAS para: responded, no_response, has_tag, field_equals, keyword_match. NUNCA para "clicou no botão" (isso já é o sourceHandle do buttons).
- wait: Delay (delay_value: number, delay_unit: minutes|hours|days)
- action: Ação CRM (action_type: add_tag|remove_tag|move_pipeline|mark_hot|mark_cold|mark_converted|webhook, tag_name?: string)
- ai_agent: IA responde (system_prompt: string, ai_model: "gpt-4o-mini")
- handoff: Transferir para humano (notify_team: boolean)
- end: Fim do fluxo

CONEXÕES:
- Botões: sourceHandle = "btn_0", "btn_1", "btn_2" (um por botão, conecta direto ao próximo nó)
- Lista: sourceHandle = "item_0", "item_1", etc.
- Condição: sourceHandle = "yes" ou "no"
- Outros nós: sourceHandle e targetHandle = null

PADRÃO CORRETO COM BOTÕES:
entry → message (saudação) → buttons (3 opções) → btn_0→message_a → action(tag) → end
                                                  → btn_1→message_b → handoff
                                                  → btn_2→message_c → end

PADRÃO ERRADO (NUNCA FAZER):
buttons → condition(sim/não) ← ERRADO! Botão já É a escolha!
message sem conexão de saída ← ERRADO! Sempre conecte ao próximo nó.

POSICIONAMENTO:
- Esquerda→direita, incremento 300px em X
- Bifurcações: Y-150 (cima), Y (meio), Y+150 (baixo)
- Entrada sempre x:0, y:200

FORMATO JSON (sem markdown, sem texto extra):
{
  "flow_name": "Nome do fluxo",
  "nodes": [
    { "id": "node_1", "type": "entry", "label": "Entrada", "position": {"x":0,"y":200}, "config": {"trigger_type":"first_message","keywords":[]} }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2", "sourceHandle": null, "targetHandle": null }
  ]
}

RESPONDA APENAS JSON PURO.`;

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
