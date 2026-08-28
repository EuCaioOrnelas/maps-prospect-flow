// Wiize — Motor de execução dos Fluxos de Automação (Meta Cloud API)
// Autocontido (sem _shared). Dois modos:
//  1) inbound  -> chamado pelo meta-webhook a cada mensagem recebida
//  2) tick     -> chamado pelo cron (wa-flow-scheduler) para nós de espera / inatividade
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MAX_STEPS = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- BYOK: chave OpenAI do cliente (AES-256-GCM) ----------
function masterSecrets(): string[] {
  const list: string[] = [];
  const primary = Deno.env.get("AI_CREDENTIALS_SECRET");
  if (primary) list.push(primary);
  if (SERVICE_KEY) list.push(`wiize-ai-byok::${SERVICE_KEY}`);
  return list;
}
async function masterKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function decryptApiKey(stored: string): Promise<string | null> {
  try {
    const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const iv = buf.subarray(0, 12);
    const cipher = buf.subarray(12);
    for (const secret of masterSecrets()) {
      try {
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await masterKey(secret), cipher);
        return new TextDecoder().decode(plain);
      } catch (_e) { /* tenta próximo */ }
    }
  } catch (_e) { /* chave inválida */ }
  return null;
}
async function getOpenAiKey(ownerId: string): Promise<{ key: string; model: string } | null> {
  const { data } = await supabase
    .from("user_ai_credentials")
    .select("encrypted_key,model,is_active")
    .eq("user_id", ownerId)
    .eq("provider", "openai")
    .maybeSingle();
  if (!data?.encrypted_key || data.is_active === false) return null;
  const key = await decryptApiKey(data.encrypted_key);
  if (!key) return null;
  return { key, model: data.model || "gpt-4o-mini" };
}
async function askOpenAi(key: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`);
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

// ---------- helpers ----------
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const normalizeHandle = (h: unknown) => String(h ?? "").replace(/^btn-/, "btn_").replace(/^item-/, "item_");
const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function interpolate(text: unknown, vars: Record<string, string>): string {
  let out = String(text ?? "");
  // aceita {{var}} e {var}
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
  out = out.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return out;
}

interface FlowNode { id: string; node_type: string; name: string | null; config: Record<string, any> }
interface FlowEdge { source_node_id: string; target_node_id: string; source_handle: string | null }

function defaultTarget(edges: FlowEdge[], nodeId: string): string | null {
  const outs = edges.filter((e) => e.source_node_id === nodeId);
  const plain = outs.find((e) => !e.source_handle);
  return (plain || outs[0])?.target_node_id ?? null;
}
function targetByHandle(edges: FlowEdge[], nodeId: string, handle: string): string | null {
  const h = normalizeHandle(handle);
  const found = edges.find((e) => e.source_node_id === nodeId && normalizeHandle(e.source_handle) === h);
  return found?.target_node_id ?? null;
}

function interactiveItems(cfg: Record<string, any>): Array<{ id: string; title: string; description?: string }> {
  const isList = cfg.interaction_type === "list";
  const raw: any[] = (isList ? cfg.list_items : (cfg.buttons || cfg.reply_buttons)) || [];
  const prefix = isList ? "item" : "btn";
  return raw.map((it, i) => {
    if (typeof it === "string") return { id: `${prefix}_${i}`, title: it };
    return { id: it?.id || `${prefix}_${i}`, title: it?.title ?? it?.label ?? `Opção ${i + 1}`, description: it?.description };
  });
}

// ---------- Meta Cloud API ----------
type FlowChannel = "whatsapp" | "instagram";

interface SendCtx {
  channel: FlowChannel;
  token: string;
  phoneNumberId: string;
  /** ID da conta profissional do Instagram (IG User ID) — usado no canal instagram */
  igUserId?: string;
  /** Comentário que originou a execução (canal instagram) */
  commentId?: string | null;
  to: string;
  convId: string | null;
  userId: string;
  ownerId: string;
  connectionId?: string | null;
}

async function logOutbound(ctx: SendCtx, content: string, type: string, wamid: string | null, ok: boolean) {
  if (!ctx.convId) return;
  await supabase.from("chat_messages").insert({
    conversation_id: ctx.convId,
    user_id: ctx.userId,
    owner_user_id: ctx.ownerId,
    waba_message_id: wamid,
    direction: "outbound",
    message_type: type === "text" ? "text" : type,
    content,
    status: ok ? "sent" : "failed",
  });
  if (ok) {
    await supabase
      .from("chat_conversations")
      .update({
        last_message_text: content,
        last_message_at: new Date().toISOString(),
        last_message_type: type === "text" ? "text" : type,
        last_message_direction: "outbound",
      })
      .eq("id", ctx.convId);
  }
}

/**
 * Traduz o payload no formato WhatsApp Cloud para uma ou mais mensagens
 * do Instagram Messaging (Send API). Mantém o motor único: os nós de
 * mensagem/botões continuam iguais, só a entrega muda.
 */
function igMessagesFromPayload(payload: Record<string, any>, logText: string): Record<string, any>[] {
  const t = payload.type;
  const clip = (v: unknown) => String(v ?? "").slice(0, 1000);

  if (t === "text") return [{ text: clip(payload.text?.body || logText) }];

  if (t === "image" || t === "video") {
    const url = payload[t]?.link;
    const caption = payload[t]?.caption;
    const msgs: Record<string, any>[] = [];
    if (url) msgs.push({ attachment: { type: t, payload: { url, is_reusable: true } } });
    if (caption) msgs.push({ text: clip(caption) });
    return msgs.length ? msgs : [{ text: clip(logText) }];
  }

  if (t === "audio") {
    const url = payload.audio?.link;
    return url
      ? [{ attachment: { type: "audio", payload: { url, is_reusable: true } } }]
      : [{ text: clip(logText) }];
  }

  if (t === "document") {
    // Instagram não aceita documentos: envia link + legenda como texto
    const url = payload.document?.link;
    const cap = payload.document?.caption;
    return [{ text: clip([cap, url].filter(Boolean).join("\n") || logText) }];
  }

  if (t === "interactive") {
    const i = payload.interactive || {};
    const body = i.body?.text || logText;
    const rows = i.type === "list"
      ? (i.action?.sections?.[0]?.rows || []).map((r: any) => ({ id: r.id, title: r.title }))
      : (i.action?.buttons || []).map((b: any) => ({ id: b.reply?.id, title: b.reply?.title }));
    const quick = rows
      .filter((r: any) => r?.title)
      .slice(0, 13)
      .map((r: any) => ({ content_type: "text", title: String(r.title).slice(0, 20), payload: String(r.id ?? r.title) }));
    const msg: Record<string, any> = { text: clip(body) };
    if (quick.length) msg.quick_replies = quick;
    return [msg];
  }

  return [{ text: clip(logText) }];
}

async function igSend(ctx: SendCtx, payload: Record<string, any>, logText: string, logType: string) {
  if (!ctx.igUserId) {
    console.error("[wa-flow-runner] Instagram sem ig_user_id no contexto");
    return false;
  }
  const messages = igMessagesFromPayload(payload, logText);
  let ok = true;
  for (const message of messages) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${ctx.igUserId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: ctx.to }, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[wa-flow-runner] Instagram erro:", res.status, JSON.stringify(data));
      ok = false;
      break;
    }
  }
  await logOutbound(ctx, logText, logType, null, ok);
  return ok;
}

/** Responde publicamente a um comentário do Instagram. */
async function igReplyComment(ctx: SendCtx, commentId: string, message: string) {
  if (!commentId || !message?.trim()) return false;
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: message.slice(0, 2200) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[wa-flow-runner] Instagram reply comment erro:", res.status, JSON.stringify(data));
    return false;
  }
  return true;
}

/** Oculta/exibe um comentário do Instagram. */
async function igHideComment(ctx: SendCtx, commentId: string, hide: boolean) {
  if (!commentId) return false;
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ hide }),
  });
  if (!res.ok) console.error("[wa-flow-runner] Instagram hide comment falhou:", res.status);
  return res.ok;
}

async function metaSend(ctx: SendCtx, payload: Record<string, any>, logText: string, logType = "text") {
  if (ctx.channel === "instagram") return await igSend(ctx, payload, logText, logType);
  const res = await fetch(`https://graph.facebook.com/v21.0/${ctx.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: ctx.to, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[wa-flow-runner] Meta erro:", res.status, JSON.stringify(data));
    await logOutbound(ctx, logText, logType, null, false);
    return false;
  }
  await logOutbound(ctx, logText, logType, data?.messages?.[0]?.id || null, true);
  return true;
}

