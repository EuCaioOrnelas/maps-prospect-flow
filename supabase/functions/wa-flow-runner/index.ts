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
  // Normalize with accent stripping + lowercase for accent-insensitive matching ("São" === "sao")
  const normalizedValue = normalizeText(rawValue);
  const normalizedText = normalizeText(ctx.lastUserText || "");
  const normalizedButtonTitle = normalizeText(ctx.lastButtonTitle || "");
  const normalizedButtonId = normalizeHandle(ctx.lastButtonId);
  const normalizedConditionHandle = normalizeHandle(rawValue);

  switch (conditionType) {
    case "button_clicked":
      return (
        (!!normalizedConditionHandle && normalizedConditionHandle === normalizedButtonId) ||
        (!!normalizedButtonTitle && normalizedButtonTitle === normalizedValue)
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
      return tags.some((t) => normalizeText(String(t)) === normalizedValue);
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
      headerImageUrl?: string;
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

// Check whether the conversation with `phone` is currently inside Meta's free-form 24h window.
// We consider the window OPEN when the lead sent any inbound message within the last 24h.
// chat_messages has NO `from_phone` column — phones live on chat_conversations.contact_phone.
// The previous version queried a non-existent column and always returned `false`, silently
// blocking every Meta send from the flow runner.
async function isInside24hWindow(supabase: any, userId: string, phone: string): Promise<boolean> {
  const last8 = String(phone || "").replace(/\D/g, "").slice(-8);
  if (!last8) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1) Find candidate conversations for this user/phone (tolerant match on last 8 digits).
  const { data: convs } = await supabase
    .from("chat_conversations")
    .select("id, contact_phone, last_message_at, last_message_direction")
    .eq("user_id", userId)
    .ilike("contact_phone", `%${last8}`)
    .order("last_message_at", { ascending: false })
    .limit(10);

  const matching = (convs || []).filter(
    (c: any) => String(c.contact_phone || "").replace(/\D/g, "").endsWith(last8),
  );
  if (matching.length === 0) return false;

  // 2) Fast path: most recent message on the conversation is inbound and < 24h old.
  for (const c of matching) {
    if (
      c.last_message_direction === "inbound" &&
      c.last_message_at &&
      new Date(c.last_message_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000
    ) {
      return true;
    }
  }

  // 3) Fallback: scan chat_messages for any inbound in the last 24h on those conversations.
  const convIds = matching.map((c: any) => c.id);
  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("id")
    .in("conversation_id", convIds)
    .eq("direction", "inbound")
    .gte("created_at", since)
    .limit(1);
  return !!(msgs && msgs.length > 0);
}

async function sendViaMeta(
  supabase: any,
  wabaConnectionId: string,
  toPhone: string,
  payload: SendPayload,
  opts?: { userId?: string; outOfWindowTemplate?: { name: string; language?: string; variables?: string[] } | null },
) {
  const { data: conn } = await supabase
    .from("user_waba_connections")
    .select("phone_number_id, access_token, webhook_verified_at, status")
    .eq("id", wabaConnectionId)
    .maybeSingle();
  if (!conn?.phone_number_id || !conn?.access_token) {
    throw new Error(`Meta WABA connection missing token/phone_number_id for ${wabaConnectionId}`);
  }
  // Hard gate: webhook must be verified for the conversation to receive inbound events.
  if (!conn.webhook_verified_at) {
    throw new Error(`Meta WABA connection ${wabaConnectionId} has no verified webhook — flow blocked`);
  }

  // 24h window enforcement: if the conversation is closed and the payload is a free-form message,
  // either swap for the configured HSM template or refuse.
  const needsWindowCheck = ["text", "image", "video", "audio", "document", "buttons", "list"].includes(payload.type);
  if (needsWindowCheck && opts?.userId) {
    const open = await isInside24hWindow(supabase, opts.userId, toPhone);
    if (!open) {
      const tpl = opts.outOfWindowTemplate;
      if (!tpl?.name) {
        console.warn(
          `[wa-flow-runner] 24h window closed for ${toPhone} and no out-of-window template configured — skipping send`,
        );
        return { skipped: true, reason: "24h_window_closed_no_template" };
      }
      // Send approved template instead
      const tplBody: any = {
        messaging_product: "whatsapp",
        to: toPhone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: tpl.name,
          language: { code: tpl.language || "pt_BR" },
        },
      };
      const vars = (tpl.variables || []).filter((v) => v != null && v !== "");
      if (vars.length > 0) {
        tplBody.template.components = [
          {
            type: "body",
            parameters: vars.map((v) => ({ type: "text", text: String(v) })),
          },
        ];
      }
      const tres = await fetch(`https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.access_token}` },
        body: JSON.stringify(tplBody),
      });
      const ttxt = await tres.text();
      if (!tres.ok) {
        console.error(`[wa-flow-runner] Meta template send failed (${tres.status}):`, ttxt);
        throw new Error(`Meta template error ${tres.status}: ${ttxt.slice(0, 200)}`);
      }
      console.log(`[wa-flow-runner] Sent HSM template '${tpl.name}' to ${toPhone} (window closed)`);
      return JSON.parse(ttxt || "{}");
    }
  }

  const url = `https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`;
  let body: any = { messaging_product: "whatsapp", to: toPhone.replace(/\D/g, "") };

  if (payload.type === "text") {
    body.type = "text";
    body.text = { body: payload.content || "" };
  } else if (payload.type === "buttons") {
    const headerObj = payload.headerImageUrl
      ? { header: { type: "image", image: { link: payload.headerImageUrl } } }
      : payload.header
        ? { header: { type: "text", text: payload.header.slice(0, 60) } }
        : {};
    body.type = "interactive";
    body.interactive = {
      type: "button",
      ...headerObj,
      body: { text: (payload.body || "Escolha uma opção:").slice(0, 1024) },
      ...(payload.footer ? { footer: { text: payload.footer.slice(0, 60) } } : {}),
      action: {
        buttons: (payload.buttons || []).slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: (b.title || "Opção").slice(0, 20) },
        })),
      },
    };
  } else if (payload.type === "list") {
    body.type = "interactive";
    body.interactive = {
      type: "list",
      ...(payload.header ? { header: { type: "text", text: payload.header.slice(0, 60) } } : {}),
      body: { text: (payload.body || "Escolha uma opção:").slice(0, 1024) },
      ...(payload.footer ? { footer: { text: payload.footer.slice(0, 60) } } : {}),
      action: {
        button: (payload.buttonText || "Ver opções").slice(0, 20),
        sections: (payload.sections || []).map((s) => ({
          title: (s.title || "Opções").slice(0, 24),
          rows: (s.rows || []).slice(0, 10).map((r) => ({
            id: r.id,
            title: (r.title || "Opção").slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        })),
      },
    };
  } else if (payload.type === "audio") {
    body.type = "audio";
    body.audio = { link: (payload as any).mediaUrl };
  } else if (payload.type === "image" || payload.type === "video") {
    body.type = payload.type;
    body[payload.type] = {
      link: (payload as any).mediaUrl,
      ...((payload as any).caption ? { caption: (payload as any).caption } : {}),
    };
  } else if (payload.type === "document") {
    body.type = "document";
    body.document = {
      link: (payload as any).mediaUrl,
      ...((payload as any).caption ? { caption: (payload as any).caption } : {}),
      ...((payload as any).filename ? { filename: (payload as any).filename } : {}),
    };
  } else {
    body.type = payload.type;
    body[payload.type] = {
      link: (payload as any).mediaUrl,
      ...((payload as any).caption ? { caption: (payload as any).caption } : {}),
      ...((payload as any).filename ? { filename: (payload as any).filename } : {}),
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
  nodeConfig?: any,
) {
  // META-ONLY: Evolution flows are no longer accepted by the runner.
  if (flow.api_type !== "meta") {
    console.error(`[wa-flow-runner] Flow ${flow.id} has api_type='${flow.api_type}' — Meta API official required. Skipping send.`);
    return;
  }
  if (!flow.waba_connection_id) {
    console.error("[wa-flow-runner] Meta flow missing waba_connection_id");
    return;
  }
  const outOfWindowTemplate = nodeConfig?.out_of_window_template
    || (flow.default_out_of_window_template || null);
  return sendViaMeta(supabase, flow.waba_connection_id, leadPhone, payload, {
    userId,
    outOfWindowTemplate,
  });
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

// ── Handoff distribution ──

async function resolveAccountOwner(supabase: any, userId: string): Promise<string> {
  try {
    const { data } = await supabase.rpc("get_account_owner", { _uid: userId });
    return (data as string) || userId;
  } catch {
    return userId;
  }
}

function memberIsAvailableNow(av: any): boolean {
  if (!av || av.status !== "online") return false;
  try {
    const tz = av.timezone || "America/Sao_Paulo";
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const wd = parts.find((p) => p.type === "weekday")?.value || "";
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = map[wd] ?? new Date().getDay();
    if (!Array.isArray(av.work_days) || !av.work_days.includes(dow)) return false;
    const cur = parseInt(hh, 10) * 60 + parseInt(mm, 10);
    const [sh, sm] = String(av.work_start || "08:00").split(":").map(Number);
    const [eh, em] = String(av.work_end || "18:00").split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return cur >= start && cur <= end;
  } catch {
    return av.status === "online";
  }
}

async function pickRoundRobinMember(
  supabase: any,
  accountOwnerId: string,
  nodeId: string,
  eligibleIds: string[]
): Promise<string | null> {
  if (eligibleIds.length === 0) return null;
  const { data } = await supabase
    .from("handoff_assignments")
    .select("assigned_member_id, assigned_at")
    .eq("account_owner_id", accountOwnerId)
    .eq("node_id", nodeId)
    .in("assigned_member_id", eligibleIds)
    .order("assigned_at", { ascending: false })
    .limit(200);

  const lastByMember = new Map<string, string>();
  for (const row of data || []) {
    if (!lastByMember.has(row.assigned_member_id)) {
      lastByMember.set(row.assigned_member_id, row.assigned_at);
    }
  }
  // Quem nunca foi atribuído vence; depois, o mais antigo.
  const sorted = [...eligibleIds].sort((a, b) => {
    const la = lastByMember.get(a);
    const lb = lastByMember.get(b);
    if (!la && lb) return -1;
    if (la && !lb) return 1;
    if (!la && !lb) return a.localeCompare(b);
    return new Date(la!).getTime() - new Date(lb!).getTime();
  });
  return sorted[0] || null;
}

async function logHandoffAudit(supabase: any, payload: {
  assignment_id?: string | null;
  account_owner_id: string;
  event_type: string;
  member_id?: string | null;
  data?: any;
}) {
  try {
    await supabase.from("handoff_audit_log").insert({
      assignment_id: payload.assignment_id || null,
      account_owner_id: payload.account_owner_id,
      event_type: payload.event_type,
      member_id: payload.member_id || null,
      payload: payload.data || {},
    });
  } catch (e) {
    console.error("[handoff audit] error:", e);
  }
}

async function executeHandoff(supabase: any, args: {
  flow: any; node: any; config: any; ctx: any; execution: any;
  userId: string; leadPhone: string; leadName?: string | null;
}): Promise<{ shouldEnd: boolean; queued: boolean; redirectFlowId?: string | null }> {
  const { flow, node, config, ctx, execution, userId, leadPhone } = args;
  const accountOwnerId = await resolveAccountOwner(supabase, userId);
  const distributionType = config.distribution_type || "specific";
  const preMessage = config.pre_message || config.handoff_message || "";
  const postMessage = config.post_message || "";
  const maxWaitMin = Number(config.max_wait_minutes ?? 30);

  // 1) Determinar candidatos
  let candidateIds: string[] = [];
  if (distributionType === "specific") {
    if (config.specific_member_id) candidateIds = [config.specific_member_id];
  } else {
    candidateIds = Array.isArray(config.member_ids) ? config.member_ids : [];
  }

  // 2) Buscar disponibilidade dos candidatos
  let eligibleIds: string[] = [];
  if (candidateIds.length > 0) {
    const { data: avs } = await supabase
      .from("member_availability")
      .select("*")
      .in("user_id", candidateIds);
    const byUser = new Map((avs || []).map((a: any) => [a.user_id, a]));
    eligibleIds = candidateIds.filter((id) => memberIsAvailableNow(byUser.get(id)));
  }

  // 3) Sem disponíveis → contingência
  if (eligibleIds.length === 0) {
    const actions: string[] = config.no_agents_actions || ["send_message"];

    // Cria registro de assignment em fila
    const { data: assignment } = await supabase.from("handoff_assignments").insert({
      execution_id: execution.id,
      flow_id: flow.id,
      node_id: node.id,
      account_owner_id: accountOwnerId,
      lead_phone: leadPhone,
      team_member_ids: candidateIds,
      distribution_type: distributionType,
      status: "queued",
      pre_message: preMessage,
      post_message: postMessage,
      no_agents_message: config.no_agents_message || null,
      no_agents_actions: actions,
      redirect_flow_id: config.redirect_flow_id || null,
      max_wait_seconds: maxWaitMin > 0 ? maxWaitMin * 60 : null,
      queued_at: new Date().toISOString(),
      expires_at: maxWaitMin > 0 ? new Date(Date.now() + maxWaitMin * 60_000).toISOString() : null,
    }).select("id").maybeSingle();

    await logHandoffAudit(supabase, {
      assignment_id: assignment?.id,
      account_owner_id: accountOwnerId,
      event_type: "no_agents_available",
      data: { candidate_ids: candidateIds },
    });

    if (actions.includes("send_message") && config.no_agents_message) {
      await sendMessage(supabase, flow, userId, leadPhone, {
        type: "text", content: interpolate(config.no_agents_message, ctx.variables),
      }, config);
    }

    if (actions.includes("create_crm_task")) {
      try {
        const { data: lead } = await supabase
          .from("leads").select("id").eq("user_id", userId).eq("phone", leadPhone).maybeSingle();
        if (lead?.id) {
          await supabase.from("lead_activities").insert({
            user_id: userId,
            lead_id: lead.id,
            type: "task",
            description: `Lead aguardando atendimento humano (fluxo: ${flow.name})`,
          });
        }
      } catch (e) { console.error("[handoff] crm task error:", e); }
    }

    if (actions.includes("notify_managers") && Array.isArray(config.notify_manager_ids)) {
      // best-effort log; integração de email pode usar mesma estrutura de notify_team
      await logHandoffAudit(supabase, {
        assignment_id: assignment?.id,
        account_owner_id: accountOwnerId,
        event_type: "managers_notified",
        data: { manager_ids: config.notify_manager_ids },
      });
    }

    if (actions.includes("redirect_flow") && config.redirect_flow_id) {
      return { shouldEnd: false, queued: false, redirectFlowId: config.redirect_flow_id };
    }
    if (actions.includes("end")) {
      return { shouldEnd: true, queued: false };
    }
    if (actions.includes("keep_in_queue") || actions.includes("auto_reassign_when_online")) {
      return { shouldEnd: false, queued: true };
    }
    // Default: encerra silenciosamente
    return { shouldEnd: true, queued: false };
  }

  // 4) Selecionar colaborador
  let chosen: string | null = null;
  if (distributionType === "specific") {
    chosen = eligibleIds[0];
  } else {
    chosen = await pickRoundRobinMember(supabase, accountOwnerId, node.id, eligibleIds);
  }
  if (!chosen) {
    return { shouldEnd: true, queued: false };
  }

  // 5) Buscar nome do responsável
  let responsibleName = "nosso especialista";
  try {
    const { data: prof } = await supabase
      .from("profiles").select("name, email").eq("id", chosen).maybeSingle();
    responsibleName = (prof as any)?.name || (prof as any)?.email || responsibleName;
  } catch { /* ignore */ }
  const enrichedVars = { ...ctx.variables, responsavel: responsibleName };

  // 6) Enviar pre-message
  if (preMessage) {
    await sendMessage(supabase, flow, userId, leadPhone, {
      type: "text", content: interpolate(preMessage, enrichedVars),
    }, config);
  }

  // 7) Atribuir conversa
  try {
    await supabase
      .from("chat_conversations")
      .update({ responsible_user_id: chosen })
      .eq("user_id", userId)
      .eq("contact_phone", leadPhone);
  } catch (e) { console.error("[handoff] assign conversation error:", e); }

  // 8) Criar assignment
  const { data: assignment } = await supabase.from("handoff_assignments").insert({
    execution_id: execution.id,
    flow_id: flow.id,
    node_id: node.id,
    account_owner_id: accountOwnerId,
    lead_phone: leadPhone,
    assigned_member_id: chosen,
    team_member_ids: candidateIds,
    distribution_type: distributionType,
    status: "assigned",
    pre_message: preMessage,
    post_message: postMessage,
    assigned_at: new Date().toISOString(),
  }).select("id").maybeSingle();

  await logHandoffAudit(supabase, {
    assignment_id: assignment?.id,
    account_owner_id: accountOwnerId,
    event_type: "assigned",
    member_id: chosen,
    data: { distribution_type: distributionType, eligible_count: eligibleIds.length },
  });

  // 9) Enviar post-message
  if (postMessage) {
    await sendMessage(supabase, flow, userId, leadPhone, {
      type: "text", content: interpolate(postMessage, enrichedVars),
    }, config);
  }

  const shouldEnd = config.stop_automation !== false;
  return { shouldEnd, queued: false };
}



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
  const MAX_ITERATIONS = 60;
  const history: any[] = Array.isArray(execution.node_history) ? execution.node_history : [];
  let runError: any = null;
  let overflowed = false;

  // ── Capture EVERY user reply tied to the node they were paused on, so partial flow
  //    responses (rating without suggestion, button click, free text) always show up
  //    in collected_data / flow results even if the lead later abandons or hits inactivity.
  try {
    if (ctx.hasFreshUserInput && execution?.current_node_id) {
      const pausedNode = nodeMap.get(execution.current_node_id);
      if (pausedNode) {
        const rawName = String(pausedNode.name || pausedNode.node_type || "resposta");
        const slug = rawName
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40) || "resposta";
        const value = (ctx.lastButtonTitle && ctx.lastButtonTitle.trim())
          || (ctx.lastUserText && ctx.lastUserText.trim())
          || "";
        if (value && ctx.variables[slug] !== value) {
          ctx.variables[slug] = value;
          try {
            await supabase
              .from("wa_flow_executions")
              .update({ collected_data: ctx.variables, last_user_message_at: new Date().toISOString() })
              .eq("id", execution.id);
          } catch (_e) { /* non-fatal */ }
        }
      }
    }
  } catch (e) {
    console.warn("[wa-flow-runner] capture-user-reply failed:", e);
  }

  try {
  while (currentNodeId && safety < MAX_ITERATIONS) {
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
        // If this node was paused waiting for response and user replied, advance now (don't re-send).
        if ((config.after_send || "continue") === "wait" && ctx.hasFreshUserInput) {
          ctx.hasFreshUserInput = false;
          currentNodeId = getDefaultTarget(bySource, node.id);
          break;
        }
        // New schema: config.contents = [{type, content, media_url, caption, media_filename, delay_min, delay_max}, ...]
        // Legacy: config.items = [...] or single { message_type, content, media_url, caption, filename }
        const pending = ctx.variables?.__pending_message__;
        const usePending = pending && pending.nodeId === node.id && Array.isArray(pending.items);
        const outgoingTarget = getDefaultTarget(bySource, node.id);
        const rawItems: any[] = usePending
          ? pending.items
          : Array.isArray(config.contents) && config.contents.length > 0
          ? config.contents
          : Array.isArray(config.items) && config.items.length > 0
          ? config.items
          : [{
              type: config.message_type || "text",
              content: config.content,
              media_url: config.media_url,
              caption: config.caption,
              media_filename: config.filename,
            }];

        for (const it of rawItems) {
          const itemType = it.type || "text";

          // Handle delay separator items: pause inline for short delays (<= 5s)
          // or persist a wait_until and resume via cron for longer delays.
          if (itemType === "delay") {
            const minS = Number(it.delay_min ?? it.delay_seconds ?? 0);
            const maxS = Number(it.delay_max ?? it.delay_seconds ?? minS);
            const lo = Math.max(0, Math.min(minS, maxS));
            const hi = Math.max(lo, Math.max(minS, maxS));
            const seconds = lo === hi ? lo : (lo + Math.floor(Math.random() * (hi - lo + 1)));
            if (seconds <= 0) continue;
            if (seconds <= 5) {
              await new Promise((r) => setTimeout(r, seconds * 1000));
            } else {
              // Persist remaining items so the cron resume re-enters this same message node
              // and continues from where we stopped. We store the remaining contents on the
              // execution variables under __pending_message__ and pause.
              const remaining = rawItems.slice(rawItems.indexOf(it) + 1);
              ctx.variables.__pending_message__ = { nodeId: node.id, items: remaining };
              waitUntil = new Date(Date.now() + seconds * 1000).toISOString();
              pausedNodeId = node.id;
              currentNodeId = null;
              console.log(`[wa-flow-runner] Message delay ${seconds}s scheduled for ${waitUntil}`);
              break;
            }
            continue;
          }

          const mediaUrl = it.media_url || it.url;
          if (["image", "audio", "video", "document"].includes(itemType) && !mediaUrl) {
            console.warn(`[wa-flow-runner] skipping ${itemType} without media_url on node=${node.id}`);
            continue;
          }

          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: itemType,
            content: interpolate(it.content || "", ctx.variables),
            mediaUrl,
            caption: interpolate(it.caption || "", ctx.variables),
            filename: it.media_filename || it.filename,
          }, config);

          // Meta API returns as soon as it accepts the payload, not when the message is delivered.
          // Media (image/audio/video/document) takes noticeably longer to render on the device than text,
          // so without a pause the NEXT item (or the next node, e.g. buttons) can arrive before the image.
          // Add a small delay to preserve visual ordering.
          const isMedia = ["image", "audio", "video", "document"].includes(itemType);
          await new Promise((r) => setTimeout(r, isMedia ? 2000 : 500));

        }

        if (currentNodeId === null) break; // paused for delay
        if (ctx.variables) delete ctx.variables.__pending_message__;
        ctx.hasFreshUserInput = false;
        // after_send: "wait" → pause for user input; "continue" (default) → advance.
        if ((config.after_send || "continue") === "wait") {
          pausedNodeId = node.id;
          currentNodeId = null;
        } else {
          currentNodeId = outgoingTarget;
        }
        break;
      }


      case "buttons": {
        // Send native interactive buttons (Meta) or interactive list (Meta) — Evolution maps to sendButtons/sendList.
        const headerText = config.header_text ? interpolate(config.header_text, ctx.variables) : "";
        const bodyText = interpolate(config.body_text || "Escolha uma opção:", ctx.variables);
        const footerText = config.footer_text ? interpolate(config.footer_text, ctx.variables) : "";
        const isList = config.interaction_type === "list";
        const choices: any[] = (isList ? config.list_items : config.buttons) || [];

        // Normalize handles: btn_0, btn_1... or item_0, item_1... (kept stable for edge matching)
        const prefix = isList ? "item" : "btn";
        const normalizedChoices = choices.map((c: any, i: number) => {
          const rawId = typeof c === "object" && c?.id ? String(c.id) : `${prefix}_${i}`;
          const id = normalizeHandle(rawId) || `${prefix}_${i}`;
          const title = String(typeof c === "string" ? c : c?.title || `Opção ${i + 1}`);
          const description = typeof c === "object" ? c?.description : undefined;
          return { id, title: interpolate(title, ctx.variables), description };
        });

        try {
          if (isList) {
            await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
              type: "list",
              header: headerText,
              body: bodyText,
              footer: footerText,
              buttonText: config.list_button_text || "Ver opções",
              sections: [{ title: config.list_section_title || "Opções", rows: normalizedChoices }],
            }, config);
          } else {
            await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
              type: "buttons",
              header: headerText,
              headerImageUrl: config.header_image_url || undefined,
              body: bodyText,
              footer: footerText,
              buttons: normalizedChoices.slice(0, 3),
            }, config);
          }
        } catch (e) {
          // Fallback to plain-text numbered list if interactive send fails (e.g. Evolution endpoint unavailable).
          console.warn("[wa-flow-runner] interactive send failed, falling back to text:", e);
          const lines = [headerText, bodyText, footerText].filter((s) => s && s.trim());
          const optionLines = normalizedChoices.map((c, i) => `${i + 1}. ${c.title}`).join("\n");
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: "text",
            content: `${lines.join("\n\n")}${optionLines ? `\n\n${optionLines}` : ""}`,
          }, config);
        }

        ctx.hasFreshUserInput = false;
        // Buttons/list always pause and wait for the user to click — never auto-advance.
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
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: prompt }, config);
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
        const result = await executeHandoff(supabase, {
          flow, node, config, ctx, execution,
          userId: body.user_id, leadPhone: body.lead_phone, leadName: body.lead_name,
        });
        ctx.hasFreshUserInput = false;
        if (config.handoff_stage) {
          await executeActions(supabase, body.user_id, body.lead_phone, {
            actions: [{ type: "move_kanban", stage_name: config.handoff_stage }],
          });
        }
        if (config.crm_stage_id) {
          await executeActions(supabase, body.user_id, body.lead_phone, {
            actions: [{ type: "move_kanban", pipeline_stage_id: config.crm_stage_id }],
          });
        }
        if (result.shouldEnd) {
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
        if (result.redirectFlowId) {
          // Direcionar para outro fluxo: simplesmente encerra esta execução.
          await supabase.from("wa_flow_executions").update({
            status: "completed",
            current_node_id: node.id,
            current_node_name: node.name,
            exit_node_name: `${node.name} → redirect`,
            completed_at: new Date().toISOString(),
            collected_data: ctx.variables,
            node_history: history,
          }).eq("id", execution.id);
          return;
        }
        if (result.queued) {
          // Espera na fila — pausa execução até reassign-watcher tomar o controle.
          await supabase.from("wa_flow_executions").update({
            status: "waiting",
            current_node_id: node.id,
            current_node_name: node.name,
            collected_data: ctx.variables,
            node_history: history,
          }).eq("id", execution.id);
          return;
        }
        currentNodeId = getDefaultTarget(bySource, node.id);
        break;
      }


      case "end": {
        if (config.end_message) {
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
            type: "text", content: interpolate(config.end_message, ctx.variables),
          }, config);
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
            }, config);
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

      case "rating": {
        const ratingType = config.type || "buttons";
        const phaseKey = `__rating_phase_${node.id}`;
        const idKey = `__rating_id_${node.id}`;
        const sentAtKey = `__rating_sent_at_${node.id}`;
        const phase = ctx.variables[phaseKey] || "ask";

        const ratingName = config.name || "Avaliação";
        const ratingKey = `Avaliação - ${ratingName}`;
        const suggestionKey = `Sugestão - ${ratingName}`;

        if (phase === "ask") {
          const msg = interpolate(config.message || "Como você avalia nosso atendimento?", ctx.variables);
          try {
            if (ratingType === "free") {
              await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: msg }, config);
            } else if (ratingType === "buttons") {
              const opts: any[] = (config.options || []).slice(0, 3).map((o: any, i: number) => ({
                id: `rate_${i}`, title: String(o.label || `Opção ${i + 1}`).slice(0, 20),
              }));
              await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                type: "buttons", body: msg, buttons: opts,
              }, config);
            } else if (ratingType === "menu") {
              const opts: any[] = (config.options || []).slice(0, 10).map((o: any, i: number) => ({
                id: `rate_${i}`, title: String(o.label || `Opção ${i + 1}`).slice(0, 24),
              }));
              await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                type: "list", body: msg, buttonText: "Ver opções",
                sections: [{ title: "Avaliação", rows: opts }],
              }, config);
            } else if (ratingType === "stars") {
              const max = Number(config.stars?.max || 5);
              if (max <= 3) {
                const opts = Array.from({ length: max }, (_, i) => ({
                  id: `rate_${i + 1}`, title: "⭐".repeat(i + 1),
                }));
                await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                  type: "buttons", body: msg, buttons: opts,
                }, config);
              } else {
                const opts = Array.from({ length: max }, (_, i) => ({
                  id: `rate_${i + 1}`, title: `${i + 1} ⭐`, description: "⭐".repeat(i + 1),
                }));
                await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                  type: "list", body: msg, buttonText: "Avaliar",
                  sections: [{ title: "Escolha sua nota", rows: opts }],
                }, config);
              }
            } else if (ratingType === "numeric") {
              const min = Number(config.numeric?.min ?? 0);
              const max = Number(config.numeric?.max ?? 10);
              const range = max - min + 1;
              if (range <= 10) {
                const opts = Array.from({ length: range }, (_, i) => {
                  const v = min + i;
                  return { id: `rate_${v}`, title: String(v) };
                });
                await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                  type: "list", body: msg, buttonText: "Avaliar",
                  sections: [{ title: `De ${min} a ${max}`, rows: opts }],
                }, config);
              } else {
                await sendMessage(supabase, flow, body.user_id, body.lead_phone, {
                  type: "text", content: `${msg}\n\nResponda com um número de ${min} a ${max}.`,
                }, config);
              }
            }
          } catch (e) {
            console.warn("[wa-flow-runner] rating send fallback:", e);
            await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: msg }, config);
          }
          ctx.variables[phaseKey] = "awaiting_rating";
          ctx.variables[sentAtKey] = new Date().toISOString();
          ctx.hasFreshUserInput = false;
          pausedNodeId = node.id;
          currentNodeId = null;
          break;
        }

        if (phase === "awaiting_rating") {
          if (!ctx.hasFreshUserInput) {
            pausedNodeId = node.id;
            currentNodeId = null;
            break;
          }
          const text = (ctx.lastUserText || "").trim();
          const btnId = ctx.lastButtonId || "";
          const btnTitle = ctx.lastButtonTitle || "";

          let scoreNumeric: number | null = null;
          let scoreText: string | null = null;
          let scoreMax: number | null = null;

          if (ratingType === "free") {
            scoreText = text;
          } else if (ratingType === "buttons" || ratingType === "menu") {
            let idx = -1;
            if (btnId.startsWith("rate_")) idx = parseInt(btnId.slice(5)) || -1;
            if (idx < 0 && text) {
              const opts = config.options || [];
              const t = text.toLowerCase();
              idx = opts.findIndex((o: any, i: number) =>
                String(o.label || "").toLowerCase() === t ||
                String(i + 1) === t ||
                String(o.value || "") === t
              );
            }
            const opt = (config.options || [])[idx];
            scoreText = opt ? String(opt.label || "") : (btnTitle || text);
          } else if (ratingType === "stars") {
            const max = Number(config.stars?.max || 5);
            scoreMax = max;
            let n = NaN;
            if (btnId.startsWith("rate_")) n = parseInt(btnId.slice(5));
            if (isNaN(n) && text) n = parseInt(text);
            if (!isNaN(n) && n >= 1 && n <= max) {
              scoreNumeric = n;
              scoreText = `${n}/${max} ⭐`;
            } else {
              scoreText = btnTitle || text;
            }
          } else if (ratingType === "numeric") {
            const min = Number(config.numeric?.min ?? 0);
            const max = Number(config.numeric?.max ?? 10);
            scoreMax = max;
            let n = NaN;
            if (btnId.startsWith("rate_")) n = parseInt(btnId.slice(5));
            if (isNaN(n) && text) n = parseInt(text);
            if (!isNaN(n) && n >= min && n <= max) {
              scoreNumeric = n;
              scoreText = String(n);
            } else {
              scoreText = text || btnTitle;
            }
          }

          // Persist into collected_data so it shows up in flow results
          const displayValue = scoreNumeric != null
            ? (scoreMax ? `${scoreNumeric}/${scoreMax}` : String(scoreNumeric))
            : (scoreText || "");
          ctx.variables[ratingKey] = displayValue;

          try {
            const { data: rating } = await supabase
              .from("wa_flow_ratings")
              .insert({
                user_id: body.user_id,
                flow_id: flow.id,
                node_id: node.id,
                execution_id: execution.id,
                contact_phone: body.lead_phone,
                contact_name: body.lead_name || execution.lead_name || null,
                rating_name: config.name || null,
                rating_type: ratingType,
                score_numeric: scoreNumeric,
                score_max: scoreMax,
                score_text: scoreText,
                sent_at: ctx.variables[sentAtKey] || null,
                responded_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (rating?.id) ctx.variables[idKey] = rating.id;
          } catch (e) {
            console.error("[wa-flow-runner] rating insert failed:", e);
          }

          ctx.hasFreshUserInput = false;

          if (config.ask_suggestion) {
            const prompt = interpolate(
              config.suggestion_prompt || "Tem alguma sugestão de melhoria para nós? (responda 'pular' para finalizar)",
              ctx.variables,
            );
            await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: prompt }, config);
            ctx.variables[phaseKey] = "awaiting_suggestion_text";
            pausedNodeId = node.id;
            currentNodeId = null;
            break;
          }

          delete ctx.variables[phaseKey];
          delete ctx.variables[sentAtKey];
          delete ctx.variables[idKey];
          currentNodeId = getDefaultTarget(bySource, node.id);
          break;
        }

        if (phase === "awaiting_suggestion_text") {
          if (!ctx.hasFreshUserInput) {
            pausedNodeId = node.id;
            currentNodeId = null;
            break;
          }
          const suggestion = (ctx.lastUserText || "").trim();
          const skip = ["pular", "skip", "nao", "não", "n"].includes(suggestion.toLowerCase());
          const finalSuggestion = skip ? "" : suggestion;
          const ratingId = ctx.variables[idKey];

          if (finalSuggestion) {
            ctx.variables[suggestionKey] = finalSuggestion;
            if (ratingId) {
              try {
                await supabase
                  .from("wa_flow_ratings")
                  .update({ suggestion_text: finalSuggestion })
                  .eq("id", ratingId);
              } catch (e) {
                console.error("[wa-flow-runner] rating suggestion update failed:", e);
              }
            }
          }

          const thanks = interpolate(
            config.suggestion_thanks || "Obrigado pelo seu feedback! Sua avaliação foi registrada.",
            ctx.variables,
          );
          await sendMessage(supabase, flow, body.user_id, body.lead_phone, { type: "text", content: thanks }, config);
          delete ctx.variables[phaseKey];
          delete ctx.variables[sentAtKey];
          delete ctx.variables[idKey];
          ctx.hasFreshUserInput = false;
          currentNodeId = getDefaultTarget(bySource, node.id);
          break;
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

  if (currentNodeId && safety >= MAX_ITERATIONS) {
    overflowed = true;
    console.error(`[wa-flow-runner] safety guard triggered: execution=${execution.id} node=${currentNodeId} iterations=${safety}`);
    history.push({ type: "_safety_overflow", at: new Date().toISOString(), node_id: currentNodeId, iterations: safety });
  }
  } catch (err) {
    runError = err;
    const errMsg = (err as any)?.message ?? String(err);
    console.error(`[wa-flow-runner] runtime error in execution=${execution.id}:`, err);
    history.push({ type: "_error", at: new Date().toISOString(), node_id: currentNodeId, message: String(errMsg) });
  }

  // Always persist state — partial history preserved even on errors / safety overflow.
  const finalStatus = runError
    ? "error"
    : overflowed
    ? "error"
    : (currentNodeId || pausedNodeId)
    ? "active"
    : "abandoned";

  await supabase.from("wa_flow_executions").update({
    status: finalStatus,
    current_node_id: currentNodeId || pausedNodeId,
    current_node_name: (currentNodeId || pausedNodeId) ? (nodeMap.get(currentNodeId || pausedNodeId)?.name || null) : null,
    collected_data: ctx.variables,
    node_history: history,
    wait_until: waitUntil,
    awaiting_input_until: awaitingInputUntil,
    awaiting_node_id: awaitingNodeId,
    last_error: runError ? String(runError?.message || runError).slice(0, 500) : (overflowed ? `safety_overflow_${MAX_ITERATIONS}` : null),
  }).eq("id", execution.id);
}

