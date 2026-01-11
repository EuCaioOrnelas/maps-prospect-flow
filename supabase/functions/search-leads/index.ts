import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting helper
async function checkRateLimit(
  supabase: any, 
  identifier: string, 
  endpoint: string,
  maxRequests: number = 30,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    });
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Fail open if rate limit check fails
    }
    
    return { 
      allowed: data?.allowed !== false,
      retryAfter: data?.retry_after
    };
  } catch (e) {
    console.error('Rate limit exception:', e);
    return { allowed: true };
  }
}

// Get client IP from request
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// Multiple API keys for fallback
const SERP_API_KEYS = [
  Deno.env.get('SERP_API_KEY'),
  Deno.env.get('SERP_API_KEY_2'),
  Deno.env.get('SERP_API_KEY_3'),
  Deno.env.get('SERP_API_KEY_4'),
].filter(key => key && key.trim() !== '');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

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
  hasWhatsApp?: boolean;
}

// Normalize phone to format 5511999999999
function normalizePhone(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  
  // Remove country code if present
  if (clean.startsWith('55') && clean.length >= 12) {
    clean = clean.substring(2);
  }
  
  // Add country code back
  return '55' + clean;
}

// Dedicated WhatsApp instance for validating numbers in prospecting
const VALIDATOR_INSTANCE = 'wiizeprospect_03f5ad6b_1767801176186_k4t5eh';

