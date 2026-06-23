// support-wian-tools — executa "ferramentas" do Wian em nome do user logado.
// Cada chamada é autenticada via JWT do usuário (RLS aplica) e auditada
// na tabela wian_tool_calls.
//
// Padrão para AÇÕES (mutações): primeira chamada sem `confirmed: true`
// retorna { requires_confirmation: true, summary }. Frontend mostra o
// resumo, pede confirmação, e re-chama com `confirmed: true`.
//
// Stack atual: 100% Meta Cloud API oficial. Sem Evolution, sem warming,
// sem campanhas Evolution. Campanhas saem por MetaCampaigns + meta-send-campaign.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function maskPhone(p?: string | null) {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  if (digits.length < 6) return p;
  return digits.slice(0, 4) + "****" + digits.slice(-4);
}

async function audit(
  userId: string,
  tool: string,
  params: any,
  success: boolean,
  error?: string,
) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("wian_tool_calls").insert({
      user_id: userId,
      tool,
      params: params ?? {},
      success,
      error: error ?? null,
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}

type Ctx = {
  userId: string;
  sb: ReturnType<typeof createClient>;
  authHeader: string;
};

// =================================================================
// Tool handlers (READ)
// =================================================================

async function get_account_overview({ sb, userId }: Ctx) {
  const { data: p } = await sb
    .from("profiles")
    .select(
      "full_name, email, plan, subscription_status, trial_started_at, trial_ends_at, created_at, opportunity_credits, opportunities_used_this_period",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!p) return { error: "perfil não encontrado" };
  return {
    nome: p.full_name,
    email: p.email,
    plano: p.plan,
    status_assinatura: p.subscription_status,
    trial_started_at: p.trial_started_at,
    trial_ends_at: p.trial_ends_at,
    criado_em: p.created_at,
    creditos_oportunidades: p.opportunity_credits,
    oportunidades_usadas_periodo: p.opportunities_used_this_period,
  };
}

async function get_whatsapp_connections({ sb, userId }: Ctx) {
  const { data: meta } = await sb
    .from("user_waba_connections")
    .select(
      "id, phone_number, display_phone_number, waba_id, phone_number_id, status, last_health_check, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return {
    total: meta?.length || 0,
    conexoes: (meta || []).map((w) => ({
      id: w.id,
      telefone: maskPhone(w.display_phone_number || w.phone_number),
      waba_id: w.waba_id,
      phone_number_id: w.phone_number_id,
      status: w.status,
      ultimo_health_check: w.last_health_check,
      conectada_em: w.created_at,
    })),
  };
}

async function get_meta_campaigns({ sb, userId }: Ctx) {
  const { data } = await sb
    .from("meta_campaigns")
    .select(
      "id, name, status, total_recipients, sent_count, delivered_count, read_count, replied_count, failed_count, started_at, completed_at, scheduled_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return {
    campanhas: (data || []).map((c) => ({
      id: c.id,
      nome: c.name,
      status: c.status,
      total: c.total_recipients,
      enviados: c.sent_count,
      entregues: c.delivered_count,
      lidos: c.read_count,
      respondidos: c.replied_count,
      falhas: c.failed_count,
      taxa_resposta:
        c.sent_count > 0
          ? `${Math.round((c.replied_count / c.sent_count) * 100)}%`
          : "0%",
      iniciada_em: c.started_at,
      concluida_em: c.completed_at,
      agendada_para: c.scheduled_at,
    })),
  };
}

async function get_crm_summary({ sb, userId }: Ctx) {
  const { data: stages } = await sb
    .from("pipeline_stages")
    .select("id, name, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  const { data: leads } = await sb
    .from("leads")
    .select("stage_id, opportunity_level, has_responded, first_message_sent")
    .eq("user_id", userId);
  const total = leads?.length || 0;
  const responderam = (leads || []).filter((l) => l.has_responded).length;
  const enviados = (leads || []).filter((l) => l.first_message_sent).length;
  const por_estagio = (stages || []).map((s) => ({
    estagio: s.name,
    total: (leads || []).filter((l) => l.stage_id === s.id).length,
  }));
  return { total_leads: total, mensagens_enviadas: enviados, responderam, por_estagio };
}

async function get_recent_leads({ sb, userId }: Ctx) {
  const { data } = await sb
    .from("leads")
    .select("id, contact_name, company_name, phone, opportunity_level, ai_score, whatsapp_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return {
    leads: (data || []).map((l) => ({
      id: l.id,
      contato: l.contact_name,
      empresa: l.company_name,
      telefone: maskPhone(l.phone),
      oportunidade: l.opportunity_level,
      score: l.ai_score,
      status_whatsapp: l.whatsapp_status,
      criado_em: l.created_at,
    })),
  };
}

async function get_active_flows({ sb, userId }: Ctx) {
  const { data } = await sb
    .from("wa_automation_flows")
    .select("id, name, status, waba_connection_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);
  return {
    flows: (data || []).map((f) => ({
      id: f.id,
      nome: f.name,
      status: f.status,
      waba_connection_id: f.waba_connection_id,
      criado_em: f.created_at,
      atualizado_em: f.updated_at,
    })),
  };
}

async function get_recent_errors({ sb, userId }: Ctx) {
  const { data } = await sb
    .from("frontend_errors")
    .select("error_message, error_stack, route, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);
  return { errors: data || [] };
}

async function get_recent_frontend_errors(ctx: Ctx) {
  return get_recent_errors(ctx);
}

async function get_user_score({ sb, userId }: Ctx) {
  const { data } = await sb
    .from("user_scores")
    .select("total_score, score_tier, badges, last_activity_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? {
    score_total: data.total_score,
    tier: data.score_tier,
    badges: data.badges,
    ultima_atividade: data.last_activity_at,
    atualizado_em: data.updated_at,
  } : { info: "Sem score registrado ainda." };
}

async function get_subscription_info({ sb, userId }: Ctx) {
  const { data: p } = await sb
    .from("profiles")
    .select("plan, subscription_status, trial_ends_at, subscription_ends_at, payment_provider")
    .eq("id", userId)
    .maybeSingle();
  const { data: lastEvent } = await sb
    .from("subscription_events")
    .select("event_type, amount, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    plano: p?.plan,
    status: p?.subscription_status,
    provedor: p?.payment_provider,
    trial_termina_em: p?.trial_ends_at,
    assinatura_termina_em: p?.subscription_ends_at,
    ultimo_evento: lastEvent,
  };
}

// =================================================================
// Tool handlers (ACTION) — exigem `confirmed: true`
// =================================================================

async function unsilence_ai_agent(
  { sb }: Ctx,
  params: { conversationId: string; confirmed?: boolean },
) {
  if (!params?.conversationId) return { error: "conversationId obrigatório" };
  const { data: conv } = await sb
    .from("agent_conversations")
    .select("id, ai_silenced, contact_phone")
    .eq("id", params.conversationId)
    .maybeSingle();
  if (!conv) return { error: "conversa não encontrada" };
  if (!conv.ai_silenced) {
    return { ok: true, info: "Agente já está ativo nessa conversa." };
  }
  if (!params.confirmed) {
    return {
      requires_confirmation: true,
      action: "unsilence_ai_agent",
      action_params: { conversationId: conv.id },
      summary:
        `Reativar o agente IA nessa conversa (${maskPhone(conv.contact_phone)})?\n` +
        `O agente voltará a responder automaticamente as próximas mensagens.`,
    };
  }
  const { error } = await sb
    .from("agent_conversations")
    .update({ ai_silenced: false })
    .eq("id", conv.id);
  if (error) return { error: error.message };
  return { ok: true, info: "Agente IA reativado nessa conversa." };
}

async function silence_ai_agent(
  { sb }: Ctx,
  params: { conversationId: string; confirmed?: boolean },
) {
  if (!params?.conversationId) return { error: "conversationId obrigatório" };
  if (!params.confirmed) {
    return {
      requires_confirmation: true,
      action: "silence_ai_agent",
      action_params: { conversationId: params.conversationId },
      summary: `Silenciar o agente IA nessa conversa?`,
    };
  }
  const { error } = await sb
    .from("agent_conversations")
    .update({ ai_silenced: true })
    .eq("id", params.conversationId);
  if (error) return { error: error.message };
  return { ok: true, info: "Agente silenciado nessa conversa." };
}

const HANDLERS: Record<string, (ctx: Ctx, params: any) => Promise<any>> = {
  get_account_overview,
  get_whatsapp_connections,
  get_meta_campaigns,
  get_crm_summary,
  get_recent_leads,
  get_active_flows,
  get_recent_errors,
  get_recent_frontend_errors,
  get_user_score,
  get_subscription_info,
  silence_ai_agent,
  unsilence_ai_agent,
};

// =================================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await sb.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const tool = String(body?.tool || "");
    const params = body?.params ?? {};

    const handler = HANDLERS[tool];
    if (!handler) {
      await audit(userId, tool || "(empty)", params, false, "unknown_tool");
      return new Response(JSON.stringify({ error: `tool desconhecida: ${tool}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    try {
      result = await handler({ sb, userId, authHeader }, params);
      await audit(userId, tool, params, !result?.error, result?.error);
    } catch (e: any) {
      await audit(userId, tool, params, false, e?.message);
      return new Response(JSON.stringify({ error: e?.message || "tool_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
