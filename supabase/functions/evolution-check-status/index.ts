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
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'No authorization header',
        connected: false,
        requiresReauth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Invalid or expired user token:', userError?.message);
      return new Response(JSON.stringify({ 
        error: 'Session expired. Please refresh the page.',
        connected: false,
        requiresReauth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { instanceName, numberId } = await req.json();

    console.log(`Checking status for instance: ${instanceName}`);

    // Check connection status with retry logic
    let statusResponse: Response | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        if (statusResponse.ok) break;
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Retry ${retryCount}/${maxRetries} for status check...`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      } catch (e) {
        console.error(`Fetch error attempt ${retryCount}:`, e);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    if (!statusResponse || !statusResponse.ok) {
      const errorText = statusResponse ? await statusResponse.text() : 'No response';
      console.error('Evolution API error after retries:', errorText);
      
      // NEVER mark as disconnected from backend - this causes unwanted UI flicker
      // Just report the state and let the webhook handle real disconnection events
      console.log(`⚠️ Instance ${instanceName} might not exist, but NOT updating database`);

      return new Response(JSON.stringify({
        success: false,
        connected: null, // Return null to indicate uncertain state
        state: 'unknown',
        phoneNumber: null,
        error: 'Could not verify instance - will retry later'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

      // For other errors, return uncertain state without updating DB
      return new Response(JSON.stringify({
        success: false,
        connected: null, // Uncertain
        state: 'unknown',
        phoneNumber: null,
        error: 'Could not determine connection state - API temporarily unavailable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusData = await statusResponse.json();
    console.log('Status response:', JSON.stringify(statusData));

    const state = statusData.state || statusData.instance?.state;
    const isConnected = state === 'open';
    
    // NEVER mark as disconnected automatically from this endpoint
    // Only the webhook should handle real disconnection events
    if (!isConnected) {
      console.log(`Instance ${instanceName} is not connected (state: ${state}). Returning status but NOT updating database.`);

      return new Response(JSON.stringify({
        success: true,
        connected: false,
        state: state || 'unknown',
        phoneNumber: null,
        // Important: we do NOT update the database here
        // The webhook will handle real disconnection events
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se conectado, obter o número de telefone
    let phoneNumber = null;
    try {
      const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });
      
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        console.log('Instance info:', JSON.stringify(infoData));
        
        if (infoData && infoData.length > 0) {
          phoneNumber = infoData[0].owner || infoData[0].instance?.owner;
        }
      }
    } catch (e) {
      console.error('Error fetching instance info:', e);
    }

    // Update database with connected status
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({ 
        is_connected: true,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', numberId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating number status:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      connected: true,
      state: state,
      phoneNumber: phoneNumber,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-check-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      connected: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
