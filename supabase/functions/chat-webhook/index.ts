import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('=== CHAT WEBHOOK RECEIVED ===');
    console.log('Full payload:', JSON.stringify(payload));

    // Evolution API sends event in different formats - normalize all to lowercase with dots
    const rawEvent = payload.event || '';
    const event = rawEvent.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
    const instance = payload.instance;
    const data = payload.data;

    console.log('Raw event:', rawEvent, '-> Normalized:', event);
    console.log('Instance:', instance);

    if (!instance) {
      console.log('No instance in payload, skipping');
      return new Response(JSON.stringify({ ok: true, skipped: 'no instance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the WhatsApp number by instance name
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id, user_id, phone_number')
      .eq('instance_name', instance)
      .single();

    if (numberError || !whatsappNumber) {
      console.log('WhatsApp number not found for instance:', instance, numberError);
      return new Response(JSON.stringify({ ok: true, skipped: 'instance not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found WhatsApp number:', whatsappNumber.id, 'for user:', whatsappNumber.user_id);

    // Handle messages.upsert event (new messages) - support multiple event name formats
    if (event === 'messages.upsert' || event === 'messagesupsert' || event === 'message.upsert') {
      console.log('=== PROCESSING MESSAGES UPSERT ===');
      
      // Evolution API sends data directly with key and message
      const messageKey = data?.key;
      const messageData = data?.message;
      const pushName = data?.pushName;

      if (!messageKey || !messageData) {
        console.log('No message key or data, skipping. Data:', JSON.stringify(data));
        return new Response(JSON.stringify({ ok: true, skipped: 'no message data' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const remoteJid = messageKey.remoteJid;
      const fromMe = messageKey.fromMe || false;
      const messageId = messageKey.id;

      // Skip group messages
      if (remoteJid?.includes('@g.us')) {
        console.log('Skipping group message');
        return new Response(JSON.stringify({ ok: true, skipped: 'group message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
      const phone = remoteJid?.replace('@s.whatsapp.net', '') || '';
      
      console.log('Processing message - Phone:', phone, 'fromMe:', fromMe, 'messageId:', messageId);

      // Determine message type and content
      let messageType = 'text';
      let content = '';
      let mediaUrl = '';
      let mediaMimetype = '';
      let mediaFilename = '';

      if (messageData.conversation) {
        content = messageData.conversation;
      } else if (messageData.extendedTextMessage?.text) {
        content = messageData.extendedTextMessage.text;
      } else if (messageData.imageMessage) {
        messageType = 'image';
        content = messageData.imageMessage.caption || '';
        mediaMimetype = messageData.imageMessage.mimetype || 'image/jpeg';
        mediaUrl = messageData.imageMessage.url || '';
      } else if (messageData.audioMessage) {
        messageType = 'audio';
        mediaMimetype = messageData.audioMessage.mimetype || 'audio/ogg';
        mediaUrl = messageData.audioMessage.url || '';
      } else if (messageData.videoMessage) {
        messageType = 'video';
        content = messageData.videoMessage.caption || '';
        mediaMimetype = messageData.videoMessage.mimetype || 'video/mp4';
        mediaUrl = messageData.videoMessage.url || '';
      } else if (messageData.documentMessage) {
        messageType = 'document';
        mediaFilename = messageData.documentMessage.fileName || 'document';
        mediaMimetype = messageData.documentMessage.mimetype || 'application/pdf';
        mediaUrl = messageData.documentMessage.url || '';
      } else if (messageData.stickerMessage) {
        messageType = 'sticker';
        mediaMimetype = messageData.stickerMessage.mimetype || 'image/webp';
      }

      console.log('Message type:', messageType, 'content:', content?.substring(0, 50));

      // Get or create conversation
      let conversationId: string;
      const { data: existingConv, error: convFetchError } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('remote_jid', remoteJid)
        .single();

      console.log('Existing conversation:', existingConv, 'Error:', convFetchError);

      if (existingConv) {
        conversationId = existingConv.id;
        console.log('Using existing conversation:', conversationId);
      } else {
        // Check if contact exists
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('user_id', whatsappNumber.user_id)
          .eq('phone', phone)
          .single();

        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: whatsappNumber.user_id,
            whatsapp_number_id: whatsappNumber.id,
            contact_id: existingContact?.id || null,
            remote_jid: remoteJid,
            phone: phone,
            contact_name: existingContact?.name || pushName || null,
          })
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }
        conversationId = newConv.id;
        console.log('Created new conversation:', conversationId);
      }

      // Check if message already exists (avoid duplicates)
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('message_id', messageId)
        .single();

      if (existingMsg) {
        console.log('Message already exists, skipping:', messageId);
        return new Response(JSON.stringify({ ok: true, skipped: 'message exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Insert message
      const { data: insertedMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: whatsappNumber.user_id,
          message_id: messageId,
          remote_jid: remoteJid,
          from_me: fromMe,
          message_type: messageType,
          content: content,
          media_url: mediaUrl || null,
          media_mimetype: mediaMimetype || null,
          media_filename: mediaFilename || null,
          status: fromMe ? 'sent' : 'received',
        })
        .select()
        .single();

      if (msgError) {
        console.error('Error inserting message:', msgError);
        throw msgError;
      }

      console.log('Message inserted successfully:', insertedMsg?.id);

      // Update conversation with last message
      const updateData: Record<string, unknown> = {
        last_message: content || `[${messageType}]`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Increment unread count only for incoming messages
      if (!fromMe) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('unread_count')
          .eq('id', conversationId)
          .single();
        updateData.unread_count = (conv?.unread_count || 0) + 1;
      }

      // Update contact name if we have pushName
      if (pushName && !fromMe) {
        updateData.contact_name = pushName;
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      console.log('Conversation updated, message processing complete');
    }

    // Handle message status updates - support multiple event name formats
    if (event === 'messages.update' || event === 'messagesupdate' || event === 'message.update' || event === 'messageupdate') {
      console.log('=== PROCESSING MESSAGE STATUS UPDATE ===');
      console.log('Raw data:', JSON.stringify(data));
      
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        console.log('Processing update item:', JSON.stringify(update));
        
        // Handle different payload structures from Evolution API v1 and v2
        const messageId = update?.key?.id || update?.id || update?.messageId;
        const statusCode = update?.update?.status ?? update?.status ?? update?.ack;
        
        console.log('Extracted messageId:', messageId, 'statusCode:', statusCode);
        
        if (messageId && statusCode !== undefined) {
          // Map status codes to our status values
          let statusText = 'sent';
          const numStatus = Number(statusCode);
          
          // Handle string status values too
          if (typeof statusCode === 'string') {
            statusText = statusCode.toLowerCase();
          } else {
            switch (numStatus) {
              case 0: statusText = 'pending'; break;
              case 1: statusText = 'sent'; break;
              case 2: statusText = 'delivered'; break;
              case 3: statusText = 'read'; break;
              case 4: statusText = 'read'; break; // played = read for audio
              case 5: statusText = 'read'; break;
              default: statusText = 'sent';
            }
          }
          
          console.log('Updating message status:', messageId, 'to:', statusText);
          
          const { error: updateErr, data: updatedRows } = await supabase
            .from('messages')
            .update({ status: statusText, updated_at: new Date().toISOString() })
            .eq('message_id', messageId)
            .select();

          if (updateErr) {
            console.error('Error updating message status:', updateErr);
          } else {
            console.log('Updated rows:', updatedRows?.length);
          }
        } else {
          console.log('Could not extract messageId or statusCode from update');
        }
      }
    }

    // Handle connection updates - support multiple event name formats
    if (event === 'connection.update' || event === 'connectionupdate') {
      console.log('=== PROCESSING CONNECTION UPDATE ===');
      const state = data?.state;
      
      if (state) {
        const isConnected = state === 'open';
        console.log('Connection state:', state, 'isConnected:', isConnected);
        
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: isConnected,
            updated_at: new Date().toISOString()
          })
          .eq('instance_name', instance);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
