import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('Evolution API not configured');
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId } = await req.json();
    
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'conversationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[READ-RECEIPT] Processing read receipt for conversation: ${conversationId}`);

    // Get conversation with WhatsApp number info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        whatsapp_numbers (id, instance_name)
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      console.error('[READ-RECEIPT] Conversation not found:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instanceName = conversation.whatsapp_numbers?.instance_name;
    if (!instanceName) {
      console.error('[READ-RECEIPT] No instance name for conversation');
      return new Response(
        JSON.stringify({ error: 'No WhatsApp instance connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unread messages from the contact (not from_me) that haven't been marked as read
    const { data: unreadMessages, error: msgError } = await supabase
      .from('messages')
      .select('id, message_id, remote_jid')
      .eq('conversation_id', conversationId)
      .eq('from_me', false)
      .not('message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (msgError) {
      console.error('[READ-RECEIPT] Error fetching messages:', msgError);
      return new Response(
        JSON.stringify({ error: 'Error fetching messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      console.log('[READ-RECEIPT] No unread messages to mark');
      return new Response(
        JSON.stringify({ success: true, marked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[READ-RECEIPT] Found ${unreadMessages.length} messages to mark as read`);

    // Get the remote_jid from the first message
    const remoteJid = unreadMessages[0].remote_jid || conversation.remote_jid;

    // Send read receipt via Evolution API
    // Evolution API endpoint: POST /chat/markMessageAsRead/{instance}
    const readReceiptUrl = `${evolutionApiUrl}/chat/markMessageAsRead/${instanceName}`;
    
    // Get the last message ID to mark all messages up to that point as read
    const lastMessageId = unreadMessages[0].message_id;

    console.log(`[READ-RECEIPT] Sending read receipt to ${remoteJid} for message ${lastMessageId}`);

    const response = await fetch(readReceiptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        read_messages: unreadMessages.map(msg => ({
          remoteJid: remoteJid,
          fromMe: false,
          id: msg.message_id,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[READ-RECEIPT] Evolution API error: ${response.status} - ${errorText}`);
      
      // Don't fail the request, just log the error
      // The user still opened the conversation
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send read receipt',
          marked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('[READ-RECEIPT] Evolution API response:', JSON.stringify(result));

    // Update unread count in conversation
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        marked: unreadMessages.length,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[READ-RECEIPT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
