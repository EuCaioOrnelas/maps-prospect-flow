// Evolution API webhook — "Número de Atendimento"
// Recebe eventos da instância (QR, conexão, mensagens) e alimenta Chat/CRM/SDR.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const MESSAGE_PREFIX = "enc:v1:";
const messageEncoder = new TextEncoder();
let messageKeyPromise: Promise<CryptoKey> | null = null;
function messageBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function messageEncryptionKey(): Promise<CryptoKey> {
  if (messageKeyPromise) return messageKeyPromise;
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("Message encryption is unavailable");
  messageKeyPromise = crypto.subtle.digest("SHA-256", messageEncoder.encode(secret)).then((raw) =>
    crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"])
  );
  return messageKeyPromise;
}
async function encryptMessageValue(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith(MESSAGE_PREFIX)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await messageEncryptionKey(), messageEncoder.encode(value));
  return `${MESSAGE_PREFIX}${messageBytesToBase64(iv)}:${messageBytesToBase64(new Uint8Array(ciphertext))}`;
}
async function encryptMessageFields<T extends Record<string, unknown>>(row: T): Promise<T> {
  return { ...row, content: await encryptMessageValue(row.content), media_caption: await encryptMessageValue(row.media_caption) };
}
async function encryptConversationPreview<T extends Record<string, unknown>>(row: T): Promise<T> {
  return "last_message_text" in row ? { ...row, last_message_text: await encryptMessageValue(row.last_message_text) } : row;
}

// Identidade estável de uma linha WhatsApp (Número de Atendimento).
// Chave = DDD + 8 últimos dígitos (ignora o "9" extra e o DDI 55).
function lineKey(phone: string | null | undefined): string | null {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10) return null;
  return `${d.slice(0, 2)}${d.slice(-8)}`;
}

function lineRef(phone: string | null | undefined): string | null {
  const k = lineKey(phone);
  return k ? `evo:${k}` : null;
}

