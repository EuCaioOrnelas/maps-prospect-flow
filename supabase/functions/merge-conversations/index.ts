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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get auth token
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

  try {
    const body = await req.json().catch(() => ({}));
    const { whatsappNumberId, dryRun = false } = body;

    console.log('[MERGE] User:', user.id, 'WhatsAppNumber:', whatsappNumberId || 'all', 'DryRun:', dryRun);

    // Get all conversations for the user
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (whatsappNumberId) {
      query = query.eq('whatsapp_number_id', whatsappNumberId);
    }

    const { data: conversations, error: convError } = await query;

    if (convError) {
      return new Response(JSON.stringify({ error: convError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ success: true, merged: 0, message: 'No conversations found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MERGE] Found', conversations.length, 'conversations');

    // Group conversations by normalized phone (last 10 digits)
    const phoneGroups = new Map<string, typeof conversations>();

    for (const conv of conversations) {
      const normalizedPhone = conv.phone.replace(/\D/g, '');
      const phoneKey = `${conv.whatsapp_number_id}_${normalizedPhone.slice(-10)}`;

      if (!phoneGroups.has(phoneKey)) {
        phoneGroups.set(phoneKey, []);
      }
      phoneGroups.get(phoneKey)!.push(conv);
    }

    let mergedCount = 0;
    let messagesMoved = 0;
    const mergeDetails: { kept: string; merged: string[]; phone: string }[] = [];

    for (const [phoneKey, group] of phoneGroups) {
      if (group.length <= 1) continue;

      console.log(`[MERGE] Found ${group.length} conversations for phone pattern ${phoneKey}`);

      // Sort by preference: prefer @s.whatsapp.net over @lid, then by most recent activity
      group.sort((a, b) => {
        const aIsLid = a.remote_jid.includes('@lid');
        const bIsLid = b.remote_jid.includes('@lid');
        if (aIsLid !== bIsLid) return aIsLid ? 1 : -1; // @s.whatsapp.net first
        
        // Then by most messages/activity
        const aTime = new Date(a.last_message_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.created_at).getTime();
        return bTime - aTime;
      });

      // Keep the first one (primary), merge others into it
      const primary = group[0];
      const duplicates = group.slice(1);

      console.log(`[MERGE] Primary: ${primary.id} (${primary.remote_jid})`);
      console.log(`[MERGE] Duplicates to merge:`, duplicates.map(d => `${d.id} (${d.remote_jid})`));

      if (!dryRun) {
        for (const dup of duplicates) {
          // Move all messages from duplicate to primary
          const { data: movedMsgs, error: moveError } = await supabase
            .from('messages')
            .update({ 
              conversation_id: primary.id,
              updated_at: new Date().toISOString()
            })
            .eq('conversation_id', dup.id)
            .select('id');

          if (moveError) {
            console.error('[MERGE] Error moving messages:', moveError);
            continue;
          }

          messagesMoved += movedMsgs?.length || 0;
          console.log(`[MERGE] Moved ${movedMsgs?.length || 0} messages from ${dup.id} to ${primary.id}`);

          // Delete the duplicate conversation
          const { error: deleteError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', dup.id);

          if (deleteError) {
            console.error('[MERGE] Error deleting duplicate:', deleteError);
          } else {
            mergedCount++;
          }
        }

        // Update primary conversation stats
        const { data: msgCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', primary.id);

        const { data: latestMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', primary.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestMsg) {
          await supabase
            .from('conversations')
            .update({
              last_message: latestMsg.content?.substring(0, 100) || '',
              last_message_at: latestMsg.created_at,
              updated_at: new Date().toISOString(),
            })
            .eq('id', primary.id);
        }
      }

      mergeDetails.push({
        kept: `${primary.id} (${primary.remote_jid})`,
        merged: duplicates.map(d => `${d.id} (${d.remote_jid})`),
        phone: primary.phone,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      totalConversations: conversations.length,
      duplicateGroups: mergeDetails.length,
      mergedCount,
      messagesMoved,
      details: mergeDetails,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[MERGE] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
