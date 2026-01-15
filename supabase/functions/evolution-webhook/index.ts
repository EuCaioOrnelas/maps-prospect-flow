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
              // For groups, use the group jid directly; for individuals, normalize
              const phoneForStorage = isGroup ? rawPhone : normalizeBrazilianPhone(rawPhone);
              const jidForStorage = isGroup ? remoteJid : (phoneForStorage + '@s.whatsapp.net');
              
              // For groups, try to get the group name from the data
              const groupName = isGroup ? (data.pushName || data.subject || null) : null;
              
              console.log('Creating new conversation for:', rawPhone, '-> is_group:', isGroup, 'groupName:', groupName);
              const { data: newConv, error: convError } = await supabase
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

            // Check if this is a protocolMessage (edit event via upsert)
            if (messageData.protocolMessage?.editedMessage) {
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
                  sender_jid: isGroup ? senderJidForGroup : null,
                  sender_name: isGroup ? senderName : null,
                  quoted_message_id: quotedMessageId,
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
                
                // ===== AUTO-MOVE LEAD TO "RESPONDEU MENSAGEM" STAGE =====
                // Find lead by phone or conversation_id
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, pipeline_stage_id, whatsapp_status')
                  .eq('user_id', whatsappNumber.user_id)
                  .or(`phone.eq.${rawPhone},phone.eq.${normalizedPhone},conversation_id.eq.${conversationId}`)
                  .limit(1)
                  .single();
                
                if (existingLead) {
                  console.log('Found lead to update on response:', existingLead.id);
                  
                  // Get the "Respondeu Mensagem" stage
                  const { data: respondeuStage } = await supabase
                    .from('pipeline_stages')
                    .select('id, position')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('name', 'Respondeu Mensagem')
                    .single();
                  
                  // Only move to "Respondeu Mensagem" if current stage is earlier (position < respondeu position)
                  let shouldMoveToRespondeu = false;
                  if (existingLead.pipeline_stage_id && respondeuStage) {
                    const { data: currentStage } = await supabase
                      .from('pipeline_stages')
                      .select('position')
                      .eq('id', existingLead.pipeline_stage_id)
                      .single();
                    
                    // Move only if current position is less than Respondeu Mensagem position
                    if (currentStage && currentStage.position < respondeuStage.position) {
                      shouldMoveToRespondeu = true;
                    }
                  } else if (respondeuStage) {
                    // No current stage, move to Respondeu Mensagem
                    shouldMoveToRespondeu = true;
                  }
                  
                  const leadUpdate: Record<string, unknown> = {
                    whatsapp_status: 'replied',
                    last_response: content || `[${messageType}]`,
                    last_response_at: new Date().toISOString(),
                    has_responded: true,
                    responded_at: new Date().toISOString(),
                    conversation_id: conversationId,
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
                    
                    // Log activity for the stage change
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
                  
                  // ===== CAMPAIGN RESPONSE DETECTION =====
                  // Check if this response is from a campaign contact and register it
                  const { data: runningCampaigns } = await supabase
                    .from('whatsapp_campaigns')
                    .select('id, name, current_window, total_responses')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('whatsapp_number_id', whatsappNumber.id)
                    .in('status', ['running', 'paused']);
                  
                  if (runningCampaigns && runningCampaigns.length > 0) {
                    console.log('=== CAMPAIGN RESPONSE CHECK ===');
                    console.log('Found', runningCampaigns.length, 'running/paused campaigns');
                    
                    // Check if this phone is in the campaign leads
                    for (const campaign of runningCampaigns) {
                      // Check if we've already registered a response from this phone
                      // Only the FIRST response from each lead should count
                      const { data: existingResponses } = await supabase
                        .from('campaign_responses')
                        .select('id')
                        .eq('campaign_id', campaign.id)
                        .eq('contact_phone', normalizedPhone)
                        .limit(1);
                      
                      const existingResponse = existingResponses && existingResponses.length > 0 ? existingResponses[0] : null;
                      
                      if (!existingResponse) {
                        // Check when the message was sent to this contact (from ignored_contacts)
                        const { data: ignoredContacts } = await supabase
                          .from('ignored_contacts')
                          .select('first_message_sent_at')
                          .eq('user_id', whatsappNumber.user_id)
                          .eq('phone', normalizedPhone)
                          .eq('campaign_id', campaign.id)
                          .limit(1);
                        
                        const ignoredContact = ignoredContacts && ignoredContacts.length > 0 ? ignoredContacts[0] : null;
                        
                        // If no record of message being sent to this phone, don't count as campaign response
                        if (!ignoredContact || !ignoredContact.first_message_sent_at) {
                          console.log(`⚠️ No message record found for ${normalizedPhone} in campaign ${campaign.id}, not counting as campaign response`);
                          continue;
                        }
                        
                        // Use the message timestamp from WhatsApp for accurate timing
                        const messageTimestamp = data?.messageTimestamp 
                          ? new Date(Number(data.messageTimestamp) * 1000) 
                          : new Date();
                        
                        const messageSentAt = new Date(ignoredContact.first_message_sent_at);
                        const secondsSinceSent = (messageTimestamp.getTime() - messageSentAt.getTime()) / 1000;
                        
                        console.log(`=== BOT DETECTION CHECK ===`);
                        console.log(`Campaign: ${campaign.id}`);
                        console.log(`Phone: ${normalizedPhone}`);
                        console.log(`Message sent at: ${messageSentAt.toISOString()}`);
                        console.log(`Response received at: ${messageTimestamp.toISOString()}`);
                        console.log(`Time difference: ${secondsSinceSent.toFixed(0)} seconds`);
                        
                        // ANTI-BOT FILTER: Only count responses that came at least 60 seconds after the message was sent
                        // This filters out:
                        // - Automatic "Away" messages
                        // - Bot auto-replies
                        // - Quick automated responses
                        const MIN_RESPONSE_TIME_SECONDS = 60;
                        
                        if (secondsSinceSent < MIN_RESPONSE_TIME_SECONDS) {
                          console.log(`🤖 BOT DETECTED: Response came in ${secondsSinceSent.toFixed(0)}s (< ${MIN_RESPONSE_TIME_SECONDS}s minimum)`);
                          console.log(`🤖 Ignoring automatic/bot message, waiting for human response...`);
                          continue;
                        }
                        
                        // Additional bot pattern detection (common auto-reply phrases)
                        const botPatterns = [
                          /obrigad[oa] (pelo|por) (contato|mensagem)/i,
                          /atendimento autom[aá]tico/i,
                          /resposta autom[aá]tica/i,
                          /estamos (ausentes|indispon[ií]veis)/i,
                          /fora do hor[aá]rio/i,
                          /retornaremos (em breve|logo)/i,
                          /aguarde (um momento|atendimento)/i,
                        ];
                        
                        const messageContent = content || '';
                        const isBotPattern = botPatterns.some(pattern => pattern.test(messageContent));
                        
                        if (isBotPattern) {
                          console.log(`🤖 BOT PATTERN DETECTED in message content: "${messageContent.substring(0, 100)}..."`);
                          console.log(`🤖 Ignoring bot message, waiting for human response...`);
                          continue;
                        }
                        
                        console.log(`✅ HUMAN RESPONSE VALIDATED: ${secondsSinceSent.toFixed(0)}s after campaign message`);
                        
                        // Register new campaign response (valid human response)
                        const { error: responseError } = await supabase
                          .from('campaign_responses')
                          .insert({
                            campaign_id: campaign.id,
                            user_id: whatsappNumber.user_id,
                            contact_phone: normalizedPhone,
                            window_number: campaign.current_window || 1,
                            message_content: content?.substring(0, 500) || null,
                            responded_at: new Date().toISOString(),
                          });
                        
                        if (responseError) {
                          console.error('Error inserting campaign response:', responseError);
                        } else {
                          console.log('✅ Valid human response registered for campaign:', campaign.id);
                          
                          // Update campaign total_responses
                          const newTotalResponses = (campaign.total_responses || 0) + 1;
                          
                          // Get current campaign status
                          const { data: campaignStatus } = await supabase
                            .from('whatsapp_campaigns')
                            .select('status, pause_reason, current_window')
                            .eq('id', campaign.id)
                            .single();
                          
                          const currentWindow = campaignStatus?.current_window || 1;
                          
                          // PROGRESSIVE WINDOW UNLOCK: Unlock next window immediately when valid response is received
                          // This works even if not at the end of current window
                          if (currentWindow < 4) {
                            const newWindow = currentWindow + 1;
                            
                            if (campaignStatus?.status === 'paused' && campaignStatus?.pause_reason === 'waiting_response') {
                              // Campaign was paused waiting for response - resume it
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
                              
                              console.log(`🎉 WINDOW UNLOCKED! Campaign ${campaign.id} resumed, now on Window ${newWindow}`);
                            } else if (campaignStatus?.status === 'running') {
                              // Campaign is still running - just unlock next window for when current one completes
                              await supabase
                                .from('whatsapp_campaigns')
                                .update({ 
                                  current_window: newWindow,
                                  window_sent_count: 0,
                                  total_responses: newTotalResponses,
                                  window_unlocked_at: new Date().toISOString(),
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', campaign.id);
                              
                              console.log(`🎉 WINDOW PRE-UNLOCKED! Campaign ${campaign.id} progressed to Window ${newWindow} (mid-window unlock)`);
                            } else {
                              // Just update total_responses
                              await supabase
                                .from('whatsapp_campaigns')
                                .update({ 
                                  total_responses: newTotalResponses,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', campaign.id);
                            }
                          } else {
                            // Already at max window, just update total_responses
                            await supabase
                              .from('whatsapp_campaigns')
                              .update({ 
                                total_responses: newTotalResponses,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', campaign.id);
                          }
                          
                          console.log('Campaign total_responses updated to:', newTotalResponses);
                        }
                      }
                    }
                    
                    // Remove from ignored_contacts if present (contact responded, allow future messages)
                    await supabase
                      .from('ignored_contacts')
                      .delete()
                      .eq('user_id', whatsappNumber.user_id)
                      .eq('phone', normalizedPhone);
                    
                    console.log('Removed from ignored_contacts (if was there)');
                  }
                }
              } else {
                // ===== MESSAGE SENT (fromMe=true) - MOVE TO "MENSAGEM ENVIADA" =====
                // Find lead by phone or conversation_id
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, pipeline_stage_id, whatsapp_status')
                  .eq('user_id', whatsappNumber.user_id)
                  .or(`phone.eq.${rawPhone},phone.eq.${normalizedPhone},conversation_id.eq.${conversationId}`)
                  .limit(1)
                  .single();
                
                if (existingLead) {
                  console.log('Found lead to update on sent message:', existingLead.id);
                  
                  // Get the "Mensagem Enviada" stage
                  const { data: mensagemEnviadaStage } = await supabase
                    .from('pipeline_stages')
                    .select('id, position')
                    .eq('user_id', whatsappNumber.user_id)
                    .eq('name', 'Mensagem Enviada')
                    .single();
                  
                  // Only move to "Mensagem Enviada" if current stage is "Prospectado" (position 0)
                  let shouldMoveToMensagemEnviada = false;
                  if (existingLead.pipeline_stage_id && mensagemEnviadaStage) {
                    const { data: currentStage } = await supabase
                      .from('pipeline_stages')
                      .select('position, name')
                      .eq('id', existingLead.pipeline_stage_id)
                      .single();
                    
                    // Move only if current stage is "Prospectado" (position 0)
                    if (currentStage && currentStage.position === 0) {
                      shouldMoveToMensagemEnviada = true;
                    }
                  } else if (mensagemEnviadaStage && !existingLead.pipeline_stage_id) {
                    // No current stage, move to Mensagem Enviada
                    shouldMoveToMensagemEnviada = true;
                  }
                  
                  const leadUpdate: Record<string, unknown> = {
                    whatsapp_status: 'message_sent',
                    last_message_sent: content || `[${messageType}]`,
                    last_message_sent_at: new Date().toISOString(),
                    conversation_id: conversationId,
                    updated_at: new Date().toISOString(),
                  };
                  
                  if (shouldMoveToMensagemEnviada && mensagemEnviadaStage) {
                    leadUpdate.pipeline_stage_id = mensagemEnviadaStage.id;
                    console.log(`Moving lead ${existingLead.id} to Mensagem Enviada stage`);
                  }
                  
                  const { error: leadUpdateError } = await supabase
                    .from('leads')
                    .update(leadUpdate)
                    .eq('id', existingLead.id);
                  
                  if (leadUpdateError) {
                    console.error('Error updating lead on sent message:', leadUpdateError);
                  } else {
                    console.log('Lead updated with sent message data');
                    
                    // Log activity for the stage change
                    if (shouldMoveToMensagemEnviada) {
                      await supabase.from('lead_activities').insert({
                        lead_id: existingLead.id,
                        user_id: whatsappNumber.user_id,
                        activity_type: 'stage_changed',
                        description: 'Movido automaticamente para Mensagem Enviada (enviou mensagem)',
                        metadata: { automatic: true, trigger: 'webhook_sent_message' },
                      });
                    }
                  }
                }
              }
                
                // ===== WARMING RESPONSE DETECTION =====
                // Check if this message is a response to a warming interaction
                const normalizedLeadPhone = rawPhone.replace(/\D/g, '');
                const leadPhoneLast8 = normalizedLeadPhone.slice(-8);
                
                // Find warming interactions from this phone - include completed ones too
                // so we can track responses even if we're not waiting for them
                const { data: warmingInteractions } = await supabase
                  .from('warming_interactions')
                  .select('*, warming_sessions!inner(*)')
                  .eq('warming_sessions.user_id', whatsappNumber.user_id)
                  .in('status', ['in_progress', 'completed', 'pending_response'])
                  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days
                
                if (warmingInteractions && warmingInteractions.length > 0) {
                  // Find matching interaction by phone (compare last 8 digits)
                  const matchingInteraction = warmingInteractions.find((i: any) => {
                    const interactionPhoneLast8 = i.lead_phone.replace(/\D/g, '').slice(-8);
                    return interactionPhoneLast8 === leadPhoneLast8;
                  });
                  
                  if (matchingInteraction) {
                    console.log('=== WARMING RESPONSE DETECTED ===');
                    console.log('Interaction ID:', matchingInteraction.id);
                    console.log('Lead phone:', matchingInteraction.lead_phone);
                    console.log('Response:', content?.substring(0, 100));
                    console.log('Current status:', matchingInteraction.status);
                    console.log('Conversation ended:', matchingInteraction.conversation_ended);
                    
                    const currentLevel = matchingInteraction.warming_level;
                    const messagesSent = matchingInteraction.messages_sent;
                    const messagesReceived = matchingInteraction.messages_received + 1;
                    const wasAlreadyCompleted = matchingInteraction.status === 'completed';
                    
                    // Always update the response count first
                    await supabase
                      .from('warming_interactions')
                      .update({
                        messages_received: messagesReceived,
                        last_response_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', matchingInteraction.id);
                    
                    console.log(`Updated messages_received to ${messagesReceived}`);
                    
                    // If conversation was already completed, don't process further
                    // Just log the response for statistics
                    if (wasAlreadyCompleted && matchingInteraction.conversation_ended) {
                      console.log('Interaction was already completed, response logged for stats only');
                      // Continue to next check
                    } else {
                      // Process response and potentially send follow-up
                      let shouldRespond = false;
                      let responseMessages: string[] = [];
                      let responseDelay: [number, number] = [3, 10];
                      let shouldEndConversation = false;
                      
                      const leadMessage = (content || '').toLowerCase().trim();
                      
                      // Contextual response patterns
                      const CONTEXTUAL_RESPONSES = {
                        positive: {
                          patterns: [
                            /^tudo\s*(bem|certo|ótimo|otimo|bom|joia|beleza|tranquilo)?[.!?]?\s*$/i,
                            /^bem\s*(obrigad[oa])?[.!?]?\s*$/i,
                            /^ótimo[.!?]?\s*$/i,
                            /^blz[.!?]?\s*$/i,
                            /^sim[.!?]?\s*$/i,
                            /^ok[.!?]?\s*$/i,
                            /^pode\s*(sim|mandar)?[.!?]?\s*$/i,
                            /^claro[.!?]?\s*$/i,
                            /^tranquilo[.!?]?\s*$/i,
                            /e\s*vc[.!?]?\s*$/i,
                            /e\s*você[.!?]?\s*$/i,
                            /e\s*voce[.!?]?\s*$/i,
                            /e\s*tu[.!?]?\s*$/i
                          ],
                          responses: [
                            'Que bom!', 'que bom!', 'Ótimo!', 'ótimo!', 'Legal!', 'legal!',
                            'Que ótimo!', 'que ótimo!', 'Perfeito!', 'perfeito!', 'Show!', 'show!',
                            'Por aqui também!', 'por aqui também!', 'Tudo certo também!', 'tudo certo também!',
                            'Aqui também tudo bem!', 'aqui também tudo bem!'
                          ]
                        },
                        whoAreYou: {
                          patterns: [
                            /quem\s*(é|e)\s*(voce|você|vc)/i,
                            /quem\s*fala/i,
                            /de\s*onde\s*(é|e)/i,
                            /te\s*conheço/i,
                            /como\s*(conseguiu|pegou)\s*(meu|o)\s*número/i
                          ],
                          responses: [
                            'Desculpa, acho que errei o número!', 'desculpa, acho que errei o número!',
                            'Opa, desculpa! Acho que peguei o número errado', 'opa, desculpa! acho que peguei o número errado',
                            'Ih, desculpa! Número errado', 'ih, desculpa! número errado'
                          ],
                          shouldEnd: true
                        },
                        stopRequest: {
                          patterns: [
                            /para\s*(de\s*)?mandar/i,
                            /não\s*mande\s*mais/i,
                            /spam/i,
                            /me\s*bloqueia/i
                          ],
                          responses: [
                            'Desculpa pelo incômodo!', 'desculpa pelo incômodo!'
                          ],
                          shouldEnd: true
                        }
                      };
                      
                      // Check contextual responses
                      let contextualResponse: string[] | null = null;
                      let forceEndConversation = false;
                      
                      for (const [key, ctx] of Object.entries(CONTEXTUAL_RESPONSES)) {
                        const ctxData = ctx as { patterns: RegExp[]; responses: string[]; shouldEnd?: boolean };
                        if (ctxData.patterns.some(p => p.test(leadMessage))) {
                          contextualResponse = ctxData.responses;
                          forceEndConversation = ctxData.shouldEnd || false;
                          console.log(`Matched contextual response: ${key}`);
                          break;
                        }
                      }
                      
                      // Use contextual response if matched (only on first response if not already completed)
                      if (contextualResponse && !matchingInteraction.conversation_ended) {
                        shouldRespond = true;
                        responseMessages = contextualResponse;
                        responseDelay = [2, 8];
                        shouldEndConversation = forceEndConversation || (currentLevel <= 2 && messagesReceived >= 1);
                      }
                      // Level-based logic (only if conversation not ended and no contextual match)
                      else if (!matchingInteraction.conversation_ended) {
                        // Level 1: Simple greeting - always end after first response
                        if (currentLevel === 1) {
                          // Don't respond at level 1, just mark as completed
                          shouldEndConversation = true;
                        }
                        // Level 2: Light conversation - respond once then end
                        else if (currentLevel === 2) {
                          if (messagesReceived >= 1 && messagesSent === 1) {
                            shouldRespond = true;
                            responseMessages = [
                              'Tudo sim, obrigado!', 'tudo sim, obrigado!',
                              'Tudo certo por aqui', 'tudo certo por aqui',
                              'Tudo bem sim!', 'tudo bem sim!',
                              'Por aqui tudo bem!', 'por aqui tudo bem!',
                              'Tudo tranquilo!', 'tudo tranquilo!'
                            ];
                            responseDelay = [3, 10];
                            shouldEndConversation = true;
                          } else if (messagesSent >= 2) {
                            shouldEndConversation = true;
                          }
                        }
                        // Level 3: Natural interaction - up to 3 exchanges
                        else if (currentLevel === 3) {
                          if (messagesReceived >= 1 && messagesSent === 1) {
                            shouldRespond = true;
                            responseMessages = [
                              'Tudo bem por aí?', 'tudo bem por aí?',
                              'Tudo certo hoje?', 'tudo certo hoje?',
                              'Por aqui tudo bem!', 'por aqui tudo bem!',
                              'Aqui também!', 'aqui também!',
                              'Tudo ótimo!', 'tudo ótimo!'
                            ];
                            responseDelay = [2, 8];
                            shouldEndConversation = false;
                          }
                          else if (messagesReceived >= 2 && messagesSent === 2) {
                            shouldRespond = true;
                            responseMessages = [
                              'Que bom!', 'que bom!',
                              'Perfeito!', 'perfeito!',
                              'Legal!', 'legal!',
                              'Show!', 'show!',
                              'Ótimo!', 'ótimo!'
                            ];
                            responseDelay = [3, 10];
                            shouldEndConversation = true;
                          } else if (messagesSent >= 3) {
                            shouldEndConversation = true;
                          }
                        }
                        // Level 4: Pre-commercial - respond naturally then end
                        else if (currentLevel === 4) {
                          if (messagesReceived >= 1 && messagesSent === 1) {
                            shouldRespond = true;
                            responseMessages = [
                              'Perfeito, obrigado!', 'perfeito, obrigado!',
                              'Combinado, agradeço!', 'combinado, agradeço!',
                              'Show, obrigado!', 'show, obrigado!',
                              'Legal, valeu!', 'legal, valeu!',
                              'Ótimo, obrigado pela atenção!', 'ótimo, obrigado pela atenção!'
                            ];
                            responseDelay = [5, 15];
                            shouldEndConversation = true;
                          } else if (messagesSent >= 2) {
                            shouldEndConversation = true;
                          }
                        }
                        // Fallback: end conversation if too many messages
                        else if (messagesSent >= 3) {
                          shouldEndConversation = true;
                        }
                      }
                      
                      // Update status based on response decision
                      if (shouldRespond || shouldEndConversation) {
                        await supabase
                          .from('warming_interactions')
                          .update({
                            status: shouldEndConversation && !shouldRespond ? 'completed' : (shouldRespond ? 'pending_response' : 'in_progress'),
                            conversation_ended: shouldEndConversation && !shouldRespond,
                            last_message_sent: shouldRespond ? responseMessages[Math.floor(Math.random() * responseMessages.length)] : matchingInteraction.last_message_sent
                          })
                          .eq('id', matchingInteraction.id);
                        
                        if (shouldRespond) {
                          console.log(`Scheduled response: ${responseMessages[0]}`);
                        }
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
