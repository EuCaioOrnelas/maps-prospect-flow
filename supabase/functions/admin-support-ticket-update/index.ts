import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STATUSES = new Set(["open", "in_progress", "escalated", "resolved", "closed"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticketId, status } = await req.json();
    if (!ticketId || !ALLOWED_STATUSES.has(status)) {
      return new Response(JSON.stringify({ error: "Status inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "resolved" || status === "closed") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = "human";
      update.phase = status;
    } else if (status === "escalated") {
      update.phase = "escalated";
      update.resolved_at = null;
      update.resolved_by = null;
    } else if (status === "in_progress") {
      update.phase = "human_assigned";
      update.resolved_at = null;
      update.resolved_by = null;
    } else {
      update.resolved_at = null;
      update.resolved_by = null;
    }

    const { data: ticket, error: updateError } = await admin
      .from("support_tickets")
      .update(update)
      .eq("id", ticketId)
      .select("id, email, status, ticket_number")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("support_ticket_history").insert({
      ticket_id: ticketId,
      author_id: authData.user.id,
      author_name: authData.user.email ?? "Equipe",
      action_type: "status_change",
      content: `Status alterado para "${status}"`,
      attachments: [],
    });

    let ratingEmailSent = false;
    if ((status === "resolved" || status === "closed") && ticket.email) {
      try {
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/support-email-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ type: "customer_rating_request", ticketId }),
        });
        ratingEmailSent = emailRes.ok;
        if (!emailRes.ok) console.warn("[admin-support-ticket-update] rating email failed", await emailRes.text());
      } catch (err) {
        console.warn("[admin-support-ticket-update] rating email failed", err);
      }
    }

    return new Response(JSON.stringify({ ok: true, ticket, ratingEmailSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[admin-support-ticket-update] error", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});