import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    let { message_id } = body;
    const { conversation_id, phone_number_id, to, type, text, media_url, caption, filename, waba_connection_id } = body;

    if ((!message_id && !conversation_id) || !to || !type || !waba_connection_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    // Get access token from connection (owner or member of the account)
    const { data: connectionRow } = await supabase
      .from('user_waba_connections')
      .select('access_token, provider, evolution_instance_name, evolution_token, user_id, owner_user_id')
      .eq('id', waba_connection_id)
      .single();

    let connection = connectionRow;
    if (connection) {
      const connOwner = connection.owner_user_id || connection.user_id;
      if (connOwner !== userId && connection.user_id !== userId) {
        const { data: member } = await supabase
          .from('account_members')
          .select('id')
          .eq('user_id', userId)
          .eq('owner_user_id', connOwner)
          .eq('status', 'active')
          .maybeSingle();
        if (!member) connection = null;
      }
    }

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: corsHeaders });
    }

    const connOwner = connection.owner_user_id || connection.user_id;
    if (message_id) {
      const { data: existingMessage } = await supabase.from('chat_messages').select('id, conversation_id')
        .eq('id', message_id).eq('owner_user_id', connOwner).maybeSingle();
      if (!existingMessage) return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404, headers: corsHeaders });
    }

    if (!message_id) {
      const { data: conversation } = await supabase.from('chat_conversations').select('id')
        .eq('id', conversation_id).eq('owner_user_id', connOwner).eq('waba_connection_id', waba_connection_id).maybeSingle();
      if (!conversation) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: corsHeaders });
      const encrypted = await encryptMessageFields({
        conversation_id, user_id: userId, owner_user_id: connOwner, direction: 'outbound',
        message_type: type === 'template' ? 'text' : type,
        content: text || (type === 'template' ? `[Template] ${body.template_name || ''}` : caption) || null,
        media_url: media_url || null, media_mime_type: body.media_mime_type || null, media_filename: filename || null,
        media_caption: caption || null, status: 'pending', reply_to_message_id: body.reply_to_message_id || null,
        metadata: { ...(body.metadata || {}), client_token: body.client_token || null },
      });
      const { data: inserted, error: insertError } = await supabase.from('chat_messages').insert(encrypted).select('id').single();
      if (insertError || !inserted) throw new Error('Unable to persist encrypted message');
      message_id = inserted.id;
      const previewText = type === 'text' ? text : type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : type === 'audio' ? '🎤 Áudio' : type === 'document' ? `📄 ${filename || 'Documento'}` : `[Template] ${body.template_name || ''}`;
      await supabase.from('chat_conversations').update(await encryptConversationPreview({
        last_message_text: previewText, last_message_at: new Date().toISOString(), last_message_type: type,
        last_message_direction: 'outbound',
      })).eq('id', conversation_id);
    }

    // Media lives in private buckets. Convert any internal storage reference into a
    // short-lived signed URL so Meta can fetch it without the object being public.
    const PRIVATE_BUCKETS = ["chat-media", "deal-attachments"];
    let mediaLink: string | undefined = media_url;
    if (typeof media_url === "string" && media_url.includes("/storage/v1/object/")) {
      const m = media_url.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?]+)\/(.+?)(?:\?|$)/);
      if (m && PRIVATE_BUCKETS.includes(m[1])) {
        const objectPath = decodeURIComponent(m[2]);
        const { data: signed } = await supabase.storage.from(m[1]).createSignedUrl(objectPath, 60 * 30);
        if (signed?.signedUrl) mediaLink = signed.signedUrl;
      }
    }

    // Resolve "responder" (quoted message) so the reply also appears as a reply
    // inside WhatsApp itself — works for both Meta Cloud API and Evolution.
    let quotedWabaId: string | null = null;
    let quotedFromMe = false;
    try {
      const { data: outRow } = await supabase
        .from('chat_messages')
        .select('reply_to_message_id')
        .eq('id', message_id)
        .maybeSingle();
      const replyId = (outRow as any)?.reply_to_message_id || body.reply_to_message_id || null;
      if (replyId) {
        const { data: quoted } = await supabase
          .from('chat_messages')
          .select('waba_message_id, direction')
          .eq('id', replyId)
          .eq('owner_user_id', connOwner)
          .maybeSingle();
        if (quoted?.waba_message_id) {
          quotedWabaId = quoted.waba_message_id as string;
          quotedFromMe = (quoted as any).direction === 'outbound';
        }
      }
    } catch (e) {
      console.warn('[send-chat-message] quoted lookup failed:', (e as Error).message);
    }

    // Build Meta API request
    let messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
    };
    if (quotedWabaId) messagePayload.context = { message_id: quotedWabaId };


    if (type === "text") {
      messagePayload.type = "text";
      messagePayload.text = { body: text };
    } else if (type === "image") {
      messagePayload.type = "image";
      messagePayload.image = { link: mediaLink, caption: caption || undefined };
    } else if (type === "video") {
      messagePayload.type = "video";
      messagePayload.video = { link: mediaLink, caption: caption || undefined };
    } else if (type === "document") {
      messagePayload.type = "document";
      messagePayload.document = { link: mediaLink, filename: filename || "document", caption: caption || undefined };
    } else if (type === "audio") {
      messagePayload.type = "audio";
      messagePayload.audio = { link: mediaLink };
    } else if (type === "template") {
      messagePayload.type = "template";
      messagePayload.template = {
        name: body.template_name,
        language: { code: body.template_language || "pt_BR" },
        ...(Array.isArray(body.template_components) ? { components: body.template_components } : {}),
      };
    }

    console.log(`[send-chat-message] Sending ${type} to ${to} via ${phone_number_id}`);

    let sendOk = false;
    let sentMessageId: string | null = null;
    let metaResult: any = {};

    if (connection.provider === 'evolution') {
      // ===== Número de Atendimento (Evolution API) =====
      const EVO_URL = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '');
      const EVO_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';
      const instance = connection.evolution_instance_name;
      const number = String(to).replace(/\D/g, '');
      if (type === 'template') {
        await supabase.from('chat_messages').update({ status: 'failed', metadata: { error: 'template_not_supported_evolution' } }).eq('id', message_id);
        return new Response(JSON.stringify({ error: 'Templates são exclusivos do Número de Marketing (Meta). Envie uma mensagem normal.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let path = `/message/sendText/${instance}`;
      let evoBody: any = { number, text: text || '' };
      if (type === 'audio') {
        // Baixa o áudio e envia em base64 com `encoding: true` para a Evolution
        // converter para OGG/Opus (nota de voz nativa), independente do formato
        // gravado pelo navegador (webm/ogg/mp4).
        path = `/message/sendWhatsAppAudio/${instance}`;
        let audioPayload: string = mediaLink || '';
        try {
          if (mediaLink) {
            const r = await fetch(mediaLink);
            if (r.ok) {
              const buf = new Uint8Array(await r.arrayBuffer());
              let bin = '';
              const chunk = 0x8000;
              for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
              audioPayload = btoa(bin);
            }
          }
        } catch (e) {
          console.warn('[send-chat-message] audio base64 fallback to url:', e);
        }
        evoBody = { number, audio: audioPayload, encoding: true, delay: 300 };
      } else if (type === 'image' || type === 'video' || type === 'document') {
        path = `/message/sendMedia/${instance}`;
        const inferMime = () => {
          const f = String(filename || '').toLowerCase();
          if (type === 'image') return f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          if (type === 'video') return 'video/mp4';
          if (f.endsWith('.pdf')) return 'application/pdf';
          if (f.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          if (f.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          if (f.endsWith('.csv')) return 'text/csv';
          return 'application/octet-stream';
        };
        evoBody = {
          number,
          mediatype: type,
          mimetype: inferMime(),
          media: mediaLink,
          caption: caption || undefined,
          fileName: filename || (type === 'document' ? 'documento' : undefined),
        };
      }
      if (quotedWabaId) {
        evoBody.quoted = {
          key: { id: quotedWabaId, remoteJid: `${number}@s.whatsapp.net`, fromMe: quotedFromMe },
        };
      }
      console.log(`[send-chat-message] Sending ${type} to ${to} via Evolution ${instance}`);
      const evoRes = await fetch(`${EVO_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
        body: JSON.stringify(evoBody),
      });
      metaResult = await evoRes.json().catch(() => ({}));
      console.log(`[send-chat-message] Evolution response:`, JSON.stringify(metaResult).substring(0, 500));
      sentMessageId = metaResult?.key?.id || null;
      sendOk = evoRes.ok && !!sentMessageId;
      if (!sendOk && !metaResult.error) {
        metaResult.error = { message: metaResult?.response?.message?.[0] || metaResult?.message || `Evolution ${evoRes.status}` };
      }
    } else {
      const metaResponse = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${connection.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagePayload),
        }
      );
      metaResult = await metaResponse.json();
      console.log(`[send-chat-message] Meta response:`, JSON.stringify(metaResult).substring(0, 500));
      sentMessageId = metaResult.messages?.[0]?.id || null;
      sendOk = metaResponse.ok && !!sentMessageId;
    }

    if (sendOk && sentMessageId) {
      const wabaMessageId = sentMessageId;
      await supabase.from('chat_messages').update({
        status: 'sent',
        waba_message_id: wabaMessageId,
        status_updated_at: new Date().toISOString(),
      }).eq('id', message_id);

      // === CRM LEAD STATUS: mark as 'message_sent' (or 'in_conversation' if already replied) ===
      try {
        const tail = String(to || '').replace(/\D/g, '').slice(-8);
        if (tail.length >= 8) {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, whatsapp_status, first_message_sent')
            .eq('user_id', userId)
            .ilike('phone', `%${tail}`)
            .limit(5);

          const nowIso = new Date().toISOString();
          for (const lead of leads || []) {
            const updates: any = {
              first_message_sent: true,
              last_message_sent_at: nowIso,
              updated_at: nowIso,
            };
            if (!lead.first_message_sent) updates.first_message_sent_at = nowIso;
            const current = lead.whatsapp_status || 'never_contacted';
            if (current === 'never_contacted' || current === 'no_response') {
              updates.whatsapp_status = 'message_sent';
            } else if (current === 'replied') {
              updates.whatsapp_status = 'in_conversation';
            }
            await supabase.from('leads').update(updates).eq('id', lead.id);
          }
          if ((leads || []).length > 0) {
            console.log(`[send-chat-message] 🏷️ Updated ${leads!.length} lead(s) status (outbound) for tail ${tail}`);
          }
        }
      } catch (statusErr) {
        console.error('[send-chat-message] Lead status update error (non-blocking):', statusErr);
      }

      // === REVENUE SCORING: Fire outbound event ===
      try {
        const phoneDigits = String(to || '').replace(/\D/g, '');
        // Normalize to E.164 BR format
        let phoneE164 = phoneDigits;
        if (phoneDigits.length === 12 && phoneDigits.startsWith('55')) {
          const ddd = phoneDigits.slice(2, 4);
          phoneE164 = `55${ddd}9${phoneDigits.slice(4)}`;
        }
        if (phoneE164.length >= 12) {
          await supabase.functions.invoke('revenue-processor', {
            body: {
              action: 'process_message',
              source: connection.provider === 'evolution' ? 'evolution' : 'meta',
              user_id: userId,
              phone_e164: phoneE164,
              direction: 'outbound',
              message_content: text || caption || undefined,
            },
          });
          console.log(`[send-chat-message] 📊 Revenue outbound event fired for ${phoneE164}`);
        }
      } catch (revErr) {
        console.error('[send-chat-message] Revenue event error (non-blocking):', revErr);
      }

      return new Response(JSON.stringify({ success: true, message_id, waba_message_id: wabaMessageId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const errorMsg = metaResult.error?.message || 'Unknown error';
      console.error(`[send-chat-message] Failed:`, errorMsg);

      await supabase.from('chat_messages').update({
        status: 'failed',
        metadata: { error: errorMsg, meta_response: metaResult },
        status_updated_at: new Date().toISOString(),
      }).eq('id', message_id);

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[send-chat-message] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
