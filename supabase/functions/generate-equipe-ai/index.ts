import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_MODEL = "gpt-4o-mini";

const VALID_KINDS = [
  "goal", "memory", "knowledge", "crm_data", "data_collection",
  "rules", "decision", "tools", "actions", "escalation", "analysis",
] as const;

const SYSTEM_PROMPT = `Você é um arquiteto de "colaboradores IA" da Wiize. A partir da descrição do usuário, gere a configuração COMPLETA de um colaborador, pronta para abrir no canvas.

Você DEVE retornar:
- name: nome curto e marcante (até 40 chars)
- role: cargo/função (até 60 chars)
- description: 1-2 frases descrevendo o objetivo
- persona: tom de voz e estilo (1-2 frases)
- system_prompt: instrução completa para a IA (até 1200 chars), em primeira pessoa, com regras claras
- nodes: array com 5 a 9 cards (NUNCA repita a mesma "kind"), cobrindo o ciclo: objetivo, memória, conhecimento, dados, regras, ferramentas, ações, escalonamento, análise. Cada node:
  - kind: um de [goal, memory, knowledge, crm_data, data_collection, rules, decision, tools, actions, escalation, analysis]
  - title: título curto
  - summary: 1 frase explicando o que faz nesse caso específico
  - fields: SOMENTE para kind="data_collection" — lista de {key, label, type, required} (type ∈ text|email|phone|number|date)

Regras:
1. SEMPRE inclua pelo menos: goal, memory, rules, escalation.
2. Adapte títulos e summaries ao domínio descrito (não use textos genéricos).
3. data_collection deve ter de 2 a 5 campos plausíveis para o caso.
4. tools deve listar no summary as integrações úteis (CRM, WhatsApp, Agenda, Webhook etc.) para o caso.
5. Nunca crie kind="core".
6. JSON puro, sem markdown.`;

const TOOL = {
  type: "function",
  function: {
    name: "create_equipe",
    description: "Cria a configuração completa de um colaborador IA da Wiize.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        role: { type: "string" },
        description: { type: "string" },
        persona: { type: "string" },
        system_prompt: { type: "string" },
        nodes: {
          type: "array",
          minItems: 4,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              kind: { type: "string", enum: VALID_KINDS as unknown as string[] },
              title: { type: "string" },
              summary: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string" },
                    label: { type: "string" },
                    type: { type: "string", enum: ["text", "email", "phone", "number", "date"] },
                    required: { type: "boolean" },
                  },
                  required: ["key", "label", "type"],
                },
              },
            },
            required: ["kind", "title", "summary"],
          },
        },
      },
      required: ["name", "role", "description", "persona", "system_prompt", "nodes"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "prompt obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Descrição do colaborador desejado:\n${prompt.trim()}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "create_equipe" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: `OpenAI: ${txt}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Sem resposta estruturada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function?.arguments ?? "{}");
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize nodes: unique kinds, valid kind, cap to 9
    const rawNodes = Array.isArray((parsed as { nodes?: unknown }).nodes) ? (parsed as { nodes: unknown[] }).nodes : [];
    const seen = new Set<string>();
    const nodes = rawNodes
      .map((n) => n as { kind?: string; title?: string; summary?: string; fields?: unknown })
      .filter((n) => typeof n?.kind === "string" && (VALID_KINDS as readonly string[]).includes(n.kind))
      .filter((n) => {
        if (seen.has(n.kind!)) return false;
        seen.add(n.kind!);
        return true;
      })
      .slice(0, 9)
      .map((n) => ({
        kind: n.kind,
        title: typeof n.title === "string" ? n.title : "",
        summary: typeof n.summary === "string" ? n.summary : "",
        fields: n.kind === "data_collection" && Array.isArray(n.fields) ? n.fields : undefined,
      }));

    return new Response(
      JSON.stringify({
        name: String((parsed as { name?: string }).name ?? "Colaborador IA").slice(0, 60),
        role: String((parsed as { role?: string }).role ?? "").slice(0, 100),
        description: String((parsed as { description?: string }).description ?? "").slice(0, 500),
        persona: String((parsed as { persona?: string }).persona ?? "").slice(0, 500),
        system_prompt: String((parsed as { system_prompt?: string }).system_prompt ?? "").slice(0, 2000),
        nodes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
