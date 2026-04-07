import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em automação de WhatsApp e criação de fluxos conversacionais avançados.

Sua tarefa é criar fluxos completos em formato JSON estruturado para um sistema visual drag-and-drop.

O fluxo deve:
- Ser lógico e organizado da esquerda para direita
- Incluir entrada, mensagens, decisões e saídas
- Usar botões interativos sempre que possível
- Incluir follow-ups automáticos quando fizer sentido
- Ter caminhos alternativos (true/false em condições)
- Considerar conversão de vendas
- Ter fallback ("não entendi")
- Incluir pelo menos: 1 entrada, 3+ mensagens, 1+ condição, 1 follow-up

TIPOS DE NÓS DISPONÍVEIS:
- entry: Nó de entrada/trigger (trigger_type: keyword|campaign_reply|button_click|webhook|qr_code|first_message|re_entry, keywords: string[])
- message: Envio de mensagem (message_type: text|image|audio|video|document|template, content: string, media_url: string, template_name: string)
- buttons: Botões interativos (interaction_type: "reply_buttons"|"list", body_text: string, buttons: [{id: "btn_0", title: string}], list_items: [{id: "item_0", title: string, description: string}]). IMPORTANT: interaction_type MUST be "reply_buttons" for buttons (NOT "buttons").
- condition: Condição IF/ELSE (condition_type: button_clicked|keyword_match|has_tag|field_equals|responded|no_response, condition_value: string)
- wait: Delay/espera (delay_value: number, delay_unit: minutes|hours|days, smart: boolean)
- action: Ação do sistema (action_type: add_tag|remove_tag|update_field|move_pipeline|send_to_crm|webhook|mark_hot|mark_cold|mark_converted)
- ai_agent: Agente IA que analisa respostas (system_prompt: string, ai_model: "gpt-4o-mini", ai_output_type: "message_and_route", ai_routes: string, ai_memory: boolean, max_chars: 500)
- handoff: Transferência para humano (notify_team: boolean)
- end: Fim do fluxo

FORMATO DE SAÍDA OBRIGATÓRIO (JSON puro, sem markdown):
{
  "flow_name": "Nome descritivo do fluxo",
  "nodes": [
    {
      "id": "node_1",
      "type": "entry",
      "label": "Entrada",
      "position": { "x": 0, "y": 200 },
      "config": { "trigger_type": "first_message", "keywords": [] }
    },
    {
      "id": "node_2",
      "type": "message",
      "label": "Saudação",
      "position": { "x": 300, "y": 200 },
      "config": { "message_type": "text", "content": "Olá! Como posso ajudar?" }
    }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2", "sourceHandle": null, "targetHandle": null }
  ]
}

REGRAS DE POSICIONAMENTO:
- Nós da esquerda para direita, incremento de 300px em X
- Bifurcações: caminho superior Y-150, caminho inferior Y+150
- Espaçamento vertical mínimo de 120px entre nós paralelos
- Entrada sempre em x:0

REGRAS DE CONEXÕES:
- Nós de condição têm sourceHandle "yes" e "no"
- Nós de botões têm sourceHandle "btn-0", "btn-1", "btn-2" etc
- Outros nós usam sourceHandle e targetHandle null

RESPONDA APENAS COM O JSON, sem texto extra, sem markdown code blocks.`;

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
    const validTypes = ["entry", "message", "buttons", "condition", "wait", "action", "handoff", "end", "ai_agent"];

    for (const node of flowData.nodes || []) {
      const nodeType = validTypes.includes(node.type) ? node.type : "message";
      const nodeConfig = node.config || {};

      // Normalize buttons node config
      if (nodeType === "buttons") {
        // Fix interaction_type: "buttons" → "reply_buttons"
        if (nodeConfig.interaction_type === "buttons" || !nodeConfig.interaction_type) {
          nodeConfig.interaction_type = "reply_buttons";
        }
        // Ensure buttons array has proper structure
        if (Array.isArray(nodeConfig.buttons)) {
          nodeConfig.buttons = nodeConfig.buttons.map((btn: any, i: number) => {
            if (typeof btn === "string") return { id: `btn_${i}`, title: btn };
            return { id: btn.id || `btn_${i}`, title: btn.title || `Opção ${i + 1}` };
          });
        }
        // Ensure list_items have proper structure
        if (Array.isArray(nodeConfig.list_items)) {
          nodeConfig.list_items = nodeConfig.list_items.map((item: any, i: number) => {
            if (typeof item === "string") return { id: `item_${i}`, title: item, description: "" };
            return { id: item.id || `item_${i}`, title: item.title || `Item ${i + 1}`, description: item.description || "" };
          });
        }
      }

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
        source_handle: edge.sourceHandle || null,
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
