// WhatsApp Flow Runner — executes wa_automation_flows in production.
// Triggered by evolution-webhook / meta-webhook on inbound messages.
//
// Body shape:
// {
//   user_id: string,
//   lead_phone: string,             // canonical (digits only, e.g. 5544991236180)
//   lead_name?: string | null,
//   incoming_text?: string | null,  // text of inbound msg (null when triggering from outbound first_message)
//   button_id?: string | null,      // when user clicked a button/list item
//   button_title?: string | null,
//   source: 'evolution' | 'meta',
//   whatsapp_number_id?: string,    // public.whatsapp_numbers.id (evolution)
//   instance_name?: string,         // evolution instance
//   waba_connection_id?: string,    // public.user_waba_connections.id (meta)
//   phone_number_id?: string,       // meta phone_number_id
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAID_PLANS = ["start", "growth", "scale"];

function getEvolutionCredsFromTier(tier: string | null | undefined) {
  const normalized = (tier || "free").toLowerCase();
  if (normalized === "paid" || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get("EVOLUTION_API_URL_PAID");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY_PAID");
    if (url && apiKey) return { url, apiKey, tier: "paid" as const };
  }
  return {
    url: Deno.env.get("EVOLUTION_API_URL")!,
    apiKey: Deno.env.get("EVOLUTION_API_KEY")!,
    tier: "free" as const,
  };
}

function normalizeHandle(value: any): string | null {
  if (!value) return null;
  const s = String(value);
  if (/^(btn|item)-\d+$/i.test(s)) return s.replace("-", "_");
  return s;
}

function interpolate(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\\{(\\w+)\\}/g, (m, name) => vars[name] ?? m);
}

function evaluateCondition(
  config: any,
  ctx: { lastUserText: string; lastButtonId: string | null; lastButtonTitle: string | null },
): boolean {
  const conditionType = config.condition_type || "responded";
  const rawValue = String(config.condition_value || "").trim();
  const normalizedValue = rawValue.toLowerCase();
  const normalizedText = (ctx.lastUserText || "").toLowerCase();
  const normalizedButtonId = normalizeHandle(ctx.lastButtonId);
  const normalizedConditionHandle = normalizeHandle(rawValue);

  switch (conditionType) {
    case "button_clicked":
      return (
        (!!normalizedConditionHandle && normalizedConditionHandle === normalizedButtonId) ||
        (!!ctx.lastButtonTitle && ctx.lastButtonTitle.toLowerCase() === normalizedValue)
      );
    case "keyword_match": {
      const keywords = normalizedValue.split(",").map((k) => k.trim()).filter(Boolean);
      return keywords.length === 0 ? !!normalizedText : keywords.some((k) => normalizedText.includes(k));
    }
    case "responded":
      return !!ctx.lastUserText.trim();
    case "no_response":
      return !ctx.lastUserText.trim();
    case "field_equals":
      return !!normalizedValue && normalizedText.includes(normalizedValue);
    default:
      return false;
  }
}

// ── WhatsApp send helpers ──

