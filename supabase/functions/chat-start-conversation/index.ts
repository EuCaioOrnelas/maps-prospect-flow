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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
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

    const { phone, whatsappNumberId, contactName, initialMessage } = await req.json();

    if (!phone || !whatsappNumberId) {
      return new Response(JSON.stringify({ error: 'Phone and whatsappNumberId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the WhatsApp number belongs to the user and get instance_name
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('id, instance_name')
      .eq('id', whatsappNumberId)
      .eq('user_id', user.id)
      .single();

    if (numberError || !whatsappNumber) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    // Normalize phone for matching (handle Brazilian 9th digit issue)
    const normalizedPhoneForMatch = cleanPhone.slice(-11);
    const phoneWithout9 = cleanPhone.length === 13 && cleanPhone[4] === '9' 
      ? cleanPhone.slice(0, 4) + cleanPhone.slice(5) 
      : cleanPhone;
    const phoneWith9 = cleanPhone.length === 12 && cleanPhone[2] !== '9'
      ? cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4)
      : cleanPhone;

    // Check if conversation already exists - try multiple matching strategies
    let existingConv = null;
    
    // Strategy 1: Match by exact remote_jid
    const { data: exactMatch } = await supabase
      .from('conversations')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('remote_jid', remoteJid)
      .single();
    
    if (exactMatch) {
      existingConv = exactMatch;
    }
    
    // Strategy 2: Match by normalized phone number (last 10-11 digits)
    if (!existingConv) {
      const { data: allConvs } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', whatsappNumberId);
      
      if (allConvs && allConvs.length > 0) {
        const matchingConv = allConvs.find(c => {
          const convPhone = c.phone.replace(/\D/g, '');
          const convNormalized = convPhone.slice(-11);
          
          // Check various matching patterns for Brazilian 9th digit issue
          return convNormalized === normalizedPhoneForMatch ||
                 convPhone === phoneWithout9 ||
                 convPhone === phoneWith9 ||
                 convNormalized.slice(-10) === normalizedPhoneForMatch.slice(-10);
        });
        
        if (matchingConv) {
          existingConv = matchingConv;
          console.log('Found existing conversation by phone normalization:', matchingConv.phone);
          
          // Update the remote_jid to the new one for future matches
          await supabase
            .from('conversations')
            .update({ remote_jid: remoteJid, phone: cleanPhone, updated_at: new Date().toISOString() })
            .eq('id', matchingConv.id);
        }
      }
    }

    if (existingConv) {
      // If conversation exists and there's an initial message, send it
      if (initialMessage && whatsappNumber.instance_name) {
        await sendInitialMessage(
          evolutionApiUrl,
          evolutionApiKey,
          whatsappNumber.instance_name,
          cleanPhone,
          initialMessage,
          supabase,
          existingConv.id,
          user.id,
          remoteJid,
          whatsappNumberId
        );
      }
      
      return new Response(JSON.stringify({ conversation: existingConv }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if contact exists
    let existingContact = null;
    try {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('phone', cleanPhone)
        .single();
      existingContact = contactData;
    } catch (e) {
      // Contact not found, which is fine
      console.log('No existing contact found for phone:', cleanPhone);
    }

    // Create new conversation - explicitly handle null values
    const contactId = existingContact?.id && existingContact.id !== 'null' ? existingContact.id : null;
    const contactNameValue = existingContact?.name || contactName || null;

    console.log('Creating conversation with:', {
      user_id: user.id,
      whatsapp_number_id: whatsappNumberId,
      contact_id: contactId,
      remote_jid: remoteJid,
      phone: cleanPhone,
      contact_name: contactNameValue,
    });

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        whatsapp_number_id: whatsappNumberId,
        contact_id: contactId,
        remote_jid: remoteJid,
        phone: cleanPhone,
        contact_name: contactNameValue,
        last_message: initialMessage || null,
        last_message_at: initialMessage ? new Date().toISOString() : null,
      })
      .select('*')
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw convError;
    }

    // Send initial message if provided
    if (initialMessage && whatsappNumber.instance_name) {
      await sendInitialMessage(
        evolutionApiUrl,
        evolutionApiKey,
        whatsappNumber.instance_name,
        cleanPhone,
        initialMessage,
        supabase,
        newConv.id,
        user.id,
        remoteJid,
        whatsappNumberId
      );
    }

    return new Response(JSON.stringify({ conversation: newConv }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Start conversation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendInitialMessage(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phoneNumber: string,
  message: string,
  supabase: any,
  conversationId: string,
  userId: string,
  remoteJid: string,
  whatsappNumberId: string
) {
  try {
    console.log('Sending initial message to:', phoneNumber);
    
    // Phone number should already include country code from frontend
    const formattedPhone = phoneNumber;
    
    // Send message via Evolution API
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const result = await response.json();
    console.log('Evolution API response:', result);

    if (!response.ok) {
      console.error('Failed to send initial message:', result);
      return;
    }

    // Save message to database
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        message_id: result.key?.id || null,
        remote_jid: remoteJid,
        from_me: true,
        message_type: 'text',
        content: message,
        status: 'sent',
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
    }

    // Update daily sent count
    await supabase
      .from('whatsapp_numbers')
      .update({
        daily_sent_count: supabase.rpc('increment_daily_count', { row_id: whatsappNumberId }),
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', whatsappNumberId);

    console.log('Initial message sent successfully');
  } catch (error) {
    console.error('Error sending initial message:', error);
  }
}
