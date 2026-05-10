// support-wian-tools — executa "ferramentas" do Wian em nome do user logado.
// Cada chamada é autenticada via JWT do usuário (RLS aplica) e auditada
// na tabela wian_tool_calls.
//
// Padrão para AÇÕES (mutações): primeira chamada sem `confirmed: true`
// retorna { requires_confirmation: true, summary }. Frontend mostra o
// resumo, pede confirmação, e re-chama com `confirmed: true`.

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
      "name, email, plan, searches_used, searches_limit, trial_start_at, is_custom_subscription, custom_searches_limit, custom_whatsapp_numbers_limit, requires_payment_setup",
    )
    .eq("id", userId)
    .maybeSingle();
  return {
    plan: p?.plan,
    is_custom: !!p?.is_custom_subscription,
    searches_used: p?.searches_used,
    searches_limit: p?.is_custom_subscription
      ? p?.custom_searches_limit
      : p?.searches_limit,
    trial_start_at: p?.trial_start_at,
    needs_payment_setup: p?.requires_payment_setup,
    name: p?.name,
    email: p?.email,
  };
}

async function get_whatsapp_connections({ sb }: Ctx) {
  const [{ data: evo }, { data: meta }] = await Promise.all([
    sb
      .from("whatsapp_numbers")
      .select(
        "id, name, phone_number, is_connected, daily_sent_count, last_sent_at, last_health_check_at, api_tier",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .from("user_waba_connections")
      .select(
        "id, nickname, business_name, display_phone_number, status, token_expires_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return {
    evolution: (evo || []).map((n) => ({
      id: n.id,
      nome: n.name,
      telefone: maskPhone(n.phone_number),
      conectado: n.is_connected,
      enviados_hoje: n.daily_sent_count,
      ultimo_envio: n.last_sent_at,
      ultimo_health_check: n.last_health_check_at,
      tier: n.api_tier,
    })),
    meta: (meta || []).map((w) => ({
      id: w.id,
      apelido: w.nickname || w.business_name,
      telefone: maskPhone(w.display_phone_number),
      status: w.status,
      token_expira: w.token_expires_at,
      conectado_em: w.created_at,
    })),
  };
}

async function get_warming_status({ sb }: Ctx) {
  const { data } = await sb
    .from("warming_sessions")
    .select(
      "id, whatsapp_number_id, status, warming_level, warming_status, leads_used, leads_limit, current_day, messages_sent_today, last_message_at, error_message",
    )
    .order("updated_at", { ascending: false })
    .limit(10);
  return { sessions: data || [] };
}

async function get_active_campaigns({ sb }: Ctx) {
  const { data } = await sb
    .from("whatsapp_campaigns")
    .select(
      "id, name, status, total_leads, sent_count, failed_count, started_at, completed_at, scheduled_at, paused_at_limit",
    )
    .order("created_at", { ascending: false })
    .limit(10);
  return {
    campaigns: (data || []).map((c) => ({
      id: c.id,
      nome: c.name,
      status: c.status,
      total: c.total_leads,
      enviados: c.sent_count,
      falhas: c.failed_count,
      taxa_falha:
        c.total_leads > 0
          ? `${Math.round((c.failed_count / Math.max(c.sent_count + c.failed_count, 1)) * 100)}%`
          : "0%",
      iniciada_em: c.started_at,
      concluida_em: c.completed_at,
      agendada_para: c.scheduled_at,
      pausada_por_limite: c.paused_at_limit,
    })),
  };
}

async function get_campaign_details({ sb }: Ctx, params: { campaignId: string }) {
  if (!params?.campaignId) return { error: "campaignId obrigatório" };
  const [{ data: c }, { data: incidents }] = await Promise.all([
    sb
      .from("whatsapp_campaigns")
      .select(
        "id, name, status, total_leads, sent_count, failed_count, delay_seconds, pause_after_contacts, pause_minutes, started_at, completed_at",
      )
      .eq("id", params.campaignId)
      .maybeSingle(),
    sb
      .from("campaign_incidents")
      .select("incident_type, contact_phone, detected_at")
      .eq("campaign_id", params.campaignId)
      .order("detected_at", { ascending: false })
      .limit(10),
  ]);
  if (!c) return { error: "campanha não encontrada" };
  return {
    campanha: {
      id: c.id,
      nome: c.name,
      status: c.status,
      total: c.total_leads,
      enviados: c.sent_count,
      falhas: c.failed_count,
      delay_segundos: c.delay_seconds,
      pausa_apos: c.pause_after_contacts,
      pausa_min: c.pause_minutes,
      iniciada_em: c.started_at,
      concluida_em: c.completed_at,
    },
    incidentes_recentes: (incidents || []).map((i) => ({
      tipo: i.incident_type,
      contato: maskPhone(i.contact_phone),
      detectado_em: i.detected_at,
    })),
  };
}

async function get_crm_summary({ sb }: Ctx) {
  const { data: stages } = await sb
    .from("pipeline_stages")
    .select("id, name, position")
    .order("position", { ascending: true });
  const { data: leads } = await sb
    .from("leads")
    .select("id, pipeline_stage_id, ai_score, last_message_sent_at");
  const byStage: Record<string, { name: string; count: number; avg_score: number }> = {};
  (stages || []).forEach((s) => {
    byStage[s.id] = { name: s.name, count: 0, avg_score: 0 };
  });
  let totalNoFollow = 0;
  const now = Date.now();
  (leads || []).forEach((l) => {
    if (l.pipeline_stage_id && byStage[l.pipeline_stage_id]) {
      byStage[l.pipeline_stage_id].count++;
      byStage[l.pipeline_stage_id].avg_score += l.ai_score || 0;
    }
    if (
      !l.last_message_sent_at ||
      now - new Date(l.last_message_sent_at).getTime() > 7 * 24 * 60 * 60 * 1000
    )
      totalNoFollow++;
  });
  const stagesOut = Object.values(byStage).map((s) => ({
    estagio: s.name,
    leads: s.count,
    score_medio: s.count ? Math.round(s.avg_score / s.count) : 0,
  }));
  return {
    total_leads: leads?.length || 0,
    sem_follow_up_7d: totalNoFollow,
    por_estagio: stagesOut,
  };
}

async function get_recent_leads({ sb }: Ctx, params?: { limit?: number }) {
  const lim = Math.min(params?.limit || 10, 30);
  const { data } = await sb
    .from("leads")
    .select(
      "id, contact_name, company_name, phone, ai_score, pipeline_stage_id, last_message_sent_at, last_response, prospected_at",
    )
    .order("prospected_at", { ascending: false })
    .limit(lim);
  return {
    leads: (data || []).map((l) => ({
      id: l.id,
      contato: l.contact_name,
      empresa: l.company_name,
      telefone: maskPhone(l.phone),
      score: l.ai_score,
      ultima_msg_enviada_em: l.last_message_sent_at,
      ultima_resposta: l.last_response?.slice(0, 80),
      prospectado_em: l.prospected_at,
    })),
  };
}

async function get_active_flows({ sb }: Ctx) {
  const { data: flows } = await sb
    .from("wa_automation_flows")
    .select("id, name, status, api_type, whatsapp_number_id, waba_connection_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  return { flows: flows || [] };
}

async function get_ai_agents_status({ sb }: Ctx) {
  const { data: agents } = await sb
    .from("user_ai_agents")
    .select("id, name, ai_model, max_chars, ai_output_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);
  return { agents: agents || [] };
}

async function get_recent_errors({ sb }: Ctx) {
  const { data } = await sb
    .from("campaign_incidents")
    .select("incident_type, contact_phone, detected_at, campaign_id")
    .order("detected_at", { ascending: false })
    .limit(15);
  return {
    incidentes: (data || []).map((i) => ({
      tipo: i.incident_type,
      contato: maskPhone(i.contact_phone),
      campanha_id: i.campaign_id,
      detectado_em: i.detected_at,
    })),
  };
}

// Lê erros JS reais que aconteceram no navegador do usuário.
// Wian usa isso para identificar arquivo:linha do bug e montar
// um diagnóstico pronto pra escalada humana.
async function get_recent_frontend_errors(
  { sb }: Ctx,
  params?: { limit?: number; route?: string },
) {
  const lim = Math.min(params?.limit || 10, 25);
  let q = sb
    .from("frontend_errors")
    .select("id, message, source_file, line_no, col_no, stack, route, created_at")
    .order("created_at", { ascending: false })
    .limit(lim);
  if (params?.route) q = q.eq("route", params.route);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return {
    errors: (data || []).map((e) => ({
      id: e.id,
      mensagem: e.message,
      arquivo: e.source_file,
      linha: e.line_no,
      coluna: e.col_no,
      rota: e.route,
      ocorreu_em: e.created_at,
      stack_resumido: (e.stack || "").split("\n").slice(0, 5).join("\n"),
    })),
    total: data?.length || 0,
  };
}

// =================================================================
// Tool handlers (ACTION) — exigem `confirmed: true`
// =================================================================

async function pause_campaign({ sb }: Ctx, params: { campaignId: string; confirmed?: boolean }) {
  if (!params?.campaignId) return { error: "campaignId obrigatório" };
  const { data: c } = await sb
    .from("whatsapp_campaigns")
    .select("id, name, status, total_leads, sent_count")
    .eq("id", params.campaignId)
    .maybeSingle();
  if (!c) return { error: "campanha não encontrada" };
  if (c.status === "paused") return { ok: true, info: "campanha já está pausada", campanha: c.name };
  if (!params.confirmed) {
    const pendentes = (c.total_leads || 0) - (c.sent_count || 0);
    return {
      requires_confirmation: true,
      action: "pause_campaign",
      action_params: { campaignId: c.id },
      summary: `Pausar campanha "${c.name}"? (${pendentes} contatos pendentes)`,
    };
  }
  const { error } = await sb
    .from("whatsapp_campaigns")
    .update({ status: "paused" })
    .eq("id", c.id);
  if (error) return { error: error.message };
  return { ok: true, info: `campanha "${c.name}" pausada` };
}

async function resume_campaign({ sb }: Ctx, params: { campaignId: string; confirmed?: boolean }) {
  if (!params?.campaignId) return { error: "campaignId obrigatório" };
  const { data: c } = await sb
    .from("whatsapp_campaigns")
    .select("id, name, status")
    .eq("id", params.campaignId)
    .maybeSingle();
  if (!c) return { error: "campanha não encontrada" };
  if (!params.confirmed) {
    return {
      requires_confirmation: true,
      action: "resume_campaign",
      action_params: { campaignId: c.id },
      summary: `Retomar campanha "${c.name}"?`,
    };
  }
  const { error } = await sb
    .from("whatsapp_campaigns")
    .update({ status: "running", paused_at_limit: false })
    .eq("id", c.id);
  if (error) return { error: error.message };
  return { ok: true, info: `campanha "${c.name}" retomada` };
}

// Helper: chama outra edge function preservando o JWT do user
async function callEdge(authHeader: string, fn: string, body: any) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    let j: any = null;
    try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
    return { ok: r.ok, status: r.status, body: j };
  } catch (e: any) {
    return { ok: false, status: 0, body: { error: e?.message || "fetch_failed" } };
  }
}

// RECONNECT: desconecta + deleta instância Evolution + remove linha + cria
// nova linha com o mesmo telefone/nome + cria nova instância pra QR.
async function reconnect_whatsapp(
  { sb, userId, authHeader }: Ctx,
  params: { numberId: string; confirmed?: boolean },
) {
  if (!params?.numberId) return { error: "numberId obrigatório" };
  const { data: n } = await sb
    .from("whatsapp_numbers")
    .select("id, name, phone_number, instance_name, api_tier")
    .eq("id", params.numberId)
    .maybeSingle();
  if (!n) return { error: "número não encontrado" };

  const [{ count: campCount }, { count: warmCount }] = await Promise.all([
    sb.from("whatsapp_campaigns").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
    sb.from("warming_sessions").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
  ]);

  if (!params.confirmed) {
    const lines = [
      `Reconectar "${n.name}" via reset completo:`,
      `• Vou desconectar e excluir a instância antiga`,
      `• Vou recriar com o MESMO telefone (${maskPhone(n.phone_number)})`,
      `• Você lerá um novo QR Code logo depois`,
      campCount ? `⚠️ ${campCount} campanha(s) vinculada(s) serão removida(s)` : null,
      warmCount ? `⚠️ ${warmCount} sessão(ões) de aquecimento serão removida(s)` : null,
    ].filter(Boolean);
    return {
      requires_confirmation: true,
      action: "reconnect_whatsapp",
      action_params: { numberId: n.id },
      summary: lines.join("\n"),
    };
  }

  const oldName = n.name;
  const oldPhone = n.phone_number;
  const oldTier = n.api_tier || "free";
  const oldInstance = n.instance_name;

  if (campCount && campCount > 0) {
    const { error: cErr } = await sb
      .from("whatsapp_campaigns")
      .delete()
      .eq("whatsapp_number_id", n.id);
    if (cErr) return { error: `Falha ao limpar campanhas vinculadas: ${cErr.message}` };
  }

  const disc = await callEdge(authHeader, "evolution-disconnect", {
    instanceName: oldInstance,
    numberId: n.id,
    deleteInstance: true,
    cascadeDelete: true,
  });
  if (!disc.ok) {
    return { error: `Falha ao remover instância antiga: ${disc.body?.error || disc.status}` };
  }

  const { data: created, error: insErr } = await sb
    .from("whatsapp_numbers")
    .insert({
      user_id: userId,
      name: oldName,
      phone_number: oldPhone,
      api_tier: oldTier,
      is_connected: false,
    })
    .select("id")
    .single();
  if (insErr || !created) {
    return { error: `Falha ao recriar registro: ${insErr?.message}` };
  }

  const newInstanceName = `wiize_${created.id.replace(/-/g, "").slice(0, 16)}`;
  const create = await callEdge(authHeader, "evolution-create-instance", {
    numberId: created.id,
    instanceName: newInstanceName,
  });
  if (!create.ok) {
    return {
      ok: true,
      partial: true,
      info: `Linha recriada mas a nova instância falhou. Vá em WhatsApp → Conexões e clique em Reconectar para gerar o QR. (detalhe: ${create.body?.error || create.status})`,
      next_route: "/whatsapp",
      new_number_id: created.id,
    };
  }

  return {
    ok: true,
    info: `"${oldName}" foi resetado. Abra WhatsApp → Conexões e leia o novo QR Code (válido por ~40 segundos).`,
    next_route: "/whatsapp",
    new_number_id: created.id,
  };
}

// DELETE: remove campanhas vinculadas + desconecta + deleta instância +
// cascade da linha. Retorna lista de cuidados pro user reconfigurar manualmente.
async function delete_whatsapp_connection(
  { sb, authHeader }: Ctx,
  params: { numberId: string; confirmed?: boolean },
) {
  if (!params?.numberId) return { error: "numberId obrigatório" };
  const { data: n } = await sb
    .from("whatsapp_numbers")
    .select("id, name, phone_number, instance_name")
    .eq("id", params.numberId)
    .maybeSingle();
  if (!n) return { error: "número não encontrado" };

  const [{ count: campCount }, { count: warmCount }, { count: agentCount }, { count: flowCount }] =
    await Promise.all([
      sb.from("whatsapp_campaigns").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
      sb.from("warming_sessions").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
      sb.from("ai_agents").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
      sb.from("wa_automation_flows").select("id", { count: "exact", head: true }).eq("whatsapp_number_id", n.id),
    ]);

  if (!params.confirmed) {
    const impacto = [
      campCount ? `${campCount} campanha(s)` : null,
      warmCount ? `${warmCount} aquecimento(s)` : null,
      agentCount ? `${agentCount} agente(s) IA vinculado(s)` : null,
      flowCount ? `${flowCount} flow(s)` : null,
    ].filter(Boolean);
    return {
      requires_confirmation: true,
      action: "delete_whatsapp_connection",
      action_params: { numberId: n.id },
      summary:
        `Excluir DEFINITIVAMENTE "${n.name}" (${maskPhone(n.phone_number)})?\n` +
        (impacto.length ? `Impacto: ${impacto.join(", ")} serão removidos junto.` : `Sem dependências vinculadas.`) +
        `\nEssa ação é irreversível.`,
    };
  }

  if (campCount && campCount > 0) {
    const { error: cErr } = await sb
      .from("whatsapp_campaigns")
      .delete()
      .eq("whatsapp_number_id", n.id);
    if (cErr) return { error: `Falha ao limpar campanhas: ${cErr.message}` };
  }

  const disc = await callEdge(authHeader, "evolution-disconnect", {
    instanceName: n.instance_name,
    numberId: n.id,
    deleteInstance: true,
    cascadeDelete: true,
  });
  if (!disc.ok) {
    return { error: `Falha ao excluir: ${disc.body?.error || disc.status}` };
  }

  const cuidados: string[] = [
    "Verifique se algum agente IA usava esse número e revincule a outro",
    "Confira flows ativos que apontavam para esse número",
    "Se tinha aquecimento rodando, recrie em outro número",
    "Campanhas agendadas vinculadas foram removidas — recrie se necessário",
  ];

  return {
    ok: true,
    info: `"${n.name}" excluído com sucesso.`,
    cuidados,
    next_route: "/whatsapp",
  };
}

async function cancel_campaign(
  { sb }: Ctx,
  params: { campaignId: string; confirmed?: boolean },
) {
  if (!params?.campaignId) return { error: "campaignId obrigatório" };
  const { data: c } = await sb
    .from("whatsapp_campaigns")
    .select("id, name, status, total_leads, sent_count, failed_count")
    .eq("id", params.campaignId)
    .maybeSingle();
  if (!c) return { error: "campanha não encontrada" };
  if (c.status === "failed" || c.status === "completed") {
    return { ok: true, info: `campanha "${c.name}" já está finalizada (${c.status})` };
  }
  const pendentes = (c.total_leads || 0) - (c.sent_count || 0) - (c.failed_count || 0);
  if (!params.confirmed) {
    return {
      requires_confirmation: true,
      action: "cancel_campaign",
      action_params: { campaignId: c.id },
      summary:
        `Cancelar DEFINITIVAMENTE a campanha "${c.name}"?\n` +
        `Status atual: ${c.status} • Enviados: ${c.sent_count || 0} • Pendentes: ${pendentes}\n` +
        `Essa ação marca a campanha como "failed" e não pode ser retomada.`,
    };
  }
  const { error } = await sb
    .from("whatsapp_campaigns")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", c.id);
  if (error) return { error: error.message };
  return { ok: true, info: `Campanha "${c.name}" cancelada definitivamente.` };
}

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
  get_warming_status,
  get_active_campaigns,
  get_campaign_details,
  get_crm_summary,
  get_recent_leads,
  get_active_flows,
  get_ai_agents_status,
  get_recent_errors,
  get_recent_frontend_errors,
  pause_campaign,
  resume_campaign,
  reconnect_whatsapp,
  delete_whatsapp_connection,
  silence_ai_agent,
  unsilence_ai_agent,
  cancel_campaign,
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
