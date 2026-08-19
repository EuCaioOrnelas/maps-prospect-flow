// Upload de imagens do blog: valida o admin e grava no bucket privado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

async function requireBlogAdmin(req: Request): Promise<{ ok: boolean; userId?: string; status?: number }> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return { ok: false, status: 401 };

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return { ok: false, status: 500 };
  const blog = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData } = await blog.auth.getUser(token);
  if (!userData?.user) return { ok: false, status: 401 };

  const { data: role } = await blog
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

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
    const guard = await requireBlogAdmin(req);
    if (!guard.ok) {
      return json({ error: guard.status === 403 ? "forbidden" : "unauthorized" }, guard.status ?? 401);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
    if (!file.type.startsWith("image/")) return json({ error: "Arquivo precisa ser uma imagem" }, 400);
    if (file.size > 8 * 1024 * 1024) return json({ error: "Imagem muito grande (máx. 8 MB)" }, 400);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

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
      return json({ error: upErr.message }, 500);
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
