import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

const logStep = (step: string, details?: any) => {
  console.log(`[admin-create-user] ${step}`, details ? JSON.stringify(details) : '');
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Client to verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Verify the calling user is an admin
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("Auth error", { error: userError });
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin via database
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminCheckError || !isAdmin) {
      logStep("Not admin", { userId: userData.user.id });
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem criar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, name }: CreateUserRequest = await req.json();
    
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Creating user", { email, name });

    // Create user using admin API (auto-confirms email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        created_by_admin: true,
        admin_id: userData.user.id
      }
    });

    if (createError) {
      logStep("Create user error", { error: createError.message });
      
      // Handle specific errors
      if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser?.user) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: resposta inválida" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User created", { userId: newUser.user.id });

    // Update the profile with additional info (trigger should have created it)
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        signup_ip: 'admin-created',
        device_fingerprint: `admin-${userData.user.id.substring(0, 8)}`,
        terms_accepted_at: new Date().toISOString()
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      logStep("Profile update warning", { error: profileError });
      // Don't fail the request, profile was created by trigger
    }

    // Log this admin action
    await supabaseAdmin.from('security_audit_log').insert({
      user_id: userData.user.id,
      action: 'admin_create_user',
      resource_type: 'profiles',
      resource_id: newUser.user.id,
      metadata: {
        created_email: email,
        created_name: name
      }
    });

    logStep("Success", { userId: newUser.user.id, email });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          name
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: `Erro interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});