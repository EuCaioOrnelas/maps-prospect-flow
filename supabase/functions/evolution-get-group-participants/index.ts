import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolutionCredentialsByNumber } from "../_shared/evolution-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GroupParticipant {
  id: string;
  admin: boolean | null;
  name?: string;
  avatarUrl?: string;
  lidId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    const { instanceName, groupJid } = await req.json();

    if (!instanceName || !groupJid) {
      return new Response(JSON.stringify({ error: 'Missing instanceName or groupJid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching participants for group ${groupJid} from instance ${instanceName}`);

    // Fetch group participants from Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/group/participants/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch group participants: ${response.status}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return new Response(JSON.stringify({ participants: [], error: 'Failed to fetch participants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('Evolution API response:', JSON.stringify(result));
    
    // Parse participants from response
    let participants: GroupParticipant[] = [];
    
    if (Array.isArray(result)) {
      participants = result.map((p: any) => {
        const phoneJid = p.phoneNumber || p.phone_number || null;
        const lidId = p.id || p.lid || null;
        return {
          id: phoneJid || p.id || p.jid || p.participant,
          lidId: phoneJid ? lidId : undefined,
          admin: !!(
            p.admin === true ||
            p.admin === 'admin' ||
            p.admin === 'superadmin' ||
            p.isAdmin ||
            p.superAdmin
          ),
          name: p.name || p.pushName || null,
          avatarUrl: p.imgUrl || p.avatarUrl || p.picture || null,
        };
      });
    } else if (result.participants && Array.isArray(result.participants)) {
      participants = result.participants.map((p: any) => {
        const phoneJid = p.phoneNumber || p.phone_number || null;
        const lidId = p.id || p.lid || null;
        return {
          id: phoneJid || p.id || p.jid || p.participant,
          lidId: phoneJid ? lidId : undefined,
          admin: !!(
            p.admin === true ||
            p.admin === 'admin' ||
            p.admin === 'superadmin' ||
            p.isAdmin ||
            p.superAdmin
          ),
          name: p.name || p.pushName || null,
          avatarUrl: p.imgUrl || p.avatarUrl || p.picture || null,
        };
      });
    }

    // Try to fetch avatars for participants (limit to first 20 to avoid rate limits)
    const participantsWithAvatars = await Promise.all(
      participants.slice(0, 20).map(async (participant) => {
        try {
          const phoneDigits = participant.id.includes('@')
            ? participant.id.split('@')[0]
            : participant.id;
          const avatarResponse = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({ number: phoneDigits }),
          });

          if (avatarResponse.ok) {
            const avatarResult = await avatarResponse.json();
            participant.avatarUrl = avatarResult.profilePictureUrl || avatarResult.picture || avatarResult.url || null;
          }
        } catch (e) {
          console.log(`Failed to fetch avatar for ${participant.id}`);
        }
        return participant;
      })
    );

    // Add remaining participants without avatars
    const allParticipants = [
      ...participantsWithAvatars,
      ...participants.slice(20),
    ];

    return new Response(JSON.stringify({ participants: allParticipants }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching group participants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
