import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Check if phone is an invalid group ID (starts with 120363 or has group patterns)
const isGroupId = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  // WhatsApp group IDs start with 120363
  if (digits.startsWith('120363')) return true;
  // Group JID patterns contain hyphen with timestamp (e.g., 554497690978-1624205300)
  if (phone.includes('-') && digits.length > 15) return true;
  return false;
};

// Valid Brazilian phone format: 55 + DDD (2 digits) + number (8-9 digits) = 12-13 digits
const isValidBrazilianPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  
  // Group IDs are never valid
  if (isGroupId(phone)) return false;
  
  // Must be 10-13 digits
  if (digits.length < 10 || digits.length > 13) return false;
  
  // If 12-13 digits, should start with 55 (Brazil)
  if (digits.length >= 12 && !digits.startsWith('55')) return false;
  
  return true;
};

// Try to fix a phone number
const tryFixPhone = (phone: string): string | null => {
  // Group IDs cannot be fixed
  if (isGroupId(phone)) return null;
  
  const digits = phone.replace(/\D/g, '');
  
  // If it's already valid, return it
  if (isValidBrazilianPhone(phone)) {
    return digits;
  }
  
  // If it's 10-11 digits without country code, add 55
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
    const fixed = '55' + digits;
    if (isValidBrazilianPhone(fixed)) {
      return fixed;
    }
  }
  
  return null;
};

interface InvalidPhone {
  id: string;
  phone: string;
  contact_name: string | null;
  company_name: string | null;
  fixed_phone: string | null;
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Check if user is admin using has_role function with user.id
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    if (roleError) {
      console.error('Error checking admin role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem usar esta função' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'scan') {
      // Scan for invalid phone numbers
      console.log('Scanning for invalid phone numbers...');
      
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, phone, contact_name, company_name')
        .order('created_at', { ascending: false });

      if (leadsError) {
        throw leadsError;
      }

      const invalidPhones: InvalidPhone[] = [];
      let validCount = 0;

      for (const lead of leads || []) {
        if (!isValidBrazilianPhone(lead.phone)) {
          const fixedPhone = tryFixPhone(lead.phone);
          const digits = lead.phone.replace(/\D/g, '');
          
          let reason = 'Formato inválido';
          if (isGroupId(lead.phone)) {
            reason = 'ID de grupo WhatsApp';
          } else if (digits.length > 15) {
            reason = 'Número muito longo';
          } else if (digits.length < 10) {
            reason = 'Número muito curto';
          } else if (digits.length >= 12 && !digits.startsWith('55')) {
            reason = 'Não começa com 55';
          }
          
          invalidPhones.push({
            id: lead.id,
            phone: lead.phone,
            contact_name: lead.contact_name,
            company_name: lead.company_name,
            fixed_phone: fixedPhone,
            reason,
          });
        } else {
          validCount++;
        }
      }

      console.log(`Found ${invalidPhones.length} invalid phones, ${validCount} valid`);

      return new Response(
        JSON.stringify({
          success: true,
          totalLeads: leads?.length || 0,
          validCount,
          invalidCount: invalidPhones.length,
          invalidPhones: invalidPhones.slice(0, 100), // Limit to first 100
          hasMore: invalidPhones.length > 100,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fix') {
      // Fix phone numbers that can be automatically fixed
      const { leadIds } = await req.json();
      
      if (!leadIds || !Array.isArray(leadIds)) {
        return new Response(
          JSON.stringify({ error: 'leadIds é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let fixedCount = 0;
      let failedCount = 0;

      for (const leadId of leadIds) {
        const { data: lead } = await supabase
          .from('leads')
          .select('phone')
          .eq('id', leadId)
          .single();

        if (lead) {
          const fixedPhone = tryFixPhone(lead.phone);
          if (fixedPhone) {
            const { error: updateError } = await supabase
              .from('leads')
              .update({ phone: fixedPhone })
              .eq('id', leadId);

            if (!updateError) {
              fixedCount++;
              console.log(`Fixed phone for lead ${leadId}: ${lead.phone} -> ${fixedPhone}`);
            } else {
              failedCount++;
              console.error(`Failed to fix phone for lead ${leadId}:`, updateError);
            }
          } else {
            failedCount++;
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          fixedCount,
          failedCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Delete leads with invalid phone numbers
      const { leadIds } = await req.json();
      
      if (!leadIds || !Array.isArray(leadIds)) {
        return new Response(
          JSON.stringify({ error: 'leadIds é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`Deleted ${leadIds.length} leads with invalid phones`);

      return new Response(
        JSON.stringify({
          success: true,
          deletedCount: leadIds.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-invalid-phones:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
