import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// API keys configuration
const API_KEYS = [
  { name: 'SERP_API_KEY', index: 1, label: 'Chave 1 (Principal)' },
  { name: 'SERP_API_KEY_2', index: 2, label: 'Chave 2 (Backup)' },
  { name: 'SERP_API_KEY_3', index: 3, label: 'Chave 3 (Backup)' },
  { name: 'SERP_API_KEY_4', index: 4, label: 'Chave 4 (Backup)' },
  { name: 'SERP_API_KEY_5', index: 5, label: 'Chave 5 (Backup)' },
  { name: 'SERP_API_KEY_6', index: 6, label: 'Chave 6 (Backup)' },
];

interface KeyCheckResult {
  keyName: string;
  keyIndex: number;
  status: 'ok' | 'exhausted' | 'error' | 'not_configured';
  message: string;
  errorDetails?: string;
}

async function checkSingleKey(keyName: string, keyIndex: number): Promise<KeyCheckResult> {
  const apiKey = Deno.env.get(keyName);
  
  if (!apiKey || apiKey.trim() === '') {
    return {
      keyName,
      keyIndex,
      status: 'not_configured',
      message: 'Chave não configurada',
    };
  }

  try {
    // Use account endpoint to check remaining searches without consuming credits
    const accountUrl = `https://serpapi.com/account.json?api_key=${apiKey}`;
    
    console.log(`Checking key ${keyIndex} (${keyName})...`);
    
    const response = await fetch(accountUrl);
    const data = await response.json();
    
    if (!response.ok) {
      // Check for specific error types
      const errorMsg = data?.error?.toLowerCase() || '';
      
      if (response.status === 401 || errorMsg.includes('invalid')) {
        return {
          keyName,
          keyIndex,
          status: 'error',
          message: 'Chave inválida',
          errorDetails: data?.error || 'API key inválida ou expirada',
        };
      }
      
      return {
        keyName,
        keyIndex,
        status: 'error',
        message: 'Erro na API',
        errorDetails: data?.error || `HTTP ${response.status}`,
      };
    }
    
    // Check remaining searches
    const totalSearches = data.total_searches_left ?? data.plan_searches_left ?? 0;
    const monthlyLimit = data.plan_monthly_limit ?? data.searches_per_month ?? 100;
    
    console.log(`Key ${keyIndex}: ${totalSearches} searches remaining of ${monthlyLimit}`);
    
    if (totalSearches === 0) {
      return {
        keyName,
        keyIndex,
        status: 'exhausted',
        message: `Limite esgotado (0/${monthlyLimit})`,
        errorDetails: 'Todas as buscas do mês foram utilizadas',
      };
    }
    
    if (totalSearches < 10) {
      return {
        keyName,
        keyIndex,
        status: 'ok',
        message: `Quase esgotada (${totalSearches}/${monthlyLimit})`,
      };
    }
    
    return {
      keyName,
      keyIndex,
      status: 'ok',
      message: `OK (${totalSearches}/${monthlyLimit} restantes)`,
    };
    
  } catch (error) {
    console.error(`Error checking key ${keyIndex}:`, error);
    return {
      keyName,
      keyIndex,
      status: 'error',
      message: 'Erro de conexão',
      errorDetails: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting SerpAPI keys verification...');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Check all keys in parallel
    const results = await Promise.all(
      API_KEYS.map(key => checkSingleKey(key.name, key.index))
    );
    
    console.log('All keys checked, updating database...');
    
    // Update database with results
    for (const result of results) {
      const { error } = await supabase
        .from('api_key_status')
        .upsert({
          key_name: result.keyName,
          key_index: result.keyIndex,
          status: result.status,
          message: result.message,
          error_details: result.errorDetails || null,
          last_checked_at: new Date().toISOString(),
        }, {
          onConflict: 'key_name,key_index',
        });
      
      if (error) {
        console.error(`Error updating key ${result.keyIndex}:`, error);
      }
    }
    
    // Calculate overall status
    const okCount = results.filter(r => r.status === 'ok').length;
    const exhaustedCount = results.filter(r => r.status === 'exhausted').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    let overallStatus: 'ok' | 'warning' | 'error';
    let overallMessage: string;
    
    if (okCount === 0) {
      overallStatus = 'error';
      overallMessage = 'Todas as chaves estão indisponíveis!';
    } else if (exhaustedCount > 0 || errorCount > 0) {
      overallStatus = 'warning';
      overallMessage = `${okCount} chave(s) funcionando, ${exhaustedCount} esgotada(s), ${errorCount} com erro`;
    } else {
      overallStatus = 'ok';
      overallMessage = 'Todas as chaves estão funcionando normalmente';
    }
    
    console.log(`Verification complete: ${overallMessage}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        overallStatus,
        overallMessage,
        results,
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});