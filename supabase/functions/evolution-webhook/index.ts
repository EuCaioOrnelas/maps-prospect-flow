// Evolution API webhook — "Número de Atendimento"
// Recebe eventos da instância (QR, conexão, mensagens) e alimenta Chat/CRM/SDR.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
    .select("id, user_id, owner_user_id, evolution_token, evolution_state, status, display_phone_number")
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

  try {
    // ------------------------------------------------------------ conexão
    if (event === "connection.update") {
      const state = normalizeState(data.state || data.status);
      const patch: Record<string, unknown> = { evolution_state: state };
      if (state === "open") {
        patch.last_connected_at = new Date().toISOString();
        patch.status = "active";
        const phone = data.wuid ? jidToPhone(data.wuid) : (body.sender ? jidToPhone(body.sender) : null);
        if (phone) patch.display_phone_number = phone;
        if (data.profileName) patch.profile_name = data.profileName;
        if (data.profilePictureUrl) patch.profile_pic_url = data.profilePictureUrl;
      }
      await supabase.from("user_waba_connections").update(patch).eq("id", connectionId);
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
        const msgTime = new Date((tsSec > 1e12 ? tsSec : tsSec * 1000)).toISOString();

        const parsed = parseMessage(item.message, item);
        if (parsed.type === "reaction" || parsed.type === "unsupported" && !parsed.text) continue;

        // Idempotência
        const { data: dup } = await supabase.from("chat_messages").select("id").eq("waba_message_id", msgId).limit(1).maybeSingle();
        if (dup) continue;

        const mediaUrl = await storeMedia(ownerId, msgId, parsed);
        const lastText = previewText(parsed.type, parsed.text, parsed.filename);
        const direction = fromMe ? "outbound" : "inbound";

        let { data: conversation } = await supabase
          .from("chat_conversations")
          .select("id, unread_count")
          .eq("user_id", userId)
          .eq("waba_connection_id", connectionId)
          .or(`contact_phone.eq.${contactPhone},contact_phone.ilike.%${phoneTail8(contactPhone)}`)
          .limit(1)
          .maybeSingle();

        if (!conversation) {
          const { data: newConv } = await supabase.from("chat_conversations").insert({
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
          }).select("id, unread_count").single();
          conversation = newConv;
        } else {
          await supabase.from("chat_conversations").update({
            contact_name: contactName || undefined,
            last_message_text: lastText,
            last_message_at: msgTime,
            last_message_type: parsed.type,
            last_message_direction: direction,
            unread_count: fromMe ? 0 : (conversation.unread_count || 0) + 1,
          }).eq("id", conversation.id);
        }
        if (!conversation) continue;

        await supabase.from("chat_messages").insert({
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
        });

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

    return ok({ ignored: event });
  } catch (e) {
    console.error("[evolution-webhook] error", event, e);
    return ok({ error: (e as Error).message });
  }
});
