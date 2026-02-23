import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}
async function getEvolutionCredentialsByNumber(supabase: any, numberId: string): Promise<EvolutionCredentials> {
  const { data } = await supabase.from('whatsapp_numbers').select('api_tier').eq('id', numberId).single();
  return getEvolutionCredentials(data?.api_tier || 'free');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messageId, newContent } = await req.json();

    if (!messageId || !newContent) {
      return new Response(JSON.stringify({ error: 'Missing messageId or newContent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[EDIT] User ${user.id} editing message ${messageId}`);

    // Get the message from database
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        conversations (
          id,
          remote_jid,
          whatsapp_number_id,
          whatsapp_numbers (
            id,
            instance_name,
            is_connected
          )
        )
      `)
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single();

    if (msgError || !message) {
      console.error('[EDIT] Message not found:', msgError);
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate message can be edited
    if (!message.from_me) {
      return new Response(JSON.stringify({ error: 'Cannot edit messages from others' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message.message_id) {
      return new Response(JSON.stringify({ error: 'Message has no WhatsApp ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check 15 minute limit
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const fifteenMinutesMs = 15 * 60 * 1000;
    if (messageAge > fifteenMinutesMs) {
      return new Response(JSON.stringify({ error: 'Messages can only be edited within 15 minutes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const conversation = message.conversations;
    const whatsappNumber = conversation?.whatsapp_numbers;

    if (!whatsappNumber?.instance_name || !whatsappNumber.is_connected) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instanceName = whatsappNumber.instance_name;
    const remoteJid = conversation.remote_jid;

    // Get Evolution API credentials
    const evoCredentials = await getEvolutionCredentialsByNumber(supabase, whatsappNumber.id);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`[EDIT] Editing message ${message.message_id} on instance ${instanceName} (${evoCredentials.tier} API)`);

    // Call Evolution API to edit the message (API v2 uses POST)
    const evolutionResponse = await fetch(
      `${EVOLUTION_API_URL}/chat/updateMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: remoteJid.split('@')[0],
          text: newContent,
          key: {
            remoteJid: remoteJid,
            fromMe: true,
            id: message.message_id,
          },
        }),
      }
    );

    const evolutionData = await evolutionResponse.json();
    console.log('[EDIT] Evolution API response:', JSON.stringify(evolutionData));

    if (!evolutionResponse.ok) {
      console.error('[EDIT] Evolution API error:', evolutionData);
      
      // Still update locally even if WhatsApp edit fails (best effort)
      await supabase
        .from('messages')
        .update({ 
          content: newContent, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', messageId);

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to edit on WhatsApp, but saved locally',
        details: evolutionData,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update message in database
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        content: newContent, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('[EDIT] Error updating database:', updateError);
    }

    // Update conversation last_message if this is the most recent message
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMsg?.id === messageId) {
      await supabase
        .from('conversations')
        .update({ 
          last_message: newContent.substring(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    }

    console.log('[EDIT] Message edited successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Message edited on WhatsApp'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EDIT] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