// Reanexa à conexão atual todas as conversas salvas para a mesma linha.
async function relinkConversationsToLine(
  supabase: any,
  conn: { id: string; user_id: string; owner_user_id?: string | null; evolution_instance_name?: string | null },
  phone: string | null | undefined,
): Promise<number> {
  const ref = lineRef(phone);
  if (!ref) return 0;
  const ownerId = conn.owner_user_id || conn.user_id;

  await supabase
    .from("chat_conversations")
    .update({ phone_number_id: ref })
    .eq("waba_connection_id", conn.id)
    .neq("phone_number_id", ref);

  const { data, error } = await supabase
    .from("chat_conversations")
    .update({ waba_connection_id: conn.id })
    .eq("phone_number_id", ref)
    .or(`owner_user_id.eq.${ownerId},user_id.eq.${conn.user_id}`)
    .or(`waba_connection_id.is.null,waba_connection_id.neq.${conn.id}`)
    .select("id");
  if (error) {
    console.warn("[lineRef] relink error", error.message);
    return 0;
  }
  return (data || []).length;
}


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Fallback: quando o webhook não traz o base64 da mídia, busca na Evolution.
async function fetchMediaBase64(instance: string, key: any, hasVideo: boolean): Promise<{ base64: string | null; mime: string | null }> {
  if (!EVO_URL || !EVO_KEY || !key?.id) return { base64: null, mime: null };
  try {
    const r = await fetch(`${EVO_URL}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ message: { key }, convertToMp4: hasVideo }),
    });
    if (!r.ok) { console.warn("[evolution-webhook] getBase64 failed", r.status); return { base64: null, mime: null }; }
    const j = await r.json().catch(() => ({}));
    return { base64: j?.base64 || null, mime: j?.mimetype || null };
  } catch (e) {
    console.warn("[evolution-webhook] getBase64 error", e);
    return { base64: null, mime: null };
  }
}

const ok = (body: unknown = { ok: true }) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const phoneTail8 = (p: string) => String(p || "").replace(/\D/g, "").slice(-8);

function normalizeBrazilianMobileE164(raw: string): string | null {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 12 && d.startsWith("55")) return `55${d.slice(2, 4)}9${d.slice(4)}`;
  if (d.length === 13 && d.startsWith("55")) return d;
  if (d.length === 10) return `55${d.slice(0, 2)}9${d.slice(2)}`;
  if (d.length === 11) return `55${d}`;
  return d.length >= 12 ? d : null;
}

function jidToPhone(jid: string): string {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function normEvent(e: string): string {
  return String(e || "").toLowerCase().replace(/_/g, ".");
}

function normalizeState(s: any): string {
  const st = String(s || "").toLowerCase();
  if (st === "open" || st === "connected") return "open";
  if (st === "connecting") return "connecting";
  return "close";
}

type Parsed = {
  type: string;
  text: string;
  mediaBase64: string | null;
  mime: string | null;
  filename: string | null;
  buttonId: string | null;
  buttonTitle: string | null;
};

function parseMessage(m: any, data: any): Parsed {
  const out: Parsed = { type: "text", text: "", mediaBase64: null, mime: null, filename: null, buttonId: null, buttonTitle: null };
  if (!m) return out;
  const ephemeral = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message;
  if (ephemeral) return parseMessage(ephemeral, data);

  const base64 = data?.message?.base64 || m.base64 || null;
  if (typeof m.conversation === "string") { out.text = m.conversation; return out; }
  if (m.extendedTextMessage?.text) { out.text = m.extendedTextMessage.text; return out; }
  if (m.imageMessage) { out.type = "image"; out.text = m.imageMessage.caption || ""; out.mime = m.imageMessage.mimetype || "image/jpeg"; out.mediaBase64 = base64; return out; }
  if (m.videoMessage) { out.type = "video"; out.text = m.videoMessage.caption || ""; out.mime = m.videoMessage.mimetype || "video/mp4"; out.mediaBase64 = base64; return out; }
  if (m.audioMessage) { out.type = "audio"; out.mime = m.audioMessage.mimetype || "audio/ogg"; out.mediaBase64 = base64; return out; }
  if (m.documentMessage || m.documentWithCaptionMessage) {
    const d = m.documentMessage || m.documentWithCaptionMessage?.message?.documentMessage;
    out.type = "document"; out.text = d?.caption || ""; out.mime = d?.mimetype || "application/octet-stream"; out.filename = d?.fileName || null; out.mediaBase64 = base64; return out;
  }
  if (m.stickerMessage) { out.type = "sticker"; out.mime = m.stickerMessage.mimetype || "image/webp"; out.mediaBase64 = base64; return out; }
  if (m.buttonsResponseMessage) { out.type = "button"; out.text = m.buttonsResponseMessage.selectedDisplayText || ""; out.buttonId = m.buttonsResponseMessage.selectedButtonId || null; out.buttonTitle = out.text; return out; }
  if (m.templateButtonReplyMessage) { out.type = "button"; out.text = m.templateButtonReplyMessage.selectedDisplayText || ""; out.buttonId = m.templateButtonReplyMessage.selectedId || null; out.buttonTitle = out.text; return out; }
  if (m.listResponseMessage) { out.type = "interactive"; out.text = m.listResponseMessage.title || ""; out.buttonId = m.listResponseMessage.singleSelectReply?.selectedRowId || null; out.buttonTitle = out.text; return out; }
  if (m.locationMessage) { out.type = "location"; out.text = `📍 ${m.locationMessage.name || ""} ${m.locationMessage.address || ""}`.trim(); return out; }
  if (m.contactMessage) { out.type = "contacts"; out.text = `👤 ${m.contactMessage.displayName || "Contato"}`; return out; }
  if (m.reactionMessage) { out.type = "reaction"; out.text = m.reactionMessage.text || ""; return out; }
  out.type = "unsupported";
  return out;
}

function extFor(mime: string | null, type: string) {
  const m = (mime || "").split(";")[0];
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
    "application/pdf": "pdf",
  };
  return map[m] || (type === "audio" ? "ogg" : type === "image" ? "jpg" : type === "video" ? "mp4" : "bin");
}

async function storeMedia(ownerId: string, msgId: string, p: Parsed): Promise<string | null> {
  if (!p.mediaBase64) return null;
  try {
    const clean = p.mediaBase64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    const ext = extFor(p.mime, p.type);
    const safeId = msgId.replace(/[^\w-]/g, "").slice(0, 40) || crypto.randomUUID();
    const path = `${ownerId}/evolution/${Date.now()}_${safeId}.${ext}`;
    let { error } = await supabase.storage.from("chat-media").upload(path, bytes, {
      contentType: (p.mime || "application/octet-stream").split(";")[0],
      upsert: false,
    });
    if (error && /mime type|not supported/i.test(error.message || "")) {
      ({ error } = await supabase.storage.from("chat-media").upload(path, bytes, { contentType: "application/octet-stream", upsert: false }));
    }
    if (error) { console.error("[evolution-webhook] media upload failed", error); return null; }
    return `${SUPABASE_URL}/storage/v1/object/public/chat-media/${path}`;
  } catch (e) {
    console.error("[evolution-webhook] media decode failed", e);
    return null;
  }
}

function previewText(type: string, text: string, filename: string | null) {
  return type === "text" ? text
    : type === "image" ? (text ? `📷 ${text}` : "📷 Imagem")
    : type === "video" ? (text ? `🎥 ${text}` : "🎥 Vídeo")
    : type === "audio" ? "🎤 Áudio"
    : type === "document" ? `📄 ${filename || "Documento"}`
    : type === "sticker" ? "🏷️ Sticker"
    : text || type;
}

const STATUS_MAP: Record<string, string> = {
  PENDING: "sent", SERVER_ACK: "sent", DELIVERY_ACK: "delivered", READ: "read", PLAYED: "read",
  "1": "sent", "2": "sent", "3": "delivered", "4": "read", "5": "read",
};

async function updateLeadStatus(userId: string, phone: string, direction: "inbound" | "outbound", ts: string) {
  try {
    const tail = phoneTail8(phone);
    if (tail.length < 8) return;
    const { data: leads } = await supabase
      .from("leads")
      .select("id, whatsapp_status, first_message_sent")
      .eq("user_id", userId)
      .ilike("phone", `%${tail}`)
      .limit(5);
    for (const lead of leads || []) {
      const patch: Record<string, unknown> = {};
      const current = lead.whatsapp_status || "never_contacted";
      if (direction === "inbound") {
        if (!["in_conversation", "converted"].includes(current)) patch.whatsapp_status = "replied";
        patch.has_responded = true;
        patch.last_response_at = ts;
        patch.responded_at = ts;
      } else {
        if (current === "never_contacted" || current === "no_response" || current === "not_contacted") patch.whatsapp_status = "message_sent";
        else if (current === "replied") patch.whatsapp_status = "in_conversation";
        if (!lead.first_message_sent) patch.first_message_sent = true;
      }
      if (Object.keys(patch).length) await supabase.from("leads").update(patch).eq("id", lead.id);
    }
  } catch (e) {
    console.error("[evolution-webhook] lead status error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ ok: true, service: "evolution-webhook" });

  let body: any;
  try { body = await req.json(); } catch { return ok({ ignored: "invalid json" }); }

  const event = normEvent(body.event);
  const instance = String(body.instance || body.instanceName || "");
  const data = body.data || {};
  if (!instance) return ok({ ignored: "no instance" });

  const { data: conn } = await supabase
    .from("user_waba_connections")
    .select("id, user_id, owner_user_id, evolution_token, evolution_state, status, display_phone_number, evolution_instance_name, created_at, last_connected_at")
    .eq("evolution_instance_name", instance)
    .eq("provider", "evolution")
    .maybeSingle();
  if (!conn) return ok({ ignored: "unknown instance" });

  // Autenticação: header configurado no webhook ou apikey enviada no corpo pela Evolution
  const headerToken = req.headers.get("x-wiize-token");
  const bodyToken = body.apikey || null;
  if (conn.evolution_token && headerToken !== conn.evolution_token && bodyToken !== conn.evolution_token) {
    console.warn(`[evolution-webhook] token inválido para ${instance}`);
    return ok({ ignored: "unauthorized" });
  }

  const userId = conn.user_id as string;
  const ownerId = (conn.owner_user_id || conn.user_id) as string;
  const connectionId = conn.id as string;
  // Referência estável da linha (DDD+8) para as conversas; cai para o nome da instância até conhecer o número
  const lineReference = lineRef(conn.display_phone_number) || instance;
  // Nunca importar histórico antigo: só mensagens após a criação da instância na Wiize
  const historyCutoff = conn.created_at ? new Date(conn.created_at).getTime() - 5 * 60 * 1000 : 0;

  try {
    // ------------------------------------------------------------ conexão
    if (event === "connection.update") {
      const state = normalizeState(data.state || data.status);
      const patch: Record<string, unknown> = { evolution_state: state };
      let phone: string | null = null;
      if (state === "open") {
        patch.last_connected_at = new Date().toISOString();
        patch.status = "active";
        phone = data.wuid ? jidToPhone(data.wuid) : (body.sender ? jidToPhone(body.sender) : null);
        if (phone) patch.display_phone_number = phone;
        if (data.profileName) patch.profile_name = data.profileName;
        if (data.profilePictureUrl) patch.profile_pic_url = data.profilePictureUrl;
      }
      await supabase.from("user_waba_connections").update(patch).eq("id", connectionId);
      if (state === "open" && (phone || conn.display_phone_number)) {
        const n = await relinkConversationsToLine(supabase, conn as any, phone || conn.display_phone_number);
        if (n) console.log(`[evolution-webhook] ${instance}: ${n} conversa(s) reanexada(s) à linha`);
      }
      // Sessão caiu (não foi logout pelo usuário): religa imediatamente sem novo QR.
      // Código 401/403/loggedOut significa que o aparelho desconectou de propósito → precisa de QR.
      const reason = Number(data.statusReason ?? data.lastDisconnect?.error?.output?.statusCode ?? 0);
      const loggedOut = reason === 401 || reason === 403 || reason === 440;
      if (state === "close" && conn.last_connected_at && !loggedOut && EVO_URL && EVO_KEY) {
        fetch(`${EVO_URL}/instance/connect/${encodeURIComponent(instance)}`, { headers: { apikey: EVO_KEY } })
          .then((r) => console.log(`[evolution-webhook] auto-reconnect ${instance}: ${r.status}`))
          .catch((e) => console.warn(`[evolution-webhook] auto-reconnect ${instance} falhou`, e));
      }
      return ok();
    }
    if (event === "qrcode.updated") {
      if (conn.evolution_state !== "connecting") {
        await supabase.from("user_waba_connections").update({ evolution_state: "connecting" }).eq("id", connectionId);
      }
      return ok();
    }
    if (event === "logout.instance" || event === "remove.instance") {
      await supabase.from("user_waba_connections").update({ evolution_state: "close" }).eq("id", connectionId);
      return ok();
    }

    // ---------------------------------------------------------- mensagens
    if (event === "messages.upsert" || event === "send.message") {
      const items: any[] = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [data];
      for (const item of items) {
        const key = item.key || {};
        const remoteJid: string = key.remoteJid || "";
        if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast" || remoteJid.endsWith("@newsletter")) continue;
        const fromMe = !!key.fromMe;
        const msgId: string = key.id || crypto.randomUUID();
        const contactPhone = jidToPhone(remoteJid);
        if (!contactPhone) continue;
        const contactName = !fromMe ? (item.pushName || null) : null;
        const tsSec = Number(item.messageTimestamp?.low ?? item.messageTimestamp ?? Math.floor(Date.now() / 1000));
        const msgMs = tsSec > 1e12 ? tsSec : tsSec * 1000;
        const msgTime = new Date(msgMs).toISOString();
        // Histórico antigo do aparelho (anterior à conexão na Wiize) nunca é importado
        if (historyCutoff && msgMs < historyCutoff) continue;

        const parsed = parseMessage(item.message, item);
        if (parsed.type === "reaction" || parsed.type === "unsupported" && !parsed.text) continue;

        // Idempotência
        const { data: dup } = await supabase.from("chat_messages").select("id").eq("waba_message_id", msgId).limit(1).maybeSingle();
        if (dup) continue;

        // Mídia sem base64 no webhook → busca na Evolution
        const isMedia = ["image", "video", "audio", "document", "sticker"].includes(parsed.type);
        if (isMedia && !parsed.mediaBase64) {
          const fetched = await fetchMediaBase64(instance, key, parsed.type === "video");
          if (fetched.base64) {
            parsed.mediaBase64 = fetched.base64;
            if (fetched.mime) parsed.mime = fetched.mime;
          }
        }

        const lastText = previewText(parsed.type, parsed.text, parsed.filename);
        const direction = fromMe ? "outbound" : "inbound";

        // Mensagem enviada pela própria Wiize (send-chat-message / SDR): o eco `fromMe`
        // pode chegar antes do update do waba_message_id. Reconcilia em vez de duplicar.
        if (fromMe) {
          const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();
          const { data: pendingOut } = await supabase
            .from("chat_messages")
            .select("id, conversation_id, chat_conversations!inner(waba_connection_id, contact_phone)")
            .eq("direction", "outbound")
            .is("waba_message_id", null)
            .eq("message_type", parsed.type)
            .gte("created_at", since)
            .eq("chat_conversations.waba_connection_id", connectionId)
            .ilike("chat_conversations.contact_phone", `%${phoneTail8(contactPhone)}`)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (pendingOut) {
            await supabase.from("chat_messages")
              .update({ waba_message_id: msgId, status: "sent", status_updated_at: new Date().toISOString() })
              .eq("id", pendingOut.id);
            continue;
          }
        }

        const mediaUrl = await storeMedia(ownerId, msgId, parsed);

        let { data: conversation } = await supabase
          .from("chat_conversations")
          .select("id, unread_count")
          .eq("user_id", userId)
          .eq("waba_connection_id", connectionId)
          .or(`contact_phone.eq.${contactPhone},contact_phone.ilike.%${phoneTail8(contactPhone)}`)
          .limit(1)
          .maybeSingle();

        if (!conversation) {
          const { data: newConv } = await supabase.from("chat_conversations").insert(await encryptConversationPreview({
            user_id: userId,
            owner_user_id: ownerId,
            waba_connection_id: connectionId,
            phone_number_id: instance,
            contact_phone: contactPhone,
            contact_name: contactName,
            last_message_text: lastText,
            last_message_at: msgTime,
            last_message_type: parsed.type,
            last_message_direction: direction,
            unread_count: fromMe ? 0 : 1,
          })).select("id, unread_count").single();
          conversation = newConv;
        } else {
          await supabase.from("chat_conversations").update(await encryptConversationPreview({
            contact_name: contactName || undefined,
            last_message_text: lastText,
            last_message_at: msgTime,
            last_message_type: parsed.type,
            last_message_direction: direction,
            unread_count: fromMe ? 0 : (conversation.unread_count || 0) + 1,
          })).eq("id", conversation.id);
        }
        if (!conversation) continue;

        await supabase.from("chat_messages").insert(await encryptMessageFields({
          conversation_id: conversation.id,
          user_id: userId,
          owner_user_id: ownerId,
          waba_message_id: msgId,
          direction,
          message_type: parsed.type,
          content: parsed.text || null,
          media_url: mediaUrl,
          media_mime_type: parsed.mime,
          media_filename: parsed.filename,
          media_caption: parsed.type !== "text" ? (parsed.text || null) : null,
          status: fromMe ? "sent" : "delivered",
          created_at: msgTime,
          metadata: { provider: "evolution", source: item.source || null },
        }));

        await updateLeadStatus(userId, contactPhone, direction, msgTime);

        // Revenue / scoring
        const e164 = normalizeBrazilianMobileE164(contactPhone);
        if (e164) {
          supabase.functions.invoke("revenue-processor", {
            body: {
              action: "process_message",
              source: "evolution",
              user_id: userId,
              phone_e164: e164,
              direction,
              message_content: parsed.text || undefined,
              lead_name: contactName || undefined,
            },
          }).catch((e) => console.error("[evolution-webhook] revenue-processor", e));
        }

        if (fromMe) continue;

        // Fluxos de Automação (motor único WhatsApp)
        try {
          const flowCall = fetch(`${SUPABASE_URL}/functions/v1/wa-flow-runner`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
              action: "inbound",
              channel: "whatsapp",
              source: "evolution",
              user_id: userId,
              owner_user_id: ownerId,
              waba_connection_id: connectionId,
              lead_phone: contactPhone,
              lead_name: contactName,
              incoming_text: parsed.text || "",
              conversation_id: conversation.id,
            }),
          }).then(async (r) => { if (!r.ok) console.error("[evolution-webhook] wa-flow-runner", r.status, await r.text()); })
            .catch((e) => console.error("[evolution-webhook] wa-flow-runner", e));
          // @ts-ignore EdgeRuntime disponível no runtime Supabase
          if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(flowCall); else await flowCall;
        } catch (e) {
          console.error("[evolution-webhook] flow error", e);
        }

        // SDR Inteligente (IA de análise e engajamento)
        try {
          const tail = phoneTail8(contactPhone);
          const { data: campaignLead } = await supabase
            .from("leads")
            .select("id")
            .eq("user_id", userId)
            .ilike("phone", `%${tail}`)
            .in("follow_up_status", ["pending", "scheduled"])
            .limit(1)
            .maybeSingle();
          if (campaignLead) continue;

          const dispatch = fetch(`${SUPABASE_URL}/functions/v1/sdr-dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
              owner_user_id: ownerId,
              user_id: userId,
              waba_connection_id: connectionId,
              phone_number_id: instance,
              conversation_id: conversation.id,
              contact_phone: contactPhone,
              contact_name: contactName,
              message: parsed.text || null,
              message_type: parsed.type,
              media_ref: mediaUrl,
              media_mime: parsed.mime,
              trigger_type: "inbound",
            }),
          }).then(async (r) => { if (!r.ok) console.error("[evolution-webhook] sdr-dispatch", r.status, await r.text()); })
            .catch((e) => console.error("[evolution-webhook] sdr-dispatch", e));
          // @ts-ignore EdgeRuntime disponível no runtime Supabase
          if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(dispatch); else await dispatch;
        } catch (e) {
          console.error("[evolution-webhook] sdr error", e);
        }
      }
      return ok();
    }

    // ------------------------------------------------------- status/update
    if (event === "messages.update") {
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const u of items) {
        const id = u.keyId || u.key?.id || u.id;
        const st = STATUS_MAP[String(u.status ?? u.update?.status ?? "")];
        if (!id || !st) continue;
        const { data: msg } = await supabase.from("chat_messages").select("id, status").eq("waba_message_id", id).maybeSingle();
        if (!msg) continue;
        const rank: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };
        if ((rank[msg.status] ?? 0) >= rank[st]) continue;
        await supabase.from("chat_messages").update({ status: st, status_updated_at: new Date().toISOString() }).eq("id", msg.id);
      }
      return ok();
    }

    if (event === "messages.delete") {
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const d of items) {
        const id = d.id || d.key?.id;
        if (!id) continue;
        await supabase.from("chat_messages").update({ deleted_for_all_at: new Date().toISOString() }).eq("waba_message_id", id);
      }
      return ok();
    }

    // ---------------------------------------------------- contatos (foto/nome)
    if (event === "contacts.update" || event === "contacts.upsert") {
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const c of items) {
        const jid: string = c.remoteJid || c.id || "";
        if (!jid || jid.endsWith("@g.us")) continue;
        const phone = jidToPhone(jid);
        if (!phone) continue;
        const patch: Record<string, unknown> = {};
        if (c.profilePicUrl || c.profilePictureUrl) patch.contact_profile_pic = c.profilePicUrl || c.profilePictureUrl;
        if (c.pushName) patch.contact_name = c.pushName;
        if (!Object.keys(patch).length) continue;
        // Nome só é atualizado quando ainda não existe (não sobrescreve nome salvo pelo usuário)
        const { data: convs } = await supabase
          .from("chat_conversations")
          .select("id, contact_name")
          .eq("waba_connection_id", connectionId)
          .ilike("contact_phone", `%${phoneTail8(phone)}`);
        for (const cv of convs || []) {
          const p = { ...patch };
          if (cv.contact_name && p.contact_name) delete p.contact_name;
          if (Object.keys(p).length) await supabase.from("chat_conversations").update(p).eq("id", cv.id);
        }
      }
      return ok();
    }


    return ok({ ignored: event });
  } catch (e) {
    console.error("[evolution-webhook] error", event, e);
    return ok({ error: (e as Error).message });
  }
});
