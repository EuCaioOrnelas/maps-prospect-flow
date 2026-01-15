import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🧹 Starting campaign drafts cleanup...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete drafts older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    console.log(`📅 Deleting drafts created before: ${thirtyMinutesAgo}`);

    const { data: deletedDrafts, error } = await supabase
      .from('campaign_drafts')
      .delete()
      .lt('created_at', thirtyMinutesAgo)
      .select('id');

    if (error) {
      console.error('❌ Error deleting drafts:', error);
      throw error;
    }

    const deletedCount = deletedDrafts?.length || 0;
    console.log(`✅ Cleanup complete. Deleted ${deletedCount} expired drafts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Cleanup failed:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
