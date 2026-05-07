import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  Deno.env.get('SERP_API_KEY_5'),
  Deno.env.get('SERP_API_KEY_6'),
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

// Normalize phone — aceita BR (celular/fixo) E qualquer número internacional E.164.
// E.164: 8 a 15 dígitos, com código de país no início.
function normalizePhone(phone: string): string {
  const raw = String(phone || '').trim();
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  // === BRASIL (mantém validação rígida) ===
  // Celular E.164 (13 díg: 55 + DDD + 9 + 8)
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = Number(digits.slice(2, 4));
    const firstLocal = digits[4];
    if (ddd >= 11 && ddd <= 99 && firstLocal === '9') return digits;
    return '';
  }
  // Fixo E.164 (12 díg: 55 + DDD + 8)
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = Number(digits.slice(2, 4));
    const firstLocal = digits[4];
    if (ddd >= 11 && ddd <= 99 && /[2-5]/.test(firstLocal)) return digits;
    return '';
  }
  // Celular local BR (11 díg)
  if (digits.length === 11 && !hasPlus) {
    const ddd = Number(digits.slice(0, 2));
    const firstLocal = digits[2];
    if (ddd >= 11 && ddd <= 99 && firstLocal === '9') return `55${digits}`;
  }
  // Fixo local BR (10 díg)
  if (digits.length === 10 && !hasPlus) {
    const ddd = Number(digits.slice(0, 2));
    const firstLocal = digits[2];
    if (ddd >= 11 && ddd <= 99 && /[2-5]/.test(firstLocal)) return `55${digits}`;
  }

  // === INTERNACIONAL (E.164 genérico) ===
  // Aceita qualquer número com 8 a 15 dígitos quando vier com "+" (formato E.164)
  // ou quando começar com código de país plausível diferente de 55.
  if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    return digits;
  }
  // Sem "+" mas claramente internacional (12-15 díg, não-BR)
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith('55')) {
    return digits;
  }

  return '';
}

// Check if a number is a landline (fixed) - has 8 digits after DDD
function isLandlineNumber(phone: string): boolean {
  const clean = phone.replace(/[^0-9]/g, '');
  // Remove country code if present
  const withoutCountry = clean.startsWith('55') ? clean.substring(2) : clean;
  // Landline: DDD (2 digits) + 8 digits = 10 total
  // Mobile: DDD (2 digits) + 9 digits = 11 total
  return withoutCountry.length === 10;
}

// Generate both formats for landline numbers (with and without 9)
function getPhoneVariations(phone: string): string[] {
  const clean = phone.replace(/[^0-9]/g, '');
  const withoutCountry = clean.startsWith('55') ? clean.substring(2) : clean;
  
  // If it's a landline (10 digits), try both formats
  if (withoutCountry.length === 10) {
    const ddd = withoutCountry.substring(0, 2);
    const number = withoutCountry.substring(2);
    
    return [
      '55' + withoutCountry,           // Original: 55 + DDD + 8 digits
      '55' + ddd + '9' + number         // With 9: 55 + DDD + 9 + 8 digits
    ];
  }
  
  // If it's already a mobile (11 digits), just return normalized
  return ['55' + withoutCountry];
}

// Dedicated WhatsApp instance for validating numbers in prospecting
const VALIDATOR_INSTANCE = 'wiizeprospect_03f5ad6b_1767801176186_k4t5eh';