async function sendText(ctx: SendCtx, body: string) {
  if (!body?.trim()) return true;
  return await metaSend(ctx, { type: "text", text: { body, preview_url: true } }, body, "text");
}

async function sendMedia(ctx: SendCtx, type: string, url: string, caption?: string, filename?: string) {
  if (!url) return true;
  const media: Record<string, any> = { link: url };
  if (caption && (type === "image" || type === "video" || type === "document")) media.caption = caption;
  if (filename && type === "document") media.filename = filename;
  return await metaSend(ctx, { type, [type]: media }, caption || url, type);
}

async function sendInteractive(ctx: SendCtx, cfg: Record<string, any>, vars: Record<string, string>) {
  const items = interactiveItems(cfg);
  const body = interpolate(cfg.body_text || cfg.content || "", vars) || "Escolha uma opção:";
  const header = interpolate(cfg.header_text || "", vars);
  const footer = interpolate(cfg.footer_text || "", vars);
  const isList = cfg.interaction_type === "list";

  if (!items.length) return await sendText(ctx, [header, body, footer].filter(Boolean).join("\n\n"));

  const interactive: Record<string, any> = { body: { text: body.slice(0, 1024) } };
  if (header) interactive.header = { type: "text", text: header.slice(0, 60) };
  if (footer) interactive.footer = { text: footer.slice(0, 60) };

  if (isList) {
    interactive.type = "list";
    interactive.action = {
      button: (cfg.list_button_text || "Ver opções").slice(0, 20),
      sections: [
        {
          title: (cfg.list_section_title || "Opções").slice(0, 24),
          rows: items.slice(0, 10).map((it) => ({
            id: it.id,
            title: interpolate(it.title, vars).slice(0, 24),
            ...(it.description ? { description: interpolate(it.description, vars).slice(0, 72) } : {}),
          })),
        },
      ],
    };
  } else {
    interactive.type = "button";
    interactive.action = {
      buttons: items.slice(0, 3).map((it) => ({
        type: "reply",
        reply: { id: it.id, title: interpolate(it.title, vars).slice(0, 20) },
      })),
    };
  }
  const logText = [header, body, items.map((i) => `• ${i.title}`).join("\n")].filter(Boolean).join("\n\n");
  return await metaSend(ctx, { type: "interactive", interactive }, logText, "interactive");
}

