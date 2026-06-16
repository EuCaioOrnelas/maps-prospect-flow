import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InMsg { role: "user" | "assistant"; content: string }
interface Body { workforceId: string; messages: InMsg[] }

function nodeSummary(nodes: any[]): string {
  if (!Array.isArray(nodes) || nodes.length === 0) return "";
  return nodes
    .map((n) => {
      const k = n?.data?.kind ?? "node";
      const t = n?.data?.title ?? "";
      const s = n?.data?.summary ?? "";
      const fields = Array.isArray(n?.data?.fields) && n.data.fields.length
        ? `\n  Campos: ${n.data.fields.map((f: any) => `${f.label || f.key}${f.required ? "*" : ""}`).join(", ")}`
        : "";
      return `- [${k}] ${t}${s ? `: ${s}` : ""}${fields}`;
    })
    .join("\n");
}

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workforceId, messages } = (await req.json()) as Body;
    if (!workforceId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: worker, error: wErr } = await supabase
      .from("ai_workforce")
      .select("*")
      .eq("id", workforceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (wErr || !worker) {
      return new Response(JSON.stringify({ error: "Colaborador não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canvas } = await supabase
      .from("ai_workforce_canvas")
      .select("nodes")
      .eq("workforce_id", workforceId)
      .maybeSingle();

    const structure = nodeSummary((canvas?.nodes as any[]) ?? []);

    const systemPrompt =
      `Você é "${worker.name}", um colaborador digital da Equipe IA.\n` +
      `Função: ${worker.role || "—"}\n` +
      `Descrição: ${worker.description || "—"}\n` +
      (worker.persona ? `Persona: ${worker.persona}\n` : "") +
      `\nEstrutura do colaborador (cards configurados no construtor):\n${structure || "Nenhum card configurado ainda."}\n` +
      `\nResponda como esse colaborador em uma conversa de teste com um humano. Seja natural, ` +
      `siga o objetivo e regras descritos. Não invente dados. Mantenha respostas curtas e claras.`;

    const chat = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chat,
        temperature: typeof worker.temperature === "number" ? worker.temperature : 0.7,
        max_tokens: 600,
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: `Erro IA: ${txt.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
