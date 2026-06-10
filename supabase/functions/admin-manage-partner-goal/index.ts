import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_INBOX = Deno.env.get("PARTNERS_ADMIN_INBOX") || "parceiros@wiize.com.br";

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

// Inlined helper (previously in _shared/partner-email.ts)
async function sendPartnerEmail(
  supabase: any,
  partnerId: string,
  type: string,
  extraData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("email, full_name, referral_code, user_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (!partner?.email) {
      console.warn(`[sendPartnerEmail] partner ${partnerId} has no email`);
      return;
    }
    const firstName = (partner.full_name || "").split(" ")[0] || "Parceiro";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        type,
        to: partner.email,
        data: { first_name: firstName, referral_code: partner.referral_code, user_id: partner.user_id, ...extraData },
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`[sendPartnerEmail] ${type} failed:`, resp.status, txt);
    }
  } catch (e) {
    console.error("[sendPartnerEmail] exception:", e);
  }
}

async function alertAdmin(supabase: any, payload: {
  subject: string;
  title: string;
  lines: string[];
  cta_url?: string;
  cta_label?: string;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type: "admin_partner_alert",
        to: ADMIN_INBOX,
        data: payload,
      }),
    });
  } catch (e) {
    console.error("[alertAdmin] failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return jsonResponse({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action || "create";

    if (action === "list") {
      const partnerId = body.partner_id || null;

      let goalsQuery = admin
        .from("partner_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (partnerId) goalsQuery = goalsQuery.eq("partner_id", partnerId);

      const [{ data: goals, error: goalsError }, { data: partners, error: partnersError }, { data: links, error: linksError }] = await Promise.all([
        goalsQuery,
        admin.from("partners").select("id, full_name, email, status").order("full_name"),
        admin.from("partner_referral_links").select("id, partner_id, slug, label, is_active, created_at").order("created_at", { ascending: false }),
      ]);

      if (goalsError) return jsonResponse({ error: goalsError.message }, 400);
      if (partnersError) return jsonResponse({ error: partnersError.message }, 400);
      if (linksError) return jsonResponse({ error: linksError.message }, 400);

      const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
      const linkMap = new Map((links || []).map((l: any) => [l.id, l]));
      const enrichedGoals = (goals || []).map((goal: any) => {
        const partner = partnerMap.get(goal.partner_id) as any;
        const link = goal.referral_link_id ? (linkMap.get(goal.referral_link_id) as any) : null;

        return {
          ...goal,
          partners: partner ? { full_name: partner.full_name, email: partner.email } : null,
          partner_referral_links: link ? { slug: link.slug, label: link.label } : null,
        };
      });

      return jsonResponse({
        success: true,
        goals: enrichedGoals,
        partners: (partners || [])
          .filter((p: any) => p.status !== "blocked")
          .map(({ id, full_name, email, status }: any) => ({ id, full_name, email, status })),
        links: (links || []).filter((l: any) => l.is_active).map(({ id, partner_id, slug, label }: any) => ({ id, partner_id, slug, label })),
      });
    }

    if (action === "create") {
      const { partner_id, title, description, goal_type, target_value, prize_amount_cents, deadline_at, internal_notes } = body;
      // Normalize empty strings to null for optional fields
      const referral_link_id = body.referral_link_id && body.referral_link_id !== "all" && body.referral_link_id !== "" ? body.referral_link_id : null;

      if (!partner_id || !title?.trim() || !goal_type || target_value === undefined || target_value === null || !deadline_at) {
        return jsonResponse({ error: "partner_id, título, tipo, meta e prazo são obrigatórios." }, 400);
      }
      if (!["revenue", "paid_clients", "leads", "mrr"].includes(goal_type)) {
        return jsonResponse({ error: "Tipo de meta inválido." }, 400);
      }
      const numericTarget = parseNumber(target_value);
      if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
        return jsonResponse({ error: "Meta deve ser um número maior que zero." }, 400);
      }
      if (["paid_clients", "leads"].includes(goal_type) && !Number.isInteger(numericTarget)) {
        return jsonResponse({ error: "Metas de clientes ou leads precisam ser números inteiros, por exemplo: 10." }, 400);
      }
      const deadlineDate = new Date(deadline_at);
      if (isNaN(deadlineDate.getTime())) {
        return jsonResponse({ error: "Prazo final inválido." }, 400);
      }
      if (deadlineDate.getTime() <= Date.now()) {
        return jsonResponse({ error: "Prazo final precisa ser uma data futura." }, 400);
      }
      if (referral_link_id) {
        const { data: rl } = await admin.from("partner_referral_links").select("partner_id").eq("id", referral_link_id).maybeSingle();
        if (!rl || rl.partner_id !== partner_id) {
          return jsonResponse({ error: "Link de campanha inválido para este parceiro." }, 400);
        }
        if (goal_type === "mrr") {
          return jsonResponse({ error: "Metas de MRR não podem ser vinculadas a um único link." }, 400);
        }
      }
      const { data, error } = await admin.rpc("admin_create_partner_goal", {
        p_admin_id: u.user.id,
        p_partner_id: partner_id,
        p_title: title.trim(),
        p_description: description || null,
        p_goal_type: goal_type,
        p_target_value: numericTarget,
        p_prize_amount_cents: Math.max(0, Math.round(parseNumber(prize_amount_cents) || 0)),
        p_deadline_at: deadlineDate.toISOString(),
        p_referral_link_id: referral_link_id || null,
        p_internal_notes: internal_notes || null,
      });
      if (error) return jsonResponse({ error: error.message }, 400);

      return jsonResponse({ success: true, goal: data });
    }

    // Accept both "update" (legacy) and "update_status" (UI shorthand)
    if (action === "update" || action === "update_status") {
      const id = body.id || body.goal_id;
      if (!id) return new Response(JSON.stringify({ error: "id é obrigatório" }), { status: 400, headers: corsHeaders });

      // Load current state for transition detection
      const { data: before } = await admin
        .from("partner_goals")
        .select("status, title, prize_amount_cents, partner_id, partners:partner_id(full_name, email)")
        .eq("id", id)
        .maybeSingle();

      const { title, description, target_value, prize_amount_cents, deadline_at, status, internal_notes } = body;
      const patch: any = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (target_value !== undefined) patch.target_value = Number(target_value);
      if (prize_amount_cents !== undefined) patch.prize_amount_cents = Math.max(0, Math.round(Number(prize_amount_cents)));
      if (deadline_at !== undefined) patch.deadline_at = deadline_at;
      if (status !== undefined) patch.status = status;
      if (internal_notes !== undefined) patch.internal_notes = internal_notes;
      if (status === "completed") patch.completed_at = new Date().toISOString();

      const { error } = await admin.from("partner_goals").update(patch).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

      // Notify partner if status transitioned to completed
      if (before && status === "completed" && before.status !== "completed") {
        sendPartnerEmail(admin, before.partner_id, "partner_goal_completed", {
          goal_title: before.title,
          prize_amount_cents: before.prize_amount_cents,
        }).catch(() => {});
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "recompute") {
      const { partner_id } = body;

      // Snapshot active goals before recompute
      const { data: beforeGoals } = await admin
        .from("partner_goals")
        .select("id, title, status, prize_amount_cents")
        .eq("partner_id", partner_id)
        .eq("status", "active");

      await admin.rpc("update_partner_goal_progress", { p_partner_id: partner_id });

      // Snapshot after to detect newly-completed goals
      const { data: afterGoals } = await admin
        .from("partner_goals")
        .select("id, title, status, prize_amount_cents")
        .eq("partner_id", partner_id);

      const justCompleted = (afterGoals || []).filter((a: any) =>
        a.status === "completed" &&
        (beforeGoals || []).some((b: any) => b.id === a.id && b.status === "active")
      );

      for (const g of justCompleted) {
        sendPartnerEmail(admin, partner_id, "partner_goal_completed", {
          goal_title: g.title,
          prize_amount_cents: g.prize_amount_cents,
        }).catch(() => {});

        const { data: partner } = await admin.from("partners").select("full_name").eq("id", partner_id).maybeSingle();
        alertAdmin(admin, {
          subject: `🏆 Meta concluída — ${partner?.full_name || "Parceiro"}`,
          title: "Um parceiro acabou de bater a meta",
          lines: [
            `Parceiro: <strong>${partner?.full_name || "—"}</strong>`,
            `Meta: <strong>${g.title}</strong>`,
            `Prêmio liberado: <strong>R$ ${(g.prize_amount_cents / 100).toFixed(2).replace(".", ",")}</strong>`,
          ],
          cta_url: "https://wiize.com.br/admin/partners/metas",
          cta_label: "Ver metas no admin",
        });
      }

      return new Response(JSON.stringify({ success: true, completed: justCompleted.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
