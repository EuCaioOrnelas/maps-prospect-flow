import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ITERATIONS = 100000;
const KEY_LENGTH = 256;

function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) {
    try {
      return storedHash === btoa(password);
    } catch {
      return false;
    }
  }

  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = fromHex(saltHex);
  const expectedHash = fromHex(hashHex);
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltBuffer = new Uint8Array(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength));

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );

  const computedHash = new Uint8Array(derivedBits);
  if (computedHash.length !== expectedHash.length) return false;

  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash[i] ^ expectedHash[i];
  }

  return result === 0;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
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

    if (new Date(report.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await verifyPassword(password, report.password_hash);
    
    if (!isValid) {
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