// Sweep executions whose lead has been silent past the configured inactivity timeout.
async function runInactivitySweep(supabase: any): Promise<number> {
  const { data: flows } = await supabase
    .from("wa_automation_flows")
    .select("*")
    .eq("inactivity_reset_enabled", true)
    .gt("inactivity_timeout_seconds", 0);

  if (!flows || flows.length === 0) return 0;

  let processed = 0;
  const now = Date.now();

  for (const flow of flows) {
    const timeoutMs = (flow.inactivity_timeout_seconds || 0) * 1000;
    if (!timeoutMs) continue;
    const threshold = new Date(now - timeoutMs).toISOString();

    const { data: execs } = await supabase
      .from("wa_flow_executions")
      .select("*")
      .eq("flow_id", flow.id)
      .in("status", ["active", "waiting", "paused"])
      .is("inactivity_processed_at", null)
      .or(`last_user_message_at.lte.${threshold},and(last_user_message_at.is.null,started_at.lte.${threshold})`)
      .limit(50);

    if (!execs || execs.length === 0) continue;

    const { nodes, edges } = await loadFlowGraph(supabase, flow.id);
    const fakeBodyBase = (exec: any) => ({
      user_id: exec.user_id,
      lead_phone: exec.lead_phone,
      lead_name: exec.lead_name,
      source: flow.api_type === "meta" ? "meta" : "evolution",
    });

    for (const exec of execs) {
      try {
        if (flow.inactivity_message) {
          await sendMessage(supabase, flow, exec.user_id, exec.lead_phone, {
            type: "text",
            content: String(flow.inactivity_message),
          }, {}).catch((e: any) => console.warn("[wa-flow-runner] inactivity msg failed:", e));
        }

        const action = flow.inactivity_action || "restart";
        // Always mark processed to avoid loops
        await supabase.from("wa_flow_executions").update({
          inactivity_processed_at: new Date().toISOString(),
          status: action === "goto_node" ? "active" : "abandoned",
          completed_at: action === "goto_node" ? null : new Date().toISOString(),
          awaiting_input_until: null,
          awaiting_node_id: null,
        }).eq("id", exec.id);

        if (action === "end") {
          processed++;
          continue;
        }

        if (action === "goto_node" && flow.inactivity_target_node_id) {
          const target = nodes.find((n: any) => n.id === flow.inactivity_target_node_id);
          if (target) {
            const ctx: RuntimeCtx = {
              lastUserText: "",
              lastButtonId: null,
              lastButtonTitle: null,
              hasFreshUserInput: false,
              variables: (exec.collected_data && typeof exec.collected_data === "object") ? exec.collected_data : {},
            };
            await runFlow(supabase, fakeBodyBase(exec), flow, nodes, edges, target.id, exec, ctx);
            processed++;
            continue;
          }
        }

        // restart or main_menu → start a fresh execution from entry (or first menu/buttons node for main_menu)
        let startNode = findEntryNode(nodes);
        if (action === "main_menu") {
          const menuNode = nodes.find((n: any) => n.node_type === "buttons") || startNode;
          startNode = menuNode || startNode;
        }
        if (!startNode) { processed++; continue; }

        const { data: newExec } = await supabase
          .from("wa_flow_executions")
          .insert({
            flow_id: flow.id,
            user_id: exec.user_id,
            lead_phone: exec.lead_phone,
            lead_name: exec.lead_name,
            status: "active",
            current_node_id: startNode.id,
            current_node_name: startNode.name,
            entry_data: { trigger_type: "inactivity_reset", source: flow.api_type === "meta" ? "meta" : "evolution" },
            node_history: [],
            collected_data: {},
            last_user_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (newExec) {
          const ctx: RuntimeCtx = {
            lastUserText: "",
            lastButtonId: null,
            lastButtonTitle: null,
            hasFreshUserInput: false,
            variables: {},
          };
          await runFlow(supabase, fakeBodyBase(exec), flow, nodes, edges, startNode.id, newExec, ctx);
        }
        processed++;
      } catch (e) {
        console.error("[wa-flow-runner] inactivity sweep error for exec", exec.id, e);
      }
    }
  }

  return processed;
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

      // c) Inactivity sweep — execution waiting on user input that didn't reply within the configured timeout.
      const inactivityCount = await runInactivitySweep(supabase);

      return new Response(JSON.stringify({ scheduler: true, resumed: resumedIds.length, inactivity: inactivityCount }), {
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
      // Allow resume for both production flows (status=active) and test-mode flows.
      if (!flow) continue;
      if (flow.status !== "active" && flow.test_mode !== true) continue;

      // Track last user activity so the inactivity sweep knows the lead is responsive.
      if (body.incoming_text || body.button_id) {
        await supabase
          .from("wa_flow_executions")
          .update({ last_user_message_at: new Date().toISOString(), inactivity_processed_at: null })
          .eq("id", exec.id);
      }


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
        // Still capture the lead's literal reply so it shows up in flow results
        // even though it didn't match any button handle.
        try {
          const rawName = String(node.name || "botoes");
          const slug = rawName
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 40) || "botoes";
          const value = (body.button_title || body.incoming_text || "").toString().trim();
          if (value) {
            const updated = { ...(exec.collected_data || {}), [slug]: value };
            await supabase
              .from("wa_flow_executions")
              .update({ collected_data: updated })
              .eq("id", exec.id);
          }
        } catch (_e) { /* non-fatal */ }
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
    // Include both:
    //  - Production flows (status = active)
    //  - Test-mode flows (test_mode = true) — but only when the incoming phone matches the configured test_phone
    const { data: flows } = await supabase
      .from("wa_automation_flows")
      .select("*")
      .eq("user_id", body.user_id)
      .or("status.eq.active,test_mode.eq.true");

    if (!flows || flows.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, reason: "no_active_flows" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggered: string[] = [];
    const leadPhoneKey = phoneKey(body.lead_phone);
    for (const flow of flows) {
      // If the flow isn't in production, it must be in test_mode AND the incoming phone must match test_phone.
      const isProd = flow.status === "active";
      const isTest = flow.test_mode === true;
      if (!isProd && !isTest) continue;
      if (isTest && (!flow.test_phone || phoneKey(flow.test_phone) !== leadPhoneKey)) {
        // Test mode is on but the message isn't from the test number — skip.
        if (!isProd) continue;
      }
      // META-ONLY: drop any flow not bound to a Meta WABA connection with a verified webhook.
      if (flow.api_type !== "meta") {
        console.log(`[wa-flow-runner] flow ${flow.id} skipped — api_type='${flow.api_type}' (Meta API official required)`);
        continue;
      }
      if (body.source !== "meta") continue;

      if (flow.waba_connection_id && body.waba_connection_id && flow.waba_connection_id !== body.waba_connection_id) continue;
      if (flow.waba_connection_id) {
        const { data: connCheck } = await supabase
          .from("user_waba_connections")
          .select("webhook_verified_at, status")
          .eq("id", flow.waba_connection_id)
          .maybeSingle();
        if (!connCheck?.webhook_verified_at) {
          console.log(`[wa-flow-runner] flow ${flow.id} skipped — WABA ${flow.waba_connection_id} has no verified webhook`);
          continue;
        }
      }

      const { nodes, edges } = await loadFlowGraph(supabase, flow.id);
      const entry = findEntryNode(nodes);
      if (!entry) continue;
      const entryConfig = entry.config || {};
      const triggerType = entryConfig.trigger_type || "first_message";

      // Active-execution guard: don't re-trigger the same flow for the same lead while it's already running.
      // After the flow reaches an `end` node, status becomes "completed" and the lead can enter again.
      const leadKey = leadPhoneKey;
      const { data: activeExecs } = await supabase
        .from("wa_flow_executions")
        .select("lead_phone, status")
        .eq("flow_id", flow.id)
        .in("status", ["active", "waiting", "paused"]);
      const hasActive = (activeExecs || []).some((e: any) => phoneKey(e.lead_phone) === leadKey);
      if (hasActive) {
        console.log(`[wa-flow-runner] flow ${flow.id} skipped — already active for lead ${leadKey}`);
        continue;
      }

      // Match trigger
      let shouldTrigger = false;
      if (triggerType === "first_message") {
        if (!body.incoming_text) continue;
        shouldTrigger = true;
      } else if (triggerType === "any_message") {
        // Any inbound message re-activates the flow (when not already active for this lead).
        if (!body.incoming_text) continue;
        shouldTrigger = true;
      } else if (triggerType === "keyword") {
        const keywords = parseKeywords(entryConfig.keywords);
        if (keywords.length === 0 || !body.incoming_text) { continue; }
        const text = normalizeText(body.incoming_text);
        const exactMatch = !!entryConfig.exact_match;
        shouldTrigger = exactMatch
          ? keywords.some((k: string) => text === k)
          : keywords.some((k: string) => text.includes(k));
      } else if (triggerType === "campaign_reply") {
        if (!body.incoming_text) { continue; }
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
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
        shouldTrigger = true;
      } else {
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
          last_user_message_at: new Date().toISOString(),
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
