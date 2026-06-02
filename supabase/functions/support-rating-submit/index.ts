// Recebe a submissão pública da página de avaliação (via rating_token).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, nps_score, nps_recommend, nps_comment } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: ticket, error: tErr } = await sb
      .from("support_tickets")
      .select("id, ticket_number, name, email, category")
      .eq("rating_token", token)
      .maybeSingle();
    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "Avaliação inválida ou expirada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const helpful = nps_score == null ? null : Math.max(0, Math.min(10, Number(nps_score)));
    const recommend = nps_recommend == null ? null : Math.max(0, Math.min(10, Number(nps_recommend)));

    const { error: insErr } = await sb.from("support_ratings").insert({
      ticket_id: ticket.id,
      nps_score: helpful,
      nps_recommend: recommend,
      nps_comment: (nps_comment || "").toString().slice(0, 2000) || null,
      resolved_by: "customer",
    });
    if (insErr) throw insErr;

    await sb.from("support_tickets")
      .update({ phase: "rated", rating_token: null })
      .eq("id", ticket.id);

    return new Response(JSON.stringify({
      ok: true,
      ticket: { number: ticket.ticket_number, name: ticket.name, category: ticket.category },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[support-rating-submit] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
