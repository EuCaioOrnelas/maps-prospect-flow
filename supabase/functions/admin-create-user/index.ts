import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateUserRequest {
  // Dados pessoais
  email: string;
  password: string;
  name: string;
  phone?: string;
  cpf?: string;
  address?: string;
  postal_code?: string;

  // Plano + tipo
  plan: "free" | "start" | "growth" | "scale";
  subscription_label?: string; // ex: "Scale Influenciador"

  // Limites
  searches_limit: number;
  whatsapp_numbers_limit: number;

  // Período
  is_lifetime: boolean;
  contract_months?: number; // se não vitalício
  starts_at?: string; // ISO

  // Pagamento
  monthly_value_cents: number;
  total_value_cents: number;
  payment_method: "free" | "pix" | "transfer" | "card" | "cash" | "other";
  payment_confirmed?: boolean;
  payment_notes?: string;

  // Anexos (já uploadados pelo cliente no bucket custom-contracts)
  contract_file_url?: string;
  contract_file_name?: string;
  receipt_file_url?: string;
  receipt_file_name?: string;

  notes?: string;
  feature_permissions?: string[] | null;
}

const log = (step: string, details?: any) => {
  console.log(`[admin-create-user] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem criar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.password || !body.name) {
      return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: "Formato de email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    body.email = body.email.trim().toLowerCase();
    log("Creating auth user", { email: body.email, plan: body.plan });

    // 1) Cria usuário via admin API (auto-confirma e-mail)
    const userMetadata = {
      name: body.name,
      created_by_admin: true,
      admin_id: userData.user.id,
    };
    let newUserId: string | null = null;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError || !newUser?.user) {
      const msg = createError?.message || "";
      log("Auth create error", { error: msg, status: (createError as any)?.status, code: (createError as any)?.code });
      const alreadyExists =
        /already (been )?registered|already exists|email_exists/i.test(msg) ||
        (createError as any)?.code === "email_exists";

      if (alreadyExists) {
        // Conta de login "órfã": existe no login mas não tem perfil (ex.: cadastro
        // interrompido pela trava antifraude ou perfil apagado). Reaproveita.
        const orphanId = await findAuthUserIdByEmail(supabaseAdmin, body.email);
        if (orphanId) {
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id, plan")
            .eq("id", orphanId)
            .maybeSingle();
          const { data: existingSub } = await supabaseAdmin
            .from("custom_subscriptions")
            .select("id")
            .eq("user_id", orphanId)
            .limit(1)
            .maybeSingle();
          const isUnused = !existingSub && (!existingProfile || existingProfile.plan === "free");
          if (isUnused) {
            const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(orphanId, {
              password: body.password,
              email_confirm: true,
              ban_duration: "none",
              user_metadata: userMetadata,
            });
            if (!updErr) {
              newUserId = orphanId;
              log("Reusing orphan auth user", { userId: orphanId });
            } else {
              log("Orphan update error", { error: updErr.message });
            }
          }
        }
        if (!newUserId) {
          return new Response(JSON.stringify({ error: "Este email já está cadastrado com uma conta ativa" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${msg || "falha no cadastro de login"}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      newUserId = newUser.user.id;
    }

    log("Auth user ready", { userId: newUserId });

    // 2) Garante que o profile existe (não dependemos do trigger handle_new_user)
    await new Promise((r) => setTimeout(r, 300));
    const { error: ensureProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email: body.email,
          name: body.name,
          plan: "free",
          searches_limit: 120,
          searches_used: 0,
        },
        { onConflict: "id", ignoreDuplicates: false }
      );
    if (ensureProfileError) {
      log("Profile upsert error", { error: ensureProfileError });
    }

    // 3) Cria registro de contrato customizado
    const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
    const endsAt = body.is_lifetime
      ? null
      : (() => {
          const d = new Date(startsAt);
          d.setMonth(d.getMonth() + (body.contract_months || 1));
          return d;
        })();

    const { data: customSub, error: subError } = await supabaseAdmin
      .from("custom_subscriptions")
      .insert({
        user_id: newUserId,
        created_by_admin_id: userData.user.id,
        plan: body.plan,
        subscription_label: body.subscription_label || null,
        searches_limit: body.searches_limit,
        whatsapp_numbers_limit: body.whatsapp_numbers_limit,
        monthly_value_cents: body.monthly_value_cents,
        total_value_cents: body.total_value_cents,
        payment_method: body.payment_method,
        payment_notes: body.payment_notes || null,
        is_lifetime: body.is_lifetime,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() || null,
        contract_months: body.is_lifetime ? null : body.contract_months || null,
        contract_file_url: body.contract_file_url || null,
        contract_file_name: body.contract_file_name || null,
        notes: body.notes || null,
        status: "active",
      })
      .select()
      .single();

    if (subError || !customSub) {
      log("Custom sub insert error", { error: subError });
      // Rollback: remove user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Erro ao criar contrato: ${subError?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Só registra receita quando o admin confirmar que houve compensação.
    // Valor contratado ou comprovante anexado, isoladamente, não provam pagamento.
    if (body.payment_confirmed === true && body.total_value_cents > 0) {
      await supabaseAdmin.from("custom_subscription_payments").insert({
        custom_subscription_id: customSub.id,
        user_id: newUserId,
        recorded_by_admin_id: userData.user.id,
        amount_cents: body.total_value_cents,
        payment_method: body.payment_method,
        paid_at: startsAt.toISOString(),
        receipt_file_url: body.receipt_file_url || null,
        receipt_file_name: body.receipt_file_name || null,
        notes: "Pagamento inicial do contrato",
      });
    }

    // 5) Atualiza profile com plano + limites customizados
    // (precisa desabilitar protect_profile_fields temporariamente via service role - bypass do trigger)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        name: body.name,
        phone: body.phone || null,
        cpf: body.cpf || null,
        address: body.address || null,
        postal_code: body.postal_code || null,
        plan: body.plan,
        searches_limit: body.searches_limit,
        searches_used: 0,
        is_custom_subscription: true,
        custom_searches_limit: body.searches_limit,
        custom_whatsapp_numbers_limit: body.whatsapp_numbers_limit,
        custom_feature_permissions: body.feature_permissions ?? null,
        custom_subscription_id: customSub.id,
        admin_assigned_plan: true,
        payment_provider: "manual",
        subscription_current_period_end: endsAt?.toISOString() || null,
        subscription_price_cents: body.monthly_value_cents,
        terms_accepted_at: new Date().toISOString(),
        signup_ip: "admin-created",
        device_fingerprint: `admin-${userData.user.id.substring(0, 8)}`,
      })
      .eq("id", newUserId);

    if (profileError) {
      log("Profile update error", { error: profileError });
    }

    // 6) Audit log
    await supabaseAdmin.from("security_audit_log").insert({
      user_id: userData.user.id,
      action: "admin_create_custom_user",
      resource_type: "profiles",
      resource_id: newUserId,
      metadata: {
        email: body.email,
        plan: body.plan,
        custom_subscription_id: customSub.id,
        monthly_value_cents: body.monthly_value_cents,
        is_lifetime: body.is_lifetime,
        contract_months: body.contract_months,
      },
    });

    log("Success", { userId: newUserId });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUserId, email: body.email, name: body.name },
        custom_subscription: customSub,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Unexpected error", { error: msg });
    return new Response(JSON.stringify({ error: `Erro interno: ${msg}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Procura o id de login pelo e-mail (a API administrativa não tem busca direta).
async function findAuthUserIdByEmail(admin: any, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found.id;
    if (users.length < 1000) return null;
  }
  return null;
}
