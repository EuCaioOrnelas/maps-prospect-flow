import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, password } = await req.json();

    if (!reportId || !password) {
      return new Response(
        JSON.stringify({ error: 'Report ID e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the shared report
    const { data: report, error } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      console.error('Report not found:', error);
      return new Response(
        JSON.stringify({ error: 'Relatório não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(report.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple password verification (in production, use bcrypt)
    // For now, we store a simple hash
    const inputHash = btoa(password);
    
    if (report.password_hash !== inputHash) {
      return new Response(
        JSON.stringify({ error: 'Senha incorreta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the report data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: report.report_data,
        filterType: report.filter_type,
        createdAt: report.created_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying shared report:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
