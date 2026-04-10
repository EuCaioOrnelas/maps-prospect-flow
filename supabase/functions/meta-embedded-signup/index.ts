import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_APP_ID = '988774494328539';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;

  try {
    const body = await req.json();
    const { code, user_id, redirect_uri } = body;

    if (!code || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing code or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[meta-embedded-signup] Exchanging code for token, user:', user_id);

    // Step 1: Exchange the short-lived code for a long-lived token
    // redirect_uri must match what was used in the OAuth dialog (JS SDK sends the current page origin)
    const redirectParam = redirect_uri ? `&redirect_uri=${encodeURIComponent(redirect_uri)}` : '';
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}${redirectParam}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[meta-embedded-signup] Token exchange error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: tokenData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    console.log('[meta-embedded-signup] ✅ Token obtained');

    // Step 2: Get the user's shared WABA info using the debug_token endpoint
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    console.log('[meta-embedded-signup] Debug token data:', JSON.stringify(debugData).substring(0, 500));

    // Step 3: Get WABA details from the shared businesses
    // The granular scopes contain the WABA ID
    let wabaId = null;
    let phoneNumberId = null;
    let businessName = null;
    let displayPhone = null;

    const granularScopes = debugData?.data?.granular_scopes || [];
    for (const scope of granularScopes) {
      if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
        wabaId = scope.target_ids[0];
        break;
      }
    }

    if (wabaId) {
      // Get WABA details
      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}?access_token=${accessToken}`
      );
      const wabaData = await wabaRes.json();
      businessName = wabaData.name || null;
      console.log('[meta-embedded-signup] WABA info:', JSON.stringify(wabaData).substring(0, 300));

      // Get phone numbers associated with this WABA
      const phonesRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`
      );
      const phonesData = await phonesRes.json();

      if (phonesData.data?.length > 0) {
        phoneNumberId = phonesData.data[0].id;
        displayPhone = phonesData.data[0].display_phone_number;
        console.log('[meta-embedded-signup] Phone:', displayPhone, 'ID:', phoneNumberId);
      }
    }

    // Step 4: Save connection to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: connection, error: dbError } = await supabase
      .from('user_waba_connections')
      .upsert({
        user_id,
        waba_id: wabaId || 'pending',
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhone,
        business_name: businessName,
        access_token: accessToken,
        status: 'active',
        raw_signup_data: {
          debug_token: debugData,
          token_data: { ...tokenData, access_token: '***REDACTED***' },
        },
      }, { onConflict: 'user_id,waba_id' })
      .select()
      .single();

    if (dbError) {
      console.error('[meta-embedded-signup] DB error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Subscribe to webhooks for this WABA
    if (wabaId) {
      try {
        const subscribeRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken }),
          }
        );
        const subscribeData = await subscribeRes.json();
        console.log('[meta-embedded-signup] Webhook subscription:', JSON.stringify(subscribeData));
      } catch (e) {
        console.error('[meta-embedded-signup] Webhook subscription error:', e);
      }
    }

    console.log('[meta-embedded-signup] ✅ Connection saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhone,
          business_name: businessName,
          status: 'active',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[meta-embedded-signup] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