async function sendMessageNode(ctx: SendCtx, cfg: Record<string, any>, vars: Record<string, string>) {
  const items: any[] = Array.isArray(cfg.items) && cfg.items.length
    ? cfg.items
    : Array.isArray(cfg.contents) && cfg.contents.length
      ? cfg.contents
      : [{ type: cfg.message_type || "text", content: cfg.content, caption: cfg.caption, media_url: cfg.media_url, media_filename: cfg.filename }];

  for (const item of items) {
    const type = item?.type || "text";
    if (type === "delay") {
      const min = Number(item.delay_min ?? item.delay_seconds ?? 1);
      const max = Number(item.delay_max ?? item.delay_seconds ?? min);
      const secs = Math.max(0, Math.min(20, min + Math.random() * Math.max(0, max - min)));
      await new Promise((r) => setTimeout(r, secs * 1000));
      continue;
    }
    if (type === "text") {
      await sendText(ctx, interpolate(item.content ?? cfg.content, vars));
    } else if (type === "template" || cfg.message_type === "template") {
      const name = cfg.template_name;
      if (name) {
        await metaSend(
          ctx,
          { type: "template", template: { name, language: { code: cfg.template_language || "pt_BR" } } },
          `[template] ${name}`,
          "template",
        );
      }
    } else {
      await sendMedia(
        ctx,
        type,
        interpolate(item.media_url ?? cfg.media_url ?? item.content, vars),
        interpolate(item.caption ?? cfg.caption ?? "", vars),
        item.media_filename ?? cfg.filename,
      );
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return true;
}

// ---------- avaliação (rating) ----------
function ratingOptions(cfg: Record<string, any>): Array<{ id: string; title: string; value: string }> {
  const opts: any[] = cfg.options || [];
  return opts.map((o, i) => ({
    id: o?.id || `opt_${i}`,
    title: String(o?.label ?? o?.title ?? `Opção ${i + 1}`),
    value: String(o?.value ?? o?.label ?? i + 1),
  }));
}

async function sendRatingQuestion(ctx: SendCtx, cfg: Record<string, any>, vars: Record<string, string>) {
  const type = cfg.type || "buttons";
  const message = interpolate(cfg.message || cfg.body_text || "Como você avalia nosso atendimento?", vars);
  const opts = ratingOptions(cfg);

  if ((type === "buttons" || type === "menu") && opts.length) {
    return await sendInteractive(
      ctx,
      {
        interaction_type: type === "menu" ? "list" : "buttons",
        body_text: message,
        list_button_text: cfg.list_button_text || "Avaliar",
        list_section_title: cfg.name || "Avaliação",
        buttons: opts.map((o) => ({ id: o.id, title: o.title })),
        list_items: opts.map((o) => ({ id: o.id, title: o.title })),
      },
      vars,
    );
  }
  if (type === "numeric") {
    const min = Number(cfg.numeric?.min ?? 0);
    const max = Number(cfg.numeric?.max ?? 10);
    return await sendText(ctx, `${message}\n\nResponda com uma nota de ${min} a ${max}.`);
  }
  if (type === "stars") {
    const max = Number(cfg.stars?.max ?? 5);
    return await sendText(ctx, `${message}\n\nResponda com um número de 1 a ${max} (estrelas).`);
  }
  return await sendText(ctx, message);
}

function ratingBucket(score: number | null, max: number | null, type: string): string | null {
  if (score == null || !max) return null;
  if (type === "numeric" && max >= 10) {
    if (score >= 9) return "promoter";
    if (score >= 7) return "passive";
    return "detractor";
  }
  const pct = score / max;
  if (pct >= 0.8) return "positive";
  if (pct >= 0.5) return "neutral";
  return "negative";
}

function parseRatingAnswer(
  cfg: Record<string, any>,
  text: string,
  buttonId: string,
  buttonTitle: string,
): { score: number | null; max: number | null; text: string; bucket: string | null } {
  const type = cfg.type || "buttons";
  if (type === "buttons" || type === "menu") {
    const opts = ratingOptions(cfg);
    const idx = opts.findIndex(
      (o) =>
        normalizeHandle(o.id) === normalizeHandle(buttonId) ||
        o.title.toLowerCase() === (buttonTitle || text).trim().toLowerCase(),
    );
    const chosen = idx >= 0 ? opts[idx] : null;
    const numeric = chosen ? Number(chosen.value) : NaN;
    const score = Number.isFinite(numeric) ? numeric : idx >= 0 ? idx + 1 : null;
    const max = opts.length || null;
    return { score, max, text: chosen?.title || buttonTitle || text.trim(), bucket: ratingBucket(score, max, type) };
  }
  if (type === "numeric" || type === "stars") {
    const max = type === "numeric" ? Number(cfg.numeric?.max ?? 10) : Number(cfg.stars?.max ?? 5);
    const found = String(text).match(/-?\d+([.,]\d+)?/);
    const score = found ? Number(found[0].replace(",", ".")) : null;
    return { score, max, text: text.trim(), bucket: ratingBucket(score, max, type) };
  }
  return { score: null, max: null, text: text.trim(), bucket: null };
}


// ---------- condições ----------
interface Runtime {
  lastUserText: string;
  lastButtonId: string;
  lastButtonTitle: string;
  hasFreshUserInput: boolean;
  vars: Record<string, string>;
}

function conditionNeedsInput(type: string) {
  return ["button_clicked", "keyword_match", "responded", "no_response", "field_equals"].includes(type);
}

async function evaluateCondition(cfg: Record<string, any>, rt: Runtime, leadId: string | null): Promise<boolean> {
  const type = cfg.condition_type;
  const value = String(cfg.condition_value ?? "");
  const text = stripAccents(rt.lastUserText || "").toLowerCase();
  switch (type) {
    case "button_clicked":
      return (
        (!!rt.lastButtonId && normalizeHandle(value) === normalizeHandle(rt.lastButtonId)) ||
        (!!rt.lastButtonTitle && rt.lastButtonTitle.toLowerCase() === value.toLowerCase())
      );
    case "keyword_match": {
      const kws = value.split(",").map((k) => stripAccents(k.trim()).toLowerCase()).filter(Boolean);
      if (!kws.length) return !!text.trim();
      return kws.some((k) => text.includes(k));
    }
    case "responded":
      return !!rt.lastUserText.trim();
    case "no_response":
      return !rt.lastUserText.trim();
    case "field_equals":
      return !!value && text.includes(stripAccents(value).toLowerCase());
    case "has_tag": {
      if (!leadId) return false;
      const { data } = await supabase.from("leads").select("tags").eq("id", leadId).maybeSingle();
      const tags: string[] = Array.isArray(data?.tags) ? data!.tags : [];
      return tags.some((t) => String(t).toLowerCase() === value.toLowerCase());
    }
    case "score_above": {
      if (!leadId) return false;
      const { data } = await supabase.from("leads").select("ai_score").eq("id", leadId).maybeSingle();
      const score = Number(data?.ai_score ?? 0);
      if (cfg.score_check_type === "category") {
        const cat = cfg.score_category;
        if (cat === "hot") return score >= 700;
        if (cat === "warm") return score >= 400 && score < 700;
        return score < 400;
      }
      return score > Number(value || 0);
    }
    case "is_customer": {
      if (!leadId) return false;
      const { data } = await supabase
        .from("lead_deals")
        .select("id,status")
        .eq("lead_id", leadId)
        .limit(5);
      return !!(data || []).some((d: any) => !["cancelled", "canceled", "cancelado"].includes(String(d.status || "").toLowerCase()));
    }

    default:
      return false;
  }
}

// ---------- ações ----------
// Resolve uma etapa do Kanban: aceita UUID (pipeline_stages.id) ou nome da coluna.
async function resolveStageId(ownerId: string, value: string): Promise<string | null> {
  const v = String(value || "").trim();
  if (!v) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return v;
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("user_id", ownerId)
    .ilike("name", v)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

async function runActions(
  cfg: Record<string, any>,
  leadId: string | null,
  ownerId: string,
  vars: Record<string, string>,
  phone?: string,
): Promise<string | null> {
  const actions: any[] = Array.isArray(cfg.actions) && cfg.actions.length
    ? cfg.actions
    : cfg.action_type
      ? [{ type: cfg.action_type, tag_value: cfg.tag_value, pipeline_stage_id: cfg.pipeline_stage }]
      : [];
  let currentLeadId = leadId;
  for (const act of actions) {
    const type = act?.type;
    try {
      if ((type === "add_tag" || type === "remove_tag") && currentLeadId) {
        const { data } = await supabase.from("leads").select("tags").eq("id", currentLeadId).maybeSingle();
        const current: string[] = Array.isArray(data?.tags) ? data!.tags : [];
        const tag = String(act.tag_value ?? act.value ?? "").trim();
        if (!tag) continue;
        const next = type === "add_tag"
          ? Array.from(new Set([...current, tag]))
          : current.filter((t) => String(t).toLowerCase() !== tag.toLowerCase());
        await supabase.from("leads").update({ tags: next }).eq("id", currentLeadId);
      } else if ((type === "move_pipeline" || type === "move_kanban") && currentLeadId) {
        const stageId = await resolveStageId(ownerId, act.pipeline_stage_id || act.stage_name || act.value);
        if (stageId) await supabase.from("leads").update({ pipeline_stage_id: stageId }).eq("id", currentLeadId);
      } else if (type === "send_to_crm") {
        const stageId = await resolveStageId(ownerId, act.crm_stage_id || "");
        const name = interpolate(act.crm_name || vars.nome || "", vars) || null;
        const estimated = Number(String(interpolate(act.crm_value || "", vars)).replace(/[^\d.,]/g, "").replace(",", ".")) || null;
        const patch: Record<string, any> = {};
        if (name) patch.contact_name = name;
        if (stageId) patch.pipeline_stage_id = stageId;
        if (estimated) patch.estimated_value = estimated;
        if (currentLeadId) {
          if (Object.keys(patch).length) await supabase.from("leads").update(patch).eq("id", currentLeadId);
        } else if (phone) {
          const { data: created } = await supabase
            .from("leads")
            .insert({
              user_id: ownerId,
              owner_user_id: ownerId,
              created_by_user_id: ownerId,
              phone: digits(phone),
              origin: "Automação WhatsApp",
              ...patch,
            })
            .select("id")
            .maybeSingle();
          currentLeadId = created?.id || null;
        }
      } else if (type === "update_lead" && currentLeadId && act.field) {
        await supabase.from("leads").update({ [act.field]: interpolate(act.value, vars) }).eq("id", currentLeadId);
      } else if (type === "webhook" && (act.url || act.webhook_url || cfg.webhook_url)) {
        const url = act.url || act.webhook_url || cfg.webhook_url;
        const method = (act.method || act.webhook_method || cfg.webhook_method || "POST").toUpperCase();
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          ...(method === "GET"
            ? {}
            : { body: JSON.stringify({ variables: vars, lead_id: currentLeadId, phone: digits(phone || ""), owner_user_id: ownerId }) }),
        });
      }
    } catch (e) {
      console.error("[wa-flow-runner] ação falhou", type, e);
    }
  }
  return currentLeadId;
}


async function callGoogleFn(fn: string, body: Record<string, any>) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error(`[wa-flow-runner] ${fn} falhou`, e);
    return false;
  }
}

