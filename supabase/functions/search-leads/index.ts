import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERP_API_KEY = Deno.env.get('SERP_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface Lead {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  mapsLink: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user profile to check search limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('searches_used, searches_limit, plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has remaining searches
    if (profile.searches_used >= profile.searches_limit) {
      console.log('Search limit reached for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de buscas atingido',
          message: 'Faça upgrade do seu plano para continuar prospectando',
          limitReached: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { keyword, location } = await req.json();
    
    if (!keyword || !location) {
      return new Response(
        JSON.stringify({ error: 'Palavra-chave e localização são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: ${keyword} in ${location}`);

    // Call SERP API with pagination to get more results
    const searchQuery = encodeURIComponent(`${keyword} ${location}`);
    const maxLeads = 50;
    const resultsPerPage = 20;
    const pagesToFetch = Math.ceil(maxLeads / resultsPerPage);
    
    let allResults: any[] = [];
    const seenPlaceIds = new Set<string>();
    const seenNames = new Set<string>();
    
    console.log(`Calling SERP API... Will fetch up to ${pagesToFetch} pages`);
    
    for (let page = 0; page < pagesToFetch && allResults.length < maxLeads; page++) {
      const startIndex = page * resultsPerPage;
      const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${searchQuery}&api_key=${SERP_API_KEY}&hl=pt-br&gl=br&start=${startIndex}`;
      
      console.log(`Fetching page ${page + 1} (start=${startIndex})...`);
      const serpResponse = await fetch(serpUrl);
      
      if (!serpResponse.ok) {
        console.error('SERP API error:', serpResponse.status, serpResponse.statusText);
        if (page === 0) {
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar dados do Google Maps' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      const serpData = await serpResponse.json();
      const pageResults = serpData.local_results || [];
      console.log(`Page ${page + 1}: received ${pageResults.length} results`);
      
      if (pageResults.length === 0) {
        console.log('No more results available, stopping pagination');
        break;
      }
      
      // Deduplicate results by place_id and name
      for (const result of pageResults) {
        const placeId = result.place_id || '';
        const name = (result.title || '').toLowerCase().trim();
        
        // Skip if we've seen this place_id or name
        if ((placeId && seenPlaceIds.has(placeId)) || (name && seenNames.has(name))) {
          console.log(`Skipping duplicate: ${result.title}`);
          continue;
        }
        
        if (placeId) seenPlaceIds.add(placeId);
        if (name) seenNames.add(name);
        
        allResults.push(result);
        
        if (allResults.length >= maxLeads) break;
      }
    }

    console.log(`Total unique results collected: ${allResults.length}`);

    // Parse leads from SERP response
    const allLeads: Lead[] = allResults.slice(0, maxLeads).map((result: any) => ({
      name: result.title || '-',
      category: result.type || result.types?.[0] || '-',
      address: result.address || '-',
      city: location,
      phone: result.phone || '-',
      website: result.website || '-',
      rating: result.rating || 0,
      reviewCount: result.reviews || 0,
      mapsLink: result.link || (result.place_id ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}` : '-'),
    }));

    // Filter out leads without valid phone numbers
    const leads = allLeads.filter(lead => {
      const phone = lead.phone?.trim();
      return phone && phone !== '-' && phone !== '' && phone.length >= 8;
    });

    console.log(`Found ${allLeads.length} total leads, ${leads.length} with valid phone numbers`);

    // Update user's search count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ searches_used: profile.searches_used + 1 })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating search count:', updateError);
    }

    // Save search to history with leads data
    const { error: historyError } = await supabase
      .from('search_history')
      .insert({
        user_id: user.id,
        keyword,
        location,
        results_count: leads.length,
        leads: leads, // Store the leads for future retrieval
      });

    if (historyError) {
      console.error('Error saving search history:', historyError);
    }

    // Delete oldest searches if user has more than 50
    const { data: historyCount } = await supabase
      .from('search_history')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (historyCount && historyCount.length > 50) {
      const idsToDelete = historyCount.slice(50).map(h => h.id);
      console.log(`Deleting ${idsToDelete.length} old search history entries`);
      
      const { error: deleteError } = await supabase
        .from('search_history')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting old search history:', deleteError);
      }
    }

    console.log('Search completed successfully');

    // Build response with accurate count info
    const maxExpected = 50;
    const foundLess = leads.length < maxExpected;

    return new Response(
      JSON.stringify({ 
        leads,
        searchesUsed: profile.searches_used + 1,
        searchesLimit: profile.searches_limit,
        resultsCount: leads.length,
        foundLessThanExpected: foundLess,
        message: foundLess 
          ? `Encontramos apenas ${leads.length} resultados para "${keyword}" em ${location}. Isso pode indicar que o nicho é pequeno na região ou há poucos estabelecimentos cadastrados.`
          : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});