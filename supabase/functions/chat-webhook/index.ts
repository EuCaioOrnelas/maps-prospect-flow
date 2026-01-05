import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[WEBHOOK] Missing Supabase credentials');
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get raw body
    const rawBody = await req.text();
    console.log('[WEBHOOK] ========================================');
    console.log('[WEBHOOK] REQUEST RECEIVED');
    console.log('[WEBHOOK] Method:', req.method);
    console.log('[WEBHOOK] Body length:', rawBody.length);
    console.log('[WEBHOOK] Body preview:', rawBody.substring(0, 1500));
    console.log('[WEBHOOK] ========================================');

    if (!rawBody || rawBody.length === 0) {
      console.log('[WEBHOOK] Empty body');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[WEBHOOK] Invalid JSON');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract event and instance from various Evolution API formats
    const rawEvent = payload.event || payload.eventType || payload.type || 'unknown';
    const instance = payload.instance || payload.instanceName || payload.instance_name || '';
    const data = payload.data || payload.message || payload;

    console.log('[WEBHOOK] Event:', rawEvent);
    console.log('[WEBHOOK] Instance:', instance);
    console.log('[WEBHOOK] Data keys:', data ? Object.keys(data) : 'null');

    // Normalize event for comparison
    const normalizedEvent = String(rawEvent).toLowerCase().replace(/[._-]/g, '');
    console.log('[WEBHOOK] Normalized event:', normalizedEvent);

    if (!instance) {
      console.log('[WEBHOOK] No instance, ignoring');
      return new Response(JSON.stringify({ ok: true, ignored: 'no_instance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find WhatsApp number by instance
    const { data: whatsappNumber, error: numErr } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('instance_name', instance)
      .single();

    if (numErr || !whatsappNumber) {
      console.log('[WEBHOOK] WhatsApp number not found for instance:', instance);
      return new Response(JSON.stringify({ ok: true, ignored: 'instance_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[WEBHOOK] Found number:', whatsappNumber.id, 'User:', whatsappNumber.user_id);

    // ============================================
    // HANDLE MESSAGE UPSERT (NEW MESSAGES)
    // ============================================
    if (normalizedEvent.includes('messagesupsert') || normalizedEvent.includes('messageinsert')) {
      console.log('[WEBHOOK] Processing MESSAGE UPSERT');

      const key = data?.key || {};
      const msg = data?.message || {};
      const remoteJid = key.remoteJid || data?.remoteJid || '';
      const messageId = key.id || data?.id || data?.messageId || '';
      const fromMe = key.fromMe ?? data?.fromMe ?? false;
      const pushName = data?.pushName || data?.push_name || '';

      console.log('[WEBHOOK] remoteJid:', remoteJid);
      console.log('[WEBHOOK] messageId:', messageId);
      console.log('[WEBHOOK] fromMe:', fromMe);
      console.log('[WEBHOOK] pushName:', pushName);

      // Skip groups
      if (remoteJid.includes('@g.us')) {
        console.log('[WEBHOOK] Skipping group');
        return new Response(JSON.stringify({ ok: true, ignored: 'group' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      console.log('[WEBHOOK] Phone:', phone);

      // Extract content
      let content = '';
      let messageType = 'text';
      let mediaUrl: string | null = null;
      let mediaMimetype: string | null = null;
      let mediaFilename: string | null = null;

      if (msg.conversation) {
        content = msg.conversation;
      } else if (msg.extendedTextMessage?.text) {
        content = msg.extendedTextMessage.text;
      } else if (msg.imageMessage) {
        messageType = 'image';
        content = msg.imageMessage.caption || '[Imagem]';
        mediaUrl = msg.imageMessage.url || null;
        mediaMimetype = msg.imageMessage.mimetype || null;
      } else if (msg.audioMessage) {
        messageType = 'audio';
        content = '[Áudio]';
        mediaUrl = msg.audioMessage.url || null;
        mediaMimetype = msg.audioMessage.mimetype || null;
      } else if (msg.videoMessage) {
        messageType = 'video';
        content = msg.videoMessage.caption || '[Vídeo]';
        mediaUrl = msg.videoMessage.url || null;
        mediaMimetype = msg.videoMessage.mimetype || null;
      } else if (msg.documentMessage) {
        messageType = 'document';
        content = msg.documentMessage.fileName || '[Documento]';
        mediaUrl = msg.documentMessage.url || null;
        mediaMimetype = msg.documentMessage.mimetype || null;
        mediaFilename = msg.documentMessage.fileName || null;
      } else if (msg.stickerMessage) {
        messageType = 'sticker';
        content = '[Sticker]';
      } else if (data?.text) {
        content = data.text;
      } else if (data?.content) {
        content = data.content;
      } else if (data?.body) {
        content = data.body;
      }

      console.log('[WEBHOOK] Type:', messageType, 'Content:', content?.substring(0, 100));

      // Find or create conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('remote_jid', remoteJid)
        .single();

      let conversationId: string;

      if (conv) {
        conversationId = conv.id;
        console.log('[WEBHOOK] Existing conversation:', conversationId);
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({
            user_id: whatsappNumber.user_id,
            whatsapp_number_id: whatsappNumber.id,
            remote_jid: remoteJid,
            phone: phone,
            contact_name: pushName || null,
            last_message: content?.substring(0, 100),
            last_message_at: new Date().toISOString(),
            unread_count: fromMe ? 0 : 1,
          })
          .select()
          .single();

        if (convErr) {
          console.error('[WEBHOOK] Error creating conversation:', convErr);
          throw convErr;
        }
        conversationId = newConv.id;
        console.log('[WEBHOOK] Created conversation:', conversationId);
      }

      // Check duplicate
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('message_id', messageId)
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (existingMsg) {
        console.log('[WEBHOOK] Message exists, skipping:', messageId);
        return new Response(JSON.stringify({ ok: true, ignored: 'duplicate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Insert message
      const { data: inserted, error: msgErr } = await supabase
        .from('messages')
        .insert({
          user_id: whatsappNumber.user_id,
          conversation_id: conversationId,
          message_id: messageId,
          remote_jid: remoteJid,
          from_me: fromMe,
          message_type: messageType,
          content: content,
          media_url: mediaUrl,
          media_mimetype: mediaMimetype,
          media_filename: mediaFilename,
          status: fromMe ? 'sent' : 'received',
        })
        .select()
        .single();

      if (msgErr) {
        console.error('[WEBHOOK] Error inserting message:', msgErr);
        throw msgErr;
      }

      console.log('[WEBHOOK] Message inserted:', inserted.id);

      // Update conversation
      const currentConv = conv || { unread_count: 0, contact_name: null };
      await supabase
        .from('conversations')
        .update({
          last_message: content?.substring(0, 100) || `[${messageType}]`,
          last_message_at: new Date().toISOString(),
          unread_count: fromMe ? currentConv.unread_count : (currentConv.unread_count || 0) + 1,
          contact_name: currentConv.contact_name || pushName || null,
        })
        .eq('id', conversationId);

      console.log('[WEBHOOK] SUCCESS - Message processed');

      return new Response(JSON.stringify({ ok: true, messageId: inserted.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // HANDLE MESSAGE STATUS UPDATES
    // ============================================
    if (normalizedEvent.includes('messagesupdate') || normalizedEvent.includes('messageupdate') || normalizedEvent.includes('ack')) {
      console.log('[WEBHOOK] Processing MESSAGE UPDATE');

      const updates = Array.isArray(data) ? data : [data];

      for (const upd of updates) {
        const msgId = upd?.key?.id || upd?.id || upd?.messageId || '';
        const statusCode = upd?.update?.status ?? upd?.status ?? upd?.ack ?? -1;

        console.log('[WEBHOOK] Status update - msgId:', msgId, 'code:', statusCode);

        if (!msgId) continue;

        let status = 'sent';
        const code = Number(statusCode);
        if (code === 0) status = 'pending';
        else if (code === 1) status = 'sent';
        else if (code === 2) status = 'delivered';
        else if (code >= 3) status = 'read';

        const { error } = await supabase
          .from('messages')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('message_id', msgId);

        if (error) {
          console.error('[WEBHOOK] Error updating status:', error);
        } else {
          console.log('[WEBHOOK] Status updated to:', status);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // HANDLE CONNECTION UPDATES
    // ============================================
    if (normalizedEvent.includes('connectionupdate')) {
      console.log('[WEBHOOK] Processing CONNECTION UPDATE');

      const state = data?.state || data?.status || '';
      const isConnected = state === 'open' || state === 'connected';

      console.log('[WEBHOOK] State:', state, 'Connected:', isConnected);

      await supabase
        .from('whatsapp_numbers')
        .update({ is_connected: isConnected, updated_at: new Date().toISOString() })
        .eq('id', whatsappNumber.id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[WEBHOOK] Unhandled event:', rawEvent);
    return new Response(JSON.stringify({ ok: true, unhandled: rawEvent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[WEBHOOK] ERROR:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});