async function sendViaEvolution(
  supabase: any,
  numberId: string,
  userId: string,
  toPhone: string,
  payload: { type: "text" | "image" | "audio" | "video" | "document"; content?: string; mediaUrl?: string; caption?: string; filename?: string },
) {
  const { data: numberRow } = await supabase
    .from("whatsapp_numbers")
    .select("instance_name, api_tier, phone_number")
    .eq("id", numberId)
    .maybeSingle();
  if (!numberRow?.instance_name) {
    throw new Error(`Evolution instance not found for number ${numberId}`);
  }

  let tier = numberRow.api_tier as string | null;
  if (!tier) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    tier = profile?.plan || "free";
  }
  const creds = getEvolutionCredsFromTier(tier);

  const formattedPhone = toPhone.replace(/\D/g, "");

  let endpoint = "";
  let body: any = { number: formattedPhone };

  switch (payload.type) {
    case "text":
      endpoint = `/message/sendText/${numberRow.instance_name}`;
      body.text = payload.content || "";
      break;
    case "image":
      endpoint = `/message/sendMedia/${numberRow.instance_name}`;
      body = { ...body, mediatype: "image", media: payload.mediaUrl, caption: payload.caption || "" };
      break;
    case "video":
      endpoint = `/message/sendMedia/${numberRow.instance_name}`;
      body = { ...body, mediatype: "video", media: payload.mediaUrl, caption: payload.caption || "" };
      break;
    case "audio":
      endpoint = `/message/sendWhatsAppAudio/${numberRow.instance_name}`;
      body = { ...body, audio: payload.mediaUrl };
      break;
    case "document":
      endpoint = `/message/sendMedia/${numberRow.instance_name}`;
      body = { ...body, mediatype: "document", media: payload.mediaUrl, fileName: payload.filename || "document.pdf" };
      break;
  }

  const res = await fetch(`${creds.url}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: creds.apiKey },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    console.error(`[wa-flow-runner] Evolution send failed (${res.status}):`, txt);
    throw new Error(`Evolution API error ${res.status}: ${txt.slice(0, 200)}`);
  }
  console.log(`[wa-flow-runner] Sent ${payload.type} via Evolution to ${formattedPhone}`);
  return JSON.parse(txt || "{}");
}

async function sendViaMeta(
  supabase: any,
  wabaConnectionId: string,
  toPhone: string,
  payload: { type: "text" | "image" | "video" | "audio" | "document"; content?: string; mediaUrl?: string; caption?: string; filename?: string },
) {
  const { data: conn } = await supabase
    .from("user_waba_connections")
    .select("phone_number_id, access_token")
    .eq("id", wabaConnectionId)
    .maybeSingle();
  if (!conn?.phone_number_id || !conn?.access_token) {
    throw new Error(`Meta WABA connection missing token/phone_number_id for ${wabaConnectionId}`);
  }

  const url = `https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`;
  let body: any = { messaging_product: "whatsapp", to: toPhone.replace(/\D/g, "") };

  if (payload.type === "text") {
    body.type = "text";
    body.text = { body: payload.content || "" };
  } else {
    body.type = payload.type;
    body[payload.type] = {
      link: payload.mediaUrl,
      ...(payload.caption ? { caption: payload.caption } : {}),
      ...(payload.filename ? { filename: payload.filename } : {}),
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.access_token}` },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    console.error(`[wa-flow-runner] Meta send failed (${res.status}):`, txt);
    throw new Error(`Meta API error ${res.status}: ${txt.slice(0, 200)}`);
  }
  console.log(`[wa-flow-runner] Sent ${payload.type} via Meta to ${toPhone}`);
  return JSON.parse(txt || "{}");
}

async function sendMessage(
  supabase: any,
  flow: any,
  userId: string,
  leadPhone: string,
  payload: any,
) {
  if (flow.api_type === "meta") {
    if (!flow.waba_connection_id) {
      console.error("[wa-flow-runner] Meta flow missing waba_connection_id");
      return;
    }
    return sendViaMeta(supabase, flow.waba_connection_id, leadPhone, payload);
  }
  // evolution: whatsapp_number_id stores the source_id (which is the whatsapp_numbers.id)
  if (!flow.whatsapp_number_id) {
    console.error("[wa-flow-runner] Evolution flow missing whatsapp_number_id");
    return;
  }
  return sendViaEvolution(supabase, flow.whatsapp_number_id, userId, leadPhone, payload);
}

// ── Action executors ──

