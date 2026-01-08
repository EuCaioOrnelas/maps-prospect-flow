import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const { instanceName, numberId, lastSyncAt } = await req.json();

    console.log(`Syncing messages for instance: ${instanceName}, since: ${lastSyncAt}`);

    // Get the whatsapp_number to verify ownership
    const { data: whatsappNumber, error: numberError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', numberId)
      .eq('user_id', user.id)
      .single();

    if (numberError || !whatsappNumber) {
      throw new Error('WhatsApp number not found');
    }

    // Fetch recent chats from Evolution API
    let chats: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const chatsResponse = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
        console.log('Chats API response type:', typeof chatsData);
        // Handle different response formats - ensure we always get an array
        if (Array.isArray(chatsData)) {
          chats = chatsData;
        } else if (chatsData && typeof chatsData === 'object') {
          if (Array.isArray(chatsData.chats)) {
            chats = chatsData.chats;
          } else if (Array.isArray(chatsData.data)) {
            chats = chatsData.data;
          } else {
            console.log('Unexpected chats format, using empty array');
            chats = [];
          }
        } else {
          chats = [];
        }
        console.log(`Found ${chats.length} chats`);
      } else {
        const errorText = await chatsResponse.text();
        console.error('Failed to fetch chats:', chatsResponse.status, errorText);
        // Return success with 0 synced instead of failing completely
        return new Response(JSON.stringify({
          success: true,
          syncedConversations: 0,
          syncedMessages: 0,
          message: `API temporariamente indisponível. Tente novamente em alguns segundos.`,
          warning: `Evolution API returned ${chatsResponse.status}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (chatError) {
      console.error('Error fetching chats from Evolution API:', chatError);
      // Return success with warning instead of failing
      return new Response(JSON.stringify({
        success: true,
        syncedConversations: 0,
        syncedMessages: 0,
        message: 'Sincronização pendente - API ocupada',
        warning: String(chatError)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let syncedMessages = 0;
    let syncedConversations = 0;

    // Process each chat (including groups)
    for (const chat of (chats || [])) {
      const remoteJid = chat.id || chat.remoteJid;
      if (!remoteJid) continue;
      
      const isGroup = remoteJid.includes('@g.us');

      // Extract phone from JID (for groups, use the group JID as identifier)
      const phone = isGroup 
        ? remoteJid.replace('@g.us', '') 
        : remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      if (!phone || phone.length < 8) continue;
      
      // Get group name for group chats
      const groupName = isGroup ? (chat.name || chat.subject || null) : null;

      // Check if conversation exists
      let { data: existingConversation } = await supabase
        .from('conversations')
        .select('id, updated_at')
        .eq('whatsapp_number_id', numberId)
        .eq('remote_jid', remoteJid)
        .single();

      let conversationId: string;

      if (!existingConversation) {
        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            whatsapp_number_id: numberId,
            remote_jid: remoteJid,
            phone: phone,
            contact_name: isGroup ? null : (chat.name || chat.pushName || null),
            is_group: isGroup,
            group_name: groupName,
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          continue;
        }

        conversationId = newConversation.id;
        syncedConversations++;
      } else {
        conversationId = existingConversation.id;
      }

      // Fetch messages for this chat
      try {
        const messagesResponse = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: remoteJid
              }
            },
            limit: 50
          }),
        });

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          console.log(`Messages API response type for ${remoteJid}:`, typeof messagesData);
          
          // Handle different response formats from Evolution API - ensure we always get an array
          let messages: any[] = [];
          if (Array.isArray(messagesData)) {
            messages = messagesData;
          } else if (messagesData && typeof messagesData === 'object') {
            if (Array.isArray(messagesData.messages)) {
              messages = messagesData.messages;
            } else if (Array.isArray(messagesData.data)) {
              messages = messagesData.data;
            } else {
              console.log(`Unexpected messages format for ${remoteJid}, using empty array`);
              messages = [];
            }
          }
          console.log(`Found ${messages.length} messages for ${remoteJid}`);

          for (const msg of messages) {
            const messageId = msg.key?.id;
            if (!messageId) continue;

            // Check if message already exists
            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('message_id', messageId)
              .single();

            if (existingMsg) continue; // Skip existing messages

            // Extract message content
            let content = '';
            let messageType = 'text';

            if (msg.message?.conversation) {
              content = msg.message.conversation;
            } else if (msg.message?.extendedTextMessage?.text) {
              content = msg.message.extendedTextMessage.text;
            } else if (msg.message?.imageMessage) {
              messageType = 'image';
              content = msg.message.imageMessage.caption || '[Imagem]';
            } else if (msg.message?.audioMessage) {
              messageType = 'audio';
              content = '[Áudio]';
            } else if (msg.message?.videoMessage) {
              messageType = 'video';
              content = msg.message.videoMessage.caption || '[Vídeo]';
            } else if (msg.message?.documentMessage) {
              messageType = 'document';
              content = msg.message.documentMessage.fileName || '[Documento]';
            }

            if (!content && messageType === 'text') continue;

            // Extract sender info for group messages
            let senderJid = null;
            let senderName = null;
            if (isGroup && !msg.key?.fromMe) {
              senderJid = msg.key?.participant || null;
              senderName = msg.pushName || null;
            }

            // Insert message
            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                user_id: user.id,
                conversation_id: conversationId,
                remote_jid: remoteJid,
                message_id: messageId,
                from_me: msg.key?.fromMe || false,
                content: content,
                message_type: messageType,
                status: 'delivered',
                sender_jid: senderJid,
                sender_name: senderName,
                created_at: msg.messageTimestamp 
                  ? new Date(parseInt(msg.messageTimestamp) * 1000).toISOString()
                  : new Date().toISOString()
              });

            if (!insertError) {
              syncedMessages++;
            }
          }

          // Update conversation with last message
          if (messages && messages.length > 0) {
            const lastMsg = messages[0];
            let lastContent = '';
            
            if (lastMsg.message?.conversation) {
              lastContent = lastMsg.message.conversation;
            } else if (lastMsg.message?.extendedTextMessage?.text) {
              lastContent = lastMsg.message.extendedTextMessage.text;
            } else {
              lastContent = '[Mídia]';
            }

            await supabase
              .from('conversations')
              .update({
                last_message: lastContent.substring(0, 200),
                last_message_at: lastMsg.messageTimestamp 
                  ? new Date(parseInt(lastMsg.messageTimestamp) * 1000).toISOString()
                  : new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', conversationId);
          }
        }
      } catch (e) {
        console.error(`Error fetching messages for ${remoteJid}:`, e);
      }
    }

    // Update number sync timestamp
    await supabase
      .from('whatsapp_numbers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', numberId);

    console.log(`Sync complete: ${syncedConversations} conversations, ${syncedMessages} messages`);

    return new Response(JSON.stringify({
      success: true,
      syncedConversations,
      syncedMessages,
      message: `Sincronizado: ${syncedConversations} conversas, ${syncedMessages} mensagens`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in evolution-sync-messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
