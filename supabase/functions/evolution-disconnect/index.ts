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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

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

    console.log(`Disconnecting instance: ${instanceName}, deleteInstance: ${deleteInstance}`);

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

    // Only delete the Evolution instance if explicitly requested (e.g. when removing the number entirely)
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

      // Clear instance_name since instance was deleted
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
      // Keep instance_name so we can reuse the same instance on reconnect
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
