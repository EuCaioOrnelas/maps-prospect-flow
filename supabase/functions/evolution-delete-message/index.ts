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

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const { messageId, messageDbId, remoteJid, whatsappNumberId, forEveryone } = await req.json();

    console.log('[DELETE-MSG] Request:', { messageId, messageDbId, remoteJid, whatsappNumberId, forEveryone });

    // Get WhatsApp number instance
    const { data: whatsappNumber, error: numError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', whatsappNumberId)
      .eq('user_id', user.id)
      .single();

    if (numError || !whatsappNumber) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If forEveryone and Evolution API is configured, delete on WhatsApp
    if (forEveryone && messageId && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      try {
        console.log('[DELETE-MSG] Deleting on WhatsApp via Evolution API...');
        
        const response = await fetch(`${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${whatsappNumber.instance_name}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            id: messageId,
            remoteJid: remoteJid,
            fromMe: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DELETE-MSG] Evolution API error:', response.status, errorText);
          // Continue with local deletion even if Evolution API fails
        } else {
          console.log('[DELETE-MSG] Deleted on WhatsApp successfully');
        }
      } catch (error) {
        console.error('[DELETE-MSG] Evolution API call failed:', error);
        // Continue with local deletion
      }
    }

    // Delete from local database
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageDbId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[DELETE-MSG] Database delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[DELETE-MSG] Message deleted successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DELETE-MSG] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
