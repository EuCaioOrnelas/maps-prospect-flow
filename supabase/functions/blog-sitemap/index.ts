import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://wiize.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: posts }, { data: categories }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false }),
    supabase.from("blog_categories").select("slug, updated_at"),
  ]);

  const urls: string[] = [];
  urls.push(
    `<url><loc>${SITE_URL}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`
  );

  for (const c of categories || []) {
    urls.push(
      `<url><loc>${SITE_URL}/blog/categoria/${c.slug}</loc><lastmod>${
        (c.updated_at || "").slice(0, 10)
      }</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  }

  for (const p of posts || []) {
    urls.push(
      `<url><loc>${SITE_URL}/blog/${p.slug}</loc><lastmod>${
        (p.updated_at || p.published_at || "").slice(0, 10)
      }</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
