import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get auth token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { messageIds, conversationId, limit = 50 } = body;

    console.log('[REDOWNLOAD] User:', user.id, 'ConvId:', conversationId, 'MessageIds:', messageIds?.length || 'all');

    // Build query for messages with expired/missing media
    // Note: We need to query messages that belong to the user through conversations
    const { data: userConversations, error: convError } = await supabase
      .from('conversations')
      .select('id, whatsapp_number_id')
      .eq('user_id', user.id);

    if (convError || !userConversations || userConversations.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0, 
        message: 'No conversations found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conversationIds = userConversations.map(c => c.id);

    let query = supabase
      .from('messages')
      .select('id, message_id, message_type, media_url, conversation_id')
      .in('conversation_id', conversationIds)
      .in('message_type', ['image', 'video', 'audio', 'document'])
      .order('created_at', { ascending: false });

    // Filter by specific message IDs or conversation
    if (messageIds && messageIds.length > 0) {
      query = query.in('id', messageIds);
    } else if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    // Filter messages with expired WhatsApp URLs or null URLs
    query = query.or('media_url.is.null,media_url.ilike.%mmg.whatsapp.net%,media_url.ilike.%.enc%');
    query = query.limit(limit);

    const { data: messages, error: queryError } = await query;

    if (queryError) {
      console.error('[REDOWNLOAD] Query error:', queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[REDOWNLOAD] Found', messages?.length || 0, 'messages to redownload');

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0, 
        message: 'No messages with expired media found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get instance names for each conversation
    const whatsappNumberIds = [...new Set(userConversations.map(c => c.whatsapp_number_id))];
    const { data: whatsappNumbers } = await supabase
      .from('whatsapp_numbers')
      .select('id, instance_name')
      .in('id', whatsappNumberIds);

    const instanceMap = new Map(whatsappNumbers?.map(w => [w.id, w.instance_name]) || []);
    const convToWaMap = new Map(userConversations.map(c => [c.id, c.whatsapp_number_id]));

    let successCount = 0;
    let failCount = 0;
    const results: { messageId: string; success: boolean; error?: string }[] = [];

    for (const msg of messages) {
      const waNumberId = convToWaMap.get(msg.conversation_id);
      const instanceName = waNumberId ? instanceMap.get(waNumberId) : null;

      if (!instanceName || !msg.message_id) {
        results.push({ messageId: msg.id, success: false, error: 'Missing instance or message_id' });
        failCount++;
        continue;
      }

      try {
        console.log(`[REDOWNLOAD] Processing message ${msg.message_id} from ${instanceName}`);

        // Download media from Evolution API
        const response = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            message: { key: { id: msg.message_id } },
            convertToMp4: msg.message_type === 'video',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[REDOWNLOAD] Failed for ${msg.message_id}:`, response.status, errorText);
          results.push({ messageId: msg.id, success: false, error: `API error: ${response.status}` });
          failCount++;
          continue;
        }

        const result = await response.json();
        const base64Data = result.base64 || result.data;
        const mimetype = result.mimetype || result.mediaType || `${msg.message_type}/unknown`;

        if (!base64Data) {
          console.log(`[REDOWNLOAD] No base64 data for ${msg.message_id}`);
          results.push({ messageId: msg.id, success: false, error: 'No media data returned' });
          failCount++;
          continue;
        }

        // Upload to Supabase Storage
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
        const filename = `${user.id}/${Date.now()}_${msg.message_id.substring(0, 8)}.${ext}`;

        const fileData = base64Decode(base64Data);

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filename, fileData, {
            contentType: mimetype.split(';')[0],
            upsert: false,
          });

        if (uploadError) {
          console.error(`[REDOWNLOAD] Upload error for ${msg.message_id}:`, uploadError);
          results.push({ messageId: msg.id, success: false, error: uploadError.message });
          failCount++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filename);

        // Update message with new URL
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            media_url: urlData.publicUrl,
            media_mimetype: mimetype,
            updated_at: new Date().toISOString(),
          })
          .eq('id', msg.id);

        if (updateError) {
          console.error(`[REDOWNLOAD] Update error for ${msg.message_id}:`, updateError);
          results.push({ messageId: msg.id, success: false, error: updateError.message });
          failCount++;
          continue;
        }

        console.log(`[REDOWNLOAD] Success: ${msg.message_id} -> ${urlData.publicUrl}`);
        results.push({ messageId: msg.id, success: true });
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[REDOWNLOAD] Error for ${msg.message_id}:`, error);
        results.push({ messageId: msg.id, success: false, error: String(error) });
        failCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: messages.length,
      successCount,
      failCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[REDOWNLOAD] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