async function executeActions(supabase: any, userId: string, leadPhone: string, config: any) {
  const actions = Array.isArray(config.actions) && config.actions.length > 0
    ? config.actions
    : config.action_type
      ? [{ type: config.action_type, value: config.tag_value || config.pipeline_stage, stage_name: config.pipeline_stage }]
      : [];

  if (actions.length === 0) return;

  // Find the lead by phone (multi-format)
  const cleanPhone = leadPhone.replace(/\D/g, "");
  const last8 = cleanPhone.slice(-8);
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, tags, pipeline_stage_id")
    .eq("user_id", userId)
    .limit(20);
  const lead = (leads || []).find((l: any) => String(l.phone).replace(/\D/g, "").endsWith(last8));
  if (!lead) {
    console.log("[wa-flow-runner] Action skipped — lead not found for", leadPhone);
    return;
  }

  for (const action of actions) {
    try {
      switch (action.type) {
        case "add_tag": {
          const tag = action.value || action.tag;
          if (!tag) break;
          const newTags = Array.from(new Set([...(lead.tags || []), tag]));
          await supabase.from("leads").update({ tags: newTags }).eq("id", lead.id);
          break;
        }
        case "remove_tag": {
          const tag = action.value || action.tag;
          if (!tag) break;
          const newTags = (lead.tags || []).filter((t: string) => t !== tag);
          await supabase.from("leads").update({ tags: newTags }).eq("id", lead.id);
          break;
        }
        case "move_kanban":
        case "move_pipeline": {
          const stageName = action.stage_name || action.value;
          if (!stageName) break;
          const { data: stage } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("user_id", userId)
            .eq("name", stageName)
            .maybeSingle();
          if (stage?.id) {
            await supabase.from("leads").update({ pipeline_stage_id: stage.id }).eq("id", lead.id);
          }
          break;
        }
        case "webhook": {
          const url = action.url || config.webhook_url;
          if (!url) break;
          await fetch(url, {
            method: action.method || config.webhook_method || "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_phone: leadPhone, lead_id: lead.id, payload: action.payload || {} }),
          }).catch((e) => console.error("[wa-flow-runner] webhook error:", e));
          break;
        }
        default:
          console.log("[wa-flow-runner] Unknown action type:", action.type);
      }
    } catch (e) {
      console.error("[wa-flow-runner] Action error:", e);
    }
  }
}

// ── Core executor ──

async function loadFlowGraph(supabase: any, flowId: string) {
  const [{ data: flow }, { data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("wa_automation_flows").select("*").eq("id", flowId).maybeSingle(),
    supabase.from("wa_flow_nodes").select("*").eq("flow_id", flowId),
    supabase.from("wa_flow_edges").select("*").eq("flow_id", flowId),
  ]);
  return { flow, nodes: nodes || [], edges: edges || [] };
}

function buildEdgeIndex(edges: any[]) {
  const bySource = new Map<string, any[]>();
  for (const e of edges) {
    if (!bySource.has(e.source_node_id)) bySource.set(e.source_node_id, []);
    bySource.get(e.source_node_id)!.push(e);
  }
  return bySource;
}

function getDefaultTarget(bySource: Map<string, any[]>, nodeId: string): string | null {
  const list = bySource.get(nodeId) || [];
  const def = list.find((e) => !e.source_handle) || list[0];
  return def?.target_node_id || null;
}

function getTargetByHandle(bySource: Map<string, any[]>, nodeId: string, handle?: string | null): string | null {
  const norm = normalizeHandle(handle);
  const list = bySource.get(nodeId) || [];
  return list.find((e) => normalizeHandle(e.source_handle) === norm)?.target_node_id || null;
}

function getConditionTarget(bySource: Map<string, any[]>, nodeId: string, result: boolean): string | null {
  const handle = result ? "yes" : "no";
  return (bySource.get(nodeId) || []).find((e) => e.source_handle === handle)?.target_node_id || null;
}

function findEntryNode(nodes: any[]): any | null {
  return nodes.find((n) => n.node_type === "entry") || nodes[0] || null;
}

interface RuntimeCtx {
  lastUserText: string;
  lastButtonId: string | null;
  lastButtonTitle: string | null;
  hasFreshUserInput: boolean;
  variables: Record<string, string>;
}