// Validate if phone number exists on WhatsApp using dedicated validator instance
async function validateWhatsAppNumber(phoneNumber: string): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log('Evolution API not configured, skipping validation');
    return true;
  }

  try {
    let normalized = normalizePhone(phoneNumber);
    
    // Ensure number starts with 55 for Brazilian numbers
    if (!normalized.startsWith('55')) {
      normalized = '55' + normalized;
    }
    
    console.log(`Validating WhatsApp for: ${normalized} using instance ${VALIDATOR_INSTANCE}`);
    
    const response = await fetch(`${EVOLUTION_API_URL}/chat/whatsappNumbers/${VALIDATOR_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        numbers: [normalized]
      })
    });
    
    if (!response.ok) {
      console.error(`Validation API error: ${response.status}`);
      return true; // Assume valid on API error
    }
    
    const result = await response.json();
    
    // Result format: [{ exists: true/false, jid: "...", number: "..." }]
    if (result && Array.isArray(result) && result.length > 0) {
      const exists = result[0]?.exists === true;
      console.log(`WhatsApp validation for ${phoneNumber}: ${exists ? 'EXISTS ✓' : 'NOT FOUND ✗'}`);
      return exists;
    }
    
    return true;
  } catch (error) {
    console.error('WhatsApp validation error:', error);
    return true;
  }
}

// Validate multiple numbers in parallel (batch of 5)
async function validatePhonesBatch(phones: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  // Process in batches of 5 with small delay
  for (let i = 0; i < phones.length; i += 5) {
    const batch = phones.slice(i, i + 5);
    const validations = await Promise.all(
      batch.map(async phone => {
        const isValid = await validateWhatsAppNumber(phone);
        return { phone, isValid };
      })
    );
    
    for (const { phone, isValid } of validations) {
      results.set(phone, isValid);
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + 5 < phones.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// Helper function to check if API key has reached its limit
function isApiKeyExhausted(response: Response, responseData: any): boolean {
  // SerpAPI returns 429 or specific error messages when limit is reached
  if (response.status === 429) {
    return true;
  }
  
  // Check for limit-related error messages
  if (responseData?.error) {
    const errorMsg = responseData.error.toLowerCase();
    if (
      errorMsg.includes('limit') || 
      errorMsg.includes('quota') || 
      errorMsg.includes('exceeded') ||
      errorMsg.includes('monthly') ||
      errorMsg.includes('searches')
    ) {
      return true;
    }
  }
  
  return false;
}

// Function to make API call with fallback between keys
async function fetchWithFallback(searchQuery: string, startIndex: number): Promise<{ response: Response; data: any; keyIndex: number } | null> {
  for (let keyIndex = 0; keyIndex < SERP_API_KEYS.length; keyIndex++) {
    const apiKey = SERP_API_KEYS[keyIndex];
    const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${searchQuery}&api_key=${apiKey}&hl=pt-br&gl=br&start=${startIndex}`;
    
    console.log(`Trying API key ${keyIndex + 1}/${SERP_API_KEYS.length} (start=${startIndex})...`);
    
    try {
      const response = await fetch(serpUrl);
      const data = await response.json();
      
      // Check if this key is exhausted
      if (isApiKeyExhausted(response, data)) {
        console.warn(`API key ${keyIndex + 1} exhausted, trying next key...`);
        continue;
      }
      
      // If request was successful, return the result
      if (response.ok) {
        console.log(`API key ${keyIndex + 1} worked successfully`);
        return { response, data, keyIndex };
      }
      
      // For other errors (not limit-related), log and try next key
      console.error(`API key ${keyIndex + 1} returned error: ${response.status}`);
      
    } catch (error) {
      console.error(`API key ${keyIndex + 1} network error:`, error);
    }
  }
  
  // All keys failed
  console.error('All API keys exhausted or failed');
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for rate limiting
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Rate limiting check by IP
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(supabaseAdmin, clientIP, 'search-leads', 30, 60);
    
    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Muitas requisições. Aguarde alguns segundos.',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      );
    }

    // Check if we have any API keys configured
    if (SERP_API_KEYS.length === 0) {
      console.error('No SERP API keys configured');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Loaded ${SERP_API_KEYS.length} API keys for fallback`);

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
    
    console.log(`Will fetch up to ${pagesToFetch} pages with ${SERP_API_KEYS.length} API keys available`);
    
    for (let page = 0; page < pagesToFetch && allResults.length < maxLeads; page++) {
      const startIndex = page * resultsPerPage;
      
      console.log(`Fetching page ${page + 1} (start=${startIndex})...`);
      
      const result = await fetchWithFallback(searchQuery, startIndex);
      
      if (!result) {
        console.error('All API keys exhausted for this request');
        if (page === 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Limite de API atingido',
              message: 'Nosso serviço de buscas está temporariamente indisponível. Por favor, entre em contato com nosso suporte para resolvermos isso rapidamente.',
              allKeysExhausted: true,
              redirectToContact: true
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      const pageResults = result.data.local_results || [];
      console.log(`Page ${page + 1}: received ${pageResults.length} results (using key ${result.keyIndex + 1})`);
      
      if (pageResults.length === 0) {
        console.log('No more results available, stopping pagination');
        break;
      }
      
      // Deduplicate results by place_id and name
      for (const item of pageResults) {
        const placeId = item.place_id || '';
        const name = (item.title || '').toLowerCase().trim();
        
        // Skip if we've seen this place_id or name
        if ((placeId && seenPlaceIds.has(placeId)) || (name && seenNames.has(name))) {
          console.log(`Skipping duplicate: ${item.title}`);
          continue;
        }
        
        if (placeId) seenPlaceIds.add(placeId);
        if (name) seenNames.add(name);
        
        allResults.push(item);
        
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
    const leadsWithPhone = allLeads.filter(lead => {
      const phone = lead.phone?.trim();
      return phone && phone !== '-' && phone !== '' && phone.length >= 8;
    });

    console.log(`Found ${allLeads.length} total leads, ${leadsWithPhone.length} with phone numbers`);

    // Validate WhatsApp numbers in batches
    console.log(`Starting WhatsApp validation for ${leadsWithPhone.length} numbers...`);
    
    const phonesToValidate = leadsWithPhone.map(l => l.phone);
    const validationResults = await validatePhonesBatch(phonesToValidate);
    
    // Filter to only include leads with valid WhatsApp numbers
    const leads = leadsWithPhone.filter(lead => {
      const isValid = validationResults.get(lead.phone);
      if (!isValid) {
        console.log(`Filtering out non-WhatsApp number: ${lead.phone}`);
      }
      return isValid !== false; // Keep if true or undefined (validation failed)
    });

    const validCount = leads.length;
    const invalidCount = leadsWithPhone.length - validCount;
    console.log(`WhatsApp validation complete: ${validCount} valid, ${invalidCount} invalid`);
    console.log(`Returning ${leads.length} leads with valid WhatsApp numbers`);

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
