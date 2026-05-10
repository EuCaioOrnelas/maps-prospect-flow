// Periodic clustering of recent escalated tickets into "incidents"
// Heurística simples: agrupa por (categoria + 3 keywords mais frequentes do título/resumo).
// Pode ser disparada por cron (pg_cron -> http) ou manualmente pelo admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STOP = new Set([
  "que","com","para","por","uma","uns","umas","dos","das","mas","como","quando","onde",
  "isso","esta","este","essa","esse","sobre","tem","ter","sou","esta","estou","aqui",
  "the","and","for","with","from","this","that","what","when","where","there","here",
  "wiize","wian","problema","erro","ajuda","ola","oi","favor","gostaria","preciso",
]);

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP.has(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: tickets } = await sb
      .from("support_tickets")
      .select("id, category, ai_summary, name, user_id, created_at")
      .in("status", ["escalated", "in_progress", "open"])
      .gte("created_at", since)
      .limit(500);

    if (!tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, clusters: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cluster: signature = category | top3 keywords
    const groups = new Map<string, { category: string; keywords: string[]; tickets: any[] }>();
    for (const t of tickets) {
      const cat = (t.category || "Outro").toLowerCase();
      const ks = tokens(`${t.ai_summary || ""}`);
      const freq: Record<string, number> = {};
      for (const k of ks) freq[k] = (freq[k] || 0) + 1;
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).sort();
      if (top.length < 2) continue; // sem keywords suficientes não vira incidente
      const sig = `${cat}|${top.join("+")}`;
      const g = groups.get(sig) || { category: cat, keywords: top, tickets: [] };
      g.tickets.push(t);
      groups.set(sig, g);
    }

    let created = 0;
    let updated = 0;
    for (const [sig, g] of groups) {
      if (g.tickets.length < 3) continue; // mínimo 3 ocorrências
      const users = new Set(g.tickets.map((t) => t.user_id).filter(Boolean));
      const sample = g.tickets.slice(0, 5).map((t) => t.id);
      const lastSeen = g.tickets.map((t) => new Date(t.created_at).getTime()).reduce((a, b) => Math.max(a, b), 0);
      const firstSeen = g.tickets.map((t) => new Date(t.created_at).getTime()).reduce((a, b) => Math.min(a, b), Date.now());
      const title = `${g.category[0].toUpperCase() + g.category.slice(1)}: ${g.keywords.join(", ")}`;

      const { data: existing } = await sb
        .from("support_incidents")
        .select("id, status")
        .eq("signature", sig)
        .maybeSingle();

      if (existing) {
        if (existing.status !== "dismissed" && existing.status !== "resolved") {
          await sb.from("support_incidents").update({
            ticket_count: g.tickets.length,
            affected_users: users.size,
            last_seen_at: new Date(lastSeen).toISOString(),
            sample_ticket_ids: sample,
            description: `Detectados ${g.tickets.length} chamados com padrão "${g.keywords.join(" + ")}".`,
          }).eq("id", existing.id);
          updated++;
        }
      } else {
        await sb.from("support_incidents").insert({
          title,
          description: `Detectados ${g.tickets.length} chamados com padrão "${g.keywords.join(" + ")}".`,
          category: g.category,
          status: "detected",
          ticket_count: g.tickets.length,
          affected_users: users.size,
          first_seen_at: new Date(firstSeen).toISOString(),
          last_seen_at: new Date(lastSeen).toISOString(),
          sample_ticket_ids: sample,
          signature: sig,
        });
        created++;
      }
    }

    return new Response(JSON.stringify({
      ok: true, processed: tickets.length, clusters: groups.size, created, updated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("incident-detector error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
