import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload = await req.json();
    console.log('=== EVOLUTION WEBHOOK RAW ===');
    console.log('Full payload:', JSON.stringify(payload));

    // Evolution API sends event in different formats - normalize
    const rawEvent = payload.event || '';
    const event = rawEvent.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
    const instance = payload.instance;
    const data = payload.data;
    
    console.log('Raw event:', rawEvent, '-> Normalized:', event);

    // Helper function to normalize Brazilian phone numbers (add 9 for mobile)
    function normalizeBrazilianPhone(phone: string): string {
      // Remove all non-digits
      let cleanPhone = phone.replace(/\D/g, '');
      
      // If it's too short or a LID, return as-is
      if (cleanPhone.length < 10 || phone.includes('@lid')) {
        return phone;
      }
      
      // Remove country code 55 if present
      let hasCountryCode = false;
      if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
        hasCountryCode = true;
        cleanPhone = cleanPhone.slice(2);
      }
      
      // Now we should have DDD + number (10 or 11 digits)
      // Brazilian mobile numbers should be 11 digits (DDD + 9 + 8 digits)
      if (cleanPhone.length === 10) {
        const ddd = cleanPhone.slice(0, 2);
        const numberPart = cleanPhone.slice(2);
        
        // Check if it's a mobile number (starts with 6, 7, 8, 9 after DDD)
        if (['6', '7', '8', '9'].includes(numberPart[0])) {
          // Add the 9 prefix for mobile numbers
          cleanPhone = ddd + '9' + numberPart;
        }
      }
      
      // Re-add country code
      return '55' + cleanPhone;
    }

    async function downloadAndStoreMedia(
      instanceName: string,
      messageId: string,
      mediaType: string,
      userId: string
    ): Promise<{ url: string; mimetype: string } | null> {
      try {
        console.log(`Downloading media for message ${messageId} from instance ${instanceName}`);
        
        // Use Evolution API to get base64 media
        const response = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!,
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
    async function fetchProfilePicture(instanceName: string, phone: string): Promise<string | null> {
      try {
        const response = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!,
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
          
          // Ignore group messages
          if (currentJidType === 'g.us' || remoteJid.includes('@g.us')) {
            console.log('Ignoring group message:', remoteJid);
            break;
          }
          
          // Remove any non-digit characters for matching
          const normalizedPhone = rawPhone.replace(/\D/g, '');
          
          // Get the WhatsApp number (instance) info
          const { data: whatsappNumber } = await supabase
            .from('whatsapp_numbers')
            .select('id, user_id')
            .eq('instance_name', instance)
            .single();
          
          if (whatsappNumber) {
            // Get or create conversation - try multiple matching strategies
            let conversationId: string | null = null;
            
            // Strategy 1: Match by exact remote_jid
            let { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('remote_jid', remoteJid)
              .eq('whatsapp_number_id', whatsappNumber.id)
              .single();
            
            if (existingConv) {
              conversationId = existingConv.id;
              console.log('Found conversation by exact remote_jid match');
            }
            
            // Strategy 2: Match by normalized phone number (Brazilian format handling)
            if (!conversationId && normalizedPhone.length >= 10) {
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
            if (!conversationId) {
              // Normalize Brazilian phone numbers before storing
              const normalizedPhoneForStorage = normalizeBrazilianPhone(rawPhone);
              const normalizedRemoteJid = normalizedPhoneForStorage + '@s.whatsapp.net';
              
              console.log('Creating new conversation for:', rawPhone, '-> normalized:', normalizedPhoneForStorage);
              const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                  user_id: whatsappNumber.user_id,
                  whatsapp_number_id: whatsappNumber.id,
                  remote_jid: normalizedRemoteJid,
                  phone: normalizedPhoneForStorage,
                  contact_name: data.pushName || null,
                })
                .select('id')
                .single();
              
              if (convError || !newConv) {
                console.error('Error creating conversation:', convError);
                break;
              }
              conversationId = newConv.id;
            }

            // If message is received (not from me), try to fetch profile picture
            if (!fromMe && rawPhone) {
              try {
                const profilePicture = await fetchProfilePicture(instance, rawPhone);
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
                    
                  if (contactByPhone && contactByPhone.length > 0) {
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

            // Extract message content based on type
            let messageType = 'text';
            let content = '';
            let mediaUrl: string | null = null;
            let mediaFilename: string | null = null;
            let mediaMimetype: string | null = null;
            let hasMedia = false;
            let interactive: Record<string, unknown> | null = null;

            if (messageData.conversation) {
              content = messageData.conversation;
            } else if (messageData.extendedTextMessage?.text) {
              content = messageData.extendedTextMessage.text;
            } else if (messageData.imageMessage) {
              messageType = 'image';
              content = messageData.imageMessage.caption || '';
              mediaMimetype = messageData.imageMessage.mimetype;
              hasMedia = true;
            } else if (messageData.videoMessage) {
              messageType = 'video';
              content = messageData.videoMessage.caption || '';
              mediaMimetype = messageData.videoMessage.mimetype;
              hasMedia = true;
            } else if (messageData.audioMessage) {
              messageType = 'audio';
              mediaMimetype = messageData.audioMessage.mimetype;
              hasMedia = true;
            } else if (messageData.documentMessage) {
              messageType = 'document';
              mediaFilename = messageData.documentMessage.fileName;
              mediaMimetype = messageData.documentMessage.mimetype;
              hasMedia = true;
            } else if (messageData.interactiveMessage) {
              // Handle interactive messages (bots with buttons/lists)
              messageType = 'interactive';
              const interactiveMsg = messageData.interactiveMessage;
              
              // Extract header text (usually the main content)
              const header = interactiveMsg.header;
              const body = interactiveMsg.body;
              const footer = interactiveMsg.footer;
              
              // Build content from parts
              const contentParts: string[] = [];
              if (header?.title) contentParts.push(header.title);
              if (header?.subtitle) contentParts.push(header.subtitle);
              if (body?.text) contentParts.push(body.text);
              if (footer?.text) contentParts.push(footer.text);
              
              content = contentParts.join('\n\n') || '[Mensagem interativa]';
              
              // Store full interactive data
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
            } else if (messageData.buttonsMessage) {
              // Legacy buttons message
              messageType = 'buttons';
              content = messageData.buttonsMessage.contentText || 
                        messageData.buttonsMessage.text || 
                        '[Mensagem com botões]';
              interactive = {
                type: 'buttons',
                buttons: messageData.buttonsMessage.buttons || [],
                headerType: messageData.buttonsMessage.headerType,
              };
            } else if (messageData.listMessage) {
              // List message
              messageType = 'list';
              content = messageData.listMessage.description || 
                        messageData.listMessage.title || 
                        '[Mensagem de lista]';
              interactive = {
                type: 'list',
                title: messageData.listMessage.title,
                buttonText: messageData.listMessage.buttonText,
                sections: messageData.listMessage.sections || [],
              };
            } else if (messageData.buttonResponseMessage) {
              // Response to buttons
              messageType = 'text';
              content = messageData.buttonResponseMessage.selectedDisplayText || 
                        messageData.buttonResponseMessage.selectedButtonId || 
                        '[Resposta de botão]';
            } else if (messageData.listResponseMessage) {
              // Response to list
              messageType = 'text';
              content = messageData.listResponseMessage.title || 
                        messageData.listResponseMessage.singleSelectReply?.selectedRowId ||
                        '[Resposta de lista]';
            } else if (messageData.templateButtonReplyMessage) {
              // Template button reply
              messageType = 'text';
              content = messageData.templateButtonReplyMessage.selectedDisplayText ||
                        messageData.templateButtonReplyMessage.selectedId ||
                        '[Resposta de template]';
            }

            // If message has media, download it and store in Supabase Storage
            if (hasMedia) {
              console.log(`Message has ${messageType} media, downloading...`);
              const storedMedia = await downloadAndStoreMedia(
                instance,
                messageId,
                messageType,
                whatsappNumber.user_id
              );
              
              if (storedMedia) {
                mediaUrl = storedMedia.url;
                mediaMimetype = storedMedia.mimetype;
                console.log(`Media stored at: ${mediaUrl}`);
              } else {
                console.log('Failed to download media, message will be saved without media URL');
              }
            }

            // Check if message already exists IN THIS CONVERSATION
            // We check by conversation_id because the same message_id can exist in multiple instances
            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('message_id', messageId)
              .eq('conversation_id', conversationId)
              .single();

            if (!existingMsg) {
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
                });

              if (msgError) {
                console.error('Error inserting message:', msgError);
              } else {
                console.log('Message inserted successfully');
              }

              // Update conversation
              const updateData: Record<string, unknown> = {
                last_message: content || `[${messageType}]`,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              if (data.pushName) {
                updateData.contact_name = data.pushName;
              }
              
              // If message is from lead (not from me), increment unread count and update lead status
              if (!fromMe) {
                const { data: conv } = await supabase
                  .from('conversations')
                  .select('unread_count')
                  .eq('id', conversationId)
                  .single();
                
                updateData.unread_count = (conv?.unread_count || 0) + 1;
                
                // ===== AUTO-MOVE LEAD TO "RESPONDEU" STAGE =====
                // Find lead by phone or conversation_id
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, pipeline_stage_id, whatsapp_status')
                  .eq('user_id', whatsappNumber.user_id)
                  .or(`phone.eq.${rawPhone},phone.eq.${normalizedPhone},conversation_id.eq.${conversationId}`)
                  .limit(1)
                  .single();
                
                if (existingLead) {
                  console.log('Found lead to update:', existingLead.id);
                  
                  // Get the "Respondeu" stage (position 2)
                  const { data: respondeuStage } = await supabase
                    .from('pipeline_stages')
                    .select('id, position')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('name', 'Respondeu')
                    .single();
                  
                  // Only move to "Respondeu" if current stage is earlier (position < 2)
                  // Get current stage position
                  let shouldMoveToRespondeu = false;
                  if (existingLead.pipeline_stage_id && respondeuStage) {
                    const { data: currentStage } = await supabase
                      .from('pipeline_stages')
                      .select('position')
                      .eq('id', existingLead.pipeline_stage_id)
                      .single();
                    
                    // Move only if current position is less than Respondeu position (before it in pipeline)
                    if (currentStage && currentStage.position < respondeuStage.position) {
                      shouldMoveToRespondeu = true;
                    }
                  } else if (respondeuStage) {
                    // No current stage, move to Respondeu
                    shouldMoveToRespondeu = true;
                  }
                  
                  const leadUpdate: Record<string, unknown> = {
                    whatsapp_status: 'replied',
                    last_response: content || `[${messageType}]`,
                    last_response_at: new Date().toISOString(),
                    conversation_id: conversationId,
                    updated_at: new Date().toISOString(),
                  };
                  
                  if (shouldMoveToRespondeu && respondeuStage) {
                    leadUpdate.pipeline_stage_id = respondeuStage.id;
                    console.log(`Moving lead ${existingLead.id} to Respondeu stage`);
                  }
                  
                  const { error: leadUpdateError } = await supabase
                    .from('leads')
                    .update(leadUpdate)
                    .eq('id', existingLead.id);
                  
                  if (leadUpdateError) {
                    console.error('Error updating lead:', leadUpdateError);
                  } else {
                    console.log('Lead updated with response data');
                    
                    // Log activity for the stage change
                    if (shouldMoveToRespondeu) {
                      await supabase.from('lead_activities').insert({
                        lead_id: existingLead.id,
                        user_id: whatsappNumber.user_id,
                        activity_type: 'stage_changed',
                        description: 'Movido automaticamente para Respondeu (recebeu resposta)',
                        metadata: { automatic: true, trigger: 'webhook_response' },
                      });
                    }
                  }
                }
              }
              
              await supabase
                .from('conversations')
                .update(updateData)
                .eq('id', conversationId);
            }
          }
        }
        break;

      case 'messages.update':
      case 'message.update':
      case 'messageupdate':
        // Message status update (delivered, read, etc)
        // Can be a single object or an array
        console.log('=== MESSAGE STATUS UPDATE ===');
        console.log('Raw data:', JSON.stringify(data));
        
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
            
            // Update message status in database
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
          const isConnected = state === 'open';
          const { error } = await supabase
            .from('whatsapp_numbers')
            .update({ 
              is_connected: isConnected,
              updated_at: new Date().toISOString()
            })
            .eq('instance_name', instanceName);
          
          if (error) {
            console.error('Error updating connection status:', error);
          } else {
            console.log(`Updated connection status for ${instanceName}: ${isConnected}`);
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
