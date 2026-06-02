// Cron job: encerra tickets sem resposta do cliente há mais de 72h e envia follow-up + avaliação.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // Candidatos: status ativo + último contato do cliente OU última resposta do suporte > 72h e ainda sem follow-up
    const { data: candidates, error } = await sb
      .from("support_tickets")
      .select("id, ticket_number, email, last_customer_reply_at, last_support_reply_at, updated_at, status, autoclose_followup_sent_at")
      .in("status", ["open", "in_progress", "escalated"])
      .is("autoclose_followup_sent_at", null)
      .not("email", "is", null);

    if (error) throw error;

    const toProcess = (candidates || []).filter((t) => {
      // Só fechamos se houve pelo menos uma resposta do suporte e o cliente não respondeu há 72h
      const lastSupport = t.last_support_reply_at ? new Date(t.last_support_reply_at).getTime() : 0;
      if (!lastSupport) return false;
      const lastCustomer = t.last_customer_reply_at ? new Date(t.last_customer_reply_at).getTime() : 0;
      const reference = Math.max(lastSupport, lastCustomer);
      return Date.now() - reference > 72 * 60 * 60 * 1000;
    });

    const results: any[] = [];
    for (const t of toProcess) {
      try {
        await sb.from("support_tickets").update({
          status: "closed",
          phase: "closed",
          resolved_at: new Date().toISOString(),
          resolved_by: "auto_no_reply",
        }).eq("id", t.id);

        await sb.from("support_ticket_events").insert({
          ticket_id: t.id,
          from_phase: "human_assigned",
          to_phase: "closed",
          triggered_by: "system",
          metadata: { reason: "auto_close_72h_no_reply" },
        });

        // Dispara e-mail de follow-up + avaliação
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/support-email-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ type: "customer_autoclose_followup", ticketId: t.id }),
        });

        results.push({ id: t.id, ticket: t.ticket_number, ok: true });
      } catch (err) {
        console.error("[autoclose] falha em", t.id, err);
        results.push({ id: t.id, ok: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[support-ticket-autoclose] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