function pickWeighted(variants: any[]): any | null {
  if (!variants?.length) return null;
  const total = variants.reduce((s, v) => s + Number(v.weight ?? 1), 0) || variants.length;
  let rand = Math.random() * total;
  for (const v of variants) {
    rand -= Number(v.weight ?? 1);
    if (rand <= 0) return v;
  }
  return variants[variants.length - 1];
}

function waitMs(cfg: Record<string, any>): number {
  const value = Number(cfg.delay_value ?? 0);
  const unit = cfg.delay_unit || "minutes";
  const mult: Record<string, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000 };
  return Math.max(0, value * (mult[unit] ?? 60_000));
}

// ---------- execução ----------
interface ExecCtx {
  execution: any;
  nodes: FlowNode[];
  edges: FlowEdge[];
  flow: any;
  send: SendCtx;
  leadId: string | null;
  runtime: Runtime;
}

async function persist(execId: string, patch: Record<string, any>) {
  await supabase.from("wa_flow_executions").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", execId);
}

async function run(ctx: ExecCtx, startNodeId: string | null) {
  const { nodes, edges, execution, runtime } = ctx;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let currentId: string | null = startNodeId;
  const history: any[] = Array.isArray(execution.node_history) ? [...execution.node_history] : [];
  let steps = 0;

  while (currentId && steps < MAX_STEPS) {
    steps++;
    const node = byId.get(currentId);
    if (!node) break;
    const cfg = node.config || {};
    history.push({ node_id: node.id, node_type: node.node_type, name: node.name, at: new Date().toISOString() });

    switch (node.node_type) {
      case "entry":
        currentId = defaultTarget(edges, node.id);
        break;

      case "message":
        await sendMessageNode(ctx.send, cfg, runtime.vars);
        if (cfg.after_send === "wait") {
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        currentId = defaultTarget(edges, node.id);
        break;

      case "buttons": {
        await sendInteractive(ctx.send, cfg, runtime.vars);
        await persist(execution.id, {
          status: "awaiting_input",
          awaiting_node_id: node.id,
          current_node_id: node.id,
          current_node_name: node.name,
          node_history: history,
          collected_data: runtime.vars,
        });
        return;
      }

      case "rating": {
        const stateKey = `_rt_${node.id}`;
        const rowKey = `${stateKey}_row`;
        const stage = runtime.vars[stateKey];
        const ratingName = cfg.name || node.name || "Avaliação";
        const ownerId = execution.owner_user_id || execution.user_id;

        const awaitInput = async () => {
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
          });
        };

        // 1) primeira passagem: envia a pergunta
        if (!stage) {
          await sendRatingQuestion(ctx.send, cfg, runtime.vars);
          runtime.vars[stateKey] = "await";
          await awaitInput();
          return;
        }

        // 2) resposta da avaliação
        if (stage === "await") {
          if (!runtime.hasFreshUserInput) { await awaitInput(); return; }
          runtime.hasFreshUserInput = false;
          const parsed = parseRatingAnswer(cfg, runtime.lastUserText, runtime.lastButtonId, runtime.lastButtonTitle);
          runtime.vars[ratingName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30)] = parsed.text;
          const { data: row } = await supabase
            .from("wa_flow_ratings")
            .insert({
              user_id: execution.user_id,
              owner_user_id: ownerId,
              flow_id: execution.flow_id,
              node_id: node.id,
              execution_id: execution.id,
              contact_phone: ctx.send.to,
              contact_name: execution.lead_name || runtime.vars.nome || null,
              lead_id: ctx.leadId,
              rating_name: ratingName,
              rating_type: cfg.type || "buttons",
              score_numeric: parsed.score,
              score_max: parsed.max,
              score_text: parsed.text,
              bucket: parsed.bucket,
              responded_at: new Date().toISOString(),
            })
            .select("id")
            .maybeSingle();
          if (row?.id) runtime.vars[rowKey] = row.id;

          if (cfg.ask_suggestion) {
            const prompt = interpolate(cfg.suggestion_prompt || "Tem alguma sugestão para melhorarmos?", runtime.vars);
            await sendText(ctx.send, prompt);
            runtime.vars[stateKey] = "suggestion";
            await awaitInput();
            return;
          }
          delete runtime.vars[stateKey];
          currentId = defaultTarget(edges, node.id);
          break;
        }

        // 3) sugestão de melhoria
        if (!runtime.hasFreshUserInput) { await awaitInput(); return; }
        runtime.hasFreshUserInput = false;
        const suggestion = runtime.lastUserText.trim();
        if (runtime.vars[rowKey] && suggestion) {
          await supabase.from("wa_flow_ratings").update({ suggestion_text: suggestion }).eq("id", runtime.vars[rowKey]);
        }
        if (cfg.suggestion_thanks) await sendText(ctx.send, interpolate(cfg.suggestion_thanks, runtime.vars));
        delete runtime.vars[stateKey];
        delete runtime.vars[rowKey];
        currentId = defaultTarget(edges, node.id);
        break;
      }


      case "condition": {
        if (conditionNeedsInput(cfg.condition_type) && !runtime.hasFreshUserInput) {
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
            awaiting_input_until: cfg.timeout_minutes
              ? new Date(Date.now() + Number(cfg.timeout_minutes) * 60_000).toISOString()
              : null,
          });
          return;
        }
        const result = await evaluateCondition(cfg, runtime, ctx.leadId);
        runtime.hasFreshUserInput = false;
        currentId = targetByHandle(edges, node.id, result ? "yes" : "no");
        break;
      }

      case "wait": {
        const ms = waitMs(cfg);
        const next = defaultTarget(edges, node.id);
        if (ms > 0) {
          await persist(execution.id, {
            status: "waiting",
            wait_until: new Date(Date.now() + ms).toISOString(),
            current_node_id: next,
            current_node_name: byId.get(next || "")?.name ?? null,
            awaiting_node_id: cfg.smart === false ? null : node.id,
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        currentId = next;
        break;
      }

      case "action": {
        const newLeadId = await runActions(
          cfg,
          ctx.leadId,
          execution.owner_user_id || execution.user_id,
          runtime.vars,
          ctx.send.to,
        );
        if (newLeadId) ctx.leadId = newLeadId;
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "handoff": {
        const pre = interpolate(cfg.pre_message || cfg.handoff_message || "", runtime.vars);
        if (pre) await sendText(ctx.send, pre);
        const responsible = cfg.distribution_type === "specific"
          ? cfg.specific_member_id
          : Array.isArray(cfg.member_ids) && cfg.member_ids.length
            ? cfg.member_ids[Math.floor(Math.random() * cfg.member_ids.length)]
            : null;
        if (responsible && ctx.send.convId) {
          await supabase.from("chat_conversations").update({ responsible_user_id: responsible }).eq("id", ctx.send.convId);
        }
        if (cfg.crm_stage_id && cfg.crm_stage_id !== "none" && ctx.leadId) {
          const stageId = await resolveStageId(execution.owner_user_id || execution.user_id, cfg.crm_stage_id);
          if (stageId) await supabase.from("leads").update({ pipeline_stage_id: stageId }).eq("id", ctx.leadId);
        }

        if (cfg.stop_automation !== false) {
          await persist(execution.id, {
            status: "completed",
            completed_at: new Date().toISOString(),
            exit_node_name: node.name || "Atendimento humano",
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "ai_agent": {
        if (!runtime.hasFreshUserInput) {
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        runtime.hasFreshUserInput = false;
        if (cfg.ai_output_type !== "route_only") {
          const cred = await getOpenAiKey(execution.owner_user_id || execution.user_id);
          if (cred) {
            try {
              const reply = await askOpenAi(
                cred.key,
                cfg.ai_model || cred.model,
                [
                  `Você é um agente comercial no WhatsApp. Objetivo: ${cfg.agent_objective || "avançar a conversa"}.`,
                  `Tom: ${cfg.agent_tone || "humano"}. Responda em português do Brasil, curto (máx ${cfg.max_chars || 400} caracteres), sem markdown.`,
                  cfg.advance_criteria ? `Critério de avanço: ${cfg.advance_criteria}` : "",
                ].filter(Boolean).join("\n"),
                runtime.lastUserText || "(sem texto)",
              );
              if (reply) await sendText(ctx.send, reply);
            } catch (e) {
              console.error("[wa-flow-runner] ai_agent", e);
            }
          }
        }
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "data_collect": {
        const varName = String(cfg.variable_name || "resposta").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
        if (!runtime.hasFreshUserInput) {
          const question = interpolate(cfg.question_text || cfg.prompt_message || "", runtime.vars);
          if (question) {
            if (cfg.use_delay) {
              const min = Number(cfg.delay_min ?? 1);
              const max = Number(cfg.delay_max ?? min);
              await new Promise((r) => setTimeout(r, Math.min(15, min + Math.random() * Math.max(0, max - min)) * 1000));
            }
            await sendText(ctx.send, question);
          }
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        runtime.hasFreshUserInput = false;
        let value = runtime.lastUserText.trim();
        const cred = await getOpenAiKey(execution.owner_user_id || execution.user_id);
        if (cred) {
          try {
            const extracted = await askOpenAi(
              cred.key,
              cfg.ai_model || cred.model,
              `Extraia da mensagem apenas o dado solicitado (${cfg.collect_type || "custom"}${cfg.custom_description ? `: ${cfg.custom_description}` : ""}). Responda somente com o valor extraído, ou "NAO_ENCONTRADO".`,
              value,
            );
            if (extracted && extracted !== "NAO_ENCONTRADO") value = extracted;
            else if (cfg.error_message) await sendText(ctx.send, interpolate(cfg.error_message, runtime.vars));
          } catch (_e) { /* fallback: texto cru */ }
        }
        runtime.vars[varName] = value;
        if (ctx.leadId && cfg.collect_type === "name") {
          await supabase.from("leads").update({ contact_name: value }).eq("id", ctx.leadId);
        }

        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "ab_test": {
        const chosen = pickWeighted(cfg.variants || []);
        currentId = chosen ? targetByHandle(edges, node.id, chosen.id) : null;
        break;
      }

      case "random_split": {
        const outputs: any[] = cfg.outputs?.length ? cfg.outputs : [{ id: "out_0" }, { id: "out_1" }];
        const chosen = outputs[Math.floor(Math.random() * outputs.length)];
        currentId = targetByHandle(edges, node.id, chosen.id);
        break;
      }

      case "google_sheets": {
        const columns: any[] = cfg.columns || [];
        await callGoogleFn("google-sheets-action", {
          user_id: execution.owner_user_id || execution.user_id,
          google_account_id: cfg.google_account_id,
          spreadsheet_id: cfg.spreadsheet_id,
          sheet_name: cfg.sheet_name,
          action: "append",
          data: columns.map((c) => interpolate(c.variable ?? "", runtime.vars) || c.default_value || ""),
        });
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "google_calendar": {
        const attendee = interpolate(cfg.attendee_email || "", runtime.vars);
        await callGoogleFn("google-calendar-action", {
          user_id: execution.owner_user_id || execution.user_id,
          google_account_id: cfg.google_account_id,
          calendar_id: cfg.calendar_id || "primary",
          summary: interpolate(cfg.event_title, runtime.vars),
          description: interpolate(cfg.event_description, runtime.vars),
          start_datetime: interpolate(cfg.event_start || "", runtime.vars) || new Date().toISOString(),
          duration_minutes: Number(cfg.event_duration ?? 30),
          attendee_email: attendee && attendee.includes("@") ? attendee : null,
          reminder_minutes: cfg.reminder_minutes != null ? Number(cfg.reminder_minutes) : null,
        });
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "gmail": {
        const body = interpolate(cfg.email_body ?? cfg.body ?? "", runtime.vars);
        const toList = interpolate(cfg.email_to ?? cfg.to_email ?? "", runtime.vars);
        const isHtml = cfg.email_html ?? cfg.use_html ?? false;
        await callGoogleFn("gmail-send-action", {
          user_id: execution.owner_user_id || execution.user_id,
          google_account_id: cfg.google_account_id,
          to: toList,
          subject: interpolate(cfg.email_subject ?? cfg.subject ?? "", runtime.vars),
          ...(isHtml ? { body_html: body } : { body_text: body }),
          cc: cfg.email_cc ?? cfg.cc ?? [],
          bcc: cfg.email_bcc ?? cfg.bcc ?? [],
        });
        currentId = defaultTarget(edges, node.id);
        break;

      }

      // ===== Instagram =====
      case "instagram_entry":
        currentId = defaultTarget(edges, node.id);
        break;

      case "ig_send_dm": {
        if (ctx.send.channel !== "instagram") {
          console.warn("[wa-flow-runner] nó ig_send_dm ignorado fora do canal Instagram");
          currentId = defaultTarget(edges, node.id);
          break;
        }
        await sendMessageNode(ctx.send, cfg, runtime.vars);
        if (cfg.after_send === "wait") {
          await persist(execution.id, {
            status: "awaiting_input",
            awaiting_node_id: node.id,
            current_node_id: node.id,
            current_node_name: node.name,
            node_history: history,
            collected_data: runtime.vars,
          });
          return;
        }
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "ig_reply_comment": {
        if (ctx.send.channel !== "instagram") {
          console.warn("[wa-flow-runner] nó ig_reply_comment ignorado fora do canal Instagram");
          currentId = defaultTarget(edges, node.id);
          break;
        }
        const commentId =
          ctx.send.commentId ||
          (execution.trigger_data as any)?.comment_id ||
          (execution.entry_data as any)?.comment_id ||
          null;
        const reply = interpolate(cfg.reply_text || cfg.content || "", runtime.vars);
        if (commentId && reply) await igReplyComment(ctx.send, String(commentId), reply);
        else if (!commentId) console.warn("[wa-flow-runner] ig_reply_comment sem comment_id no contexto");
        if (commentId && cfg.hide_comment) await igHideComment(ctx.send, String(commentId), true);
        const dm = interpolate(cfg.dm_text || "", runtime.vars);
        if (dm) await sendText(ctx.send, dm);
        currentId = defaultTarget(edges, node.id);
        break;
      }

      case "end": {
        const msg = interpolate(cfg.end_message || "", runtime.vars);
        if (msg) await sendText(ctx.send, msg);
        await persist(execution.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          exit_node_name: node.name || "Fim",
          node_history: history,
          collected_data: runtime.vars,
        });
        return;
      }

      default:
        currentId = defaultTarget(edges, node.id);
        break;
    }
  }

  // sem próximo nó conectado -> encerra
  await persist(execution.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    exit_node_name: steps >= MAX_STEPS ? "Limite de passos" : "Sem saída conectada",
    node_history: history,
    collected_data: runtime.vars,
    ...(steps >= MAX_STEPS ? { last_error: "Limite de 60 passos atingido (possível loop)" } : {}),
  });
}

// ---------- carregar contexto ----------
async function loadFlow(flowId: string) {
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("wa_flow_nodes").select("id,node_type,name,config").eq("flow_id", flowId),
    supabase.from("wa_flow_edges").select("source_node_id,target_node_id,source_handle").eq("flow_id", flowId),
  ]);
  return { nodes: (nodes || []) as FlowNode[], edges: (edges || []) as FlowEdge[] };
}

async function buildSendCtx(flow: any, phone: string, leadName: string | null, userId: string, ownerId: string): Promise<SendCtx | null> {
  // ---- Canal Instagram ----
  if ((flow.channel || "whatsapp") === "instagram") {
    let igQuery = supabase
      .from("user_instagram_connections")
      .select("id,access_token,ig_user_id")
      .eq("status", "active");
    igQuery = flow.instagram_connection_id
      ? igQuery.eq("id", flow.instagram_connection_id)
      : igQuery.eq("owner_user_id", ownerId);
    const { data: igConn } = await igQuery.limit(1).maybeSingle();
    if (!igConn?.access_token || !igConn.ig_user_id) return null;
    return {
      channel: "instagram",
      token: igConn.access_token,
      phoneNumberId: "",
      igUserId: igConn.ig_user_id,
      commentId: null,
      to: String(phone),
      convId: null,
      userId,
      ownerId,
      connectionId: igConn.id,
    };
  }

  let connQuery = supabase.from("user_waba_connections").select("id,access_token,phone_number_id").eq("status", "active");
  connQuery = flow.waba_connection_id
    ? connQuery.eq("id", flow.waba_connection_id)
    : connQuery.eq("user_id", ownerId);
  const { data: conn } = await connQuery.limit(1).maybeSingle();
  if (!conn?.access_token) return null;

  const tail = digits(phone).slice(-8);
  let convId: string | null = null;
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("owner_user_id", ownerId)
    .eq("waba_connection_id", conn.id)
    .ilike("contact_phone", `%${tail}`)
    .limit(1)
    .maybeSingle();
  if (existing?.id) convId = existing.id;
  else {
    const { data: created } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: userId,
        owner_user_id: ownerId,
        waba_connection_id: conn.id,
        phone_number_id: flow.phone_number_id || conn.phone_number_id,
        contact_phone: digits(phone),
        contact_name: leadName,
      })
      .select("id")
      .maybeSingle();
    convId = created?.id || null;
  }

  return {
    channel: "whatsapp",
    token: conn.access_token,
    phoneNumberId: flow.phone_number_id || conn.phone_number_id,
    to: digits(phone),
    convId,
    userId,
    ownerId,
    connectionId: conn.id,
  };
}

async function findLeadId(ownerId: string, phone: string): Promise<string | null> {
  const tail = digits(phone).slice(-8);
  if (!tail) return null;
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("owner_user_id", ownerId)
    .ilike("phone", `%${tail}`)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

function entryMatches(cfg: Record<string, any>, text: string, isFirstMessage: boolean): boolean {
  const trigger = cfg.trigger_type || "any_message";
  const normalized = stripAccents(text || "").toLowerCase().trim();
  if (trigger === "any_message") return true;
  if (trigger === "first_message") return isFirstMessage;
  if (trigger === "campaign_reply") return true; // filtro de campanha tratado no webhook/campanhas
  if (trigger === "keyword") {
    const kws = String(cfg.keywords || "").split(",").map((k) => stripAccents(k.trim()).toLowerCase()).filter(Boolean);
    if (!kws.length) return false;
    return cfg.exact_match ? kws.includes(normalized) : kws.some((k) => normalized.includes(k));
  }
  return false;
}

/**
 * Gatilhos do canal Instagram.
 * event: "comment" | "dm" | "story_reply" | "mention"
 */
function igEntryMatches(cfg: Record<string, any>, text: string, event: string, isFirstMessage: boolean): boolean {
  const trigger = cfg.trigger_type || "any_dm";
  const normalized = stripAccents(text || "").toLowerCase().trim();
  const hasKeyword = () => {
    const kws = String(cfg.keywords || "")
      .split(",")
      .map((k) => stripAccents(k.trim()).toLowerCase())
      .filter(Boolean);
    if (!kws.length) return false;
    return cfg.exact_match ? kws.includes(normalized) : kws.some((k) => normalized.includes(k));
  };

  switch (trigger) {
    case "any_dm": return event === "dm";
    case "first_dm": return event === "dm" && isFirstMessage;
    case "dm_keyword": return event === "dm" && hasKeyword();
    case "any_comment": return event === "comment";
    case "comment_keyword": return event === "comment" && hasKeyword();
    case "story_reply": return event === "story_reply";
    case "mention": return event === "mention";
    default: return false;
  }
}

// ---------- handler inbound ----------
async function handleInbound(body: Record<string, any>) {
  const channel: FlowChannel = body.channel === "instagram" ? "instagram" : "whatsapp";
  const isIg = channel === "instagram";
  const igEvent = String(body.ig_event_type || "dm");
  const commentId = body.comment_id ? String(body.comment_id) : null;

  const phone = isIg ? String(body.contact_ref || body.lead_phone || "").trim() : digits(body.lead_phone);
  if (!phone) return json({ skipped: isIg ? "sem contato do Instagram" : "sem telefone" });
  const userId = body.user_id;
  const tail = phone.slice(-8);

  // owner do usuário que recebeu
  const { data: profile } = await supabase.from("profiles").select("id,owner_user_id").eq("id", userId).maybeSingle();
  const ownerId = profile?.owner_user_id || userId;

  const text = String(body.incoming_text || "");
  const runtimeBase: Runtime = {
    lastUserText: text,
    lastButtonId: String(body.button_id || ""),
    lastButtonTitle: String(body.button_title || ""),
    hasFreshUserInput: true,
    vars: {},
  };

  // 1) execução em andamento?
  const { data: running } = await supabase
    .from("wa_flow_executions")
    .select("*")
    .eq("owner_user_id", ownerId)
    .eq("channel", channel)
    .in("status", ["active", "running", "waiting", "awaiting_input"])
    .ilike("lead_phone", `%${tail}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (running) {
    const { data: flow } = await supabase.from("wa_automation_flows").select("*").eq("id", running.flow_id).maybeSingle();
    if (!flow) return json({ skipped: "fluxo removido" });
    const { nodes, edges } = await loadFlow(flow.id);
    const send = await buildSendCtx(flow, phone, body.lead_name || running.lead_name, userId, ownerId);
    if (!send) return json({ skipped: isIg ? "sem conta Instagram ativa" : "sem conexão WhatsApp ativa" });
    if (isIg) send.commentId = commentId || (running.trigger_data as any)?.comment_id || null;

    const vars = { ...(running.collected_data || {}), nome: body.lead_name || running.lead_name || "", telefone: phone };
    const runtime = { ...runtimeBase, vars };

    let startId: string | null = running.awaiting_node_id || running.current_node_id;
    // se estava aguardando num nó de botões, roteia pela opção escolhida
    const awaiting = nodes.find((n) => n.id === running.awaiting_node_id);
    if (awaiting && awaiting.node_type === "buttons") {
      const items = interactiveItems(awaiting.config || {});
      const match = items.find(
        (i) =>
          normalizeHandle(i.id) === normalizeHandle(runtime.lastButtonId) ||
          i.title.toLowerCase() === text.trim().toLowerCase(),
      );
      const handle = match?.id || runtime.lastButtonId;
      startId = handle ? targetByHandle(edges, awaiting.id, handle) : defaultTarget(edges, awaiting.id);
      if (!startId) startId = defaultTarget(edges, awaiting.id);
    } else if (awaiting && awaiting.node_type === "rating") {
      // o nó de avaliação é reentrante: ele mesmo processa nota e sugestão
      startId = awaiting.id;
    } else if (awaiting && awaiting.node_type === "message") {
      startId = defaultTarget(edges, awaiting.id);
    }


    await persist(running.id, {
      status: "active",
      awaiting_node_id: null,
      awaiting_input_until: null,
      wait_until: null,
      last_user_message_at: new Date().toISOString(),
    });
    await run(
      { execution: { ...running, status: "active" }, nodes, edges, flow, send, leadId: await findLeadId(ownerId, phone), runtime },
      startId,
    );
    return json({ ok: true, resumed: running.id });
  }

  // 2) nenhuma execução: tentar disparar um fluxo ativo
  const { data: flows } = await supabase
    .from("wa_automation_flows")
    .select("*")
    .eq("status", "active")
    .or(`owner_user_id.eq.${ownerId},user_id.eq.${ownerId}`);

  if (!flows?.length) return json({ skipped: "nenhum fluxo ativo" });

  // "primeira mensagem" é por contato (não por conta inteira)
  let isFirstMessage = true;
  if (isIg) {
    const { count } = await supabase
      .from("wa_flow_executions")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerId)
      .eq("channel", "instagram")
      .eq("contact_ref", phone);
    isFirstMessage = (count ?? 0) === 0;
  } else {
    const { data: convForCount } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("owner_user_id", ownerId)
      .ilike("contact_phone", `%${tail}`)
      .limit(1)
      .maybeSingle();
    let previous = 0;
    if (convForCount?.id) {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convForCount.id)
        .eq("direction", "inbound");
      previous = count ?? 0;
    }
    isFirstMessage = previous <= 1;
  }


  for (const flow of flows) {
    if ((flow.channel || "whatsapp") !== channel) continue;
    if (!isIg && flow.test_mode && digits(flow.test_phone).slice(-8) !== tail) continue;
    if (!isIg && body.waba_connection_id && flow.waba_connection_id && flow.waba_connection_id !== body.waba_connection_id) continue;
    if (isIg && body.instagram_connection_id && flow.instagram_connection_id && flow.instagram_connection_id !== body.instagram_connection_id) continue;
    const { nodes, edges } = await loadFlow(flow.id);
    const entry = nodes.find((n) => (isIg ? n.node_type === "instagram_entry" : n.node_type === "entry"));
    if (!entry) continue;
    if (isIg) {
      if (!igEntryMatches(entry.config || {}, text, igEvent, isFirstMessage)) continue;
    } else if (!entryMatches(entry.config || {}, text, isFirstMessage)) continue;

    const send = await buildSendCtx(flow, phone, body.lead_name || null, userId, ownerId);
    if (!send) continue;
    if (isIg) send.commentId = commentId;

    const { data: execution } = await supabase
      .from("wa_flow_executions")
      .insert({
        flow_id: flow.id,
        user_id: userId,
        owner_user_id: ownerId,
        lead_phone: phone,
        lead_name: body.lead_name || null,
        status: "active",
        channel,
        contact_ref: isIg ? phone : digits(phone),
        thread_ref: body.thread_ref || null,
        trigger_type: isIg ? (entry.config?.trigger_type || igEvent) : (entry.config?.trigger_type || null),
        trigger_data: isIg
          ? { ig_event: igEvent, comment_id: commentId, media_id: body.media_id || null, username: body.lead_name || null }
          : {},
        channel_account_id: isIg ? (send.connectionId || null) : (send.connectionId || null),
        current_node_id: entry.id,
        current_node_name: entry.name,
        entry_data: { text, button_id: body.button_id || null, source: body.source || "meta", comment_id: commentId },
        last_user_message_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();
    if (!execution) continue;

    const vars = { nome: body.lead_name || "", telefone: phone };
    await run(
      { execution, nodes, edges, flow, send, leadId: await findLeadId(ownerId, phone), runtime: { ...runtimeBase, vars } },
      entry.id,
    );
    return json({ ok: true, started: execution.id, flow_id: flow.id });
  }

  return json({ skipped: "nenhum gatilho combinou" });
}

// ---------- handler tick (cron) ----------
async function handleTick() {
  const nowIso = new Date().toISOString();
  let processed = 0;

  // A) esperas vencidas
  const { data: due } = await supabase
    .from("wa_flow_executions")
    .select("*")
    .eq("status", "waiting")
    .lte("wait_until", nowIso)
    .limit(50);

  for (const exec of due || []) {
    try {
      const { data: flow } = await supabase.from("wa_automation_flows").select("*").eq("id", exec.flow_id).maybeSingle();
      if (!flow) {
        await persist(exec.id, { status: "abandoned", completed_at: nowIso, last_error: "Fluxo removido" });
        continue;
      }
      const { nodes, edges } = await loadFlow(flow.id);
      const ownerId = exec.owner_user_id || exec.user_id;
      const send = await buildSendCtx(flow, exec.lead_phone, exec.lead_name, exec.user_id, ownerId);
      if (!send) {
        await persist(exec.id, { last_error: "Sem conexão de canal ativa" });
        continue;
      }
      if (send.channel === "instagram") send.commentId = (exec.trigger_data as any)?.comment_id || null;
      const vars = { ...(exec.collected_data || {}), nome: exec.lead_name || "", telefone: digits(exec.lead_phone) };
      await persist(exec.id, { status: "active", wait_until: null, awaiting_node_id: null });
      await run(
        {
          execution: { ...exec, status: "active" },
          nodes,
          edges,
          flow,
          send,
          leadId: await findLeadId(ownerId, exec.lead_phone),
          runtime: { lastUserText: "", lastButtonId: "", lastButtonTitle: "", hasFreshUserInput: false, vars },
        },
        exec.current_node_id,
      );
      processed++;
    } catch (e) {
      console.error("[wa-flow-runner] tick wait erro", exec.id, e);
      await persist(exec.id, { last_error: e instanceof Error ? e.message : "erro" });
    }
  }

  // B) timeout de "sem resposta" em nós de condição
  const { data: timedOut } = await supabase
    .from("wa_flow_executions")
    .select("*")
    .eq("status", "awaiting_input")
    .not("awaiting_input_until", "is", null)
    .lte("awaiting_input_until", nowIso)
    .limit(50);

  for (const exec of timedOut || []) {
    try {
      const { data: flow } = await supabase.from("wa_automation_flows").select("*").eq("id", exec.flow_id).maybeSingle();
      if (!flow) continue;
      const { nodes, edges } = await loadFlow(flow.id);
      const node = nodes.find((n) => n.id === exec.awaiting_node_id);
      if (!node) continue;
      const ownerId = exec.owner_user_id || exec.user_id;
      const send = await buildSendCtx(flow, exec.lead_phone, exec.lead_name, exec.user_id, ownerId);
      if (!send) continue;
      const vars = { ...(exec.collected_data || {}), nome: exec.lead_name || "", telefone: digits(exec.lead_phone) };
      // sem resposta: condição avalia false (exceto no_response, que vira true)
      const next = node.node_type === "condition"
        ? targetByHandle(edges, node.id, node.config?.condition_type === "no_response" ? "yes" : "no")
        : defaultTarget(edges, node.id);
      await persist(exec.id, { status: "active", awaiting_input_until: null, awaiting_node_id: null });
      await run(
        {
          execution: { ...exec, status: "active" },
          nodes,
          edges,
          flow,
          send,
          leadId: await findLeadId(ownerId, exec.lead_phone),
          runtime: { lastUserText: "", lastButtonId: "", lastButtonTitle: "", hasFreshUserInput: true, vars },
        },
        next,
      );
      processed++;
    } catch (e) {
      console.error("[wa-flow-runner] tick timeout erro", exec.id, e);
    }
  }

  // C) inatividade configurada no fluxo
  const { data: idleFlows } = await supabase
    .from("wa_automation_flows")
    .select("id,inactivity_reset_enabled,inactivity_timeout_seconds,inactivity_action,inactivity_target_node_id,inactivity_message,phone_number_id,waba_connection_id,user_id,owner_user_id")
    .eq("status", "active")
    .eq("inactivity_reset_enabled", true);

  for (const flow of idleFlows || []) {
    const seconds = Number(flow.inactivity_timeout_seconds || 0);
    if (seconds <= 0) continue;
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    const { data: idle } = await supabase
      .from("wa_flow_executions")
      .select("*")
      .eq("flow_id", flow.id)
      .in("status", ["awaiting_input", "active"])
      .lt("updated_at", cutoff)
      .is("inactivity_processed_at", null)
      .limit(50);

    for (const exec of idle || []) {
      try {
        const ownerId = exec.owner_user_id || exec.user_id;
        const send = await buildSendCtx(flow, exec.lead_phone, exec.lead_name, exec.user_id, ownerId);
        if (send && flow.inactivity_message) await sendText(send, flow.inactivity_message);
        if (flow.inactivity_action === "restart" || flow.inactivity_action === "goto") {
          const { nodes, edges } = await loadFlow(flow.id);
          const target = flow.inactivity_action === "goto"
            ? flow.inactivity_target_node_id
            : nodes.find((n) => n.node_type === "entry")?.id || null;
          if (send && target) {
            const vars = { ...(exec.collected_data || {}), nome: exec.lead_name || "", telefone: digits(exec.lead_phone) };
            await persist(exec.id, { status: "active", awaiting_node_id: null, inactivity_processed_at: nowIso });
            await run(
              {
                execution: { ...exec, status: "active" },
                nodes,
                edges,
                flow,
                send,
                leadId: await findLeadId(ownerId, exec.lead_phone),
                runtime: { lastUserText: "", lastButtonId: "", lastButtonTitle: "", hasFreshUserInput: false, vars },
              },
              target,
            );
          }
        } else {
          await persist(exec.id, {
            status: "abandoned",
            completed_at: nowIso,
            inactivity_processed_at: nowIso,
            exit_node_name: "Inatividade",
          });
        }
        processed++;
      } catch (e) {
        console.error("[wa-flow-runner] inatividade erro", exec.id, e);
      }
    }
  }

  return json({ ok: true, processed });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "tick" || body?.trigger === "cron") return await handleTick();
    return await handleInbound(body || {});
  } catch (e) {
    console.error("[wa-flow-runner]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
