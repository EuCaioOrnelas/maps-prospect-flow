import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for cleanup
const AVATAR_EXPIRY_DAYS = 7;      // Avatars older than 7 days
const MEDIA_EXPIRY_DAYS = 90;      // Media older than 90 days (3 months)
const MAX_STORAGE_MB = 5000;       // 5GB max storage target
const BATCH_SIZE = 100;            // Delete in batches

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results = {
      avatars_deleted: 0,
      media_deleted: 0,
      storage_freed_mb: 0,
      errors: [] as string[],
    };

    // 1. Clean up expired avatar cache entries
    const avatarExpiryDate = new Date();
    avatarExpiryDate.setDate(avatarExpiryDate.getDate() - AVATAR_EXPIRY_DAYS);
    const avatarExpiryStr = avatarExpiryDate.toISOString();

    console.log(`[CLEANUP] Cleaning avatars older than ${avatarExpiryStr}`);

    const { data: deletedAvatars, error: avatarError } = await supabase
      .from('group_member_avatars')
      .delete()
      .lt('updated_at', avatarExpiryStr)
      .select('id');

    if (avatarError) {
      console.error('[CLEANUP] Error deleting expired avatars:', avatarError);
      results.errors.push(`Avatar cleanup error: ${avatarError.message}`);
    } else {
      results.avatars_deleted = deletedAvatars?.length || 0;
      console.log(`[CLEANUP] Deleted ${results.avatars_deleted} expired avatar cache entries`);
    }

    // 2. Check current storage usage
    const { data: storageStats, error: statsError } = await supabase
      .rpc('get_storage_stats');

    let currentStorageMb = 0;
    if (!statsError && storageStats) {
      currentStorageMb = storageStats.total_size_mb || 0;
      console.log(`[CLEANUP] Current storage usage: ${currentStorageMb.toFixed(2)} MB`);
    }

    // 3. If storage exceeds limit, clean up old media from chat-media bucket
    if (currentStorageMb > MAX_STORAGE_MB) {
      console.log(`[CLEANUP] Storage exceeds ${MAX_STORAGE_MB}MB, cleaning old media...`);
      
      const mediaExpiryDate = new Date();
      mediaExpiryDate.setDate(mediaExpiryDate.getDate() - MEDIA_EXPIRY_DAYS);
      
      // List old files in chat-media bucket
      const { data: oldFiles, error: listError } = await supabase.storage
        .from('chat-media')
        .list('', {
          limit: BATCH_SIZE,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (listError) {
        console.error('[CLEANUP] Error listing files:', listError);
        results.errors.push(`Media list error: ${listError.message}`);
      } else if (oldFiles && oldFiles.length > 0) {
        // Filter files older than expiry date
        const filesToDelete = oldFiles
          .filter(f => {
            if (!f.created_at) return false;
            const fileDate = new Date(f.created_at);
            return fileDate < mediaExpiryDate;
          })
          .map(f => f.name);

        if (filesToDelete.length > 0) {
          // Calculate approximate size
          const approxSizeMb = oldFiles
            .filter(f => filesToDelete.includes(f.name))
            .reduce((acc, f) => acc + (f.metadata?.size || 500000) / 1024 / 1024, 0);

          console.log(`[CLEANUP] Deleting ${filesToDelete.length} old media files (~${approxSizeMb.toFixed(2)}MB)`);

          const { error: deleteError } = await supabase.storage
            .from('chat-media')
            .remove(filesToDelete);

          if (deleteError) {
            console.error('[CLEANUP] Error deleting media:', deleteError);
            results.errors.push(`Media delete error: ${deleteError.message}`);
          } else {
            results.media_deleted = filesToDelete.length;
            results.storage_freed_mb = approxSizeMb;
          }
        }
      }
    }

    // 4. Clean up messages table - remove media_url from very old messages to save space
    // (Keep the message record but clear the heavy fields)
    const veryOldDate = new Date();
    veryOldDate.setMonth(veryOldDate.getMonth() - 6); // 6 months old

    const { error: msgCleanError } = await supabase
      .from('messages')
      .update({ 
        media_url: null,
      })
      .lt('created_at', veryOldDate.toISOString())
      .not('media_url', 'is', null);

    if (msgCleanError) {
      console.error('[CLEANUP] Error cleaning old message media refs:', msgCleanError);
    } else {
      console.log('[CLEANUP] Cleared media URLs from old messages');
    }

    console.log('[CLEANUP] Cleanup complete:', JSON.stringify(results));

    return new Response(JSON.stringify({ 
      success: true,
      ...results,
      current_storage_mb: currentStorageMb,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[CLEANUP] Error in cleanup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
