/**
 * Shared Evolution API configuration helper.
 * Resolves the correct Evolution API URL and Key based on the user's plan/tier.
 * 
 * - Free/trial users → EVOLUTION_API_URL + EVOLUTION_API_KEY (testing API)
 * - Paid users (start, growth, scale) → EVOLUTION_API_URL_PAID + EVOLUTION_API_KEY_PAID (production API)
 */

export interface EvolutionCredentials {
  url: string;
  apiKey: string;
  tier: 'free' | 'paid';
}

const PAID_PLANS = ['start', 'growth', 'scale'];

/**
 * Check if a plan is a paid plan
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return PAID_PLANS.includes((plan || 'free').toLowerCase());
}

/**
 * Get Evolution API credentials based on the user's plan or api_tier.
 * @param tierOrPlan - Either 'free'/'paid' (api_tier) or a plan name like 'start', 'growth', etc.
 */
export function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  const isPaid = normalized === 'paid' || PAID_PLANS.includes(normalized);

  if (isPaid) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    
    if (!url || !apiKey) {
      console.error('[evolution-config] PAID credentials not configured, falling back to free API');
      // Fallback to free API if paid not configured
      return getFreeCredentials();
    }
    
    return { url, apiKey, tier: 'paid' };
  }

  return getFreeCredentials();
}

function getFreeCredentials(): EvolutionCredentials {
  const url = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  
  if (!url || !apiKey) {
    throw new Error('Evolution API credentials not configured');
  }
  
  return { url, apiKey, tier: 'free' };
}

/**
 * Get Evolution credentials by looking up the whatsapp_number's api_tier from DB.
 * Falls back to the user's plan if api_tier is not set.
 */
export async function getEvolutionCredentialsByNumber(
  supabase: any,
  numberId: string
): Promise<EvolutionCredentials> {
  const { data: number } = await supabase
    .from('whatsapp_numbers')
    .select('api_tier')
    .eq('id', numberId)
    .single();

  return getEvolutionCredentials(number?.api_tier || 'free');
}

/**
 * Get Evolution credentials by looking up the user's profile plan.
 */
export async function getEvolutionCredentialsByUser(
  supabase: any,
  userId: string
): Promise<EvolutionCredentials> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  return getEvolutionCredentials(profile?.plan || 'free');
}
