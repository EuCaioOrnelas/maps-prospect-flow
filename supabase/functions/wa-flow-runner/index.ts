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

// Strip accents and lowercase for keyword matching ("preço" -> "preco")
function normalizeText(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Last-8-digit key for tolerant phone matching across formats (with/without 9th digit, +55, etc.)
function phoneKey(p: string | null | undefined): string {
  return String(p || "").replace(/\D/g, "").slice(-8);
}

// Parse keywords stored either as CSV string or as array
function parseKeywords(raw: any): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : String(raw).split(/[,\n;]/);
  return arr
    .map((k: any) => normalizeText(String(k)))
    .filter((k: string) => k.length > 0);
}

function interpolate(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => vars[name] ?? m);
}

async function evaluateCondition(
  supabase: any,
  userId: string,
  leadPhone: string,
  config: any,
  ctx: { lastUserText: string; lastButtonId: string | null; lastButtonTitle: string | null },
): Promise<boolean> {
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

    case "has_tag": {
      if (!rawValue) return false;
      const last8 = leadPhone.replace(/\D/g, "").slice(-8);
      if (!last8) return false;
      const { data: leads } = await supabase
        .from("leads")
        .select("id, phone, tags")
        .eq("user_id", userId)
        .like("phone", `%${last8}%`)
        .limit(10);
      const lead = (leads || []).find(
        (l: any) => String(l.phone).replace(/\D/g, "").endsWith(last8),
      );
      if (!lead) return false;
      const tags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
      return tags.some((t) => String(t).toLowerCase() === normalizedValue);
    }

    case "score_above": {
      const last8 = leadPhone.replace(/\D/g, "").slice(-8);
      if (!last8) return false;
      const { data: leads } = await supabase
        .from("leads")
        .select("id, phone, score")
        .eq("user_id", userId)
        .like("phone", `%${last8}%`)
        .limit(10);
      const lead = (leads || []).find(
        (l: any) => String(l.phone).replace(/\D/g, "").endsWith(last8),
      );
      if (!lead) return false;
      const score = Number(lead.score || 0);

      const checkType = config.score_check_type || "number";
      if (checkType === "category") {
        const cat = String(config.score_category || "").toLowerCase();
        // Buckets aligned with revenue scoring: cold <150, warm 150-649, hot ≥650
        if (cat === "hot") return score >= 650;
        if (cat === "warm") return score >= 150;
        if (cat === "cold") return score >= 0;
        return false;
      }
      const minScore = Number(rawValue || 0);
      return score >= minScore;
    }

    case "is_customer": {
      const last8 = leadPhone.replace(/\D/g, "").slice(-8);
      if (!last8) return false;
      const { data: leads } = await supabase
        .from("leads")
        .select("id, phone")
        .eq("user_id", userId)
        .like("phone", `%${last8}%`)
        .limit(10);
      const lead = (leads || []).find(
        (l: any) => String(l.phone).replace(/\D/g, "").endsWith(last8),
      );
      if (!lead) return false;
      const { count } = await supabase
        .from("lead_deals")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .eq("user_id", userId);
      return (count || 0) > 0;
    }

    default:
      return false;
  }
}

// ── WhatsApp send helpers ──

// Shared payload type for all WhatsApp send helpers
type SendPayload =
  | { type: "text" | "image" | "audio" | "video" | "document"; content?: string; mediaUrl?: string; caption?: string; filename?: string }
  | {
      type: "buttons";
      header?: string;
      body?: string;
      footer?: string;
      buttons: Array<{ id: string; title: string }>;
    }
  | {
      type: "list";
      header?: string;
      body?: string;
      footer?: string;
      buttonText?: string;
      sections: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>;
    };

