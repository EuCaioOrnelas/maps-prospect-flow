import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeWhatsAppNumber(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return '';

  // Brasil (10-11 dígitos sem DDI): adiciona 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }

  // Internacional (já vem com DDI): mantém
  return digits;
}

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

    // Parse body first while auth is being checked (parallel)
    const bodyPromise = req.json();
    const authPromise = supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    const [body, authResult] = await Promise.all([bodyPromise, authPromise]);

    if (authResult.error || !authResult.data.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = authResult.data.user;
    const { conversationId, content, messageType = 'text', mediaUrl, mediaFilename, quotedMessageId } = body;

    // Parallel fetch: conversation and quoted message (if needed)
    const conversationPromise = supabase
      .from('conversations')
      .select('*, whatsapp_numbers!inner(instance_name)')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    const quotedMsgPromise = quotedMessageId 
      ? supabase
          .from('messages')
          .select('message_id')
          .eq('id', quotedMessageId)
          .single()
      : Promise.resolve({ data: null });

    const [convResult, quotedResult] = await Promise.all([conversationPromise, quotedMsgPromise]);

    if (convResult.error || !convResult.data) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conversation = convResult.data;
    
    // Build quoted message info
    let quotedMessageInfo = null;
    if (quotedResult.data?.message_id) {
      quotedMessageInfo = {
        key: {
          id: quotedResult.data.message_id,
        },
      };
    }

    const instanceName = conversation.whatsapp_numbers.instance_name;
    if (!instanceName) {
      return new Response(JSON.stringify({ error: 'WhatsApp não conectado para este número' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Destination:
    // - grupos: usar o remote_jid completo (@g.us)
    // - chats 1:1: usar número somente dígitos com DDI (ex: 5511999999999 / 447700900000)
    const isGroup = String(conversation.remote_jid || '').includes('@g.us');
    const destination = isGroup
      ? String(conversation.remote_jid)
      : normalizeWhatsAppNumber(String(conversation.phone || '').trim() || String(conversation.remote_jid || '').split('@')[0]);

    if (!destination) {
      return new Response(JSON.stringify({ error: 'Destino inválido para envio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let apiEndpoint = '';
    let messageBody: Record<string, unknown> = {};

    // Build request based on message type
    if (messageType === 'text') {
      apiEndpoint = `${evolutionApiUrl}/message/sendText/${instanceName}`;
      messageBody = {
        number: destination,
        text: content,
      };
      
      if (quotedMessageInfo) {
        messageBody.quoted = quotedMessageInfo;
      }
    } else if (messageType === 'image') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: destination,
        mediatype: 'image',
        media: mediaUrl,
        caption: content || '',
      };
    } else if (messageType === 'audio') {
      apiEndpoint = `${evolutionApiUrl}/message/sendWhatsAppAudio/${instanceName}`;
      messageBody = {
        number: destination,
        audio: mediaUrl,
      };
    } else if (messageType === 'video') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: destination,
        mediatype: 'video',
        media: mediaUrl,
        caption: content || '',
      };
    } else if (messageType === 'document') {
      apiEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      messageBody = {
        number: destination,
        mediatype: 'document',
        media: mediaUrl,
        fileName: mediaFilename || 'document',
        caption: content || '',
      };
    }

    // Send message via Evolution API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const evolutionResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify(messageBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      let errorMessage = 'Failed to send message';
      
      if (evolutionData.response?.message) {
        const msgInfo = evolutionData.response.message[0];
        if (msgInfo?.exists === false) {
          errorMessage = `Número ${msgInfo.number} não existe no WhatsApp`;
        } else if (typeof evolutionData.response.message === 'string') {
          errorMessage = evolutionData.response.message;
        }
      } else if (evolutionData.message) {
        errorMessage = evolutionData.message;
      }
      
      throw new Error(errorMessage);
    }

    // Return response immediately, save to DB in background
    const messageId = evolutionData.key?.id;
    
    // Background task: Insert message and update conversation
    EdgeRuntime.waitUntil((async () => {
      try {
        // Insert message into database
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            message_id: messageId,
            remote_jid: conversation.remote_jid,
            from_me: true,
            message_type: messageType,
            content: content,
            media_url: mediaUrl || null,
            media_filename: mediaFilename || null,
            quoted_message_id: quotedMessageId || null,
            status: 'sent',
          });

        if (msgError) {
          console.error('Error inserting message:', msgError);
        }

        // Update conversation
        await supabase
          .from('conversations')
          .update({
            last_message: content || `[${messageType}]`,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
      } catch (e) {
        console.error('Background task error:', e);
      }
    })());

    return new Response(JSON.stringify({ 
      success: true, 
      message: { message_id: messageId }
    }), {
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