async function runFlow(
  supabase: any,
  body: any,
  flow: any,
  nodes: any[],
  edges: any[],
  startNodeId: string,
  execution: any,
  ctx: RuntimeCtx,
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const bySource = buildEdgeIndex(edges);

  let currentNodeId: string | null = startNodeId;
  let safety = 0;
  const history: any[] = Array.isArray(execution.node_history) ? execution.node_history : [];

  while (currentNodeId && safety < 60) {
    safety += 1;
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    const config = node.config || {};
    history.push({ id: node.id, type: node.node_type, at: new Date().toISOString() });

    switch (node.node_type) {
      case "entry": {
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "message": {
        const messageType = config.message_type || "text";
        const items = Array.isArray(config.items) && config.items.length > 0
          ? config.items
          : [{ type: messageType, content: config.content, media_url: config.media_url, caption: config.caption, filename: config.filename }];

        for (const it of items) {
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: it.type || "text",
            content: interpolate(it.content || "", ctx.variables),
            mediaUrl: it.media_url || it.url,
            caption: interpolate(it.caption || "", ctx.variables),
            filename: it.filename,
          });
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "buttons": {
        // Send the body text + options as plain text fallback (full interactive support is API-specific).
        const lines = [config.header_text, config.body_text || "Escolha uma opção:", config.footer_text]
          .filter((v: any) => typeof v === "string" && v.trim())
          .map((t: string) => interpolate(t, ctx.variables));
        const choices = (config.interaction_type === "list" ? config.list_items : config.buttons) || [];
        const optionLines = choices
          .map((c: any, i: number) => `${i + 1}. ${typeof c === "string" ? c : c?.title || `Opção ${i + 1}`}`)
          .join("\n");
        await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
          type: "text",
          content: `${lines.join("\n\n")}${optionLines ? `\n\n${optionLines}` : ""}`,
        });
        // Pause — wait for next inbound to resume from this node
        currentNodeId = null;
        break;
      }

      case "condition": {
        const needsInput = ["responded", "keyword_match", "button_clicked", "field_equals", "no_response"].includes(
          config.condition_type || "responded",
        );
        if (needsInput && !ctx.hasFreshUserInput) {
          // Pause until inbound message arrives
          currentNodeId = null;
          break;
        }
        const result = evaluateCondition(config, ctx);
        ctx.hasFreshUserInput = false;
        const next = getConditionTarget(bySource, node.id, result);
        currentNodeId = next;
        break;
      }

      case "wait": {
        // For minutes/hours/days/weeks waits, schedule and exit. (For now: only short waits inline; long waits = persist + exit.)
        const value = Number(config.delay_value || 0);
        const unit = config.delay_unit || "minutes";
        const ms =
          unit === "minutes" ? value * 60_000 :
          unit === "hours" ? value * 3_600_000 :
          unit === "days" ? value * 86_400_000 :
          unit === "weeks" ? value * 604_800_000 : value * 60_000;

        if (ms <= 5_000) {
          await new Promise((r) => setTimeout(r, ms));
          currentNodeId = getDefaultTarget(bySource, node.id);
        } else {
          // TODO: schedule resume via cron. For now, exit and skip wait.
          console.log(`[wa-flow-runner] Long wait (${ms}ms) skipped — continuing immediately.`);
          currentNodeId = getDefaultTarget(bySource, node.id);
        }
        break;
      }

      case "action": {
        await executeActions(supabase, body.user_id, body.lead_phone, config);
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "data_collect": {
        const varName = config.variable_name || "dado";
        if (ctx.hasFreshUserInput && ctx.lastUserText) {
          ctx.variables[varName] = ctx.lastUserText;
          ctx.hasFreshUserInput = false;
          currentNodeId = getDefaultTarget(bySource, node.id);
        } else {
          const labels: Record<string, string> = {
            name: "seu nome", email: "seu email", phone: "seu telefone",
            cpf: "seu CPF", address: "seu endereço", custom: varName,
          };
          const prompt = config.prompt_message
            ? interpolate(config.prompt_message, ctx.variables)
            : `Por favor, informe ${labels[config.collect_type] || varName}:`;
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: prompt });
          currentNodeId = null; // wait for inbound
        }
        break;
      }

      case "ab_test": {
        const variants: any[] = config.variants || [];
        if (variants.length === 0) { currentNodeId = null; break; }
        const total = variants.reduce((s, v) => s + (v.weight || 1), 0);
        let r = Math.random() * total;
        let chosen = variants[0];
        for (const v of variants) { r -= (v.weight || 1); if (r <= 0) { chosen = v; break; } }
        currentNodeId = getTargetByHandle(bySource, node.id, chosen.id);
        break;
      }

      case "random_split": {
        const outs: any[] = config.outputs || [{ id: "out_0" }, { id: "out_1" }];
        const chosen = outs[Math.floor(Math.random() * outs.length)];
        currentNodeId = getTargetByHandle(bySource, node.id, chosen.id);
        break;
      }

      case "handoff": {
        if (config.handoff_message) {
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: "text", content: interpolate(config.handoff_message, ctx.variables),
          });
        }
        // Move to human support stage if configured
        if (config.handoff_stage) {
          await executeActions(supabase, body.user_id, body.lead_phone, {
            actions: [{ type: "move_kanban", stage_name: config.handoff_stage }],
          });
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "end": {
        if (config.end_message) {
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: "text", content: interpolate(config.end_message, ctx.variables),
          });
        }
        await supabase.from("wa_flow_executions").update({
          status: "completed",
          current_node_id: node.id,
          current_node_name: node.name,
          exit_node_name: node.name,
          completed_at: new Date().toISOString(),
          collected_data: ctx.variables,
          node_history: history,
        }).eq("id", execution.id);
        return;
      }

      default: {
        // Skip unknown
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }
    }
  }

  // Persist state when paused
  await supabase.from("wa_flow_executions").update({
    status: currentNodeId ? "active" : "abandoned",
    current_node_id: currentNodeId,
    current_node_name: currentNodeId ? (nodeMap.get(currentNodeId)?.name || null) : null,
    collected_data: ctx.variables,
    node_history: history,
  }).eq("id", execution.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    if (!body.user_id || !body.lead_phone) {
      return new Response(JSON.stringify({ error: "user_id and lead_phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[wa-flow-runner] invoked: user=${body.user_id} phone=${body.lead_phone} text=${body.incoming_text?.slice(0, 60)}`);

    // 1) Resume any active execution for this lead
    const { data: activeExecutions } = await supabase
      .from("wa_flow_executions")
      .select("*, wa_automation_flows!inner(*)")
      .eq("user_id", body.user_id)
      .eq("lead_phone", body.lead_phone)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(5);

    const resumed: string[] = [];
    for (const exec of activeExecutions || []) {
      const flow = exec.wa_automation_flows;
      if (!flow || flow.status !== "active") continue;

      const { nodes, edges } = await loadFlowGraph(supabase, flow.id);
      const ctx: RuntimeCtx = {
        lastUserText: body.incoming_text || "",
        lastButtonId: body.button_id || null,
        lastButtonTitle: body.button_title || null,
        hasFreshUserInput: !!(body.incoming_text || body.button_id),
        variables: (exec.collected_data && typeof exec.collected_data === "object") ? exec.collected_data : {},
      };
      const startId = exec.current_node_id || findEntryNode(nodes)?.id;
      if (!startId) continue;
      // For "buttons" pause we re-enter via the chosen button handle
      const node = nodes.find((n: any) => n.id === startId);
      let realStart = startId;
      if (node?.node_type === "buttons" && body.button_id) {
        const next = getTargetByHandle(buildEdgeIndex(edges), startId, body.button_id);
        if (next) realStart = next;
      } else if (node?.node_type === "buttons" && body.incoming_text) {
        // Try to match button by typed text/index
        const choices = ((node.config?.interaction_type === "list" ? node.config?.list_items : node.config?.buttons) || []);
        const typed = body.incoming_text.trim().toLowerCase();
        const idx = choices.findIndex((c: any, i: number) => {
          const title = String(typeof c === "string" ? c : c?.title || "").toLowerCase();
          return title === typed || String(i + 1) === typed;
        });
        if (idx >= 0) {
          const chosen = choices[idx];
          const handle = typeof chosen === "object" && chosen?.id ? chosen.id : `${node.config?.interaction_type === "list" ? "item" : "btn"}_${idx}`;
          ctx.lastButtonId = handle;
          ctx.lastButtonTitle = String(typeof chosen === "string" ? chosen : chosen?.title || "");
          const next = getTargetByHandle(buildEdgeIndex(edges), startId, handle);
          if (next) realStart = next;
        }
      }
      await runFlow(supabase, body, flow, nodes, edges, realStart, exec, ctx);
      resumed.push(exec.id);
    }

    if (resumed.length > 0) {
      return new Response(JSON.stringify({ resumed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) No active execution — try to trigger new flow(s)
    const { data: flows } = await supabase
      .from("wa_automation_flows")
      .select("*")
      .eq("user_id", body.user_id)
      .eq("status", "active");

    if (!flows || flows.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, reason: "no_active_flows" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggered: string[] = [];
    for (const flow of flows) {
      // Filter by number/connection
      if (flow.api_type === "evolution") {
        if (body.source !== "evolution") continue;
        if (flow.whatsapp_number_id && body.whatsapp_number_id && flow.whatsapp_number_id !== body.whatsapp_number_id) continue;
      } else if (flow.api_type === "meta") {
        if (body.source !== "meta") continue;
        if (flow.waba_connection_id && body.waba_connection_id && flow.waba_connection_id !== body.waba_connection_id) continue;
      }

      const { nodes, edges } = await loadFlowGraph(supabase, flow.id);
      const entry = findEntryNode(nodes);
      if (!entry) continue;
      const entryConfig = entry.config || {};
      const triggerType = entryConfig.trigger_type || "first_message";

      // Match trigger
      let shouldTrigger = false;
      if (triggerType === "first_message") {
        // Trigger only on the lead's FIRST inbound message — i.e. no prior execution and an incoming text
        if (!body.incoming_text) continue;
        const { count } = await supabase
          .from("wa_flow_executions")
          .select("id", { count: "exact", head: true })
          .eq("flow_id", flow.id)
          .eq("lead_phone", body.lead_phone);
        shouldTrigger = (count || 0) === 0;
      } else if (triggerType === "keyword") {
        const keywords = (entryConfig.keywords || []).map((k: string) => String(k).toLowerCase().trim()).filter(Boolean);
        const text = (body.incoming_text || "").toLowerCase();
        shouldTrigger = keywords.length === 0 ? false : keywords.some((k: string) => text.includes(k));
      } else {
        // Other triggers (campaign_reply, button_click, webhook, qr_code, re_entry, template_reply) — not auto-fired here.
        continue;
      }

      if (!shouldTrigger) continue;

      // Create execution row
      const { data: exec, error: execErr } = await supabase
        .from("wa_flow_executions")
        .insert({
          flow_id: flow.id,
          user_id: body.user_id,
          lead_phone: body.lead_phone,
          lead_name: body.lead_name || null,
          status: "active",
          current_node_id: entry.id,
          current_node_name: entry.name,
          entry_data: { trigger_type: triggerType, source: body.source, incoming_text: body.incoming_text },
          node_history: [],
          collected_data: {},
        })
        .select()
        .single();

      if (execErr || !exec) {
        console.error("[wa-flow-runner] Failed to create execution:", execErr);
        continue;
      }

      const ctx: RuntimeCtx = {
        lastUserText: body.incoming_text || "",
        lastButtonId: body.button_id || null,
        lastButtonTitle: body.button_title || null,
        hasFreshUserInput: !!(body.incoming_text || body.button_id),
        variables: {},
      };
      await runFlow(supabase, body, flow, nodes, edges, entry.id, exec, ctx);
      triggered.push(flow.id);
    }

    return new Response(JSON.stringify({ triggered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wa-flow-runner] FATAL:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
