import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_NODE_TYPES = ["entry", "message", "buttons", "condition", "wait", "action", "ai_agent", "handoff", "end"];

const SYSTEM_PROMPT = `Você é um arquiteto expert em fluxos conversacionais para WhatsApp Business. Gere fluxos PERFEITOS seguindo estas regras:

=== TIPOS DE NÓS PERMITIDOS ===
entry, message, buttons, condition, wait, action, ai_agent, handoff, end

=== REGRAS OBRIGATÓRIAS ===

1. SEMPRE comece com um nó "entry" e termine TODOS os caminhos com "end" ou "handoff".

2. BOTÕES: Nunca coloque "condition" depois de "buttons". Botões conectam DIRETAMENTE ao próximo nó via sourceHandle (btn_0, btn_1, btn_2).

3. CONDITION: Use APENAS para verificar se o lead respondeu (responded/no_response). sourceHandle é "yes" ou "no".

4. WAIT: Use entre mensagens quando faz sentido dar tempo ao lead (follow-ups, lembretes). Valores: delay_value + delay_unit (minutes/hours/days).

5. ACTION: Use para integração CRM. Tipos: add_tag, remove_tag, move_pipeline, mark_hot, mark_cold, mark_converted, webhook.

6. AI_AGENT: Para prompts complexos com muitas categorias/intenções, use UM nó ai_agent com o prompt completo como system_prompt. NÃO crie dezenas de message nodes separados.

7. HANDOFF: Sempre inclua pelo menos 1 handoff para escalonamento humano.

8. CONECTIVIDADE: TODO nó deve ter pelo menos uma conexão de entrada E uma de saída. Exceções: entry (só saída), end/handoff (só entrada).

9. MÁXIMO 25 NÓS.

=== POSICIONAMENTO ===
- Layout esquerda→direita, X incrementa 300px por etapa
- Entry em x:0, y:300
- Bifurcações: cada ramo separado por 200px em Y
- Nós NUNCA devem sobrepor

=== PADRÕES DE FLUXO ===

SUPORTE/ATENDIMENTO COMPLEXO:
entry → message(saudação) → ai_agent(prompt completo) → condition(responded?) → yes: message(confirmação) → action(tag) → end / no: wait(1h) → handoff

VENDAS COM OPÇÕES:
entry → message(saudação) → buttons(menu) → btn_0: message → action → end / btn_1: handoff / btn_2: message → end

CAPTAÇÃO DE LEADS:
entry → message(saudação) → message(pergunta qualificadora) → wait(5min) → condition(responded?) → yes: action(mark_hot) → handoff / no: message(follow-up) → wait(1d) → end

=== CONFIG POR TIPO ===
- entry: {trigger_type: "first_message"|"keyword"|"campaign_reply", keywords: []}
- message: {message_type: "text", content: "texto da mensagem"}
- buttons: {interaction_type: "reply_buttons", body_text: "texto", buttons: [{id: "btn_0", title: "Texto"}]}
- condition: {condition_type: "responded"|"no_response", condition_value: "true"}
- wait: {delay_value: number, delay_unit: "minutes"|"hours"|"days"}
- action: {action_type: "add_tag"|"mark_hot"|"mark_converted"|"move_pipeline"|"webhook", tag_name: "nome"}
- ai_agent: {system_prompt: "instruções do agente", ai_model: "gpt-4o-mini"}
- handoff: {notify_team: true}
- end: {}`;

const FLOW_TOOL = {
  type: "function",
  function: {
    name: "create_whatsapp_flow",
    description: "Cria um fluxo conversacional completo para WhatsApp com nós e conexões. IMPORTANTE: cada nó DEVE ter config preenchido conforme seu tipo.",
    parameters: {
      type: "object",
      properties: {
        flow_name: {
          type: "string",
          description: "Nome descritivo do fluxo"
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID único (node_1, node_2, etc)" },
              type: { type: "string", enum: VALID_NODE_TYPES },
              label: { type: "string", description: "Nome exibido no editor" },
              position_x: { type: "number" },
              position_y: { type: "number" },
              config: {
                type: "object",
                description: `OBRIGATÓRIO conforme tipo do nó:
- entry: {"trigger_type":"first_message","keywords":[]}
- message: {"message_type":"text","content":"texto real da mensagem aqui"}
- buttons: {"interaction_type":"reply_buttons","body_text":"pergunta","buttons":[{"id":"btn_0","title":"Opção 1"},{"id":"btn_1","title":"Opção 2"}]}
- condition: {"condition_type":"responded","condition_value":"true"}
- wait: {"delay_value":5,"delay_unit":"minutes"}
- action: {"action_type":"add_tag","tag_name":"nome_da_tag"}
- ai_agent: {"system_prompt":"instruções completas do agente de IA aqui","ai_model":"gpt-4o-mini"}
- handoff: {"notify_team":true}
- end: {}
NUNCA deixe config vazio exceto para end!`
              }
            },
            required: ["id", "type", "label", "position_x", "position_y", "config"]
          }
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string", description: "ID do nó de origem" },
              target: { type: "string", description: "ID do nó de destino" },
              source_handle: { type: "string", description: "btn_0, btn_1, yes, no, ou null" },
              target_handle: { type: "string" }
            },
            required: ["source", "target"]
          }
        }
      },
      required: ["flow_name", "nodes", "edges"]
    }
  }
};

const normalizeHandle = (value?: string | null) => {
  if (!value) return null;
  if (/^(btn|item)-\d+$/i.test(value)) return value.replace("-", "_");
  return value;
};

