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
    const { message_id, phone_number_id, to, type, text, media_url, caption, filename, waba_connection_id } = body;

    if (!message_id || !phone_number_id || !to || !type || !waba_connection_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    // Get access token from connection
    const { data: connection } = await supabase
      .from('user_waba_connections')
      .select('access_token')
      .eq('id', waba_connection_id)
      .eq('user_id', userId)
      .single();

    if (!connection) {
      await supabase.from('chat_messages').update({ status: 'failed' }).eq('id', message_id);
      return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: corsHeaders });
    }

    // Build Meta API request
    let messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
    };

    if (type === "text") {
      messagePayload.type = "text";
      messagePayload.text = { body: text };
    } else if (type === "image") {
      messagePayload.type = "image";
      messagePayload.image = { link: media_url, caption: caption || undefined };
    } else if (type === "video") {
      messagePayload.type = "video";
      messagePayload.video = { link: media_url, caption: caption || undefined };
    } else if (type === "document") {
      messagePayload.type = "document";
      messagePayload.document = { link: media_url, filename: filename || "document", caption: caption || undefined };
    } else if (type === "audio") {
      messagePayload.type = "audio";
      messagePayload.audio = { link: media_url };
    }

    console.log(`[send-chat-message] Sending ${type} to ${to} via ${phone_number_id}`);

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

    const metaResult = await metaResponse.json();
    console.log(`[send-chat-message] Meta response:`, JSON.stringify(metaResult).substring(0, 500));

    if (metaResponse.ok && metaResult.messages?.[0]?.id) {
      const wabaMessageId = metaResult.messages[0].id;
      await supabase.from('chat_messages').update({
        status: 'sent',
        waba_message_id: wabaMessageId,
        status_updated_at: new Date().toISOString(),
      }).eq('id', message_id);

      return new Response(JSON.stringify({ success: true, waba_message_id: wabaMessageId }), {
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
