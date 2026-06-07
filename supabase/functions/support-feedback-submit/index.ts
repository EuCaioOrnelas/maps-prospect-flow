import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ticketId, visitorSession, type, score, comment, npsScore, npsRecommend, npsComment, wasEscalated } = await req.json();
    if (!ticketId || typeof ticketId !== "string") throw new Error("ticketId required");
    if (!type || !["rating", "nps"].includes(type)) throw new Error("type invalid");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const auth = req.headers.get("Authorization");
    let requesterUserId: string | null = null;
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(token);
      requesterUserId = user?.id ?? null;
    }

    const { data: ticket, error: ticketErr } = await sb
      .from("support_tickets")
      .select("id, user_id, visitor_session, phase")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketErr) throw ticketErr;
    if (!ticket) throw new Error("ticket not found");
    if (ticket.user_id && ticket.user_id !== requesterUserId) throw new Error("ticket access denied");
    if (!ticket.user_id && (!visitorSession || ticket.visitor_session !== visitorSession)) throw new Error("ticket session mismatch");

    if (type === "rating") {
      const normalizedScore = Math.max(0, Math.min(10, Number(score)));
      if (!Number.isFinite(normalizedScore)) throw new Error("score invalid");
      const textComment = typeof comment === "string" ? comment.slice(0, 2000) : "";

      await sb.from("support_ratings").insert({
        ticket_id: ticket.id,
        stars: null,
        nps_score: normalizedScore,
        comment: textComment || null,
        resolved_by: wasEscalated ? "human" : "ai",
      });

      const ratingMsg = `⭐ **Avaliação do atendimento:** ${normalizedScore}/10${textComment.trim() ? `\n\n💬 **Como posso melhorar:** ${textComment.trim()}` : ""}`;
      await sb.from("support_messages").insert({ ticket_id: ticket.id, role: "user", content: ratingMsg });

      if (!wasEscalated) {
        await sb.from("support_tickets").update({ status: "resolved", phase: "rated", resolved_by: "ai", resolved_at: new Date().toISOString() }).eq("id", ticket.id);
      } else {
        await sb.from("support_tickets").update({ phase: "rated" }).eq("id", ticket.id);
      }

      await sb.from("support_ticket_events").insert({
        ticket_id: ticket.id,
        from_phase: wasEscalated ? "escalated" : "waiting_user_confirmation",
        to_phase: "rated",
        triggered_by: "user",
        metadata: { score: normalizedScore, has_comment: !!textComment.trim() },
      });
    }

    if (type === "nps") {
      const helpful = npsScore == null ? null : Math.max(0, Math.min(10, Number(npsScore)));
      const recommend = npsRecommend == null ? null : Math.max(0, Math.min(10, Number(npsRecommend)));
      await sb.from("support_ratings").insert({
        ticket_id: ticket.id,
        stars: null,
        nps_score: helpful,
        nps_recommend: recommend,
        nps_comment: typeof npsComment === "string" ? npsComment.slice(0, 2000) || null : null,
        resolved_by: wasEscalated ? "human" : "ai",
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[support-feedback-submit] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});