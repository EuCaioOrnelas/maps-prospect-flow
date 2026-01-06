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

    // Helper function to download media from Evolution API and upload to Supabase Storage
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
          'application/pdf': 'pdf',
        };
        
        const ext = extMap[mimetype] || mimetype.split('/')[1] || 'bin';
        const filename = `${userId}/${Date.now()}_${messageId.substring(0, 8)}.${ext}`;
        
        // Decode base64 and upload to Supabase Storage
        const fileData = base64Decode(base64Data);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filename, fileData, {
            contentType: mimetype,
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
          const remoteJid = messageKey.remoteJid;
          const fromMe = messageKey.fromMe;
          const messageId = messageKey.id;
          
          // Extract phone number from remoteJid - normalize to digits only
          const rawPhone = remoteJid.split('@')[0];
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
            
            // Strategy 2: Match by normalized phone number (last 10-11 digits)
            if (!conversationId && normalizedPhone.length >= 10) {
              // Get last 10-11 digits for matching (without country code)
              const phoneToMatch = normalizedPhone.slice(-11);
              
              const { data: convsByPhone } = await supabase
                .from('conversations')
                .select('id, phone, remote_jid')
                .eq('whatsapp_number_id', whatsappNumber.id);
              
              if (convsByPhone && convsByPhone.length > 0) {
                // Find conversation where phone ends with same digits
                const matchingConv = convsByPhone.find(c => {
                  const convPhone = c.phone.replace(/\D/g, '');
                  return convPhone.slice(-11) === phoneToMatch || 
                         convPhone.slice(-10) === phoneToMatch.slice(-10) ||
                         phoneToMatch.endsWith(convPhone.slice(-10)) ||
                         convPhone.endsWith(phoneToMatch.slice(-10));
                });
                
                if (matchingConv) {
                  conversationId = matchingConv.id;
                  console.log('Found conversation by phone number match:', matchingConv.phone);
                  
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
              console.log('Creating new conversation for:', remoteJid);
              const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                  user_id: whatsappNumber.user_id,
                  whatsapp_number_id: whatsappNumber.id,
                  remote_jid: remoteJid,
                  phone: rawPhone,
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

            // Check if message already exists
            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('message_id', messageId)
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
              
              // If message is from lead, increment unread count
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
