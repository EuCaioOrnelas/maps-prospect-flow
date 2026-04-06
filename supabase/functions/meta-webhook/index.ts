import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ========== GET: Webhook Verification ==========
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    console.log('[meta-webhook] Verification request:', { mode, token: token?.substring(0, 4) + '***', challenge });
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[meta-webhook] ✅ Webhook verified');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ========== POST: Incoming events ==========
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[meta-webhook] Received:', JSON.stringify(body).substring(0, 500));
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (body.object !== 'whatsapp_business_account') {
        return new Response('OK', { status: 200 });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        const changes = entry.changes || [];

        for (const change of changes) {
          const field = change.field;
          const value = change.value;
          console.log(`[meta-webhook] WABA ${wabaId} | field: ${field}`);

          if (field === 'messages') {
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata || {};
            const phoneNumberId = metadata.phone_number_id;
            const displayPhone = metadata.display_phone_number;

            // Find WABA connection for this phone_number_id
            const { data: wabaConn } = await supabase
              .from('user_waba_connections')
              .select('id, user_id')
              .eq('phone_number_id', phoneNumberId)
              .eq('status', 'active')
              .maybeSingle();

            for (const msg of messages) {
              const from = msg.from;
              const msgType = msg.type;
              const timestamp = msg.timestamp;
              const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || null;

              console.log(`[meta-webhook] 📩 Message from ${from} (${contactName}) to ${displayPhone} | type: ${msgType}`);

              let textContent = '';
              let mediaUrl = null;
              let mediaMime = null;
              let mediaFilename = null;

              if (msgType === 'text') {
                textContent = msg.text?.body || '';
              } else if (msgType === 'button') {
                textContent = msg.button?.text || '';
              } else if (msgType === 'interactive') {
                textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
              } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType)) {
                const media = msg[msgType];
                if (media) {
                  textContent = media.caption || '';
                  mediaMime = media.mime_type || null;
                  mediaFilename = media.filename || null;
                  // Media ID needs to be downloaded via Graph API - store ID for now
                  mediaUrl = media.id ? `meta_media:${media.id}` : null;
                }
              }

              // Log to meta_webhook_events
              await supabase.from('meta_webhook_events').insert({
                waba_id: wabaId,
                phone_number_id: phoneNumberId,
                event_type: 'message',
                from_phone: from,
                contact_name: contactName,
                message_type: msgType,
                message_content: textContent,
                raw_payload: msg,
                received_at: new Date(parseInt(timestamp) * 1000).toISOString(),
              });

              // ===== CHAT SYSTEM INTEGRATION =====
              if (wabaConn) {
                const userId = wabaConn.user_id;
                const connectionId = wabaConn.id;
                const msgTime = new Date(parseInt(timestamp) * 1000).toISOString();

                // Find or create conversation
                let { data: conversation } = await supabase
                  .from('chat_conversations')
                  .select('id, unread_count')
                  .eq('user_id', userId)
                  .eq('waba_connection_id', connectionId)
                  .eq('contact_phone', from)
                  .maybeSingle();

                const lastText = msgType === 'text' ? textContent
                  : msgType === 'image' ? '📷 Imagem'
                  : msgType === 'video' ? '🎥 Vídeo'
                  : msgType === 'audio' ? '🎤 Áudio'
                  : msgType === 'document' ? `📄 ${mediaFilename || 'Documento'}`
                  : msgType === 'sticker' ? '🏷️ Sticker'
                  : textContent || msgType;

                if (!conversation) {
                  const { data: newConv } = await supabase.from('chat_conversations').insert({
                    user_id: userId,
                    waba_connection_id: connectionId,
                    contact_phone: from,
                    contact_name: contactName,
                    last_message_text: lastText,
                    last_message_at: msgTime,
                    last_message_type: msgType,
                    last_message_direction: 'inbound',
                    unread_count: 1,
                  }).select('id, unread_count').single();
                  conversation = newConv;
                } else {
                  await supabase.from('chat_conversations').update({
                    contact_name: contactName || undefined,
                    last_message_text: lastText,
                    last_message_at: msgTime,
                    last_message_type: msgType,
                    last_message_direction: 'inbound',
                    unread_count: (conversation.unread_count || 0) + 1,
                  }).eq('id', conversation.id);
                }

                if (conversation) {
                  await supabase.from('chat_messages').insert({
                    conversation_id: conversation.id,
                    user_id: userId,
                    waba_message_id: msg.id || null,
                    direction: 'inbound',
                    message_type: msgType,
                    content: textContent || null,
                    media_url: mediaUrl,
                    media_mime_type: mediaMime,
                    media_filename: mediaFilename,
                    media_caption: msgType !== 'text' ? (textContent || null) : null,
                    status: 'delivered',
                  });
                  console.log(`[meta-webhook] ✅ Chat message saved for conversation ${conversation.id}`);
                }
              }
            }

            // Handle statuses
            const statuses = value.statuses || [];
            for (const status of statuses) {
              console.log(`[meta-webhook] 📊 Status: ${status.status} for msg ${status.id}`);

              await supabase.from('meta_webhook_events').insert({
                waba_id: wabaId,
                phone_number_id: value.metadata?.phone_number_id,
                event_type: 'status',
                from_phone: status.recipient_id,
                message_type: status.status,
                message_content: status.errors?.[0]?.message || null,
                raw_payload: status,
                received_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
              });

              // Update chat message status
              if (status.id && status.status) {
                const statusMap: Record<string, string> = {
                  'sent': 'sent',
                  'delivered': 'delivered',
                  'read': 'read',
                  'failed': 'failed',
                };
                const newStatus = statusMap[status.status];
                if (newStatus) {
                  await supabase.from('chat_messages')
                    .update({
                      status: newStatus,
                      status_updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
                    })
                    .eq('waba_message_id', status.id);
                  console.log(`[meta-webhook] ✅ Message ${status.id} status → ${newStatus}`);
                }
              }
            }
          } else {
            console.log(`[meta-webhook] 📋 Event field=${field}:`, JSON.stringify(value).substring(0, 300));
            await supabase.from('meta_webhook_events').insert({
              waba_id: wabaId,
              event_type: field,
              message_type: value.event || value.status || field,
              message_content: JSON.stringify(value).substring(0, 1000),
              raw_payload: value,
            });
          }
        }
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('[meta-webhook] Error:', error);
      return new Response('OK', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
