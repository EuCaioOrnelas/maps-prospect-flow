import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache duration in hours (avatars rarely change)
const CACHE_DURATION_HOURS = 24 * 7; // 7 days

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, instanceName, phone } = await req.json();

    if (!instanceName || !phone) {
      return new Response(JSON.stringify({ error: 'Missing instanceName or phone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize phone for cache lookup
    const normalizedPhone = phone.replace(/\D/g, '');
    
    console.log(`Fetching avatar for phone ${normalizedPhone} from instance ${instanceName}`);

    // Step 1: Check database cache first
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);

    const { data: cachedAvatar } = await supabase
      .from('group_member_avatars')
      .select('avatar_url, updated_at')
      .eq('user_id', user.id)
      .eq('phone', normalizedPhone)
      .single();

    // Return cached avatar if it exists and is still fresh
    if (cachedAvatar?.avatar_url) {
      const cacheDate = new Date(cachedAvatar.updated_at);
      if (cacheDate > cacheExpiry) {
        console.log(`Returning cached avatar for ${normalizedPhone}`);
        return new Response(JSON.stringify({ avatarUrl: cachedAvatar.avatar_url, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 2: Fetch from Evolution API if not cached or cache expired
    console.log(`Cache miss for ${normalizedPhone}, fetching from Evolution API`);
    
    const response = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: phone }),
    });

    if (!response.ok) {
      console.log(`Failed to fetch profile picture: ${response.status}`);
      return new Response(JSON.stringify({ avatarUrl: cachedAvatar?.avatar_url || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('Evolution API response:', JSON.stringify(result));
    
    const avatarUrl = result.profilePictureUrl || result.picture || result.url || null;

    // Step 3: Cache the avatar in database
    if (avatarUrl) {
      // Upsert the cache entry
      const { error: upsertError } = await supabase
        .from('group_member_avatars')
        .upsert(
          {
            user_id: user.id,
            phone: normalizedPhone,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,phone',
          }
        );

      if (upsertError) {
        console.error('Error caching avatar:', upsertError);
      } else {
        console.log(`Cached avatar for ${normalizedPhone}`);
      }
    }

    // Also update conversation's contact if applicable
    if (avatarUrl && conversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('id', conversationId)
        .single();

      if (conversation?.contact_id) {
        await supabase
          .from('contacts')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', conversation.contact_id);
      }
    }

    return new Response(JSON.stringify({ avatarUrl, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching avatar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
