import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DISABLED: Cleanup automático completamente desativado.
  // A exclusão de instâncias só ocorre manualmente ao excluir o número no sistema.
  console.log('evolution-cleanup-instances: DISABLED - function is deactivated');
  
  return new Response(JSON.stringify({
    success: true,
    disabled: true,
    message: 'Cleanup function is permanently disabled. Instances are only removed when deleted manually in the app.',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