const normalizeButtonsConfig = (config: any = {}) => {
  const nodeConfig = { ...config };

  if (!nodeConfig.interaction_type || nodeConfig.interaction_type === "buttons") {
    nodeConfig.interaction_type = "reply_buttons";
  }

  nodeConfig.header_text = typeof nodeConfig.header_text === "string" ? nodeConfig.header_text.trim() : "";
  nodeConfig.footer_text = typeof nodeConfig.footer_text === "string" ? nodeConfig.footer_text.trim() : "";

  if (nodeConfig.interaction_type === "list") {
    const rawItems = Array.isArray(nodeConfig.list_items) ? nodeConfig.list_items : Array.isArray(nodeConfig.items) ? nodeConfig.items : [];
    nodeConfig.list_items = rawItems.map((item: any, i: number) => ({
      id: item?.id || `item_${i}`,
      title: (typeof item === "string" ? item : item?.title) || `Item ${i + 1}`,
      description: item?.description || "",
    }));
    nodeConfig.list_button_text = nodeConfig.list_button_text || "Ver opções";
    delete nodeConfig.buttons;
  } else {
    nodeConfig.interaction_type = "reply_buttons";
    const rawButtons = Array.isArray(nodeConfig.buttons) ? nodeConfig.buttons : Array.isArray(nodeConfig.options) ? nodeConfig.options : [];
    nodeConfig.buttons = rawButtons.map((btn: any, i: number) => ({
      id: btn?.id || `btn_${i}`,
      title: (typeof btn === "string" ? btn : btn?.title) || `Opção ${i + 1}`,
    }));
    delete nodeConfig.list_items;
  }

  delete nodeConfig.header;
  delete nodeConfig.footer;
  delete nodeConfig.items;
  delete nodeConfig.options;

  return nodeConfig;
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

    console.log("[generate-wa-flow] Calling OpenAI with tool calling...");

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
          { role: "user", content: `Crie um fluxo WhatsApp para: ${prompt}` },
        ],
        tools: [FLOW_TOOL],
        tool_choice: { type: "function", function: { name: "create_whatsapp_flow" } },
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[generate-wa-flow] OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "Erro na geração com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "create_whatsapp_flow") {
      console.error("[generate-wa-flow] No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "IA não retornou o fluxo estruturado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let flowData: any;
    try {
      flowData = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("[generate-wa-flow] Failed to parse tool args:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Resposta da IA não é JSON válido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-wa-flow] Parsed ${flowData.nodes?.length} nodes, ${flowData.edges?.length} edges`);

    // Setup Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Clean existing nodes/edges for this flow (in case of retry)
    await sb.from("wa_flow_edges").delete().eq("flow_id", flow_id);
    await sb.from("wa_flow_nodes").delete().eq("flow_id", flow_id);

    // Validate and filter nodes
    const validNodes = (flowData.nodes || []).filter((n: any) => VALID_NODE_TYPES.includes(n.type));
    
    // Ensure there's exactly one entry node
    const entryNodes = validNodes.filter((n: any) => n.type === "entry");
    if (entryNodes.length === 0) {
      validNodes.unshift({
        id: "node_entry",
        type: "entry",
        label: "Entrada",
        position_x: 0,
        position_y: 300,
        config: { trigger_type: "first_message", keywords: [] }
      });
    }

    // Ensure at least one end node
    const endNodes = validNodes.filter((n: any) => n.type === "end" || n.type === "handoff");
    if (endNodes.length === 0) {
      const maxX = Math.max(...validNodes.map((n: any) => n.position_x || 0));
      validNodes.push({
        id: "node_end",
        type: "end",
        label: "Fim do Fluxo",
        position_x: maxX + 300,
        position_y: 300,
        config: {}
      });
    }

    // Insert nodes
    const nodeIdMap: Record<string, string> = {};

    for (const node of validNodes) {
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

    // Insert edges - only for nodes that were successfully inserted
    let edgesInserted = 0;
    for (const edge of flowData.edges || []) {
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
        console.error(`[generate-wa-flow] Edge insert error:`, error);
      } else {
        edgesInserted++;
      }
    }

    console.log(`[generate-wa-flow] Inserted ${edgesInserted} edges. Flow complete!`);

    // Post-processing: find disconnected nodes and connect them to end
    const connectedSources = new Set((flowData.edges || []).map((e: any) => e.source));
    const connectedTargets = new Set((flowData.edges || []).map((e: any) => e.target));
    
    // Find terminal nodes (have no outgoing edge, aren't end/handoff)
    const looseNodes = validNodes.filter((n: any) => 
      !connectedSources.has(n.id) && 
      n.type !== "end" && 
      n.type !== "handoff" && 
      n.type !== "entry" &&
      nodeIdMap[n.id]
    );

    // Find the first end node
    const endNodeId = validNodes.find((n: any) => n.type === "end" && nodeIdMap[n.id]);
    
    if (endNodeId && looseNodes.length > 0) {
      for (const looseNode of looseNodes) {
        // Only connect if this node has incoming connections (it's reachable)
        if (connectedTargets.has(looseNode.id)) {
          await sb.from("wa_flow_edges").insert({
            flow_id,
            source_node_id: nodeIdMap[looseNode.id],
            target_node_id: nodeIdMap[endNodeId.id],
            source_handle: null,
            target_handle: null,
            label: null,
          });
          console.log(`[generate-wa-flow] Auto-connected loose node ${looseNode.id} to end`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, flow_name: flowData.flow_name || "Fluxo IA" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-wa-flow] error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
