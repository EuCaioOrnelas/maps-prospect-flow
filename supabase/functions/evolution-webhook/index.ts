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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload));

    const event = payload.event;
    const instance = payload.instance;
    const data = payload.data;

    // Handle different webhook events
    switch (event) {
      case 'messages.upsert':
        // Message received or sent status
        console.log('Message upsert:', data);
        break;

      case 'messages.update':
        // Message status update (delivered, read, etc)
        console.log('Message update:', data);
        
        if (data?.key?.id && data?.update?.status) {
          const messageId = data.key.id;
          const status = data.update.status;
          
          // Log the delivery status
          console.log(`Message ${messageId} status: ${status}`);
          
          // You can store message status in a separate table if needed
          // Status values: PENDING, SERVER_ACK, DELIVERY_ACK, READ, PLAYED
        }
        break;

      case 'connection.update':
        // Connection status changed
        console.log('Connection update:', data);
        
        if (data?.state) {
          const state = data.state;
          const instanceName = instance;
          
          console.log(`Instance ${instanceName} connection state: ${state}`);
          
          // Update the whatsapp_numbers table based on connection state
          if (state === 'close' || state === 'connecting') {
            // Find and update the number by matching instance name pattern
            // Instance names are like: wiizeprospect_userid_timestamp_random
            const { error } = await supabase
              .from('whatsapp_numbers')
              .update({ 
                is_connected: state === 'open',
                updated_at: new Date().toISOString()
              })
              .like('name', `%${instanceName}%`);
            
            if (error) {
              console.error('Error updating connection status:', error);
            }
          }
        }
        break;

      case 'qrcode.updated':
        // QR Code was updated
        console.log('QR Code updated for instance:', instance);
        break;

      case 'send.message':
        // Message was sent
        console.log('Message sent:', data);
        break;

      default:
        console.log('Unknown event:', event);
    }

    return new Response(JSON.stringify({ 
      received: true,
      event: event 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