// Validate if phone number exists on WhatsApp using dedicated validator instance
// For landlines, tries both formats (with and without 9)
async function validateWhatsAppNumber(phoneNumber: string): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log('Evolution API not configured, skipping validation');
    return true;
  }

  try {
    const variations = getPhoneVariations(phoneNumber);
    const isLandline = isLandlineNumber(phoneNumber);
    
    console.log(`Validating WhatsApp for: ${phoneNumber} (${isLandline ? 'landline' : 'mobile'}) - trying: ${variations.join(', ')}`);
    
    // Try all variations
    for (const normalized of variations) {
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
        continue;
      }
      
      const result = await response.json();
      
      if (result && Array.isArray(result) && result.length > 0) {
        const exists = result[0]?.exists === true;
        if (exists) {
          console.log(`WhatsApp validation for ${phoneNumber}: EXISTS ✓ (found as ${normalized})`);
          return true;
        }
      }
    }
    
    console.log(`WhatsApp validation for ${phoneNumber}: NOT FOUND ✗`);
    return false;
  } catch (error) {
    console.error('WhatsApp validation error:', error);
    return true; // Assume valid on error
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

    // Get user profile to check opportunity limits
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

    // Check remaining opportunities (each lead = 1 opportunity)
    const remainingOpportunities = profile.searches_limit - profile.searches_used;
    
    if (remainingOpportunities <= 0) {
      console.log('Opportunity limit reached for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de oportunidades atingido',
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

    // Minimum and maximum targets for valid leads
    const MIN_VALID_LEADS = 60;
    const MAX_LEADS_PER_LOCATION = 60; // Max 3 pages x 20 results = 3 SERP API searches per location
    const resultsPerPage = 20;
    const MAX_SERP_CALLS = 3; // Hard limit: max 3 SerpAPI calls per user search (3x20=60, trim to 50)

    // Define nearby cities for major Brazilian cities (fallback expansion)
    const nearbyCities: Record<string, string[]> = {
      'sao paulo': ['guarulhos', 'osasco', 'santo andre', 'sao bernardo do campo', 'diadema', 'maua'],
      'rio de janeiro': ['niteroi', 'sao goncalo', 'duque de caxias', 'nova iguacu', 'belford roxo'],
      'belo horizonte': ['contagem', 'betim', 'ribeirao das neves', 'santa luzia', 'ibirite'],
      'curitiba': ['sao jose dos pinhais', 'colombo', 'araucaria', 'pinhais', 'campo largo'],
      'porto alegre': ['canoas', 'novo hamburgo', 'sao leopoldo', 'gravatai', 'viamao'],
      'salvador': ['lauro de freitas', 'camacari', 'simoes filho', 'candeias', 'dias davila'],
      'fortaleza': ['caucaia', 'maracanau', 'maranguape', 'pacatuba', 'eusebio'],
      'recife': ['jaboatao dos guararapes', 'olinda', 'paulista', 'camaragibe', 'cabo de santo agostinho'],
      'brasilia': ['taguatinga', 'ceilandia', 'samambaia', 'gama', 'aguas claras'],
      'goiania': ['aparecida de goiania', 'anapolis', 'trindade', 'senador canedo', 'goianira'],
      'manaus': ['iranduba', 'rio preto da eva', 'presidente figueiredo', 'itacoatiara', 'manacapuru'],
      'belem': ['ananindeua', 'marituba', 'benevides', 'castanhal', 'santa izabel do para'],
      'campinas': ['hortolandia', 'sumare', 'americana', 'indaiatuba', 'valinhos'],
    };

    // Normalize location for matching (remove accents and lowercase)
    const normalizeForMatch = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const locationNormalized = normalizeForMatch(location);
    
    // Find nearby cities
    const nearbyLocations = Object.entries(nearbyCities).find(([city]) => 
      locationNormalized.includes(city) || city.includes(locationNormalized)
    )?.[1] || [];

    // Locations to search (main + nearby)
    const locationsToSearch = [location, ...nearbyLocations.map(c => `${c}, ${location.split(',').pop()?.trim() || 'Brasil'}`)];
    
    let allValidLeads: Lead[] = [];
    const seenPhones = new Set<string>();
    const seenNames = new Set<string>();
    let searchedLocations: string[] = [];
    let totalRawResults = 0;
    let totalWithPhone = 0;
    let totalSerpCalls = 0; // Track total SerpAPI calls
    
    // Helper to collect leads from a location
    async function collectLeadsFromLocation(searchLocation: string, maxToCollect: number): Promise<Lead[]> {
      const searchQuery = encodeURIComponent(`${keyword} ${searchLocation}`);
      const pagesToFetch = Math.ceil(maxToCollect / resultsPerPage);
      const collectedResults: any[] = [];
      const localSeenPlaceIds = new Set<string>();
      
      for (let page = 0; page < pagesToFetch && collectedResults.length < maxToCollect; page++) {
        // Enforce global hard limit of SERP API calls
        if (totalSerpCalls >= MAX_SERP_CALLS) {
          console.log(`Global SERP call limit reached (${MAX_SERP_CALLS}). Stopping.`);
          break;
        }
        
        const startIndex = page * resultsPerPage;
        console.log(`Fetching ${searchLocation} page ${page + 1} (start=${startIndex}), totalSerpCalls=${totalSerpCalls + 1}/${MAX_SERP_CALLS}...`);
        
        const result = await fetchWithFallback(searchQuery, startIndex);
        totalSerpCalls++; // Count every API call
        
        if (!result) {
          console.log('API keys exhausted for this location');
          break;
        }

        const pageResults = result.data.local_results || [];
        console.log(`${searchLocation} page ${page + 1}: ${pageResults.length} results`);
        
        if (pageResults.length === 0) break;
        
        for (const item of pageResults) {
          const placeId = item.place_id || '';
          if (placeId && localSeenPlaceIds.has(placeId)) continue;
          if (placeId) localSeenPlaceIds.add(placeId);
          collectedResults.push({ ...item, searchLocation });
          if (collectedResults.length >= maxToCollect) break;
        }
      }
      
      // Parse to Lead format
      return collectedResults.map((result: any) => ({
        name: result.title || '-',
        category: result.type || result.types?.[0] || '-',
        address: result.address || '-',
        city: result.searchLocation || searchLocation,
        phone: result.phone || '-',
        website: result.website || '-',
        rating: result.rating || 0,
        reviewCount: result.reviews || 0,
        mapsLink: result.link || (result.place_id ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}` : '-'),
      }));
    }

    // Helper to filter leads with strict valid BR mobile phone numbers
    function filterLeadsWithPhone(leads: Lead[]): Lead[] {
      const filtered: Lead[] = [];

      for (const lead of leads) {
        const normalized = normalizePhone(lead.phone || '');
        if (!normalized) continue;

        // Block obvious placeholders
        const subscriber = normalized.slice(-8);
        if (/^(\d)\1{7}$/.test(subscriber)) continue;
        if (subscriber.startsWith('9999')) continue;
        if (/(0000|1234|4321)/.test(subscriber)) continue;

        filtered.push({ ...lead, phone: normalized });
      }

      return filtered;
    }

    // Helper to deduplicate leads by canonical full phone + name
    function deduplicateLeads(leads: Lead[]): Lead[] {
      return leads.filter(lead => {
        const normalizedPhone = normalizePhone(lead.phone || '');
        if (!normalizedPhone) return false;

        const phoneKey = normalizedPhone;
        const nameKey = lead.name.toLowerCase().trim();

        if (seenPhones.has(phoneKey) || (nameKey && seenNames.has(nameKey))) {
          return false;
        }

        seenPhones.add(phoneKey);
        if (nameKey) seenNames.add(nameKey);

        // Persist canonical phone for downstream use
        lead.phone = normalizedPhone;
        return true;
      });
    }

    // MAIN SEARCH LOOP: Search locations until we have enough valid leads
    for (let locIndex = 0; locIndex < locationsToSearch.length && allValidLeads.length < MIN_VALID_LEADS && totalSerpCalls < MAX_SERP_CALLS; locIndex++) {
      const currentLocation = locationsToSearch[locIndex];
      searchedLocations.push(currentLocation);
      
      console.log(`\n=== Searching location ${locIndex + 1}/${locationsToSearch.length}: ${currentLocation} ===`);
      console.log(`Current valid leads: ${allValidLeads.length}/${MIN_VALID_LEADS}`);
      
      // Calculate how many to collect from this location
      // For main location, collect more; for nearby cities, collect less
      const isMainLocation = locIndex === 0;
      const toCollect = isMainLocation ? MAX_LEADS_PER_LOCATION : Math.min(40, MAX_LEADS_PER_LOCATION);
      
      // Collect raw leads from this location
      const rawLeads = await collectLeadsFromLocation(currentLocation, toCollect);
      totalRawResults += rawLeads.length;
      
      console.log(`Collected ${rawLeads.length} raw leads from ${currentLocation}`);
      
      // Deduplicate first (before validation to save API calls)
      const uniqueLeads = deduplicateLeads(rawLeads);
      console.log(`${uniqueLeads.length} unique leads after deduplication`);
      
      const withPhone = uniqueLeads.filter(l => l.phone && l.phone !== '-' && l.phone.length >= 8);
      totalWithPhone += withPhone.length;
      console.log(`${withPhone.length} leads with phone numbers`);
      
      if (withPhone.length === 0) continue;
      
      // Filter leads with phone numbers (no WhatsApp validation)
      console.log(`Filtering ${withPhone.length} leads with phone numbers...`);
      const validLeads = filterLeadsWithPhone(uniqueLeads);
      console.log(`${validLeads.length} leads with valid phone numbers`);
      
      // Add to our collection
      allValidLeads.push(...validLeads);
      
      // Check if we have enough
      if (allValidLeads.length >= MIN_VALID_LEADS) {
        console.log(`✓ Reached minimum target of ${MIN_VALID_LEADS} valid leads!`);
        break;
      }
      
      // If this is the main location and we got very few results, continue to nearby cities
      if (locIndex === 0 && validLeads.length < 10 && nearbyLocations.length > 0) {
        console.log(`Main location had few results, will search nearby cities...`);
      }
    }

    // Cap leads to remaining opportunities to avoid exceeding the user's limit
    const maxLeads = Math.min(60, remainingOpportunities);
    const leads = allValidLeads.slice(0, maxLeads);
    
    console.log(`\n=== SEARCH SUMMARY ===`);
    console.log(`Locations searched: ${searchedLocations.join(', ')}`);
    console.log(`Total raw results: ${totalRawResults}`);
    console.log(`Total with phone: ${totalWithPhone}`);
    console.log(`Final valid leads: ${leads.length} (capped by remaining: ${remainingOpportunities})`);
    
    const validCount = leads.length;
    const invalidCount = totalWithPhone - allValidLeads.length;

    // Update user's opportunity count (each lead = 1 opportunity)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ searches_used: profile.searches_used + leads.length })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating opportunity count:', updateError);
    }

    // Save leads to the leads table with enriched data
    const leadsToInsert = leads.map(lead => ({
      user_id: user.id,
      company_name: lead.name !== '-' ? lead.name : null,
      phone: lead.phone,
      category: lead.category !== '-' ? lead.category : null,
      city: lead.city !== '-' ? lead.city : null,
      website: lead.website !== '-' ? lead.website : null,
      google_maps_link: lead.mapsLink !== '-' ? lead.mapsLink : null,
      address: lead.address !== '-' ? lead.address : null,
      rating: lead.rating || null,
      review_count: lead.reviewCount || null,
      origin: 'oportunidades',
      prospected_at: new Date().toISOString(),
    }));

    // Use upsert to avoid duplicate phone errors
    if (leadsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('leads')
        .upsert(leadsToInsert, { 
          onConflict: 'user_id,phone',
          ignoreDuplicates: true 
        });
      
      if (insertError) {
        console.error('Error saving leads to table:', insertError);
      } else {
        console.log(`Saved ${leadsToInsert.length} leads to leads table`);
      }
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
    const foundLess = leads.length < MIN_VALID_LEADS;
    const searchedMultipleLocations = searchedLocations.length > 1;

    return new Response(
      JSON.stringify({ 
        leads,
        opportunitiesUsed: profile.searches_used + leads.length,
        opportunitiesLimit: profile.searches_limit,
        resultsCount: leads.length,
        locationsSearched: searchedLocations,
        foundLessThanExpected: foundLess,
        message: foundLess 
          ? `Encontramos ${leads.length} resultados válidos para "${keyword}"${searchedMultipleLocations ? ` em ${searchedLocations.length} cidades` : ` em ${location}`}. O nicho pode ser pequeno na região.`
          : searchedMultipleLocations
            ? `Encontramos ${leads.length} leads válidos buscando em ${searchedLocations.length} cidades da região.`
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
