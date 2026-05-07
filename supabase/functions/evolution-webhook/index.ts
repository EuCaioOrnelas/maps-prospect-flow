import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_API_URL_PAID = Deno.env.get('EVOLUTION_API_URL_PAID');
    const EVOLUTION_API_KEY_PAID = Deno.env.get('EVOLUTION_API_KEY_PAID');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Helper to resolve correct API credentials based on instance tier/user plan
    async function getApiCredentials(instanceName: string): Promise<{ url: string; apiKey: string; tier: 'free' | 'paid' }> {
      const { data: numberRow } = await supabase
        .from('whatsapp_numbers')
        .select('api_tier, user_id')
        .eq('instance_name', instanceName)
        .maybeSingle();

      const isPaidByNumber = numberRow?.api_tier === 'paid';
      let isPaidByPlan = false;

      if (!isPaidByNumber && numberRow?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', numberRow.user_id)
          .maybeSingle();

        const normalizedPlan = (profile?.plan || 'free').toLowerCase();
        isPaidByPlan = ['start', 'growth', 'scale'].includes(normalizedPlan);
      }

      if ((isPaidByNumber || isPaidByPlan) && EVOLUTION_API_URL_PAID && EVOLUTION_API_KEY_PAID) {
        return { url: EVOLUTION_API_URL_PAID, apiKey: EVOLUTION_API_KEY_PAID, tier: 'paid' };
      }

      return { url: EVOLUTION_API_URL!, apiKey: EVOLUTION_API_KEY!, tier: 'free' };
    }

    const payload = await req.json();
    console.log('=== EVOLUTION WEBHOOK RAW ===');
    console.log('Full payload:', JSON.stringify(payload));

    // Evolution API sends event in different formats - normalize
    const rawEvent = payload.event || '';
    const event = rawEvent.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');

    const instance = typeof payload.instance === 'string'
      ? payload.instance
      : payload.instance?.instanceName || payload.instance?.name || payload.instance_id || payload.instanceId;

    const rawData = payload.data;
    const isMessageUpsertEvent = ['messages.upsert', 'message.upsert', 'messagesupsert'].includes(event);

    const selectedMessageFromArray = isMessageUpsertEvent && Array.isArray(rawData?.messages)
      ? (rawData.messages.find((msg: any) => msg?.key && msg?.message && msg?.key?.fromMe === false)
          || rawData.messages.find((msg: any) => msg?.key && msg?.message)
          || null)
      : null;

    const data = selectedMessageFromArray
      ? {
          ...selectedMessageFromArray,
          pushName: selectedMessageFromArray?.pushName || rawData?.pushName || payload?.pushName || null,
          participant: selectedMessageFromArray?.participant || rawData?.participant || null,
        }
      : rawData;
    
    console.log('Raw event:', rawEvent, '-> Normalized:', event, 'messagesInBatch:', Array.isArray(rawData?.messages) ? rawData.messages.length : 0, 'selectedFromMe:', data?.key?.fromMe ?? null);

    if (!instance) {
      console.error('Webhook payload sem instance identificável:', JSON.stringify(payload));
      return new Response(JSON.stringify({ error: 'Missing instance name in webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper: revenue event processing (awaited to avoid dropping events)
    async function fireRevenueEvent(params: {
      user_id: string;
      phone_e164: string;
      number_instance_id?: string;
      direction: 'inbound' | 'outbound';
      message_content?: string;
      lead_name?: string;
    }) {
      try {
        const { data: revenueResult, error } = await supabase.functions.invoke('revenue-processor', {
          body: { action: 'process_message', ...params },
        });

        if (error) {
          console.error('Revenue processor invoke failed:', error);
          return;
        }

        if (revenueResult && revenueResult.success === false) {
          console.log('Revenue processor skipped:', revenueResult);
        }
      } catch (e) {
        console.error('Revenue event fire error:', e);
      }
    }

    function phoneTail8(phone: string): string {
      return String(phone || '').replace(/\D/g, '').slice(-8);
    }

    async function findEvolutionChatConnection(userId: string, numberPhone?: string | null) {
      const { data: allConnections } = await supabase
        .from('user_waba_connections')
        .select('id, display_phone_number, nickname, business_name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!allConnections || allConnections.length === 0) return null;

      const numberTail = phoneTail8(numberPhone || '');
      if (numberTail.length === 8) {
        const matching = allConnections.find((conn: any) => {
          const connTail = phoneTail8(conn.display_phone_number || conn.nickname || conn.business_name || '');
          return connTail === numberTail;
        });
        if (matching) return matching;
      }

      return allConnections[0] || null;
    }

    async function upsertChatConversation(params: {
      userId: string;
      connectionId: string;
      contactPhone: string;
      contactName?: string | null;
      lastMessageText: string;
      lastMessageType: string;
      direction: 'inbound' | 'outbound';
      occurredAt: string;
    }) {
      let { data: conversation } = await supabase
        .from('chat_conversations')
        .select('id, unread_count')
        .eq('user_id', params.userId)
        .eq('waba_connection_id', params.connectionId)
        .eq('contact_phone', params.contactPhone)
        .maybeSingle();

      if (!conversation) {
        const payload: any = {
          user_id: params.userId,
          waba_connection_id: params.connectionId,
          contact_phone: params.contactPhone,
          contact_name: params.contactName || null,
          last_message_text: params.lastMessageText,
          last_message_at: params.occurredAt,
          last_message_type: params.lastMessageType,
          last_message_direction: params.direction,
          unread_count: params.direction === 'inbound' ? 1 : 0,
        };

        const { data: created } = await supabase
          .from('chat_conversations')
          .insert(payload)
          .select('id, unread_count')
          .single();

        return created;
      }

      const updates: any = {
        last_message_text: params.lastMessageText,
        last_message_at: params.occurredAt,
        last_message_type: params.lastMessageType,
        last_message_direction: params.direction,
      };

      if (params.contactName) updates.contact_name = params.contactName;
      if (params.direction === 'inbound') {
        updates.unread_count = (conversation.unread_count || 0) + 1;
      }

      await supabase.from('chat_conversations').update(updates).eq('id', conversation.id);
      return conversation;
    }

    async function insertChatMessage(params: {
      conversationId: string;
      userId: string;
      messageId: string;
      direction: 'inbound' | 'outbound';
      messageType: string;
      content?: string | null;
      mediaUrl?: string | null;
      mediaMimeType?: string | null;
      mediaFilename?: string | null;
      mediaCaption?: string | null;
      status: string;
      occurredAt: string;
      metadata?: Record<string, unknown> | null;
    }) {
      const { data: existing } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('conversation_id', params.conversationId)
        .eq('waba_message_id', params.messageId)
        .maybeSingle();

      if (existing) return existing;

      const { data: inserted } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: params.conversationId,
          user_id: params.userId,
          waba_message_id: params.messageId,
          direction: params.direction,
          message_type: params.messageType,
          content: params.content || null,
          media_url: params.mediaUrl || null,
          media_mime_type: params.mediaMimeType || null,
          media_filename: params.mediaFilename || null,
          media_caption: params.mediaCaption || null,
          status: params.status,
          status_updated_at: params.occurredAt,
          metadata: params.metadata || null,
          created_at: params.occurredAt,
        })
        .select('id')
        .single();

      return inserted;
    }

    async function updateLeadStatusByTail(params: {
      userId: string;
      phone: string;
      direction: 'inbound' | 'outbound';
      timestamp: string;
      content?: string;
      conversationId?: string | null;
    }) {
      const tail = phoneTail8(params.phone);
      if (tail.length < 8) return;

      const { data: leads } = await supabase
        .from('leads')
        .select('id, whatsapp_status, first_message_sent, pipeline_stage_id')
        .eq('user_id', params.userId)
        .ilike('phone', `%${tail}`)
        .limit(5);

      if (!leads || leads.length === 0) return;

      let repliedStage: any = null;
      let sentStage: any = null;
      if (params.direction === 'inbound') {
        const { data } = await supabase
          .from('pipeline_stages')
          .select('id, position')
          .eq('user_id', params.userId)
          .eq('name', 'Respondeu Mensagem')
          .maybeSingle();
        repliedStage = data;
      } else {
        const { data } = await supabase
          .from('pipeline_stages')
          .select('id, position')
          .eq('user_id', params.userId)
          .eq('name', 'Mensagem Enviada')
          .maybeSingle();
        sentStage = data;
      }

      for (const lead of leads) {
        const updates: any = { updated_at: params.timestamp };

        if (params.direction === 'inbound') {
          updates.whatsapp_status = 'replied';
          updates.has_responded = true;
          updates.responded_at = params.timestamp;
          updates.last_response_at = params.timestamp;
          updates.last_response = params.content || null;

          if (repliedStage?.id && lead.pipeline_stage_id) {
            const { data: currentStage } = await supabase
              .from('pipeline_stages')
              .select('position')
              .eq('id', lead.pipeline_stage_id)
              .maybeSingle();
            if (currentStage && currentStage.position < repliedStage.position) {
              updates.pipeline_stage_id = repliedStage.id;
            }
          } else if (repliedStage?.id && !lead.pipeline_stage_id) {
            updates.pipeline_stage_id = repliedStage.id;
          }
        } else {
          const current = lead.whatsapp_status || 'never_contacted';
          if (current === 'never_contacted' || current === 'no_response') {
            updates.whatsapp_status = 'message_sent';
          } else if (current === 'replied') {
            updates.whatsapp_status = 'in_conversation';
          }
          updates.first_message_sent = true;
          if (!lead.first_message_sent) updates.first_message_sent_at = params.timestamp;
          updates.last_message_sent = params.content || null;
          updates.last_message_sent_at = params.timestamp;
          if (params.conversationId) updates.conversation_id = params.conversationId;

          if (sentStage?.id && lead.pipeline_stage_id) {
            const { data: currentStage } = await supabase
              .from('pipeline_stages')
              .select('position')
              .eq('id', lead.pipeline_stage_id)
              .maybeSingle();
            if (currentStage && currentStage.position === 0) {
              updates.pipeline_stage_id = sentStage.id;
            }
          } else if (sentStage?.id && !lead.pipeline_stage_id) {
            updates.pipeline_stage_id = sentStage.id;
          }
        }

        await supabase.from('leads').update(updates).eq('id', lead.id);
      }
    }

    // Helper function to normalize generic phone strings
    function normalizePhoneNumber(phone: string): string {
      return String(phone || '').replace(/\D/g, '');
    }

    // Canonical BR mobile phone for CRM/Revenue (E.164: 55 + DDD + 9 + 8)
    function normalizeBrazilianMobileE164(phone: string): string | null {
      const digits = normalizePhoneNumber(phone);
      if (!digits) return null;

      // Ignore obvious non-person IDs (groups / special IDs)
      if (digits.startsWith('120363')) return null;

      // Helper to validate and block placeholder numbers
      function isPlaceholder(subscriber: string): boolean {
        if (/^(\d)\1{7}$/.test(subscriber)) return true;
        if (subscriber.startsWith('9999')) return true;
        if (/(0000|1234|4321)/.test(subscriber)) return true;
        if (subscriber.endsWith('0000') || subscriber.endsWith('0001') || subscriber.endsWith('0002')) return true;
        return false;
      }

      // Accept 13-digit E.164 BR mobile directly: 55 + DD + 9XXXXXXXX
      if (digits.length === 13 && digits.startsWith('55')) {
        const ddd = Number(digits.slice(2, 4));
        const firstLocal = digits[4];
        if (!Number.isNaN(ddd) && ddd >= 11 && ddd <= 99 && firstLocal === '9') {
          if (isPlaceholder(digits.slice(-8))) return null;
          return digits;
        }
        return null;
      }

      // 12-digit BR number missing the 9th digit: 55 + DD + 8-digit number
      // Add the leading 9 to make it 13-digit E.164
      if (digits.length === 12 && digits.startsWith('55')) {
        const ddd = Number(digits.slice(2, 4));
        const localNumber = digits.slice(4); // 8 digits
        const firstDigit = localNumber[0];
        // Mobile numbers in old format start with 6,7,8,9
        if (!Number.isNaN(ddd) && ddd >= 11 && ddd <= 99 && ['6', '7', '8', '9'].includes(firstDigit)) {
          const candidate = `55${digits.slice(2, 4)}9${localNumber}`;
          if (isPlaceholder(candidate.slice(-8))) return null;
          console.log(`Normalized 12-digit BR phone ${digits} -> ${candidate} (added 9th digit)`);
          return candidate;
        }
        return null;
      }

      // Accept local BR mobile (DDD + 9 + 8) and add country code
      if (digits.length === 11) {
        const ddd = Number(digits.slice(0, 2));
        const firstLocal = digits[2];
        if (!Number.isNaN(ddd) && ddd >= 11 && ddd <= 99 && firstLocal === '9') {
          const candidate = `55${digits}`;
          if (isPlaceholder(candidate.slice(-8))) return null;
          return candidate;
        }
      }

      // 10-digit local BR number missing the 9th digit: DD + 8-digit number
      if (digits.length === 10) {
        const ddd = Number(digits.slice(0, 2));
        const localNumber = digits.slice(2); // 8 digits
        const firstDigit = localNumber[0];
        if (!Number.isNaN(ddd) && ddd >= 11 && ddd <= 99 && ['6', '7', '8', '9'].includes(firstDigit)) {
          const candidate = `55${ddd}9${localNumber}`;
          if (isPlaceholder(candidate.slice(-8))) return null;
          console.log(`Normalized 10-digit BR phone ${digits} -> ${candidate} (added 9th digit)`);
          return candidate;
        }
      }

      // Accept international numbers (non-BR) with 10+ digits as-is
      if (digits.length >= 10 && !digits.startsWith('55')) {
        return digits;
      }

      return null;
    }

    async function downloadAndStoreMedia(
      instanceName: string,
      messageId: string,
      mediaType: string,
      userId: string,
      apiCreds?: { url: string; apiKey: string }
    ): Promise<{ url: string; mimetype: string } | null> {
      const creds = apiCreds || { url: EVOLUTION_API_URL!, apiKey: EVOLUTION_API_KEY! };
      try {
        console.log(`Downloading media for message ${messageId} from instance ${instanceName}`);
        
        // Use Evolution API to get base64 media
        const response = await fetch(`${creds.url}/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.apiKey,
          },
          body: JSON.stringify({
            message: { key: { id: messageId } },
            convertToMp4: mediaType === 'video',
          }),
        });

        if (!response.ok) {
          console.log(`Failed to download media for ${messageId}:`, response.status);
          return null;
        }

        const result = await response.json();
        console.log('Media download result keys:', Object.keys(result));
        
        const base64Data = result.base64 || result.data;
        const mimetype = result.mimetype || result.mediaType || `${mediaType}/unknown`;
        
        if (!base64Data) {
          console.log('No base64 data in response');
          return null;
        }

        // Clean mimetype - remove codec params like "audio/ogg; codecs=opus" -> "audio/ogg"
        const cleanMimetype = mimetype.split(';')[0].trim();
        
        // Determine file extension from mimetype
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'video/mp4': 'mp4',
          'video/3gpp': '3gp',
          'audio/ogg': 'ogg',
          'audio/mpeg': 'mp3',
          'audio/mp4': 'm4a',
          'audio/aac': 'aac',
          'audio/webm': 'webm',
          'application/pdf': 'pdf',
        };
        
        const ext = extMap[cleanMimetype] || cleanMimetype.split('/')[1] || 'bin';
        const filename = `${userId}/${Date.now()}_${messageId.substring(0, 8)}.${ext}`;
        
        // Decode base64 and upload to Supabase Storage
        const fileData = base64Decode(base64Data);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filename, fileData, {
            contentType: cleanMimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading media to storage:', uploadError);
          return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filename);

        console.log('Media uploaded successfully:', urlData.publicUrl);
        
        return {
          url: urlData.publicUrl,
          mimetype: mimetype,
        };
      } catch (error) {
        console.error('Error downloading/storing media:', error);
        return null;
      }
    }

    // Helper function to fetch profile picture from Evolution API
    async function fetchProfilePicture(instanceName: string, phone: string, apiCreds?: { url: string; apiKey: string }): Promise<string | null> {
      const creds = apiCreds || { url: EVOLUTION_API_URL!, apiKey: EVOLUTION_API_KEY! };
      try {
        const response = await fetch(`${creds.url}/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.apiKey,
          },
          body: JSON.stringify({ number: phone }),
        });

        if (!response.ok) {
          console.log(`Failed to fetch profile picture for ${phone}:`, response.status);
          return null;
        }

        const result = await response.json();
        console.log('Profile picture result:', JSON.stringify(result));
        return result.profilePictureUrl || result.picture || null;
      } catch (error) {
        console.error('Error fetching profile picture:', error);
        return null;
      }
    }

    // Helper function to update or create contact with profile picture
    async function updateContactAvatar(userId: string, phone: string, avatarUrl: string) {
      // Check if contact exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, avatar_url')
        .eq('user_id', userId)
        .eq('phone', phone)
        .single();

      if (existingContact) {
        // Only update if avatar is different or empty
        if (!existingContact.avatar_url || existingContact.avatar_url !== avatarUrl) {
          const { error } = await supabase
            .from('contacts')
            .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
            .eq('id', existingContact.id);

          if (error) {
            console.error('Error updating contact avatar:', error);
          } else {
            console.log(`Updated avatar for contact ${phone}`);
          }
        }
      }
    }

    // === WARMING AI RESPONSE HELPERS ===
    async function generateWarmingAIResponse(
      leadMessage: string,
      warmingLevel: number,
      messagesReceived: number,
      leadName?: string | null,
      companyName?: string | null
    ): Promise<string | null> {
      console.log(`Generating AI warming response for level ${warmingLevel}, msg: "${leadMessage}"`);
      
      if (!OPENAI_API_KEY) {
        console.log('OPENAI_API_KEY not configured, falling back to templates');
        return null;
      }
      
      try {
        // Different strategies by warming level
        let systemPrompt: string;
        
        if (warmingLevel <= 2) {
          // Levels 1-2: Casual conversation, say it was wrong number
          systemPrompt = `Você é uma pessoa REAL conversando pelo WhatsApp no Brasil. Gere APENAS a mensagem de resposta, sem aspas, sem explicações.

CONTEXTO: Você mandou uma mensagem para essa pessoa por engano (número errado). O lead respondeu e agora você precisa encerrar a conversa de forma educada dizendo que errou o número.

REGRAS:
- Máximo 10 palavras
- Linguagem informal brasileira natural
- SEM emojis (ou no máximo 1)
- Pareça uma pessoa real digitando rápido
- Diga que foi engano/número errado
- Peça desculpas brevemente
- NÃO continue a conversa`;
        } else {
          // Levels 3-4: Contextual prospecting response
          const leadContext = [];
          if (leadName) leadContext.push(`Nome: ${leadName}`);
          if (companyName) leadContext.push(`Empresa: ${companyName}`);
          
          systemPrompt = `Você é um profissional REAL conversando pelo WhatsApp no Brasil. Gere APENAS a mensagem de resposta, sem aspas, sem explicações.

CONTEXTO: Você mandou uma mensagem de prospecção para este lead e ele respondeu. Você precisa dar continuidade à conversa de forma natural e interessada.
${leadContext.length > 0 ? '\nDADOS DO LEAD:\n' + leadContext.join('\n') : ''}

MENSAGEM QUE O LEAD ENVIOU: "${leadMessage}"

REGRAS:
- Máximo 2 frases curtas (~30 palavras)
- Tom casual brasileiro, como se estivesse no WhatsApp
- RESPONDA ao que o lead disse de forma contextual
- Se o lead demonstrou interesse → agradeça e diga que vai mandar mais info depois
- Se o lead perguntou quem é → apresente-se brevemente como alguém que trabalha na região
- Se o lead foi positivo → reforce e encerre educadamente
- Se o lead foi negativo → agradeça e peça desculpas pelo contato
- Máximo 1 emoji (ou nenhum)
- Pareça uma pessoa real, NÃO um bot
- NÃO force venda, seja leve e natural`;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `O lead respondeu: "${leadMessage}"` }
            ],
            temperature: 0.9,
            max_tokens: 100,
          }),
        });

        if (!response.ok) {
          console.error('OpenAI warming response error:', response.status, await response.text());
          return null;
        }

        const result = await response.json();
        let aiMessage = result.choices?.[0]?.message?.content?.trim();
        
        if (aiMessage) {
          aiMessage = aiMessage.replace(/^["']|["']$/g, '').trim();
        }
        
        console.log('OpenAI generated warming response:', aiMessage);
        return aiMessage || null;
      } catch (error) {
        console.error('Error generating AI warming response:', error);
        return null;
      }
    }
    async function sendWarmingResponseDirect(
      instanceName: string,
      phone: string,
      message: string,
      apiCreds?: { url: string; apiKey: string }
    ): Promise<boolean> {
      const creds = apiCreds || { url: EVOLUTION_API_URL!, apiKey: EVOLUTION_API_KEY! };
      try {
        // Add a small random delay to simulate human typing (1-4 seconds)
        const typingDelay = Math.floor(Math.random() * 3000) + 1000;
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        const formattedPhone = phone.replace(/\D/g, '');
        console.log(`Sending warming response to ${formattedPhone}: "${message}"`);
        
        const response = await fetch(`${creds.url}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.apiKey,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        });

        if (!response.ok) {
          console.error('Failed to send warming response:', await response.text());
          return false;
        }
        
        console.log('✓ Warming response sent successfully');
        return true;
      } catch (error) {
        console.error('Error sending warming response:', error);
        return false;
      }
    }

    // Handle different webhook events - support multiple event name formats
    switch (event) {
      case 'messages.upsert':
      case 'message.upsert':
      case 'messagesupsert':
        // Message received or sent
        console.log('Message upsert:', JSON.stringify(data));
        
        if (data?.key && data?.message) {
          const messageKey = data.key;
          const messageData = data.message;
          let remoteJid = messageKey.remoteJid;
          const fromMe = messageKey.fromMe;
          const messageId = messageKey.id;
          
          // Check for LID format and resolve to real phone number
          const jidType = remoteJid.split('@')[1]; // s.whatsapp.net, lid, g.us, etc
          
          if (jidType === 'lid' || remoteJid.includes('@lid')) {
            // LID messages need special handling to get the real phone number
            const altJid = messageKey.remoteJidAlt;
            const senderJid = payload.sender; // The actual sender's phone from payload root
            
            // For fromMe messages with LID:
            // - If senderJid matches the instance's own number, this is the original message
            // - If senderJid doesn't match, this is a duplicate from another instance - IGNORE
            if (fromMe) {
              // Get the instance's phone number to compare
              const { data: instanceNumber } = await supabase
                .from('whatsapp_numbers')
                .select('phone_number')
                .eq('instance_name', instance)
                .single();
              
              const instancePhone = instanceNumber?.phone_number?.replace(/\D/g, '') || '';
              const senderPhone = senderJid?.replace(/\D/g, '').replace('@swhatsappnet', '') || '';
              
              // Check if this message was sent from THIS instance
              const senderLast8 = senderPhone.slice(-8);
              const instanceLast8 = instancePhone.slice(-8);
              
              if (instanceLast8 && senderLast8 && instanceLast8 !== senderLast8) {
                // This is a message sent from ANOTHER connected number, not this instance
                // The message will be processed by the other instance as fromMe=true
                console.log('Ignoring cross-instance sent message. Instance:', instancePhone, 'Sender:', senderPhone);
                break;
              }
              
              // For sent messages, altJid contains the recipient
              if (altJid && altJid.includes('@s.whatsapp.net')) {
                console.log('Converting LID to real JID for sent message:', remoteJid, '->', altJid);
                remoteJid = altJid;
              } else {
                console.log('Ignoring sent LID message without valid recipient:', remoteJid, 'altJid:', altJid);
                break;
              }
            } else {
              // For received messages (fromMe=false):
              // altJid should have the sender's real phone number
              if (altJid && altJid.includes('@s.whatsapp.net')) {
                console.log('Converting LID to real JID for received message:', remoteJid, '->', altJid);
                remoteJid = altJid;
              } else if (senderJid && senderJid.includes('@s.whatsapp.net')) {
                // Fallback to sender field from payload root
                console.log('Converting LID to real JID via sender fallback:', remoteJid, '->', senderJid);
                remoteJid = senderJid;
              } else {
                console.log('Ignoring received LID message without valid source:', remoteJid, 'altJid:', altJid, 'sender:', senderJid);
                break;
              }
            }
          }
          
          // Extract phone number from remoteJid (now normalized)
          const rawPhone = remoteJid.split('@')[0];
          const currentJidType = remoteJid.split('@')[1];
          
          // Check if it's a group message
          const isGroup = currentJidType === 'g.us' || remoteJid.includes('@g.us');
          
          // For groups, extract the sender's phone number
          let senderJidForGroup: string | null = null;
          let senderName: string | null = data.pushName || null;
          
          if (isGroup && !fromMe) {
            // For group messages, the participant field contains the sender
            senderJidForGroup = messageKey.participant || data.participant || null;
            if (senderJidForGroup) {
              // Clean the sender jid to get just the phone
              senderJidForGroup = senderJidForGroup.split('@')[0];
            }
          }
          
          // Remove any non-digit characters for matching
          const normalizedPhone = rawPhone.replace(/\D/g, '');
          const canonicalLeadPhone = !isGroup ? normalizeBrazilianMobileE164(rawPhone) : null;
          const rawMessageTimestamp = Number(data?.messageTimestamp || payload?.data?.messageTimestamp || 0);
          const normalizedMessageTimestampMs = Number.isFinite(rawMessageTimestamp) && rawMessageTimestamp > 0
            ? (rawMessageTimestamp < 1_000_000_000_000 ? rawMessageTimestamp * 1000 : rawMessageTimestamp)
            : null;
          const messageOccurredAt = normalizedMessageTimestampMs
            ? new Date(normalizedMessageTimestampMs).toISOString()
            : new Date().toISOString();
          const messageAgeMs = normalizedMessageTimestampMs ? Date.now() - normalizedMessageTimestampMs : null;
          const isHistoricalSyncMessage = messageAgeMs !== null && messageAgeMs > 10 * 60 * 1000;

          if (isHistoricalSyncMessage) {
            console.log(`Skipping CRM/agent automation for historical message (${Math.round(messageAgeMs / 1000)}s old) on ${instance}`);
          }
          
          // Get the WhatsApp number (instance) info
          const { data: whatsappNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id, api_tier, phone_number')
            .eq('instance_name', instance)
            .single();
          
          // Resolve correct API credentials based on instance tier
          const instanceApiCreds = (whatsappNumber?.api_tier === 'paid' && EVOLUTION_API_URL_PAID && EVOLUTION_API_KEY_PAID)
            ? { url: EVOLUTION_API_URL_PAID, apiKey: EVOLUTION_API_KEY_PAID }
            : { url: EVOLUTION_API_URL!, apiKey: EVOLUTION_API_KEY! };

          if (whatsappNumber) {
            // Get or create conversation - try multiple matching strategies
            // NOTE: The 'conversations' and 'messages' tables may not exist in all setups
            // We wrap these in try-catch to allow the AI agent flow to continue
            let conversationId: string | null = null;
            let hasConversationsTable = true;
            
            try {
              // Strategy 1: Match by exact remote_jid
              let { data: existingConv, error: convError } = await supabase
                .from('conversations')
                .select('id')
                .eq('remote_jid', remoteJid)
                .eq('whatsapp_number_id', whatsappNumber.id)
                .single();
              
              // Check if table doesn't exist
              if (convError?.code === 'PGRST205') {
                console.log('conversations table not found - skipping conversation tracking');
                hasConversationsTable = false;
              } else if (existingConv) {
                conversationId = existingConv.id;
                console.log('Found conversation by exact remote_jid match');
              }
              
              // Strategy 2: Match by normalized phone number (Brazilian format handling)
              if (hasConversationsTable && !conversationId && normalizedPhone.length >= 10) {
                // For Brazilian numbers, handle the 9th digit variation
                // 55 44 9 91236180 vs 55 44 91236180
                const phoneToMatch = normalizedPhone.slice(-11);
                const phoneToMatch8 = normalizedPhone.slice(-8); // Last 8 digits (most unique part)
                
                const { data: convsByPhone } = await supabase
                  .from('conversations')
                  .select('id, phone, remote_jid')
                  .eq('whatsapp_number_id', whatsappNumber.id);
                
                if (convsByPhone && convsByPhone.length > 0) {
                  // Find conversation where phone matches (considering 9th digit variations)
                  const matchingConv = convsByPhone.find(c => {
                    const convPhone = c.phone.replace(/\D/g, '');
                    const convLast8 = convPhone.slice(-8);
                    const convLast11 = convPhone.slice(-11);
                    
                    // Exact match on last 11 digits
                    if (convLast11 === phoneToMatch) return true;
                    
                    // Match on last 8 digits (ignores 9th digit and area code variations)
                    if (convLast8 === phoneToMatch8) return true;
                    
                    // Brazilian mobile: compare without the 9th digit
                    // 9XXXXXXXX -> XXXXXXXX
                    const removeBrazilian9 = (p: string) => {
                      const last9 = p.slice(-9);
                      if (last9.startsWith('9')) {
                        return p.slice(0, -9) + last9.slice(1);
                      }
                      return p;
                    };
                    
                    const normalizedConv = removeBrazilian9(convPhone);
                    const normalizedNew = removeBrazilian9(normalizedPhone);
                    
                    // Compare last 10 digits after removing the Brazilian 9
                    if (normalizedConv.slice(-10) === normalizedNew.slice(-10)) return true;
                    
                    return false;
                  });
                  
                  if (matchingConv) {
                    conversationId = matchingConv.id;
                    console.log('Found conversation by phone number match:', matchingConv.phone, '-> new:', rawPhone);
                    
                    // Update the remote_jid to the new one for future matches
                    await supabase
                      .from('conversations')
                      .update({ remote_jid: remoteJid, updated_at: new Date().toISOString() })
                      .eq('id', conversationId);
                  }
                }
              }
              
              // Strategy 3: Create new conversation if not found
              if (hasConversationsTable && !conversationId) {
                // For groups, use the group jid directly; for individuals keep digits only
                const phoneForStorage = isGroup ? rawPhone : normalizePhoneNumber(rawPhone);
                const jidForStorage = isGroup ? remoteJid : (phoneForStorage + '@s.whatsapp.net');
                
                // For groups, try to get the group name from the data
                const groupName = isGroup ? (data.pushName || data.subject || null) : null;
                
                console.log('Creating new conversation for:', rawPhone, '-> is_group:', isGroup, 'groupName:', groupName);
                const { data: newConv, error: createConvError } = await supabase
                  .from('conversations')
                  .insert({
                    user_id: whatsappNumber.user_id,
                    whatsapp_number_id: whatsappNumber.id,
                    remote_jid: jidForStorage,
                    phone: phoneForStorage,
                    contact_name: isGroup ? null : (data.pushName || null),
                    is_group: isGroup,
                    group_name: groupName,
                  })
                  .select('id')
                  .single();
                
                if (createConvError) {
                  if (createConvError.code === 'PGRST205') {
                    console.log('conversations table not found - skipping conversation creation');
                    hasConversationsTable = false;
                  } else {
                    console.error('Error creating conversation:', createConvError);
                  }
                } else if (newConv) {
                  conversationId = newConv.id;
                }
              }
            } catch (convTableError) {
              console.log('Conversation table operations failed (table may not exist):', convTableError);
              hasConversationsTable = false;
            }

            // If message is received (not from me), try to fetch profile picture
            // Only do this for fresh 1:1 messages to avoid heavy sync/replay work
            if (!fromMe && rawPhone && hasConversationsTable && !isGroup && !isHistoricalSyncMessage) {
              try {
                const profilePicture = await fetchProfilePicture(instance, rawPhone, instanceApiCreds);
                if (profilePicture) {
                  console.log('Got profile picture URL:', profilePicture);
                  
                  // Update contact if exists
                  await updateContactAvatar(whatsappNumber.user_id, rawPhone, profilePicture);
                  
                  // Also check for contact by normalized phone
                  const { data: contactByPhone } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('user_id', whatsappNumber.user_id)
                    .or(`phone.eq.${rawPhone},phone.eq.${normalizedPhone}`)
                    .limit(1);
                    
                  if (contactByPhone && contactByPhone.length > 0 && conversationId) {
                    // Update conversation with contact_id
                    await supabase
                      .from('conversations')
                      .update({ contact_id: contactByPhone[0].id })
                      .eq('id', conversationId)
                      .is('contact_id', null);
                      
                    // Update avatar on contact
                    await supabase
                      .from('contacts')
                      .update({ avatar_url: profilePicture, updated_at: new Date().toISOString() })
                      .eq('id', contactByPhone[0].id);
                  }
                }
              } catch (e) {
                console.log('Profile picture fetch skipped:', e);
              }
            }

            // Check if this is a protocolMessage (edit event via upsert)
            // Only process if we have conversations/messages tables
            if (hasConversationsTable && messageData.protocolMessage?.editedMessage) {
              console.log('=== EDIT VIA PROTOCOL MESSAGE IN UPSERT ===');
              const protocolMessage = messageData.protocolMessage;
              const editedMsgKey = protocolMessage.key;
              const editedMessage = protocolMessage.editedMessage;
              
              const editMsgId = editedMsgKey?.id || '';
              const newContent = editedMessage?.message?.conversation || 
                                editedMessage?.message?.extendedTextMessage?.text ||
                                editedMessage?.extendedTextMessage?.text ||
                                editedMessage?.conversation || '';
              
              console.log('Edit via upsert - msgId:', editMsgId, 'newContent:', newContent?.substring(0, 100));
              
              if (editMsgId && newContent) {
                try {
                  // Find and update the message
                  const { data: existingEditMsg } = await supabase
                    .from('messages')
                    .select('id, conversation_id')
                    .eq('message_id', editMsgId)
                    .eq('user_id', whatsappNumber.user_id)
                    .maybeSingle();
                  
                  if (existingEditMsg) {
                    await supabase
                      .from('messages')
                      .update({ 
                        content: newContent,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', existingEditMsg.id);
                    
                    console.log('Message edited via protocolMessage:', existingEditMsg.id);
                    
                    // Update conversation last_message if needed
                    const { data: lastMsg } = await supabase
                      .from('messages')
                      .select('id')
                      .eq('conversation_id', existingEditMsg.conversation_id)
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    
                    if (lastMsg && lastMsg.id === existingEditMsg.id) {
                      await supabase
                        .from('conversations')
                        .update({
                          last_message: newContent.substring(0, 100),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingEditMsg.conversation_id);
                    }
                  } else {
                    console.log('Message not found for edit via protocolMessage:', editMsgId);
                  }
                } catch (editError) {
                  console.log('Error processing edit (messages table may not exist):', editError);
                }
              }
              
              // Don't process this as a regular message, it's an edit event
              break;
            }

            // Extract quoted message ID from contextInfo
            // contextInfo can be in the root of data, inside messageData, or inside specific message types
            const contextInfo = data.contextInfo || 
                               messageData.contextInfo || 
                               messageData.extendedTextMessage?.contextInfo ||
                               messageData.imageMessage?.contextInfo ||
                               messageData.videoMessage?.contextInfo ||
                               messageData.audioMessage?.contextInfo ||
                               messageData.documentMessage?.contextInfo ||
                               messageData.stickerMessage?.contextInfo;
            const quotedMessageId = contextInfo?.stanzaId || contextInfo?.quotedStanzaId || null;
            
            if (quotedMessageId) {
              console.log('Message has quoted message ID:', quotedMessageId, 'from contextInfo');
            }

            // Extract message content based on type
            // Handle wrapper message types first (ephemeral, viewOnce, etc.)
            let actualMessageData = messageData;
            if (messageData.ephemeralMessage?.message) {
              actualMessageData = messageData.ephemeralMessage.message;
              console.log('Unwrapped ephemeral message');
            } else if (messageData.viewOnceMessage?.message) {
              actualMessageData = messageData.viewOnceMessage.message;
              console.log('Unwrapped viewOnce message');
            } else if (messageData.viewOnceMessageV2?.message) {
              actualMessageData = messageData.viewOnceMessageV2.message;
              console.log('Unwrapped viewOnceV2 message');
            } else if (messageData.documentWithCaptionMessage?.message) {
              actualMessageData = messageData.documentWithCaptionMessage.message;
              console.log('Unwrapped documentWithCaption message');
            } else if (messageData.editedMessage?.message) {
              actualMessageData = messageData.editedMessage.message;
              console.log('Unwrapped edited message');
            }

            let messageType = 'text';
            let content = '';
            let mediaUrl: string | null = null;
            let mediaFilename: string | null = null;
            let mediaMimetype: string | null = null;
            let hasMedia = false;
            let interactive: Record<string, unknown> | null = null;

            if (actualMessageData.conversation) {
              content = actualMessageData.conversation;
            } else if (actualMessageData.extendedTextMessage?.text) {
              content = actualMessageData.extendedTextMessage.text;
            } else if (actualMessageData.imageMessage) {
              messageType = 'image';
              content = actualMessageData.imageMessage.caption || '';
              mediaMimetype = actualMessageData.imageMessage.mimetype;
              hasMedia = true;
            } else if (actualMessageData.videoMessage) {
              messageType = 'video';
              content = actualMessageData.videoMessage.caption || '';
              mediaMimetype = actualMessageData.videoMessage.mimetype;
              hasMedia = true;
            } else if (actualMessageData.audioMessage) {
              messageType = 'audio';
              mediaMimetype = actualMessageData.audioMessage.mimetype;
              hasMedia = true;
            } else if (actualMessageData.documentMessage) {
              messageType = 'document';
              mediaFilename = actualMessageData.documentMessage.fileName;
              mediaMimetype = actualMessageData.documentMessage.mimetype;
              hasMedia = true;
            } else if (actualMessageData.interactiveMessage) {
              messageType = 'interactive';
              const interactiveMsg = actualMessageData.interactiveMessage;
              const header = interactiveMsg.header;
              const body = interactiveMsg.body;
              const footer = interactiveMsg.footer;
              const contentParts: string[] = [];
              if (header?.title) contentParts.push(header.title);
              if (header?.subtitle) contentParts.push(header.subtitle);
              if (body?.text) contentParts.push(body.text);
              if (footer?.text) contentParts.push(footer.text);
              content = contentParts.join('\n\n') || '[Mensagem interativa]';
              interactive = {
                type: interactiveMsg.nativeFlowMessage ? 'flow' : 
                      interactiveMsg.collectionMessage ? 'collection' : 
                      interactiveMsg.shopStorefrontMessage ? 'storefront' : 'generic',
                header: header || null,
                body: body || null,
                footer: footer || null,
                nativeFlowMessage: interactiveMsg.nativeFlowMessage || null,
                collectionMessage: interactiveMsg.collectionMessage || null,
                shopStorefrontMessage: interactiveMsg.shopStorefrontMessage || null,
              };
              console.log('Interactive message detected:', JSON.stringify(interactive).slice(0, 500));
            } else if (actualMessageData.buttonsMessage) {
              messageType = 'buttons';
              content = actualMessageData.buttonsMessage.contentText || 
                        actualMessageData.buttonsMessage.text || 
                        '[Mensagem com botões]';
              interactive = {
                type: 'buttons',
                buttons: actualMessageData.buttonsMessage.buttons || [],
                headerType: actualMessageData.buttonsMessage.headerType,
              };
            } else if (actualMessageData.listMessage) {
              messageType = 'list';
              content = actualMessageData.listMessage.description || 
                        actualMessageData.listMessage.title || 
                        '[Mensagem de lista]';
              interactive = {
                type: 'list',
                title: actualMessageData.listMessage.title,
                buttonText: actualMessageData.listMessage.buttonText,
                sections: actualMessageData.listMessage.sections || [],
              };
            } else if (actualMessageData.buttonResponseMessage) {
              messageType = 'text';
              content = actualMessageData.buttonResponseMessage.selectedDisplayText || 
                        actualMessageData.buttonResponseMessage.selectedButtonId || 
                        '[Resposta de botão]';
            } else if (actualMessageData.listResponseMessage) {
              messageType = 'text';
              content = actualMessageData.listResponseMessage.title || 
                        actualMessageData.listResponseMessage.singleSelectReply?.selectedRowId ||
                        '[Resposta de lista]';
            } else if (actualMessageData.templateButtonReplyMessage) {
              messageType = 'text';
              content = actualMessageData.templateButtonReplyMessage.selectedDisplayText ||
                        actualMessageData.templateButtonReplyMessage.selectedId ||
                        '[Resposta de template]';
            } else if (actualMessageData.stickerMessage) {
              messageType = 'sticker';
              hasMedia = true;
              mediaMimetype = actualMessageData.stickerMessage.mimetype;
            } else if (actualMessageData.reactionMessage) {
              messageType = 'text';
              content = actualMessageData.reactionMessage.text || '';
            }

            // If message has media, download it and store in Supabase Storage
            if (hasMedia && !isHistoricalSyncMessage) {
              console.log(`Message has ${messageType} media, downloading...`);
              const storedMedia = await downloadAndStoreMedia(
                instance,
                messageId,
                messageType,
                whatsappNumber.user_id,
                instanceApiCreds
              );
              
              if (storedMedia) {
                mediaUrl = storedMedia.url;
                mediaMimetype = storedMedia.mimetype;
                console.log(`Media stored at: ${mediaUrl}`);
              } else {
                console.log('Failed to download media, message will be saved without media URL');
              }
            } else if (hasMedia) {
              console.log(`Skipping media download for historical message ${messageId}`);
            }

            const lastText = messageType === 'text' ? (content || '')
              : messageType === 'image' ? '📷 Imagem'
              : messageType === 'video' ? '🎥 Vídeo'
              : messageType === 'audio' ? '🎤 Áudio'
              : messageType === 'document' ? `📄 ${mediaFilename || 'Documento'}`
              : messageType === 'sticker' ? '🏷️ Sticker'
              : content || `[${messageType}]`;

            // ===== MESSAGE STORAGE (only if conversations/messages tables exist) =====
            // These operations are wrapped to allow the AI agent flow to continue even if tables don't exist
            if (hasConversationsTable && conversationId) {
              try {
                // Check if message already exists IN THIS CONVERSATION
                const { data: existingMsg, error: existingMsgError } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('message_id', messageId)
                  .eq('conversation_id', conversationId)
                  .single();
                
                // Skip message storage if messages table doesn't exist
                if (existingMsgError?.code === 'PGRST205') {
                  console.log('messages table not found - skipping message storage');
                } else if (!existingMsg) {
                  // Insert the message
                  const { error: msgError } = await supabase
                    .from('messages')
                    .insert({
                      conversation_id: conversationId,
                      user_id: whatsappNumber.user_id,
                      message_id: messageId,
                      remote_jid: remoteJid,
                      from_me: fromMe,
                      message_type: messageType,
                      content: content || (hasMedia ? `[${messageType}]` : ''),
                      media_url: mediaUrl,
                      media_filename: mediaFilename,
                      media_mimetype: mediaMimetype,
                      interactive: interactive,
                      status: fromMe ? 'sent' : 'received',
                      sender_jid: isGroup ? senderJidForGroup : null,
                      sender_name: isGroup ? senderName : null,
                      quoted_message_id: quotedMessageId,
                      created_at: messageOccurredAt,
                    });

                  if (msgError) {
                    if (msgError.code !== 'PGRST205') {
                      console.error('Error inserting message:', msgError);
                    }
                  } else {
                    console.log('Message inserted successfully');
                  }

                  // Update conversation
                  const updateData: Record<string, unknown> = {
                    last_message: lastText,
                    last_message_at: messageOccurredAt,
                    updated_at: messageOccurredAt,
                  };
                  
                  if (data.pushName) {
                    updateData.contact_name = data.pushName;
                  }
                  
                  // If message is from lead (not from me), increment unread count
                  if (!fromMe) {
                    const { data: conv } = await supabase
                      .from('conversations')
                      .select('unread_count')
                      .eq('id', conversationId)
                      .single();
                    
                    updateData.unread_count = (conv?.unread_count || 0) + 1;
                  }
                  
                  await supabase
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversationId);
                }
              } catch (msgTableError) {
                console.log('Message storage operations failed (tables may not exist):', msgTableError);
              }
            }

            // ===== CURRENT CHAT SYSTEM SYNC (chat_conversations/chat_messages) =====
            if (!isGroup) {
              try {
                const chatConnection = await findEvolutionChatConnection(whatsappNumber.user_id, whatsappNumber.phone_number);
                if (chatConnection) {
                  const chatConversation = await upsertChatConversation({
                    userId: whatsappNumber.user_id,
                    connectionId: chatConnection.id,
                    contactPhone: rawPhone,
                    contactName: data.pushName || null,
                    lastMessageText: lastText,
                    lastMessageType: messageType,
                    direction: fromMe ? 'outbound' : 'inbound',
                    occurredAt: messageOccurredAt,
                  });

                  if (chatConversation?.id) {
                    await insertChatMessage({
                      conversationId: chatConversation.id,
                      userId: whatsappNumber.user_id,
                      messageId,
                      direction: fromMe ? 'outbound' : 'inbound',
                      messageType,
                      content: content || null,
                      mediaUrl,
                      mediaMimeType: mediaMimetype,
                      mediaFilename,
                      mediaCaption: messageType !== 'text' ? (content || null) : null,
                      status: fromMe ? 'sent' : 'delivered',
                      occurredAt: messageOccurredAt,
                      metadata: {
                        provider: 'evolution',
                        instance_name: instance,
                        quoted_message_id: quotedMessageId,
                      },
                    });
                  }
                }
              } catch (chatSyncError) {
                console.error('Error syncing current chat tables:', chatSyncError);
              }
            }
            
            // ===== REVENUE TRACKING: OUTBOUND =====
            if (fromMe && canonicalLeadPhone) {
              await fireRevenueEvent({
                user_id: whatsappNumber.user_id,
                phone_e164: canonicalLeadPhone,
                number_instance_id: whatsappNumber.id,
                direction: 'outbound',
                message_content: content,
              });
            }

            // ===== LEAD STATUS UPDATES (works without conversations/messages tables) =====
            if (!fromMe && !isGroup && !isHistoricalSyncMessage) {
              const ownCanonicalPhone = normalizeBrazilianMobileE164(String(whatsappNumber?.phone_number || ''));
              const effectiveLeadPhone = ownCanonicalPhone && canonicalLeadPhone === ownCanonicalPhone
                ? null
                : canonicalLeadPhone;

              if (!effectiveLeadPhone) {
                console.log('Skipping Revenue/CRM for invalid or self inbound phone:', rawPhone);
              } else {
                // ===== REVENUE TRACKING: INBOUND (always fire, regardless of CRM lead) =====
                await fireRevenueEvent({
                  user_id: whatsappNumber.user_id,
                  phone_e164: effectiveLeadPhone,
                  number_instance_id: whatsappNumber.id,
                  direction: 'inbound',
                  message_content: content,
                  lead_name: data.pushName || undefined,
                });

                console.log('=== LEAD LOOKUP (inbound) ===');
                console.log('Raw phone:', rawPhone);
                console.log('Canonical phone:', effectiveLeadPhone);

                // Multi-format phone lookup to handle different stored formats
                const phonesToTryInbound = [effectiveLeadPhone];
                const rawNormalized = String(rawPhone).replace(/\D/g, '');
                if (rawNormalized && rawNormalized !== effectiveLeadPhone) {
                  phonesToTryInbound.push(rawNormalized);
                }
                if (rawNormalized.startsWith('55') && rawNormalized.length >= 12) {
                  phonesToTryInbound.push(rawNormalized.slice(2));
                }
                // Also try last 8 digits fallback
                const last8 = rawNormalized.slice(-8);

                console.log('Phones to try (inbound):', phonesToTryInbound);

                let existingLead: any = null;
                for (const phoneAttempt of phonesToTryInbound) {
                  const { data: foundLead } = await supabase
                    .from('leads')
                    .select('id, phone, pipeline_stage_id, whatsapp_status')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('phone', phoneAttempt)
                    .limit(1)
                    .maybeSingle();
                  if (foundLead) {
                    existingLead = foundLead;
                    console.log(`Lead found with phone format: ${phoneAttempt}`);
                    break;
                  }
                }

                // Last resort: match by last 8 digits using DB function
                if (!existingLead && last8.length === 8) {
                  const { data: fallbackLeads } = await supabase
                    .from('leads')
                    .select('id, phone, pipeline_stage_id, whatsapp_status')
                    .eq('user_id', whatsappNumber.user_id)
                    .limit(5);
                  
                  if (fallbackLeads) {
                    existingLead = fallbackLeads.find((l: any) => 
                      String(l.phone).replace(/\D/g, '').endsWith(last8)
                    ) || null;
                    if (existingLead) {
                      console.log(`Lead found via last-8-digits fallback: ${existingLead.phone}`);
                    }
                  }
                }

                const { data: respondeuStage } = await supabase
                  .from('pipeline_stages')
                  .select('id, position')
                  .eq('user_id', whatsappNumber.user_id)
                  .eq('name', 'Respondeu Mensagem')
                  .maybeSingle();

                if (existingLead) {
                  console.log('Found lead to update on response:', existingLead.id, 'phone:', existingLead.phone);

                  // Check if lead is in a human support stage — NEVER auto-move if so
                  let isInHumanSupportStage = false;
                  if (existingLead.pipeline_stage_id) {
                    // Get current stage name
                    const { data: currentStageInfo } = await supabase
                      .from('pipeline_stages')
                      .select('id, name, position')
                      .eq('id', existingLead.pipeline_stage_id)
                      .maybeSingle();

                    if (currentStageInfo) {
                      // Check if any agent has this stage configured as human support
                      const { data: agentsWithHumanStage } = await supabase
                        .from('ai_agents')
                        .select('id, crm_stage_on_unknown')
                        .eq('user_id', whatsappNumber.user_id)
                        .not('crm_stage_on_unknown', 'is', null);

                      if (agentsWithHumanStage && agentsWithHumanStage.length > 0) {
                        isInHumanSupportStage = agentsWithHumanStage.some(
                          (a: any) => a.crm_stage_on_unknown === currentStageInfo.name
                        );
                      }

                      if (isInHumanSupportStage) {
                        console.log(`Lead ${existingLead.id} is in human support stage "${currentStageInfo.name}" — will NOT auto-move`);
                      }
                    }
                  }

                  // Only move to "Respondeu Mensagem" if current stage is earlier AND not in human support
                  let shouldMoveToRespondeu = false;
                  if (!isInHumanSupportStage) {
                    if (existingLead.pipeline_stage_id && respondeuStage) {
                      const { data: currentStage } = await supabase
                        .from('pipeline_stages')
                        .select('position')
                        .eq('id', existingLead.pipeline_stage_id)
                        .single();

                      if (currentStage && currentStage.position < respondeuStage.position) {
                        shouldMoveToRespondeu = true;
                      }
                    } else if (respondeuStage) {
                      shouldMoveToRespondeu = true;
                    }
                  }

                  const leadUpdate: Record<string, unknown> = {
                    whatsapp_status: 'replied',
                    last_response: content || `[${messageType}]`,
                    last_response_at: new Date().toISOString(),
                    has_responded: true,
                    responded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };

                  if (shouldMoveToRespondeu && respondeuStage) {
                    leadUpdate.pipeline_stage_id = respondeuStage.id;
                    console.log(`Moving lead ${existingLead.id} to Respondeu Mensagem stage`);
                  }

                  const { error: leadUpdateError } = await supabase
                    .from('leads')
                    .update(leadUpdate)
                    .eq('id', existingLead.id);

                  if (leadUpdateError) {
                    console.error('Error updating lead:', leadUpdateError);
                  } else {
                    console.log('Lead updated with response data');

                    if (shouldMoveToRespondeu) {
                      await supabase.from('lead_activities').insert({
                        lead_id: existingLead.id,
                        user_id: whatsappNumber.user_id,
                        activity_type: 'stage_changed',
                        description: 'Movido automaticamente para Respondeu Mensagem (recebeu resposta)',
                        metadata: { automatic: true, trigger: 'webhook_response' },
                      });
                    }
                  }
                } else {
                  // Create CRM lead automatically when inbound message has no existing lead
                  const newLeadPayload: Record<string, unknown> = {
                    user_id: whatsappNumber.user_id,
                    phone: effectiveLeadPhone,
                    contact_name: data.pushName || null,
                    origin: 'whatsapp_inbound',
                    whatsapp_number_id: whatsappNumber.id,
                    whatsapp_status: 'replied',
                    has_responded: true,
                    responded_at: new Date().toISOString(),
                    last_response: content || `[${messageType}]`,
                    last_response_at: new Date().toISOString(),
                    first_message_sent: false,
                  };

                  if (respondeuStage?.id) {
                    newLeadPayload.pipeline_stage_id = respondeuStage.id;
                  }

                  const { data: createdLead, error: createLeadError } = await supabase
                    .from('leads')
                    .insert(newLeadPayload)
                    .select('id, phone')
                    .single();

                  if (createLeadError) {
                    console.error('Error creating lead from inbound message:', createLeadError);
                  } else {
                    existingLead = createdLead;
                    console.log('Lead created automatically from inbound message:', createdLead?.id, createdLead?.phone);

                    await supabase.from('lead_activities').insert({
                      lead_id: createdLead.id,
                      user_id: whatsappNumber.user_id,
                      activity_type: 'lead_created',
                      description: 'Lead criado automaticamente por mensagem recebida',
                      metadata: { automatic: true, trigger: 'webhook_inbound' },
                    });
                  }
                }

                // Continue with campaign detection only if lead was found/created
                if (existingLead) {
                  // ===== CAMPAIGN RESPONSE DETECTION =====
                  const { data: runningCampaigns } = await supabase
                    .from('whatsapp_campaigns')
                    .select('id, name, current_window, total_responses')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('whatsapp_number_id', whatsappNumber.id)
                    .in('status', ['running', 'paused']);
                
                if (runningCampaigns && runningCampaigns.length > 0) {
                  console.log('=== CAMPAIGN RESPONSE CHECK ===');
                  
                  for (const campaign of runningCampaigns) {
                    const { data: existingResponses } = await supabase
                      .from('campaign_responses')
                      .select('id')
                        .eq('campaign_id', campaign.id)
                        .eq('contact_phone', effectiveLeadPhone)
                      .limit(1);
                    
                    if (!existingResponses || existingResponses.length === 0) {
                      const { data: ignoredContacts } = await supabase
                        .from('ignored_contacts')
                        .select('first_message_sent_at')
                        .eq('user_id', whatsappNumber.user_id)
                        .eq('phone', effectiveLeadPhone)
                        .eq('campaign_id', campaign.id)
                        .limit(1);
                      
                      const ignoredContact = ignoredContacts && ignoredContacts.length > 0 ? ignoredContacts[0] : null;
                      
                      if (!ignoredContact?.first_message_sent_at) {
                        continue;
                      }
                      
                      const messageTimestamp = data?.messageTimestamp 
                        ? new Date(Number(data.messageTimestamp) * 1000) 
                        : new Date();
                      
                      const messageSentAt = new Date(ignoredContact.first_message_sent_at);
                      const secondsSinceSent = (messageTimestamp.getTime() - messageSentAt.getTime()) / 1000;
                      
                      const MIN_RESPONSE_TIME_SECONDS = 60;
                      
                      if (secondsSinceSent < MIN_RESPONSE_TIME_SECONDS) {
                        console.log(`⚠️ Response too fast (${secondsSinceSent.toFixed(0)}s), ignoring as bot`);
                        continue;
                      }
                      
                      console.log(`✅ HUMAN RESPONSE VALIDATED`);
                      
                      await supabase
                        .from('campaign_responses')
                        .insert({
                          campaign_id: campaign.id,
                          user_id: whatsappNumber.user_id,
                          contact_phone: effectiveLeadPhone,
                          window_number: campaign.current_window || 1,
                          message_content: content?.substring(0, 500) || null,
                          responded_at: new Date().toISOString(),
                        });
                      
                      const newTotalResponses = (campaign.total_responses || 0) + 1;
                      const { data: campaignStatus } = await supabase
                        .from('whatsapp_campaigns')
                        .select('status, pause_reason, current_window')
                        .eq('id', campaign.id)
                        .single();
                      
                      const currentWindow = campaignStatus?.current_window || 1;
                      
                      if (currentWindow < 4) {
                        const newWindow = currentWindow + 1;
                        
                        if (campaignStatus?.status === 'paused' && campaignStatus?.pause_reason === 'waiting_response') {
                          await supabase
                            .from('whatsapp_campaigns')
                            .update({ 
                              status: 'running',
                              pause_reason: null,
                              current_window: newWindow,
                              window_sent_count: 0,
                              total_responses: newTotalResponses,
                              window_unlocked_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', campaign.id);
                          
                          console.log(`🎉 WINDOW UNLOCKED! Campaign resumed on Window ${newWindow}`);
                        } else {
                          await supabase
                            .from('whatsapp_campaigns')
                            .update({ 
                              total_responses: newTotalResponses,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', campaign.id);
                        }
                      } else {
                        await supabase
                          .from('whatsapp_campaigns')
                          .update({ 
                            total_responses: newTotalResponses,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', campaign.id);
                      }
                    }
                  }
                  
                  // Remove from ignored_contacts
                  await supabase
                    .from('ignored_contacts')
                    .delete()
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('phone', effectiveLeadPhone);
                }
              }
              }
              
              // ===== WA FLOW RUNNER (production flows) =====
              const buttonId = actualMessageData.buttonResponseMessage?.selectedButtonId ||
                actualMessageData.listResponseMessage?.singleSelectReply?.selectedRowId ||
                actualMessageData.templateButtonReplyMessage?.selectedId || null;
              const buttonTitle = actualMessageData.buttonResponseMessage?.selectedDisplayText ||
                actualMessageData.listResponseMessage?.title ||
                actualMessageData.templateButtonReplyMessage?.selectedDisplayText || null;

              if (!fromMe && !isGroup && !isHistoricalSyncMessage && effectiveLeadPhone) {
                try {
                  await fetch(`${SUPABASE_URL}/functions/v1/wa-flow-runner`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({
                      user_id: whatsappNumber.user_id,
                      lead_phone: effectiveLeadPhone,
                      lead_name: data.pushName || null,
                      incoming_text: content || null,
                      button_id: buttonId,
                      button_title: buttonTitle,
                      source: 'evolution',
                      whatsapp_number_id: whatsappNumber.id,
                      instance_name: instance,
                    }),
                  }).catch((e) => console.error('[evolution-webhook] wa-flow-runner invoke failed:', e));
                } catch (flowErr) {
                  console.error('[evolution-webhook] wa-flow-runner error:', flowErr);
                }
              }

              // ===== AI AGENT INTEGRATION =====
              // Ignore group and historical sync messages to avoid replay loops and instability
              if (isGroup) {
                console.log('Skipping AI agent processing for group message:', remoteJid);
              } else if (isHistoricalSyncMessage) {
                console.log('Skipping AI agent processing for historical sync message:', remoteJid);
              } else {
                try {
                  const { data: activeAgents } = await supabase
                    .from('ai_agents')
                    .select('id, name, status, objective')
                    .eq('whatsapp_number_id', whatsappNumber.id)
                    .eq('status', 'active');
                  
                  const activeAgent = (activeAgents || []).find((a: any) => a.objective !== 'warming') || (activeAgents || [])[0] || null;
                  
                  if (activeAgent) {
                    console.log('=== AI AGENT DETECTED ===');
                    console.log('Agent:', activeAgent.name, activeAgent.id);
                    console.log('Forwarding message to agent-webhook...');
                    
                    // Get lead name from contact or pushName
                    const leadName = data.pushName || 'Lead';
                    
                    // If message is audio, transcribe it before forwarding to agent
                    let agentMessage = content || `[${messageType}]`;
                    let agentMessageType: string | undefined = undefined;
                    
                    if (messageType === 'audio' && mediaUrl && OPENAI_API_KEY) {
                      try {
                        console.log('Transcribing audio for AI agent...');
                        
                        // Download the audio file from storage
                        const audioResponse = await fetch(mediaUrl);
                        if (audioResponse.ok) {
                          const audioBlob = await audioResponse.blob();
                          
                          // Send to OpenAI Whisper for transcription
                          const formData = new FormData();
                          formData.append('file', audioBlob, 'audio.ogg');
                          formData.append('model', 'whisper-1');
                          formData.append('language', 'pt');
                          
                          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${OPENAI_API_KEY}`,
                            },
                            body: formData,
                          });
                          
                          if (whisperResponse.ok) {
                            const whisperResult = await whisperResponse.json();
                            const transcription = whisperResult.text?.trim();
                            
                            if (transcription) {
                              agentMessage = transcription;
                              agentMessageType = 'audio';
                              console.log('Audio transcribed successfully:', transcription.substring(0, 100));
                            } else {
                              agentMessage = '[Áudio recebido - não foi possível transcrever]';
                              agentMessageType = 'audio';
                              console.log('Whisper returned empty transcription');
                            }
                          } else {
                            console.error('Whisper API error:', whisperResponse.status, await whisperResponse.text());
                            agentMessage = '[Áudio recebido - erro na transcrição]';
                            agentMessageType = 'audio';
                          }
                        } else {
                          console.error('Failed to download audio for transcription:', audioResponse.status);
                          agentMessage = '[Áudio recebido]';
                          agentMessageType = 'audio';
                        }
                      } catch (transcribeError) {
                        console.error('Error transcribing audio:', transcribeError);
                        agentMessage = '[Áudio recebido - erro na transcrição]';
                        agentMessageType = 'audio';
                      }
                    }
                    
                    // Forward to agent-webhook asynchronously (don't wait for response)
                    const agentWebhookUrl = `${SUPABASE_URL}/functions/v1/agent-webhook?agent_id=${activeAgent.id}&action=receive`;
                    
                    fetch(agentWebhookUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                      },
                      body: JSON.stringify({
                        phone: normalizedPhone,
                        message: agentMessage,
                        lead_name: leadName,
                        message_type: agentMessageType,
                      }),
                    })
                    .then(res => {
                      console.log('Agent webhook response status:', res.status);
                      return res.json();
                    })
                    .then(agentData => {
                      console.log('Agent webhook response:', JSON.stringify(agentData));
                    })
                    .catch(err => {
                      console.error('Error calling agent webhook:', err);
                    });
                    
                    console.log('Message forwarded to AI agent (async)');
                  }
                } catch (agentCheckError) {
                  // Ignore errors - agent integration is optional
                  console.log('AI agent check skipped:', agentCheckError);
                }
              }
            } else {
                // ===== MESSAGE SENT (fromMe=true) - MOVE TO "MENSAGEM ENVIADA" =====
                
                // ===== PAUSE AI AGENT WHEN USER RESPONDS TO LEAD =====
                // Check if there's an AI agent for this number (active OR paused) and handle handoff
                // EXCEPTION: "atendimento" objective agents don't follow this rule
                try {
                  const { data: relevantAgents } = await supabase
                    .from('ai_agents')
                    .select('id, name, objective, status, crm_stage_on_unknown')
                    .eq('whatsapp_number_id', whatsappNumber.id)
                    .in('status', ['active', 'paused']);
                  
                  if (relevantAgents && relevantAgents.length > 0) {
                    // Also try canonical phone format for matching
                    const canonicalPhoneForAgent = normalizeBrazilianMobileE164(normalizedPhone);
                    
                    for (const activeAgent of relevantAgents) {
                      // Skip atendimento agents - they continue even when user responds
                      if (activeAgent.objective === 'atendimento') {
                        console.log(`Skipping pause for atendimento agent: ${activeAgent.name}`);
                        continue;
                      }
                      
                      // Find conversation for this lead with this agent (try both phone formats)
                      let agentConv = null;
                      const { data: conv1 } = await supabase
                        .from('agent_conversations')
                        .select('id, status, agent_manually_paused')
                        .eq('agent_id', activeAgent.id)
                        .eq('lead_phone', normalizedPhone)
                        .maybeSingle();
                      
                      agentConv = conv1;
                      
                      // If not found, try canonical E164 format
                      if (!agentConv && canonicalPhoneForAgent && canonicalPhoneForAgent !== normalizedPhone) {
                        const { data: conv2 } = await supabase
                          .from('agent_conversations')
                          .select('id, status, agent_manually_paused')
                          .eq('agent_id', activeAgent.id)
                          .eq('lead_phone', canonicalPhoneForAgent)
                          .maybeSingle();
                        agentConv = conv2;
                      }
                      
                      // Also try without country code prefix
                      if (!agentConv && normalizedPhone.startsWith('55') && normalizedPhone.length >= 12) {
                        const withoutCountry = normalizedPhone.slice(2);
                        const { data: conv3 } = await supabase
                          .from('agent_conversations')
                          .select('id, status, agent_manually_paused')
                          .eq('agent_id', activeAgent.id)
                          .eq('lead_phone', withoutCountry)
                          .maybeSingle();
                        agentConv = conv3;
                      }
                      
                      if (agentConv) {
                        console.log(`Found agent conversation ${agentConv.id} for phone ${normalizedPhone} with agent ${activeAgent.name} (status: ${activeAgent.status})`);
                        
                        // Log the user's manual message for AI context
                        await supabase.from('agent_message_logs').insert({
                          agent_id: activeAgent.id,
                          conversation_id: agentConv.id,
                          direction: 'sent',
                          content: content || `[${messageType}]`,
                          message_type: 'user_manual',
                          processed_at: new Date().toISOString(),
                        });
                        
                        // Clear any buffered messages for this conversation
                        await supabase
                          .from('agent_message_buffer')
                          .delete()
                          .eq('conversation_id', agentConv.id);
                        
                        // Clear processing flags so buffer doesn't pick it up
                        await supabase
                          .from('agent_conversations')
                          .update({
                            process_after: null,
                            is_processing: false,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', agentConv.id);
                        
                        // Move lead to human support CRM stage — agent naturally stops responding there
                        if (activeAgent.crm_stage_on_unknown) {
                          try {
                            const { data: humanStage } = await supabase
                              .from('pipeline_stages')
                              .select('id')
                              .eq('user_id', whatsappNumber.user_id)
                              .eq('name', activeAgent.crm_stage_on_unknown)
                              .maybeSingle();
                            
                            if (humanStage) {
                              // Try multiple phone formats to find the lead
                              const canonicalForCRM = normalizeBrazilianMobileE164(normalizedPhone);
                              const phonesToTry = [canonicalForCRM, normalizedPhone];
                              if (normalizedPhone.startsWith('55') && normalizedPhone.length >= 12) {
                                phonesToTry.push(normalizedPhone.slice(2));
                              }
                              
                              let leadToMove = null;
                              for (const phoneAttempt of phonesToTry) {
                                if (!phoneAttempt) continue;
                                const { data: foundLead } = await supabase
                                  .from('leads')
                                  .select('id, pipeline_stage_id')
                                  .eq('user_id', whatsappNumber.user_id)
                                  .eq('phone', phoneAttempt)
                                  .maybeSingle();
                                if (foundLead) {
                                  leadToMove = foundLead;
                                  console.log(`Found lead ${foundLead.id} with phone format: ${phoneAttempt}`);
                                  break;
                                }
                              }
                              
                              if (leadToMove && leadToMove.pipeline_stage_id !== humanStage.id) {
                                await supabase
                                  .from('leads')
                                  .update({ 
                                    pipeline_stage_id: humanStage.id,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', leadToMove.id);
                                
                                await supabase.from('lead_activities').insert({
                                  lead_id: leadToMove.id,
                                  user_id: whatsappNumber.user_id,
                                  activity_type: 'stage_change',
                                  description: `Movido automaticamente para "${activeAgent.crm_stage_on_unknown}" — humano assumiu o atendimento`,
                                });
                                
                                console.log(`Lead ${normalizedPhone} moved to human support stage "${activeAgent.crm_stage_on_unknown}"`);
                              } else if (!leadToMove) {
                                console.log(`No lead found for phone ${normalizedPhone} (tried: ${phonesToTry.filter(Boolean).join(', ')})`);
                              } else {
                                console.log(`Lead already in human support stage, skipping move`);
                              }
                            } else {
                              console.log(`Human support stage "${activeAgent.crm_stage_on_unknown}" not found for user ${whatsappNumber.user_id}`);
                            }
                          } catch (crmMoveError) {
                            console.error('Error moving lead to human support stage:', crmMoveError);
                          }
                        } else {
                          console.log(`Agent ${activeAgent.name} has no crm_stage_on_unknown configured`);
                        }
                        
                        console.log(`AI Agent ${activeAgent.name}: human took over lead ${normalizedPhone}, moved to human support column`);
                      } else {
                        console.log(`No agent conversation found for phone ${normalizedPhone} with agent ${activeAgent.name} (tried canonical: ${canonicalPhoneForAgent})`);
                      }
                    }
                  }
                } catch (agentPauseError) {
                  console.error('Error pausing AI agent:', agentPauseError);
                }
                
                await updateLeadStatusByTail({
                  userId: whatsappNumber.user_id,
                  phone: rawPhone,
                  direction: 'outbound',
                  timestamp: messageOccurredAt,
                  content: content || lastText,
                  conversationId: null,
                });
              }
            }
            
            // ===== WARMING RESPONSE DETECTION (runs for all received messages) =====
            // This is OUTSIDE the if/else block, so it runs for both fromMe and !fromMe
            // We only process for received messages (!fromMe)
            if (!fromMe) {
              if (!whatsappNumber) {
                console.log('Warming detection skipped: whatsapp number not found for instance', instance);
              } else {
                const normalizedLeadPhone = rawPhone.replace(/\D/g, '');
                const leadPhoneLast8 = normalizedLeadPhone.slice(-8);
                const warmingMessageText = String(
                  data?.message?.conversation ||
                  data?.message?.extendedTextMessage?.text ||
                  data?.message?.imageMessage?.caption ||
                  data?.message?.videoMessage?.caption ||
                  ''
                ).trim();
                
                console.log(`Checking warming interactions for lead ${normalizedLeadPhone} (last8: ${leadPhoneLast8}) on user ${whatsappNumber.user_id}`);

                try {
                  // Fetch interactions directly using user_id which is present on the table
                  const { data: warmingInteractions, error: warmingError } = await supabase
                    .from('warming_interactions')
                    .select('*')
                    .eq('user_id', whatsappNumber.user_id)
                    .in('status', ['in_progress', 'completed', 'pending_response'])
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
                  
                  if (warmingError) {
                    console.error('Error fetching warming interactions:', warmingError);
                  } else {
                    console.log(`Found ${warmingInteractions?.length || 0} interactions for user ${whatsappNumber.user_id}`);
                    if (warmingInteractions && warmingInteractions.length > 0) {
                      console.log('Sample interaction phone:', warmingInteractions[0].lead_phone);
                    }
                  }
                
                if (warmingInteractions && warmingInteractions.length > 0) {
                  const matchingInteraction = warmingInteractions.find((i: any) => {
                    const interactionPhoneLast8 = i.lead_phone.replace(/\D/g, '').slice(-8);
                    return interactionPhoneLast8 === leadPhoneLast8;
                  });
                  
                  if (matchingInteraction) {
                    console.log('=== WARMING RESPONSE DETECTED ===');
                    console.log('Lead message:', warmingMessageText);
                    console.log('Interaction status:', matchingInteraction.status);
                    console.log('Messages sent so far:', matchingInteraction.messages_sent);

                    // ===== AI MODE: delegate to warming-reply-processor =====
                    let aiDelegated = false;
                    try {
                      const { data: sessionRow } = await supabase
                        .from('warming_sessions')
                        .select('ai_mode, status')
                        .eq('id', matchingInteraction.session_id)
                        .maybeSingle();

                      if (sessionRow?.ai_mode === true && sessionRow?.status === 'active') {
                        console.log('[warming] AI mode enabled — delegating to warming-reply-processor');
                        const supaUrl = Deno.env.get('SUPABASE_URL')!;
                        const srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                        await fetch(`${supaUrl}/functions/v1/warming-reply-processor`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${srv}`,
                            apikey: srv,
                          },
                          body: JSON.stringify({
                            mode: 'inbound',
                            user_id: whatsappNumber.user_id,
                            from_phone: normalizedLeadPhone,
                            message_text: warmingMessageText,
                            instance_name: instance,
                          }),
                        }).catch((e) => console.error('[warming] delegate error', e));
                        aiDelegated = true;
                      }
                    } catch (delegateErr) {
                      console.error('[warming] AI delegation check failed, falling back to classic:', delegateErr);
                    }

                    if (!aiDelegated) {

                    const messagesReceived = matchingInteraction.messages_received + 1;
                    const warmingLevel = matchingInteraction.warming_level || 1;
                    
                    // SIMPLIFIED: After lead responds, send ONE reply saying it was wrong number, then end
                    // Only respond once per interaction - if we already sent more than the initial message, don't respond again
                    const shouldRespond = warmingLevel >= 2 
                      && !matchingInteraction.conversation_ended 
                      && messagesReceived === 1; // Only respond to the FIRST reply from the lead
                    
                    let responseMessage: string | null = null;
                    let shouldEndConversation = false;
                    
                    if (shouldRespond && warmingMessageText) {
                      const messageText = warmingMessageText;
                      
                      // Safety pattern 1: Stop/block requests (hardcoded for safety)
                      const stopPatterns = [/para\s*(de\s*)?mandar/i, /não\s*mande\s*mais/i, /nao\s*mande\s*mais/i, /me\s*bloqueia/i, /spam/i, /sai\s*fora/i, /chega/i];
                      const isStopRequest = stopPatterns.some(p => p.test(messageText));
                      
                      if (isStopRequest) {
                        const stopResponses = ['Desculpa pelo incômodo!', 'Desculpa, não vou mais incomodar!', 'Foi mal, desculpa!'];
                        responseMessage = stopResponses[Math.floor(Math.random() * stopResponses.length)];
                        shouldEndConversation = true;
                        console.log('Stop request detected, ending conversation');
                      }
                      
                      // Safety pattern 2: "Who are you" questions - handle differently by level
                      if (!responseMessage) {
                        const whoPatterns = [/quem\s*(é|e)\s*(voce|você|vc)/i, /quem\s*fala/i, /de\s*onde/i, /te\s*conheço/i, /como\s*(conseguiu|pegou)\s*(meu|o)\s*número/i];
                        if (whoPatterns.some(p => p.test(messageText))) {
                          if (warmingLevel <= 2) {
                            // Levels 1-2: wrong number excuse
                            const whoResponses = ['Desculpa, acho que errei o número!', 'Opa, desculpa! Número errado', 'Ih, desculpa! Número errado'];
                            responseMessage = whoResponses[Math.floor(Math.random() * whoResponses.length)];
                          }
                          // Levels 3-4: let AI handle contextually (will fall through to AI block below)
                          if (responseMessage) {
                            shouldEndConversation = true;
                            console.log('Who-are-you detected (level 1-2), ending conversation');
                          }
                        }
                      }
                      
                      // Safety pattern 3: Bot responses
                      if (!responseMessage) {
                        const botPatterns = [/mensagem automática/i, /resposta automática/i, /fora do horário/i, /digite.*opção/i, /selecione.*opção/i, /menu.*opções/i, /assistente virtual/i, /bem-vindo.*atendimento/i, /retornaremos.*breve/i];
                        if (botPatterns.some(p => p.test(messageText))) {
                          shouldEndConversation = true;
                          console.log('Bot response detected, ending conversation silently');
                        }
                      }
                      
                      // Generate contextual AI response
                      if (!responseMessage && !shouldEndConversation) {
                        console.log(`Generating contextual response for warming level ${warmingLevel}`);
                        
                        // Try AI with lead context
                        const aiResponse = await generateWarmingAIResponse(
                          messageText,
                          warmingLevel,
                          messagesReceived,
                          matchingInteraction.lead_name,
                          null // company_name not stored in interaction yet
                        );
                        
                        if (aiResponse) {
                          responseMessage = aiResponse;
                        } else {
                          // Fallback templates
                          if (warmingLevel <= 2) {
                            const wrongNumberResponses = [
                              'opa desculpa, errei o número!',
                              'ih foi mal, número errado',
                              'desculpa, confundi o contato!',
                            ];
                            responseMessage = wrongNumberResponses[Math.floor(Math.random() * wrongNumberResponses.length)];
                          } else {
                            const contextResponses = [
                              'Que bom! Vou te mandar mais informações depois então',
                              'Obrigado pela atenção! Qualquer coisa estou por aqui',
                              'Valeu! Se precisar de algo, é só chamar',
                            ];
                            responseMessage = contextResponses[Math.floor(Math.random() * contextResponses.length)];
                          }
                        }
                        shouldEndConversation = true; // End after responding
                        console.log(`Response: "${responseMessage}" - ending conversation`);
                      }
                    } else if (messagesReceived > 1 && !matchingInteraction.conversation_ended) {
                      // Lead sent another message after we already responded - just end silently
                      shouldEndConversation = true;
                      console.log('Lead sent follow-up after our response, ending conversation silently');
                    }
                    
                    // Update the interaction
                    const updateData: Record<string, unknown> = {
                      messages_received: messagesReceived,
                      last_response_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    
                    if (responseMessage) {
                      // SEND RESPONSE IMMEDIATELY via Evolution API (no more queuing)
                      console.log(`Sending warming response immediately: "${responseMessage}"`);
                      
                      const sent = await sendWarmingResponseDirect(
                        instance,
                        normalizedLeadPhone,
                        responseMessage,
                        instanceApiCreds
                      );
                      
                      if (sent) {
                        // Response sent successfully - update status directly
                        updateData.status = shouldEndConversation ? 'completed' : 'in_progress';
                        updateData.last_message_sent = responseMessage;
                        updateData.messages_sent = matchingInteraction.messages_sent + 1;
                        updateData.last_message_at = new Date().toISOString();
                        if (shouldEndConversation) {
                          updateData.conversation_ended = true;
                        }
                        console.log(`✓ Warming response sent and interaction updated (end: ${shouldEndConversation})`);
                      } else {
                        // Failed to send - queue for warming-processor as fallback
                        updateData.status = 'pending_response';
                        updateData.last_message_sent = responseMessage;
                        if (shouldEndConversation) {
                          updateData.conversation_ended = true;
                        }
                        console.log('✗ Failed to send immediately, queued for warming-processor');
                      }
                    } else if (!shouldRespond) {
                      updateData.conversation_ended = true;
                      updateData.status = 'completed';
                      console.log('Conversation completed (max messages reached or level 1)');
                    }
                    
                    await supabase
                      .from('warming_interactions')
                      .update(updateData)
                      .eq('id', matchingInteraction.id);
                    
                    console.log(`Updated warming interaction ${matchingInteraction.id}: received=${messagesReceived}, status=${updateData.status || 'unchanged'}`);
                    } // end if (!aiDelegated)
                  }
                }
                } catch (warmingError) {
                  console.log('Warming detection skipped:', warmingError);
                }
              }
            }
          }
        break;

      case 'messages.edit':
      case 'message.edit':
      case 'messagesedit':
      case 'messageedit':
        // Message was edited by contact or by user on phone
        console.log('=== MESSAGE EDIT EVENT ===');
        console.log('Edit data:', JSON.stringify(data));

        {
          const editedMessage =
            data?.editedMessage ??
            data?.message?.editedMessage ??
            data?.message?.protocolMessage?.editedMessage ??
            data?.update?.editedMessage ??
            data?.update?.message?.editedMessage ??
            data?.update?.message?.protocolMessage?.editedMessage;

          const protocolMessage =
            data?.message?.protocolMessage ??
            data?.update?.message?.protocolMessage ??
            data?.protocolMessage ??
            data?.update?.protocolMessage;

          const key =
            data?.key ??
            data?.update?.key ??
            editedMessage?.key ??
            protocolMessage?.key ??
            {};

          const candidateIds = Array.from(
            new Set(
              [
                key?.id,
                data?.key?.id,
                data?.update?.key?.id,
                data?.keyId,
                data?.update?.keyId,
                data?.id,
                data?.update?.id,
                data?.messageId,
                data?.update?.messageId,
                protocolMessage?.key?.id,
              ].filter((v): v is string => typeof v === 'string' && v.length > 0)
            )
          );

          const newContent =
            editedMessage?.message?.conversation ??
            editedMessage?.message?.extendedTextMessage?.text ??
            editedMessage?.extendedTextMessage?.text ??
            editedMessage?.conversation ??
            protocolMessage?.editedMessage?.message?.conversation ??
            protocolMessage?.editedMessage?.message?.extendedTextMessage?.text ??
            protocolMessage?.editedMessage?.extendedTextMessage?.text ??
            data?.message?.text ??
            data?.update?.message?.text ??
            data?.newContent ??
            data?.update?.newContent ??
            data?.text ??
            data?.update?.text ??
            '';

          console.log('Edit - candidateIds:', candidateIds);
          console.log('Edit - newContent:', newContent?.substring(0, 120));

          if (candidateIds.length && newContent) {
            const { data: whatsappNumber } = await supabase
              .from('whatsapp_numbers')
              .select('id, user_id')
              .eq('instance_name', instance)
              .single();

            if (whatsappNumber) {
              const { data: matches, error: findErr } = await supabase
                .from('messages')
                .select('id, conversation_id, message_id')
                .eq('user_id', whatsappNumber.user_id)
                .in('message_id', candidateIds)
                .limit(1);

              if (findErr) {
                console.error('Error finding message for edit:', findErr);
                break;
              }

              const existingMsg = matches?.[0];

              if (existingMsg) {
                console.log('Updating edited message:', existingMsg.id, 'message_id:', existingMsg.message_id);

                const { error: updateError } = await supabase
                  .from('messages')
                  .update({
                    content: newContent,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingMsg.id);

                if (updateError) {
                  console.error('Error updating edited message:', updateError);
                } else {
                  console.log('Message edited successfully in database');

                  const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('conversation_id', existingMsg.conversation_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (lastMsg && lastMsg.id === existingMsg.id) {
                    await supabase
                      .from('conversations')
                      .update({
                        last_message: newContent.substring(0, 100),
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', existingMsg.conversation_id);
                    console.log('Updated conversation last_message');
                  }
                }
              } else {
                console.log('Message not found for edit. candidateIds:', candidateIds);
              }
            }
          } else {
            console.log('Could not extract candidateIds or newContent from edit event');
          }
        }
        break;

      case 'messages.update':
      case 'message.update':
      case 'messageupdate':
        // Message status update (delivered, read, etc) OR edit event
        // Evolution API can send edit events as messages.update with protocolMessage
        console.log('=== MESSAGE STATUS/EDIT UPDATE ===');
        console.log('Raw data:', JSON.stringify(data));

        {
          const editedMessage =
            data?.editedMessage ??
            data?.message?.editedMessage ??
            data?.message?.protocolMessage?.editedMessage ??
            data?.update?.editedMessage ??
            data?.update?.message?.editedMessage ??
            data?.update?.message?.protocolMessage?.editedMessage;

          const protocolMessage =
            data?.message?.protocolMessage ??
            data?.update?.message?.protocolMessage ??
            data?.protocolMessage ??
            data?.update?.protocolMessage;

          const hasEdit = !!editedMessage || !!protocolMessage?.editedMessage;

          if (hasEdit) {
            console.log('Detected edit within messages.update, processing as edit');

            const key =
              data?.key ??
              data?.update?.key ??
              editedMessage?.key ??
              protocolMessage?.key ??
              {};

            const candidateIds = Array.from(
              new Set(
                [
                  key?.id,
                  data?.key?.id,
                  data?.update?.key?.id,
                  data?.keyId,
                  data?.update?.keyId,
                  data?.id,
                  data?.update?.id,
                  data?.messageId,
                  data?.update?.messageId,
                  protocolMessage?.key?.id,
                ].filter((v): v is string => typeof v === 'string' && v.length > 0)
              )
            );

            const newContent =
              editedMessage?.message?.conversation ??
              editedMessage?.message?.extendedTextMessage?.text ??
              editedMessage?.extendedTextMessage?.text ??
              editedMessage?.conversation ??
              protocolMessage?.editedMessage?.message?.conversation ??
              protocolMessage?.editedMessage?.message?.extendedTextMessage?.text ??
              protocolMessage?.editedMessage?.extendedTextMessage?.text ??
              data?.message?.text ??
              data?.update?.message?.text ??
              data?.newContent ??
              data?.update?.newContent ??
              data?.text ??
              data?.update?.text ??
              '';

            console.log('Edit via update - candidateIds:', candidateIds);
            console.log('Edit via update - newContent:', newContent?.substring(0, 120));

            if (candidateIds.length && newContent) {
              const { data: whatsappNumber } = await supabase
                .from('whatsapp_numbers')
                .select('id, user_id')
                .eq('instance_name', instance)
                .single();

              if (whatsappNumber) {
                const { data: matches, error: findErr } = await supabase
                  .from('messages')
                  .select('id, conversation_id, message_id')
                  .eq('user_id', whatsappNumber.user_id)
                  .in('message_id', candidateIds)
                  .limit(1);

                if (findErr) {
                  console.error('Error finding message for edit (update):', findErr);
                  break;
                }

                const existingMsg = matches?.[0];

                if (existingMsg) {
                  await supabase
                    .from('messages')
                    .update({
                      content: newContent,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingMsg.id);

                  console.log('Message edited via update event:', existingMsg.id, 'message_id:', existingMsg.message_id);

                  const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('conversation_id', existingMsg.conversation_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (lastMsg && lastMsg.id === existingMsg.id) {
                    await supabase
                      .from('conversations')
                      .update({
                        last_message: newContent.substring(0, 100),
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', existingMsg.conversation_id);
                  }
                } else {
                  console.log('Message not found for edit (update). candidateIds:', candidateIds);
                }
              }
            } else {
              console.log('Edit detected but missing candidateIds/newContent');
            }

            break;
          }
        }

        // Regular status update (not an edit)
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          console.log('Processing update item:', JSON.stringify(update));
          
          // Handle different payload structures from Evolution API v1 and v2
          const messageId = update?.key?.id || update?.id || update?.messageId;
          // Status can be in different places depending on API version
          const statusCode = update?.update?.status ?? update?.status ?? update?.ack;
          
          console.log('Extracted messageId:', messageId, 'statusCode:', statusCode);
          
          if (messageId && statusCode !== undefined) {
            // Map status codes to our status values
            // Evolution API: 0=error, 1=pending, 2=sent, 3=delivered, 4=read, 5=played
            // Some versions: 0=pending, 1=sent, 2=delivered, 3=read
            let status = 'sent';
            const numStatus = Number(statusCode);
            
            // Handle string status values too
            if (typeof statusCode === 'string') {
              status = statusCode.toLowerCase();
            } else {
              switch (numStatus) {
                case 0: status = 'pending'; break;
                case 1: status = 'sent'; break;
                case 2: status = 'delivered'; break;
                case 3: status = 'read'; break;
                case 4: status = 'read'; break; // played = read
                case 5: status = 'read'; break;
                default: status = 'sent';
              }
            }
            
            console.log(`Updating message ${messageId} to status: ${status}`);
            
            // Update legacy message status in database
            const { error, data: updatedMsg } = await supabase
              .from('messages')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('message_id', messageId)
              .select();
            
            if (error) {
              console.error('Error updating message status:', error);
            } else {
              console.log(`Message ${messageId} status updated to ${status}, rows:`, updatedMsg?.length);
            }

            const statusTimestamp = new Date().toISOString();
            const { data: updatedChatMessages, error: chatStatusError } = await supabase
              .from('chat_messages')
              .update({
                status,
                status_updated_at: statusTimestamp,
              })
              .eq('waba_message_id', messageId)
              .select('id, conversation_id');

            if (chatStatusError) {
              console.error('Error updating current chat message status:', chatStatusError);
            } else {
              console.log(`Current chat message ${messageId} status updated to ${status}, rows:`, updatedChatMessages?.length);
            }
          } else {
            console.log('Could not extract messageId or statusCode from update');
          }
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
          // IMPORTANT: Only set is_connected = true when state is 'open'
          // NEVER set is_connected = false from webhook events, as temporary states
          // like 'close' or 'connecting' would falsely mark numbers as disconnected
          // and cause the campaign-processor to pause campaigns prematurely.
          // Disconnection detection is handled by evolution-check-status (user-facing)
          // and the campaign-processor's own live connection check.
          if (state === 'open') {
            const { data: numberRow } = await supabase
              .from('whatsapp_numbers')
              .select('id, user_id, is_connected')
              .eq('instance_name', instanceName)
              .maybeSingle();

            // Track if this is a fresh connection (transition from false→true)
            // We use this below to gate side effects that should NOT run on every
            // repeated 'open' event (Evolution emits these periodically and
            // re-running webhook/set restarts the Baileys socket → ping-pong).
            const isFreshConnection = !numberRow?.is_connected;

            const apiCreds = await getApiCredentials(instanceName);
            const updatePayload: Record<string, any> = {
              is_connected: true,
              api_tier: apiCreds.tier,
              updated_at: new Date().toISOString(),
            };

            // Try to hydrate phone_number when connection opens (self-heal for null owner)
            // Strategy: try multiple sources to maximize chance of getting the phone number
            let ownerPhone: string | null = null;

            // Source 0: data.wuid (most reliable - directly from connection payload)
            if (!ownerPhone && data?.wuid) {
              const wuidDigits = String(data.wuid).replace(/\D/g, '');
              if (wuidDigits.length >= 10) {
                ownerPhone = wuidDigits.startsWith('55') ? wuidDigits : `55${wuidDigits}`;
                console.log(`[phone-hydrate] Got phone from data.wuid: ${ownerPhone}`);
              }
            }

            // Source 1: payload.sender (root-level sender from Evolution API)
            if (!ownerPhone && payload.sender) {
              const senderDigits = String(payload.sender).replace(/\D/g, '');
              if (senderDigits.length >= 10) {
                ownerPhone = senderDigits.startsWith('55') ? senderDigits : `55${senderDigits}`;
                console.log(`[phone-hydrate] Got phone from payload.sender: ${ownerPhone}`);
              }
            }

            // Source 2: fetchInstances API
            if (!ownerPhone) {
              try {
                const infoResponse = await fetch(`${apiCreds.url}/instance/fetchInstances?instanceName=${instanceName}`, {
                  method: 'GET',
                  headers: { 'apikey': apiCreds.apiKey },
                });

                if (infoResponse.ok) {
                  const infoData = await infoResponse.json();
                  const instanceInfo = Array.isArray(infoData)
                    ? infoData[0]
                    : (Array.isArray(infoData?.data) ? infoData.data[0] : infoData?.data || infoData);

                  const rawOwner =
                    instanceInfo?.owner ||
                    instanceInfo?.instance?.owner ||
                    instanceInfo?.number ||
                    instanceInfo?.instance?.number ||
                    instanceInfo?.wuid ||
                    instanceInfo?.instance?.wuid ||
                    instanceInfo?.instance?.jid ||
                    instanceInfo?.jid ||
                    null;

                  if (rawOwner) {
                    const ownerDigits = String(rawOwner).replace(/\D/g, '');
                    if (ownerDigits.length >= 10) {
                      ownerPhone = ownerDigits.startsWith('55') ? ownerDigits : `55${ownerDigits}`;
                      console.log(`[phone-hydrate] Got phone from fetchInstances: ${ownerPhone}`);
                    }
                  }
                }
              } catch (err) {
                console.log(`[phone-hydrate] fetchInstances failed:`, err);
              }
            }

            // Source 3: connectionState API (sometimes returns the owner number)
            if (!ownerPhone) {
              try {
                const connResponse = await fetch(`${apiCreds.url}/instance/connectionState/${instanceName}`, {
                  method: 'GET',
                  headers: { 'apikey': apiCreds.apiKey },
                });
                if (connResponse.ok) {
                  const connData = await connResponse.json();
                  const rawNum = connData?.instance?.owner || connData?.instance?.wuid || connData?.number || null;
                  if (rawNum) {
                    const digits = String(rawNum).replace(/\D/g, '');
                    if (digits.length >= 10) {
                      ownerPhone = digits.startsWith('55') ? digits : `55${digits}`;
                      console.log(`[phone-hydrate] Got phone from connectionState: ${ownerPhone}`);
                    }
                  }
                }
              } catch (err) {
                console.log(`[phone-hydrate] connectionState failed:`, err);
              }
            }

            if (ownerPhone) {
              updatePayload.phone_number = ownerPhone;
              console.log(`[phone-hydrate] ✅ Will set phone_number = ${ownerPhone}`);
            } else {
              console.log(`[phone-hydrate] ⚠️ Could not resolve phone_number for ${instanceName} — will remain null`);
            }

            if (numberRow) {
              // Update connection status + inferred tier/phone
              const { error } = await supabase
                .from('whatsapp_numbers')
                .update(updatePayload)
                .eq('instance_name', instanceName);
              
              if (error) {
                console.error('Error updating connection status:', error);
              } else {
                console.log(`Updated connection status for ${instanceName}: connected (${apiCreds.tier})`);
              }

              // Re-link recent orphaned campaigns when the same chip is re-added as a new number
              const { count: connectedNumbersCount } = await supabase
                .from('whatsapp_numbers')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', numberRow.user_id)
                .eq('is_connected', true);

              if ((connectedNumbersCount ?? 0) === 1) {
                const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const { data: orphanedCampaigns } = await supabase
                  .from('whatsapp_campaigns')
                  .select('id, name, status')
                  .eq('user_id', numberRow.user_id)
                  .is('whatsapp_number_id', null)
                  .in('status', ['paused', 'scheduled', 'postponed', 'pending', 'completed', 'failed'])
                  .gte('updated_at', recentCutoff)
                  .order('updated_at', { ascending: false })
                  .limit(10);

                if (orphanedCampaigns && orphanedCampaigns.length > 0) {
                  const { error: relinkCampaignsError } = await supabase
                    .from('whatsapp_campaigns')
                    .update({
                      whatsapp_number_id: numberRow.id,
                      updated_at: new Date().toISOString(),
                    })
                    .in('id', orphanedCampaigns.map((campaign: any) => campaign.id));

                  if (relinkCampaignsError) {
                    console.error('Error re-linking orphaned campaigns:', relinkCampaignsError);
                  } else {
                    console.log(`🔗 Re-linked ${orphanedCampaigns.length} orphaned campaign(s) to ${instanceName}`);
                  }
                }
              }

              // AUTO-RESUME: Find and resume paused campaigns on this number
              const { data: pausedCampaigns } = await supabase
                .from('whatsapp_campaigns')
                .select('id, name, pause_reason, user_id, status')
                .eq('whatsapp_number_id', numberRow.id)
                .eq('user_id', numberRow.user_id)
                .in('status', ['paused', 'scheduled']);

              if (pausedCampaigns && pausedCampaigns.length > 0) {
                const disconnectionCampaigns = pausedCampaigns.filter((c: any) => 
                  c.pause_reason?.includes('desconectado') || 
                  c.pause_reason?.includes('conexão') ||
                  c.pause_reason?.includes('Reconecte') ||
                  c.pause_reason?.includes('não conectado')
                );

                for (const campaign of disconnectionCampaigns) {
                  console.log(`🔄 AUTO-RESUMING campaign "${campaign.name}" (was ${campaign.status}) after reconnection`);
                  
                  // Clear ignored contacts for this campaign (leads weren't delivered)
                  const { data: clearedContacts } = await supabase
                    .from('ignored_contacts')
                    .delete()
                    .eq('user_id', campaign.user_id)
                    .eq('campaign_id', campaign.id)
                    .select('id');
                  
                  console.log(`🧹 Cleared ${clearedContacts?.length || 0} ignored contacts for auto-resumed campaign`);

                  await supabase.from('whatsapp_campaigns').update({
                    status: 'running',
                    pause_reason: null,
                    resume_at: null,
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }).eq('id', campaign.id);
                }

                if (disconnectionCampaigns.length > 0) {
                  console.log(`✅ Auto-resumed ${disconnectionCampaigns.length} campaigns after reconnection on ${instanceName}`);
                }
              }
            } else {
              // Fallback: update by instance_name even without row lookup
              const { error } = await supabase
                .from('whatsapp_numbers')
                .update(updatePayload)
                .eq('instance_name', instanceName);
              
              if (error) {
                console.error('Error updating connection status:', error);
              }
            }
          } else if (state === 'close') {
            // IMPORTANT: do NOT auto-connect/restart here.
            // A transient close event can happen during reconnect cycles and forcing
            // /instance/connect from the webhook may invalidate the existing session
            // and trigger QR re-auth for all numbers.
            console.log(`⚠️ Instance ${instanceName} received 'close' event — leaving recovery to manual reconnect / status check`);
          } else if (state === 'connecting') {
            // 'connecting' means the instance is trying to auto-reconnect
            // Do NOT touch updated_at or is_connected
            console.log(`ℹ️ Instance ${instanceName} is in CONNECTING state — NOT updating (transient state)`);
          } else {
            console.log(`Ignoring unknown state "${state}" for ${instanceName}`);
          }

          // AUTO-CONFIGURE WEBHOOK when instance connects successfully
          // Many Evolution API versions discard webhook config set before QR scan
          // AUTO-CONFIGURE WEBHOOK only on FRESH connections.
          // Calling /webhook/set on every 'open' event restarts the Baileys
          // socket on this Evolution version, causing connect→disconnect loops.
          if (state === 'open' && isFreshConnection) {
            const webhookCreds = await getApiCredentials(instanceName);
            const resolvedApiUrl = webhookCreds.url;
            const resolvedApiKey = webhookCreds.apiKey;
            
            console.log(`🔄 Auto-configuring webhook for ${instanceName} on ${resolvedApiUrl.includes('paid') ? 'PAID' : 'FREE'} API`);
            const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
            const webhookEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_EDIT", "CONNECTION_UPDATE", "QRCODE_UPDATED"];
            
            const webhookFormats = [
              { url: `${resolvedApiUrl}/webhook/set/${instanceName}`, method: 'POST', body: { webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events: webhookEvents } } },
              { url: `${resolvedApiUrl}/webhook/set/${instanceName}`, method: 'POST', body: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events: webhookEvents } },
              { url: `${resolvedApiUrl}/webhook/instance/${instanceName}`, method: 'POST', body: { webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events: webhookEvents } } },
              { url: `${resolvedApiUrl}/webhook/${instanceName}`, method: 'PUT', body: { webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events: webhookEvents } } },
              { url: `${resolvedApiUrl}/settings/${instanceName}`, method: 'PUT', body: { webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: true, events: webhookEvents } } },
            ];

            let webhookOk = false;
            for (const fmt of webhookFormats) {
              if (webhookOk) break;
              try {
                const wRes = await fetch(fmt.url, {
                  method: fmt.method,
                  headers: { 'Content-Type': 'application/json', 'apikey': resolvedApiKey },
                  body: JSON.stringify(fmt.body),
                });
                const wText = await wRes.text();
                console.log(`Webhook set attempt ${fmt.method} ${fmt.url}: ${wRes.status} - ${wText.substring(0, 200)}`);
                if (wRes.ok || wRes.status === 201) {
                  webhookOk = true;
                  console.log('✅ Webhook auto-configured successfully on connection!');
                }
              } catch (e) {
                console.log(`Webhook set failed for ${fmt.url}:`, e);
              }
            }

            if (!webhookOk) {
              console.warn('⚠️ Could not auto-configure webhook on connection. Manual config may be needed.');
            }
          }
        }
        break;

      case 'contacts.upsert':
        // Contact was added or updated - good time to fetch profile picture
        console.log('Contact upsert:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          const { data: whatsappNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id')
            .eq('instance_name', instance)
            .single();
          
          if (whatsappNumber) {
            for (const contact of data) {
              const phone = contact.id?.split('@')[0];
              if (phone && contact.profilePictureUrl) {
                await updateContactAvatar(whatsappNumber.user_id, phone, contact.profilePictureUrl);
              }
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

      case 'presence.update':
      case 'presenceupdate':
        // Typing indicator from contact
        console.log('Presence update:', JSON.stringify(data));
        
        if (data?.remoteJid && data?.participant !== undefined) {
          const remoteJid = data.remoteJid;
          const isTyping = data.presence === 'composing';
          
          // Get the WhatsApp number info
          const { data: whatsappNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id')
            .eq('instance_name', instance)
            .single();
          
          if (whatsappNumber) {
            // Broadcast typing status via Supabase Realtime
            const channel = supabase.channel(`typing:${whatsappNumber.user_id}`);
            await channel.send({
              type: 'broadcast',
              event: 'typing',
              payload: {
                remote_jid: remoteJid,
                is_typing: isTyping,
                whatsapp_number_id: whatsappNumber.id,
              },
            });
            await supabase.removeChannel(channel);
            console.log('Broadcasted typing status:', { remoteJid, isTyping });
          }
        }
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
