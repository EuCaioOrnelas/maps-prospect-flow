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
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, content, messageType = 'text', mediaUrl, mediaFilename, quotedMessageId } = await req.json();

    // Get conversation and whatsapp number
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, whatsapp_numbers!inner(instance_name)')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get quoted message if provided
    let quotedMessageInfo = null;
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase
        .from('messages')
        .select('message_id')
        .eq('id', quotedMessageId)
        .single();
      
      if (quotedMsg?.message_id) {
        quotedMessageInfo = {
          key: {
            id: quotedMsg.message_id,
          },
        };
      }
    }

    const instanceName = conversation.whatsapp_numbers.instance_name;
    let apiEndpoint = '';
    let messageBody: Record<string, unknown> = {};

    // Build request based on message type
    if (messageType === 'text') {
      apiEndpoint = `${evolutionApiUrl}/message/sendText/${instanceName}`;
      messageBody = {
        number: conversation.phone,
        text: content,
      };
      
      // Add quoted message if provided
      if (quotedMessageInfo) {
        messageBody.quoted = quotedMessageInfo;
      }
    } else if (messageType === 'image') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: conversation.phone,
        mediatype: 'image',
        media: mediaUrl,
        caption: content || '',
      };
    } else if (messageType === 'audio') {
      apiEndpoint = `${evolutionApiUrl}/message/sendWhatsAppAudio/${instanceName}`;
      messageBody = {
        number: conversation.phone,
        audio: mediaUrl,
      };
    } else if (messageType === 'video') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: conversation.phone,
        mediatype: 'video',
        media: mediaUrl,
        caption: content || '',
      };
    } else if (messageType === 'document') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: conversation.phone,
        mediatype: 'document',
        media: mediaUrl,
        fileName: mediaFilename || 'document',
      };
    }

    console.log('Sending message to Evolution API:', apiEndpoint, JSON.stringify(messageBody));

    // Send message via Evolution API
    const evolutionResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify(messageBody),
    });

    const evolutionData = await evolutionResponse.json();
    console.log('Evolution API response:', JSON.stringify(evolutionData));

    if (!evolutionResponse.ok) {
      throw new Error(evolutionData.message || 'Failed to send message');
    }

    // Insert message into database
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        message_id: evolutionData.key?.id,
        remote_jid: conversation.remote_jid,
        from_me: true,
        message_type: messageType,
        content: content,
        media_url: mediaUrl || null,
        media_filename: mediaFilename || null,
        quoted_message_id: quotedMessageId || null,
        status: 'sent',
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error inserting message:', msgError);
      throw msgError;
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: content || `[${messageType}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Send message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
