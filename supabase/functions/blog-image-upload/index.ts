// Upload de imagens do blog: valida o admin e grava no bucket privado.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "blog-images";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBackendConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function admin(config: { url: string; serviceKey: string }) {
  return createClient(
    config.url,
    config.serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function requireBlogAdmin(
  req: Request,
  config: { url: string; serviceKey: string },
): Promise<{ ok: boolean; userId?: string; status?: number; reason?: string }> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401 };

  const supa = admin(config);
  const { data: userData, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.error("[blog-image-upload] invalid token", userErr?.message);
    return { ok: false, status: 401 };
  }

  const { data: role, error: roleErr } = await supa
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr) {
    console.error("[blog-image-upload] role lookup failed", roleErr.message);
    return { ok: false, status: 500, reason: roleErr.message };
  }
  if (!role) return { ok: false, status: 403 };
  return { ok: true, userId: userData.user.id };
}


const sanitize = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const config = getBackendConfig();
    if (!config) return json({ error: "Backend de upload não configurado." }, 500);

    const guard = await requireBlogAdmin(req, config);
    if (!guard.ok) {
      const error = guard.status === 403
        ? "Acesso restrito a administradores."
        : guard.status === 500
          ? `Falha ao validar administrador: ${guard.reason || "erro interno"}`
          : "Sessão inválida. Entre novamente e tente o upload.";
      return json({ error }, guard.status ?? 401);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
    if (!file.type.startsWith("image/")) return json({ error: "Arquivo precisa ser uma imagem" }, 400);
    if (file.size > 8 * 1024 * 1024) return json({ error: "Imagem muito grande (máx. 8 MB)" }, 400);

    const supa = admin(config);

    // O projeto externo pode ainda não possuir o bucket. A criação é
    // idempotente e evita o erro 500 "Bucket not found" no primeiro envio.
    const { data: buckets, error: listError } = await supa.storage.listBuckets();
    if (listError) return json({ error: `Falha ao acessar o armazenamento: ${listError.message}` }, 500);
    if (!buckets?.some((bucket) => bucket.id === BUCKET)) {
      const { error: createError } = await supa.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 8 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
      });
      if (createError && !/already exists/i.test(createError.message)) {
        return json({ error: `Falha ao preparar o armazenamento: ${createError.message}` }, 500);
      }
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const base = sanitize(file.name.replace(/\.[^.]+$/, "") || "imagem");
    const path = `${new Date().getFullYear()}/${Date.now()}-${base}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (upErr) {
      console.error("[blog-image-upload] upload failed", upErr);
      return json({ error: `Falha ao gravar a imagem: ${upErr.message}` }, 500);
    }

    // Bucket privado (política do workspace bloqueia buckets públicos):
    // devolvemos uma URL assinada de longa duração (10 anos).
    const TTL = 60 * 60 * 24 * 365 * 10;
    const { data, error: signErr } = await supa.storage.from(BUCKET).createSignedUrl(path, TTL);
    if (signErr || !data?.signedUrl) {
      return json({ error: signErr?.message || "Não foi possível gerar a URL da imagem." }, 500);
    }
    return json({ url: data.signedUrl, path });
  } catch (e) {
    console.error("[blog-image-upload] error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
