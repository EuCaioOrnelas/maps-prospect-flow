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
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    const { event, data, instance } = payload;

    // Find the WhatsApp number by instance name
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id, user_id')
      .eq('instance_name', instance)
      .single();

    if (numberError || !whatsappNumber) {
      console.log('WhatsApp number not found for instance:', instance);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different event types
    if (event === 'messages.upsert') {
      const message = data?.message;
      if (!message) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const remoteJid = message.key?.remoteJid;
      const fromMe = message.key?.fromMe || false;
      const messageId = message.key?.id;
      
      // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
      const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
      
      // Determine message type and content
      let messageType = 'text';
      let content = '';
      let mediaUrl = '';
      let mediaMimetype = '';
      let mediaFilename = '';

      if (message.message?.conversation) {
        content = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        content = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage) {
        messageType = 'image';
        content = message.message.imageMessage.caption || '';
        mediaMimetype = message.message.imageMessage.mimetype || 'image/jpeg';
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        mediaMimetype = message.message.audioMessage.mimetype || 'audio/ogg';
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        content = message.message.videoMessage.caption || '';
        mediaMimetype = message.message.videoMessage.mimetype || 'video/mp4';
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaFilename = message.message.documentMessage.fileName || 'document';
        mediaMimetype = message.message.documentMessage.mimetype || 'application/pdf';
      }

      // Get or create conversation
      let conversationId: string;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .eq('whatsapp_number_id', whatsappNumber.id)
        .eq('remote_jid', remoteJid)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
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
            contact_name: existingContact?.name || message.pushName || null,
          })
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }
        conversationId = newConv.id;
      }

      // Insert message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: whatsappNumber.user_id,
          message_id: messageId,
          remote_jid: remoteJid,
          from_me: fromMe,
          message_type: messageType,
          content: content,
          media_url: mediaUrl,
          media_mimetype: mediaMimetype,
          media_filename: mediaFilename,
          status: fromMe ? 'sent' : 'received',
        });

      if (msgError) {
        console.error('Error inserting message:', msgError);
        throw msgError;
      }

      // Update conversation with last message
      const updateData: Record<string, unknown> = {
        last_message: content || `[${messageType}]`,
        last_message_at: new Date().toISOString(),
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
      if (message.pushName && !fromMe) {
        updateData.contact_name = message.pushName;
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      console.log('Message processed successfully');
    }

    // Handle message status updates
    if (event === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        const messageId = update.key?.id;
        const status = update.update?.status;
        
        if (messageId && status !== undefined) {
          let statusText = 'sent';
          if (status === 2) statusText = 'sent';
          if (status === 3) statusText = 'delivered';
          if (status === 4) statusText = 'read';
          
          await supabase
            .from('messages')
            .update({ status: statusText })
            .eq('message_id', messageId);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
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
