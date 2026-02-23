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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { instanceName, numberId, deleteInstance = false } = await req.json();

    // Get the correct Evolution API based on the number's api_tier
    const evoCredentials = await getEvolutionCredentialsByNumber(supabase, numberId);
    const EVOLUTION_API_URL = evoCredentials.url;
    const EVOLUTION_API_KEY = evoCredentials.apiKey;

    console.log(`Disconnecting instance: ${instanceName} on ${evoCredentials.tier} API, deleteInstance: ${deleteInstance}`);

    // Always logout from WhatsApp session
    try {
      const logoutResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });
      console.log('Logout response status:', logoutResponse.status);
    } catch (e) {
      console.error('Error during logout:', e);
    }

    // Only delete the Evolution instance if explicitly requested
    if (deleteInstance) {
      try {
        const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });
        console.log('Delete response status:', deleteResponse.status);
      } catch (e) {
        console.error('Error deleting instance:', e);
      }

      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          phone_number: null,
          instance_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating number status:', updateError);
      }
    } else {
      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          phone_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating number status:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: deleteInstance ? 'Instance deleted successfully' : 'Instance disconnected (preserved for reconnection)',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-disconnect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
