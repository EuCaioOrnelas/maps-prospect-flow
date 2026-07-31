// chat-summarize: generates an executive summary of a conversation using Lovable AI (gpt-4o-mini equivalent).
// Enforces a per-user daily limit to protect margin.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ---- Registro de custo de IA (inline; sem módulo compartilhado) ----
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};
async function logAiUsage(p: {
  feature: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const model = p.model.replace(/^openai\//, "").trim();
    const tin = p.tokens_in ?? p.usage?.prompt_tokens ?? 0;
    const tout = p.tokens_out ?? p.usage?.completion_tokens ?? 0;
    const price = AI_PRICES[model] ?? AI_PRICES["gpt-4o-mini"];
    const cost = p.cost_usd ?? tin * price.in + tout * price.out;
    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: p.feature,
        model,
        user_id: p.user_id ?? null,
        tokens_in: Math.round(tin),
        tokens_out: Math.round(tout),
        cost_usd: Number(cost.toFixed(8)),
        metadata: p.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}
// ---- fim registro de custo de IA ----

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 10;
const MAX_MESSAGES = 80;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const { conversation_id } = await req.json();
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: corsHeaders });
    }

    // Verify ownership
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("id, user_id, contact_name, contact_phone")
      .eq("id", conversation_id)
      .eq("user_id", userId)
      .single();
    if (!conv) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });

    // Daily usage check
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const { data: usage } = await supabase
      .from("chat_ai_summary_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "daily_limit", limit: DAILY_LIMIT, used }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch last N messages
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("direction, message_type, content, media_caption, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(MAX_MESSAGES);

    const ordered = (msgs ?? []).reverse();
    if (ordered.length === 0) {
      return new Response(JSON.stringify({ summary: "Conversa sem mensagens." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = ordered
      .map((m) => {
        const who = m.direction === "inbound" ? (conv.contact_name || "Cliente") : "Nós";
        const body = m.content || m.media_caption || `[${m.message_type}]`;
        return `${who}: ${body}`;
      })
      .join("\n");

    const systemPrompt =
      "Você é um analista de atendimento. Gere um resumo executivo curto (máx 6 bullets) em português do Brasil sobre a conversa: objetivos do cliente, principais pedidos/objeções, status atual, próximos passos sugeridos. Seja direto, sem floreios.";

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversa com ${conv.contact_name || conv.contact_phone}:\n\n${transcript}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("[chat-summarize] ai error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 502, headers: corsHeaders });
    }
    const aiJson = await aiRes.json();
    logAiUsage({ feature: 'chat-summarize', model: 'gpt-4o-mini', usage: aiJson.usage, user_id: userId });
    const summary: string = aiJson?.choices?.[0]?.message?.content?.trim() ?? "";

    // Increment usage (upsert)
    await supabase.from("chat_ai_summary_usage").upsert(
      { user_id: userId, day: today, count: used + 1, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );

    // Cache
    await supabase.from("chat_conversation_summaries").insert({
      user_id: userId,
      conversation_id,
      summary,
      message_count: ordered.length,
    });

    return new Response(
      JSON.stringify({
        summary,
        usage: { used: used + 1, limit: DAILY_LIMIT },
        message_count: ordered.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[chat-summarize] error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
