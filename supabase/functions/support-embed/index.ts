// Gera embedding(s) usando OpenAI text-embedding-3-small e atualiza KB/FAQ.
// Modo single: { table, id, text }
// Modo bulk:   { table, bulk: true } -> embeda todos os registros sem embedding
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

async function embedText(text: string): Promise<number[] | null> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });
  if (!r.ok) {
    console.error("openai embed error", r.status, await r.text());
    return null;
  }
  const j = await r.json();
  logAiUsage({ feature: 'support-embed', model: 'text-embedding-3-small', tokens_in: j.usage?.prompt_tokens ?? 0, tokens_out: 0 });
  return j.data?.[0]?.embedding ?? null;
}

function buildText(table: string, row: any): string {
  if (table === "faqs") {
    const stripped = (row.content || "").replace(/<[^>]+>/g, " ");
    return `${row.title}\n\n${stripped}\n\nTags: ${(row.tags || []).join(", ")}`;
  }
  return `${row.title}\nDores: ${row.pains || ""}\nSolução: ${row.solution || ""}\n${row.content || ""}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { table, id, text, bulk } = body;

    if (!table || !["knowledge_base", "faqs"].includes(table)) {
      return new Response(JSON.stringify({ error: "invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (bulk) {
      const selectCols = table === "faqs"
        ? "id, title, content, tags"
        : "id, title, pains, solution";
      const { data: rows, error } = await sb
        .from(table)
        .select(selectCols)
        .is("embedding", null)
        .limit(200);
      if (error) throw error;

      let ok = 0, fail = 0;
      for (const row of rows ?? []) {
        const t = buildText(table, row);
        const emb = await embedText(t);
        if (!emb) { fail++; continue; }
        const { error: upErr } = await sb.from(table).update({ embedding: emb }).eq("id", (row as any).id);
        if (upErr) { fail++; console.error(upErr); } else { ok++; }
      }

      return new Response(JSON.stringify({ ok: true, processed: ok, failed: fail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!id || !text) {
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedding = await embedText(text);
    if (!embedding) {
      return new Response(JSON.stringify({ error: "embedding failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await sb.from(table).update({ embedding }).eq("id", id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