async function sendViaEvolution(
  supabase: any,
  numberId: string,
  userId: string,
  toPhone: string,
  payload: SendPayload,
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
    case "buttons": {
      // Evolution API v2: /message/sendButtons
      endpoint = `/message/sendButtons/${numberRow.instance_name}`;
      body = {
        ...body,
        title: payload.header || "",
        description: payload.body || "",
        footer: payload.footer || "",
        buttons: (payload.buttons || []).slice(0, 3).map((b) => ({
          type: "reply",
          displayText: b.title,
          id: b.id,
        })),
      };
      break;
    }
    case "list": {
      endpoint = `/message/sendList/${numberRow.instance_name}`;
      body = {
        ...body,
        title: payload.header || "",
        description: payload.body || "",
        footerText: payload.footer || "",
        buttonText: payload.buttonText || "Ver opções",
        sections: (payload.sections || []).map((s) => ({
          title: s.title || "Opções",
          rows: (s.rows || []).slice(0, 10).map((r) => ({
            rowId: r.id,
            title: r.title,
            description: r.description || "",
          })),
        })),
      };
      break;
    }
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

  // #6 fix: Find the lead by phone using DB-side filter (no arbitrary limit).
  // Match using the last 8 digits (tolerant to +55, 9th digit, formatting differences).
  const last8 = leadPhone.replace(/\D/g, "").slice(-8);
  if (!last8) {
    console.log("[wa-flow-runner] Action skipped — invalid phone for", leadPhone);
    return;
  }
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, tags, pipeline_stage_id")
    .eq("user_id", userId)
    .like("phone", `%${last8}%`)
    .limit(10);
  const lead = (leads || []).find(
    (l: any) => String(l.phone).replace(/\D/g, "").endsWith(last8),
  );
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
          // Editor saves UUID in `pipeline_stage_id`; legacy callers may pass `stage_name`.
          let stageId: string | null = action.pipeline_stage_id || null;
          if (!stageId) {
            const stageName = action.stage_name || action.value;
            if (!stageName) break;
            const { data: stage } = await supabase
              .from("pipeline_stages")
              .select("id")
              .eq("user_id", userId)
              .eq("name", stageName)
              .maybeSingle();
            stageId = stage?.id || null;
          }
          if (stageId) {
            await supabase.from("leads").update({ pipeline_stage_id: stageId }).eq("id", lead.id);
          }
          break;
        }
        case "send_to_crm": {
          // Create or update the lead in CRM with mapped fields (supports {variable} interpolation upstream).
          const updates: Record<string, any> = {};
          if (action.crm_name) updates.name = String(action.crm_name);
          if (action.crm_email) updates.email = String(action.crm_email);
          if (action.crm_company) updates.company = String(action.crm_company);
          if (action.crm_notes) updates.notes = String(action.crm_notes);
          if (action.crm_stage_id) updates.pipeline_stage_id = action.crm_stage_id;
          if (Object.keys(updates).length > 0) {
            await supabase.from("leads").update(updates).eq("id", lead.id);
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
  /** Internal: set by scheduler when timing out a no_response condition */
  forceNoResponseTimeout?: boolean;
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
  let pausedNodeId: string | null = null;
  let waitUntil: string | null = null;
  let awaitingInputUntil: string | null = null;
  let awaitingNodeId: string | null = null;
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
        ctx.hasFreshUserInput = false;
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
        ctx.hasFreshUserInput = false;
        pausedNodeId = node.id;
        currentNodeId = null;
        break;
      }

      case "condition": {
        const conditionType = config.condition_type || "responded";
        const needsInput = ["responded", "keyword_match", "button_clicked", "field_equals", "no_response"].includes(conditionType);

        if (needsInput && !ctx.hasFreshUserInput) {
          // Special case: "no_response" can have a timeout window. If timeout expired (or scheduler forced),
          // resolve as TRUE (no response) and continue. Otherwise pause and schedule.
          if (conditionType === "no_response") {
            const timeoutMin = Number(config.timeout_minutes ?? config.no_response_timeout ?? 0);
            if (ctx.forceNoResponseTimeout) {
              const result = true; // no_response timeout fired → "yes" branch
              ctx.hasFreshUserInput = false;
              ctx.forceNoResponseTimeout = false;
              currentNodeId = getConditionTarget(bySource, node.id, result);
              break;
            }
            if (timeoutMin > 0) {
              awaitingInputUntil = new Date(Date.now() + timeoutMin * 60_000).toISOString();
              awaitingNodeId = node.id;
            }
          }
          pausedNodeId = node.id;
          currentNodeId = null;
          break;
        }
        const result = await evaluateCondition(supabase, body.user_id, body.lead_phone, config, ctx);
        ctx.hasFreshUserInput = false;
        const next = getConditionTarget(bySource, node.id, result);
        currentNodeId = next;
        break;
      }

      case "wait": {
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
          // Persist wait_until so the cron scheduler can resume after the delay.
          waitUntil = new Date(Date.now() + ms).toISOString();
          pausedNodeId = node.id;
          currentNodeId = null;
          console.log(`[wa-flow-runner] Wait scheduled for ${waitUntil} (exec ${execution.id})`);
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
          ctx.hasFreshUserInput = false;
          pausedNodeId = node.id;
          currentNodeId = null;
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
        ctx.hasFreshUserInput = false;
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

      case "ai_agent": {
        try {
          // Reuse saved agent or inline config
          let agent: any = null;
          if (config.saved_agent_id) {
            const { data } = await supabase
              .from("user_ai_agents")
              .select("*")
              .eq("id", config.saved_agent_id)
              .eq("user_id", body.user_id)
              .maybeSingle();
            agent = data;
          }
          const systemPrompt = agent?.system_prompt || config.system_prompt || "";
          const aiRoutesRaw: string = agent?.ai_routes || config.ai_routes || "";
          const maxChars = Number(agent?.max_chars || config.max_chars || 500);
          const routes = aiRoutesRaw.split("\n").map((r: string) => r.trim()).filter(Boolean);

          const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
          if (!OPENAI_API_KEY) {
            console.error("[wa-flow-runner] ai_agent skipped — OPENAI_API_KEY missing");
            currentNodeId = getDefaultTarget(bySource, node.id);
            break;
          }

          const userMessage = ctx.lastUserText
            || `(Lead acabou de entrar no fluxo, sem mensagem ainda. Inicie a conversa.)`;
          const routeBlock = routes.length > 0
            ? `\n\nAo final, classifique a conversa retornando OBRIGATORIAMENTE no formato:\n[ROUTE: <UMA_DAS_ROTAS>]\nRotas válidas: ${routes.join(", ")}.`
            : "";
          const sysFinal = `${systemPrompt}\n\nResponda em até ${maxChars} caracteres.${routeBlock}`;

          // Use OpenAI directly. Respect agent's saved model when provider is openai; otherwise default.
          const openaiModel = (agent?.ai_provider === "openai" && agent?.ai_model)
            ? agent.ai_model
            : "gpt-4o-mini";

          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: openaiModel,
              messages: [
                { role: "system", content: interpolate(sysFinal, ctx.variables) },
                { role: "user", content: userMessage },
              ],
              max_tokens: Math.min(1000, Math.ceil(maxChars / 2) + 200),
            }),
          });

          if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error("[wa-flow-runner] AI gateway error:", aiRes.status, errText);
            currentNodeId = getDefaultTarget(bySource, node.id);
            break;
          }
          const aiJson = await aiRes.json();
          const fullText: string = aiJson?.choices?.[0]?.message?.content || "";

          // Extract route tag
          let chosenRoute: string | null = null;
          const routeMatch = fullText.match(/\[ROUTE:\s*([^\]]+)\]/i);
          if (routeMatch) chosenRoute = routeMatch[1].trim().toUpperCase();
          const cleanedText = fullText.replace(/\[ROUTE:[^\]]+\]/gi, "").trim().slice(0, maxChars);

          if (cleanedText) {
            await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
              type: "text",
              content: cleanedText,
            });
          }
          ctx.variables["ai_response"] = cleanedText;
          if (chosenRoute) ctx.variables["ai_route"] = chosenRoute;

          // Branch by route handle if matched, otherwise default edge.
          let nextId: string | null = null;
          if (chosenRoute) {
            nextId = getTargetByHandle(bySource, node.id, chosenRoute)
              || getTargetByHandle(bySource, node.id, chosenRoute.toLowerCase())
              || null;
          }
          currentNodeId = nextId || getDefaultTarget(bySource, node.id);
        } catch (e) {
          console.error("[wa-flow-runner] ai_agent error:", e);
          currentNodeId = getDefaultTarget(bySource, node.id);
        }
        break;
      }

      case "google_sheets": {
        try {
          if (!config.spreadsheet_id) {
            console.warn("[wa-flow-runner] google_sheets skipped — no spreadsheet_id");
            currentNodeId = getDefaultTarget(bySource, node.id);
            break;
          }
          const columns: any[] = Array.isArray(config.columns) ? config.columns : [];
          // Pre-populate {nome} {telefone} variables if missing
          if (!ctx.variables.nome && body.lead_name) ctx.variables.nome = body.lead_name;
          if (!ctx.variables.telefone) ctx.variables.telefone = body.lead_phone;

          const row = columns.map((c: any) =>
            interpolate(String(c.variable ?? c.value ?? ""), ctx.variables)
          );

          const { error } = await supabase.functions.invoke("google-sheets-action", {
            body: {
              user_id: body.user_id,
              spreadsheet_id: config.spreadsheet_id,
              sheet_name: config.sheet_name || "Dados",
              data: row,
              action: "append",
            },
          });
          if (error) console.error("[wa-flow-runner] google_sheets error:", error);
        } catch (e) {
          console.error("[wa-flow-runner] google_sheets error:", e);
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "google_calendar": {
        try {
          const summary = interpolate(String(config.event_title || ""), ctx.variables);
          if (!summary) {
            console.warn("[wa-flow-runner] google_calendar skipped — no event_title");
            currentNodeId = getDefaultTarget(bySource, node.id);
            break;
          }
          // Default to "next business hour" if no explicit start (editor doesn't expose one yet).
          const start = new Date(Date.now() + 60 * 60 * 1000); // +1h
          start.setMinutes(0, 0, 0);

          const attendeeRaw = interpolate(String(config.attendee_email || ""), ctx.variables);
          const attendee = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeRaw) ? attendeeRaw : undefined;

          const { error } = await supabase.functions.invoke("google-calendar-action", {
            body: {
              user_id: body.user_id,
              summary,
              description: interpolate(String(config.event_description || ""), ctx.variables),
              start_datetime: start.toISOString(),
              duration_minutes: Number(config.event_duration || 30),
              attendee_email: attendee,
            },
          });
          if (error) console.error("[wa-flow-runner] google_calendar error:", error);
        } catch (e) {
          console.error("[wa-flow-runner] google_calendar error:", e);
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }

      case "gmail": {
        try {
          const to = interpolate(String(config.email_to || ""), ctx.variables);
          if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            console.warn("[wa-flow-runner] gmail skipped — invalid recipient:", to);
            currentNodeId = getDefaultTarget(bySource, node.id);
            break;
          }
          const subject = interpolate(String(config.email_subject || "Novo lead"), ctx.variables);
          const bodyText = interpolate(String(config.email_body || ""), ctx.variables);
          const ccArr: string[] = Array.isArray(config.email_cc) ? config.email_cc : (config.email_cc ? [config.email_cc] : []);
          const bccArr: string[] = Array.isArray(config.email_bcc) ? config.email_bcc : (config.email_bcc ? [config.email_bcc] : []);

          const payload: any = {
            user_id: body.user_id,
            to,
            cc: ccArr,
            bcc: bccArr,
            subject,
          };
          if (config.email_html) payload.body_html = bodyText;
          else payload.body_text = bodyText;

          const { error } = await supabase.functions.invoke("gmail-send-action", { body: payload });
          if (error) console.error("[wa-flow-runner] gmail error:", error);
        } catch (e) {
          console.error("[wa-flow-runner] gmail error:", e);
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
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
    status: currentNodeId || pausedNodeId ? "active" : "abandoned",
    current_node_id: currentNodeId || pausedNodeId,
    current_node_name: (currentNodeId || pausedNodeId) ? (nodeMap.get(currentNodeId || pausedNodeId)?.name || null) : null,
    collected_data: ctx.variables,
    node_history: history,
    wait_until: waitUntil,
    awaiting_input_until: awaitingInputUntil,
    awaiting_node_id: awaitingNodeId,
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

    // ── Scheduler mode: invoked by pg_cron every minute. Resume waits & no_response timeouts. ──
    if (body.scheduler === true) {
      const nowIso = new Date().toISOString();

      // a) Waits whose time has come
      const { data: dueWaits } = await supabase
        .from("wa_flow_executions")
        .select("*, wa_automation_flows!inner(*)")
        .eq("status", "active")
        .lte("wait_until", nowIso)
        .not("wait_until", "is", null)
        .limit(100);

      // b) no_response conditions whose timeout fired
      const { data: dueTimeouts } = await supabase
        .from("wa_flow_executions")
        .select("*, wa_automation_flows!inner(*)")
        .eq("status", "active")
        .lte("awaiting_input_until", nowIso)
        .not("awaiting_input_until", "is", null)
        .limit(100);

      const resumedIds: string[] = [];

      // Helper to resume an execution
      const resumeExec = async (exec: any, mode: "wait" | "timeout") => {
        const flow = exec.wa_automation_flows;
        if (!flow || flow.status !== "active") return;
        const { nodes, edges } = await loadFlowGraph(supabase, flow.id);

        const ctx: RuntimeCtx = {
          lastUserText: "",
          lastButtonId: null,
          lastButtonTitle: null,
          hasFreshUserInput: false,
          variables: (exec.collected_data && typeof exec.collected_data === "object") ? exec.collected_data : {},
          forceNoResponseTimeout: mode === "timeout",
        };

        // Clear scheduling fields BEFORE running so we don't re-trigger.
        await supabase.from("wa_flow_executions").update({
          wait_until: null,
          awaiting_input_until: null,
          awaiting_node_id: null,
        }).eq("id", exec.id);

        let startId = exec.current_node_id;
        if (mode === "wait") {
          // For wait nodes, advance to the next node (default target).
          const bySource = buildEdgeIndex(edges);
          const next = getDefaultTarget(bySource, exec.current_node_id);
          if (next) startId = next;
        }
        if (!startId) return;

        const fakeBody = {
          user_id: exec.user_id,
          lead_phone: exec.lead_phone,
          lead_name: exec.lead_name,
          source: flow.api_type === "meta" ? "meta" : "evolution",
        };
        await runFlow(supabase, fakeBody, flow, nodes, edges, startId, exec, ctx);
        resumedIds.push(exec.id);
      };

      for (const exec of dueWaits || []) await resumeExec(exec, "wait");
      for (const exec of dueTimeouts || []) await resumeExec(exec, "timeout");

      return new Response(JSON.stringify({ scheduler: true, resumed: resumedIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.user_id || !body.lead_phone) {
      return new Response(JSON.stringify({ error: "user_id and lead_phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[wa-flow-runner] invoked: user=${body.user_id} phone=${body.lead_phone} text=${body.incoming_text?.slice(0, 60)}`);

    // 1) Resume any active execution for this lead — #5 fix: tolerant phone match (last 8 digits)
    const leadKey8 = phoneKey(body.lead_phone);
    const { data: candidateExecs } = await supabase
      .from("wa_flow_executions")
      .select("*, wa_automation_flows!inner(*)")
      .eq("user_id", body.user_id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(50);
    const activeExecutions = (candidateExecs || []).filter(
      (e: any) => phoneKey(e.lead_phone) === leadKey8,
    ).slice(0, 5);

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
      let buttonResolved = false;
      if (node?.node_type === "buttons" && body.button_id) {
        const next = getTargetByHandle(buildEdgeIndex(edges), startId, body.button_id);
        if (next) { realStart = next; buttonResolved = true; }
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
          if (next) { realStart = next; buttonResolved = true; }
        }
      }

      // #7 fix: if we're paused on a "buttons" node and the user reply did NOT match any handle,
      // skip re-execution (don't re-send the same buttons message). The execution stays paused.
      if (node?.node_type === "buttons" && !buttonResolved && (body.button_id || body.incoming_text)) {
        console.log(`[wa-flow-runner] No matching button handle for exec ${exec.id} — staying paused`);
        continue;
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
        // #5 fix: tolerant phone match (compare last 8 digits across all executions of this flow)
        const leadKey = phoneKey(body.lead_phone);
        const { data: priorExec } = await supabase
          .from("wa_flow_executions")
          .select("lead_phone")
          .eq("flow_id", flow.id);
        const alreadyRan = (priorExec || []).some((e: any) => phoneKey(e.lead_phone) === leadKey);
        shouldTrigger = !alreadyRan && !!body.incoming_text;
      } else if (triggerType === "keyword") {
        // #1 fix: keywords may be CSV string OR array. #2 fix: respect exact_match flag.
        const keywords = parseKeywords(entryConfig.keywords);
        if (keywords.length === 0 || !body.incoming_text) { continue; }
        const text = normalizeText(body.incoming_text);
        const exactMatch = !!entryConfig.exact_match;
        shouldTrigger = exactMatch
          ? keywords.some((k: string) => text === k)
          : keywords.some((k: string) => text.includes(k));
      } else if (triggerType === "campaign_reply") {
        // #3: campaign_reply triggers when this lead replied to a campaign of this user.
        // Source of truth: public.campaign_responses (logged by the campaign engine).
        if (!body.incoming_text) { continue; }
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const leadKey = phoneKey(body.lead_phone);
        let q = supabase
          .from("campaign_responses")
          .select("id, campaign_id, contact_phone, responded_at")
          .eq("user_id", body.user_id)
          .gte("responded_at", since)
          .limit(100);
        if (entryConfig.campaign_id) {
          q = q.eq("campaign_id", entryConfig.campaign_id);
        }
        const { data: responses } = await q;
        const matched = (responses || []).find((r: any) => phoneKey(r.contact_phone) === leadKey);
        if (!matched) { continue; }
        // ensure not already triggered for this lead+flow
        const { data: priorExec2 } = await supabase
          .from("wa_flow_executions")
          .select("lead_phone")
          .eq("flow_id", flow.id);
        const alreadyRan2 = (priorExec2 || []).some((e: any) => phoneKey(e.lead_phone) === leadKey);
        shouldTrigger = !alreadyRan2;
      } else {
        // Unknown trigger types — log and skip
        console.log(`[wa-flow-runner] Unsupported trigger_type='${triggerType}' on flow ${flow.id}`);
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
