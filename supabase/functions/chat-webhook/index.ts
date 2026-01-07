import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[WEBHOOK] Missing Supabase credentials');
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Helper function to download media from Evolution API and upload to Supabase Storage
  async function downloadAndStoreMedia(
    instanceName: string,
    messageId: string,
    mediaType: string,
    userId: string
  ): Promise<{ url: string; mimetype: string } | null> {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.log('[WEBHOOK] Evolution API not configured, skipping media download');
      return null;
    }

    try {
      console.log(`[WEBHOOK] Downloading media for message ${messageId}`);
      
      const response = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          message: { key: { id: messageId } },
          convertToMp4: mediaType === 'video',
        }),
      });

      if (!response.ok) {
        console.log(`[WEBHOOK] Failed to download media: ${response.status}`);
        return null;
      }

      const result = await response.json();
      const base64Data = result.base64 || result.data;
      const mimetype = result.mimetype || result.mediaType || `${mediaType}/unknown`;
      
      if (!base64Data) {
        console.log('[WEBHOOK] No base64 data in response');
        return null;
      }

      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'audio/ogg': 'ogg',
        'audio/mpeg': 'mp3',
        'audio/ogg; codecs=opus': 'ogg',
        'application/pdf': 'pdf',
      };
      
      const ext = extMap[mimetype] || mimetype.split('/')[1]?.split(';')[0] || 'bin';
      const filename = `${userId}/${Date.now()}_${messageId.substring(0, 8)}.${ext}`;
      
      const fileData = base64Decode(base64Data);
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filename, fileData, {
          contentType: mimetype.split(';')[0],
          upsert: false,
        });

      if (uploadError) {
        console.error('[WEBHOOK] Error uploading media:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filename);

      console.log('[WEBHOOK] Media stored:', urlData.publicUrl);
      return { url: urlData.publicUrl, mimetype: mimetype };
    } catch (error) {
      console.error('[WEBHOOK] Error downloading media:', error);
      return null;
    }
  }

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

      // Extract raw phone and normalize - @lid uses internal ID, extract actual phone
      const rawPhone = remoteJid.split('@')[0];
      const normalizedPhone = rawPhone.replace(/\D/g, '');
      // For matching, use last 10-11 digits (without country code variations)
      const phoneToMatch = normalizedPhone.slice(-11);
      console.log('[WEBHOOK] Raw phone:', rawPhone, 'Normalized:', normalizedPhone, 'Match pattern:', phoneToMatch);

      // Extract content
      let content = '';
      let messageType = 'text';
      let mediaUrl: string | null = null;
      let mediaMimetype: string | null = null;
      let mediaFilename: string | null = null;
      let hasMedia = false;
      let quotedMessageId: string | null = null;

      // Extract quoted message ID (contextInfo contains reply info)
      const contextInfo = msg.extendedTextMessage?.contextInfo || 
                          msg.imageMessage?.contextInfo ||
                          msg.videoMessage?.contextInfo ||
                          msg.audioMessage?.contextInfo ||
                          msg.documentMessage?.contextInfo ||
                          data?.contextInfo;
      
      if (contextInfo?.stanzaId) {
        quotedMessageId = contextInfo.stanzaId;
        console.log('[WEBHOOK] Message is a reply to:', quotedMessageId);
      }

      if (msg.conversation) {
        content = msg.conversation;
      } else if (msg.extendedTextMessage?.text) {
        content = msg.extendedTextMessage.text;
      } else if (msg.imageMessage) {
        messageType = 'image';
        content = msg.imageMessage.caption || '[Imagem]';
        mediaMimetype = msg.imageMessage.mimetype || null;
        hasMedia = true;
      } else if (msg.audioMessage) {
        messageType = 'audio';
        content = '[Áudio]';
        mediaMimetype = msg.audioMessage.mimetype || null;
        hasMedia = true;
      } else if (msg.videoMessage) {
        messageType = 'video';
        content = msg.videoMessage.caption || '[Vídeo]';
        mediaMimetype = msg.videoMessage.mimetype || null;
        hasMedia = true;
      } else if (msg.documentMessage) {
        messageType = 'document';
        content = msg.documentMessage.fileName || '[Documento]';
        mediaMimetype = msg.documentMessage.mimetype || null;
        mediaFilename = msg.documentMessage.fileName || null;
        hasMedia = true;
      } else if (msg.stickerMessage) {
        messageType = 'sticker';
        content = '[Sticker]';
      } else if (msg.buttonResponseMessage) {
        // Handle button response messages
        messageType = 'text';
        content = msg.buttonResponseMessage.selectedDisplayText || 
                  msg.buttonResponseMessage.selectedButtonId || 
                  '[Resposta de botão]';
      } else if (msg.listResponseMessage) {
        // Handle list response messages
        messageType = 'text';
        content = msg.listResponseMessage.title || 
                  msg.listResponseMessage.singleSelectReply?.selectedRowId ||
                  '[Resposta de lista]';
      } else if (msg.templateButtonReplyMessage) {
        // Handle template button replies
        messageType = 'text';
        content = msg.templateButtonReplyMessage.selectedDisplayText ||
                  msg.templateButtonReplyMessage.selectedId ||
                  '[Resposta de template]';
      } else if (msg.buttonsMessage) {
        // Handle outgoing buttons message
        messageType = 'text';
        content = msg.buttonsMessage.contentText || 
                  msg.buttonsMessage.headerType === 1 ? msg.buttonsMessage.text : 
                  '[Mensagem com botões]';
      } else if (msg.listMessage) {
        // Handle outgoing list message
        messageType = 'text';
        content = msg.listMessage.description || 
                  msg.listMessage.title ||
                  '[Mensagem de lista]';
      } else if (data?.text) {
        content = data.text;
      } else if (data?.content) {
        content = data.content;
      } else if (data?.body) {
        content = data.body;
      }

      // If message has media, download and store it
      if (hasMedia && messageId) {
        console.log(`[WEBHOOK] Message has ${messageType} media, downloading...`);
        const storedMedia = await downloadAndStoreMedia(
          instance,
          messageId,
          messageType,
          whatsappNumber.user_id
        );
        
        if (storedMedia) {
          mediaUrl = storedMedia.url;
          mediaMimetype = storedMedia.mimetype;
          console.log(`[WEBHOOK] Media stored at: ${mediaUrl}`);
        } else {
          console.log('[WEBHOOK] Failed to download media, will store without URL');
        }
      }

      console.log('[WEBHOOK] Type:', messageType, 'Content:', content?.substring(0, 100));

      // Find or create conversation - use phone matching to merge @lid and @s.whatsapp.net
      let conversationId: string | null = null;
      let existingConv = null;

      // Strategy 1: Match by exact remote_jid
      const { data: exactMatch } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('remote_jid', remoteJid)
        .single();

      if (exactMatch) {
        existingConv = exactMatch;
        conversationId = exactMatch.id;
        console.log('[WEBHOOK] Found by exact remote_jid:', conversationId);
      }

      // Strategy 2: Match by phone number (handles @lid -> same phone as @s.whatsapp.net)
      if (!conversationId && phoneToMatch.length >= 10) {
        const { data: allConvs } = await supabase
          .from('conversations')
          .select('*')
          .eq('whatsapp_number_id', whatsappNumber.id);

        if (allConvs && allConvs.length > 0) {
          const matchingConv = allConvs.find(c => {
            const convPhone = c.phone.replace(/\D/g, '');
            const convNormalized = convPhone.slice(-11);
            // Match by last 10-11 digits
            return convNormalized === phoneToMatch ||
                   convNormalized.slice(-10) === phoneToMatch.slice(-10) ||
                   phoneToMatch.endsWith(convNormalized.slice(-10)) ||
                   convNormalized.endsWith(phoneToMatch.slice(-10));
          });

          if (matchingConv) {
            existingConv = matchingConv;
            conversationId = matchingConv.id;
            console.log('[WEBHOOK] Found by phone match:', matchingConv.phone, '-> merging with', rawPhone);

            // Update remote_jid to the current one for future exact matches
            // Prefer @s.whatsapp.net over @lid for the canonical remote_jid
            const newRemoteJid = remoteJid.includes('@lid') ? matchingConv.remote_jid : remoteJid;
            if (newRemoteJid !== matchingConv.remote_jid || normalizedPhone !== matchingConv.phone) {
              await supabase
                .from('conversations')
                .update({ 
                  remote_jid: newRemoteJid,
                  phone: normalizedPhone,
                  updated_at: new Date().toISOString() 
                })
                .eq('id', conversationId);
            }
          }
        }
      }

      // Strategy 3: Create new conversation
      if (!conversationId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({
            user_id: whatsappNumber.user_id,
            whatsapp_number_id: whatsappNumber.id,
            remote_jid: remoteJid,
            phone: normalizedPhone,
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
          quoted_message_id: quotedMessageId,
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
      const currentConv = existingConv || { unread_count: 0, contact_name: null };
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
    // HANDLE MESSAGE DELETIONS (from mobile)
    // ============================================
    if (normalizedEvent.includes('messagesdelete') || normalizedEvent.includes('messagedelete') || normalizedEvent.includes('messagerevoked')) {
      console.log('[WEBHOOK] Processing MESSAGE DELETE');

      // Handle both single and array of message IDs
      const messageIds = Array.isArray(data) 
        ? data.map((d: any) => d?.key?.id || d?.id || d?.messageId).filter(Boolean)
        : [data?.key?.id || data?.id || data?.messageId].filter(Boolean);

      console.log('[WEBHOOK] Message IDs to delete:', messageIds);

      for (const msgId of messageIds) {
        if (!msgId) continue;

        // Find and delete the message
        const { data: existingMsg } = await supabase
          .from('messages')
          .select('id, conversation_id')
          .eq('message_id', msgId)
          .eq('user_id', whatsappNumber.user_id)
          .maybeSingle();

        if (existingMsg) {
          console.log('[WEBHOOK] Deleting message:', existingMsg.id);
          
          await supabase
            .from('messages')
            .delete()
            .eq('id', existingMsg.id);

          // Update conversation's last message if needed
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, message_type, created_at')
            .eq('conversation_id', existingMsg.conversation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMsg) {
            await supabase
              .from('conversations')
              .update({
                last_message: lastMsg.content?.substring(0, 100) || `[${lastMsg.message_type}]`,
                last_message_at: lastMsg.created_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingMsg.conversation_id);
          }

          console.log('[WEBHOOK] Message deleted successfully');
        } else {
          console.log('[WEBHOOK] Message not found for deletion:', msgId);
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