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
      
      // Don't immediately mark as disconnected - could be temporary API issue
      // Only update if we're confident the instance doesn't exist
      if (errorText.includes('not found') || errorText.includes('not exists')) {
        await supabase
          .from('whatsapp_numbers')
          .update({ 
            is_connected: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', numberId)
          .eq('user_id', user.id);

        return new Response(JSON.stringify({
          success: true,
          connected: false,
          state: 'disconnected',
          phoneNumber: null,
          error: 'Instance not found'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
    
    // Se não está conectado, atualizar o banco imediatamente
    if (!isConnected) {
      console.log(`Instance ${instanceName} is not connected (state: ${state}). Updating database.`);
      
      await supabase
        .from('whatsapp_numbers')
        .update({ 
          is_connected: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', numberId)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        connected: false,
        state: state || 'unknown',
        phoneNumber: null,
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
