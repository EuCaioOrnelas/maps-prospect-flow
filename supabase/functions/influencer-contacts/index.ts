// Wiize · Influenciadores — Identificação de contatos públicos
// Etapa "Encontrar contatos" do funil de prospecção de influenciadores.
//
// Ações:
//   find            → varre fontes públicas (YouTube About, links do canal, site,
//                     página de contato, descrições de vídeos) e grava contatos deduplicados
//   list            → lista contatos de um prospect
//   update_contact  → status / confiança / observação / valor
//   add_contact     → contato manual
//   delete_contact  → remove contato
//
// Reutiliza: auth + checagem de admin (mesmo padrão de youtube-influencer-prospect),
// tabelas influencer_prospects / influencer_videos, YOUTUBE_API_KEY já configurada.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_PROSPECTS_PER_RUN = 25;

// ─────────────────────────── extração ───────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BAD_EMAIL = /(example\.|sentry\.|wixpress|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|@2x|no-?reply@|@youtube\.com|@google\.com|@sentry)/i;

const SOCIAL_PATTERNS: { type: string; re: RegExp; build: (m: RegExpMatchArray) => string }[] = [
  { type: "instagram", re: /(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{2,30})/gi, build: (m) => `https://instagram.com/${m[1]}` },
  { type: "tiktok", re: /tiktok\.com\/@([A-Za-z0-9._]{2,30})/gi, build: (m) => `https://tiktok.com/@${m[1]}` },
  { type: "twitter", re: /(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{2,20})/gi, build: (m) => `https://x.com/${m[1]}` },
  { type: "linkedin", re: /linkedin\.com\/(in|company)\/([A-Za-z0-9\-_.%]{2,60})/gi, build: (m) => `https://linkedin.com/${m[1]}/${m[2]}` },
  { type: "facebook", re: /facebook\.com\/([A-Za-z0-9.\-]{3,60})/gi, build: (m) => `https://facebook.com/${m[1]}` },
  { type: "threads", re: /threads\.(?:net|com)\/@?([A-Za-z0-9._]{2,30})/gi, build: (m) => `https://threads.net/@${m[1]}` },
];

const SOCIAL_HOSTS = /(youtube\.com|youtu\.be|instagram\.com|instagr\.am|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com|threads\.(net|com)|whatsapp\.com|wa\.me|t\.me|spotify\.com|linktr\.ee|beacons\.ai|discord\.gg|twitch\.tv|patreon\.com|kwai)/i;

const SOCIAL_JUNK = /^(p|reel|reels|explore|share|watch|profile|pages|groups|hashtag|home|feed|about|privacy|legal|policies|sharer|tr|intent|login|signup|status|i)$/i;

interface Found {
  type: string;
  value: string;
  source: string;
  confidence: "alta" | "media" | "baixa";
  status?: string;
  note?: string | null;
}

function normalize(type: string, value: string) {
  const v = value.trim();
  if (type === "email") return v.toLowerCase();
  return v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

function harvest(text: string, source: string, confidence: "alta" | "media" | "baixa"): Found[] {
  const out: Found[] = [];
  if (!text) return out;

  for (const raw of text.match(EMAIL_RE) ?? []) {
    const email = raw.toLowerCase().replace(/[.,;)]+$/, "");
    if (BAD_EMAIL.test(email)) continue;
    out.push({ type: "email", value: email, source, confidence });
  }

  for (const p of SOCIAL_PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const handle = m[m.length - 1];
      if (SOCIAL_JUNK.test(handle)) continue;
      out.push({
        type: p.type,
        value: p.build(m as unknown as RegExpMatchArray),
        source,
        confidence,
        // referências capturadas fora de fonte oficial entram como possível correspondência
        status: confidence === "baixa" ? "possivel" : "encontrado",
      });
    }
  }

  // sites e páginas de contato
  const links = Array.from(new Set((text.match(/https?:\/\/[^\s)<>"'\\]+/g) ?? []).map((l) => l.replace(/[.,;]+$/, ""))));
  for (const l of links.slice(0, 40)) {
    if (SOCIAL_HOSTS.test(l)) continue;
    const isContactPage = /(contato|contact|fale-conosco|parcerias|imprensa|midia|media-?kit|business)/i.test(l);
    out.push({
      type: isContactPage ? "contact_page" : "website",
      value: l,
      source,
      confidence: confidence === "alta" ? "alta" : "media",
    });
  }

  return out;
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WiizeBot/1.0; +https://wiize.com.br)" },
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain/i.test(ct)) return "";
    const body = await res.text();
    return body.slice(0, 400_000);
  } catch {
    return "";
  }
}

function decodeHtmlEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[at\]|\(at\)|\s+arroba\s+/gi, "@")
    .replace(/\[dot\]|\(dot\)/gi, ".");
}

// ─────────────────────────── persistência (dedupe) ───────────────────────────

async function persist(admin: any, prospectId: string, found: Found[]) {
  const { data: existing } = await admin
    .from("influencer_contacts")
    .select("id, type, normalized_value, sources, confidence, status")
    .eq("prospect_id", prospectId);

  const byKey = new Map<string, any>();
  (existing ?? []).forEach((c: any) => byKey.set(`${c.type}::${c.normalized_value}`, c));

  const seen = new Set<string>();
  let created = 0;
  let merged = 0;

  const rank = { alta: 3, media: 2, baixa: 1 } as Record<string, number>;
  // consolida duplicatas do próprio lote mantendo todas as origens
  const bundled = new Map<string, Found & { sources: string[] }>();
  for (const f of found) {
    const key = `${f.type}::${normalize(f.type, f.value)}`;
    const prev = bundled.get(key);
    if (!prev) {
      bundled.set(key, { ...f, sources: [f.source] });
    } else {
      if (!prev.sources.includes(f.source)) prev.sources.push(f.source);
      if (rank[f.confidence] > rank[prev.confidence]) {
        prev.confidence = f.confidence;
        prev.status = f.status;
      }
    }
  }

  for (const [key, f] of bundled) {
    if (seen.has(key)) continue;
    seen.add(key);
    const normalized = normalize(f.type, f.value);
    const hit = byKey.get(key);
    const now = new Date().toISOString();
    const newSources = f.sources.map((s) => ({ source: s, discovered_at: now }));

    if (hit) {
      const current = Array.isArray(hit.sources) ? hit.sources : [];
      const names = new Set(current.map((s: any) => s?.source));
      const addition = newSources.filter((s) => !names.has(s.source));
      const bestConfidence = rank[f.confidence] > rank[hit.confidence] ? f.confidence : hit.confidence;
      if (addition.length || bestConfidence !== hit.confidence) {
        await admin
          .from("influencer_contacts")
          .update({ sources: [...current, ...addition], confidence: bestConfidence })
          .eq("id", hit.id);
        merged++;
      }
      continue;
    }

    const { error } = await admin.from("influencer_contacts").insert({
      prospect_id: prospectId,
      type: f.type,
      value: f.value,
      normalized_value: normalized,
      sources: newSources,
      confidence: f.confidence,
      status: f.status ?? "encontrado",
      note: f.note ?? null,
    });
    if (!error) created++;
  }

  return { created, merged };
}

// ─────────────────────────── handler ───────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const youtubeKey = Deno.env.get("YOUTUBE_API_KEY") || "";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Acesso restrito a administradores." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "find");

    // ---------- LIST ----------
    if (action === "list") {
      const prospectId = String(body.prospect_id || "");
      if (!prospectId) return json({ error: "prospect_id obrigatório." }, 400);
      const { data } = await admin
        .from("influencer_contacts").select("*").eq("prospect_id", prospectId)
        .order("type", { ascending: true });
      return json({ contacts: data ?? [] });
    }

    // ---------- UPDATE ----------
    if (action === "update_contact") {
      const id = String(body.contact_id || "");
      if (!id) return json({ error: "contact_id obrigatório." }, 400);
      const patch: Record<string, unknown> = {};
      for (const k of ["status", "confidence", "note", "value", "is_primary"]) {
        if (body[k] !== undefined) patch[k] = body[k];
      }
      if (body.value !== undefined) {
        const { data: cur } = await admin.from("influencer_contacts").select("type").eq("id", id).maybeSingle();
        if (cur) patch.normalized_value = normalize(cur.type, String(body.value));
      }
      if (body.status === "contatado") patch.last_contacted_at = new Date().toISOString();
      const { error } = await admin.from("influencer_contacts").update(patch).eq("id", id);
      if (error) return json({ error: error.message }, 400);

      // opt-out manual também bloqueia envios futuros de e-mail
      if (body.status === "nao_contatar") {
        const { data: c } = await admin.from("influencer_contacts").select("type, normalized_value, prospect_id").eq("id", id).maybeSingle();
        if (c?.type === "email") {
          await admin.from("influencer_email_suppressions")
            .upsert({ email: c.normalized_value, reason: "marcado_manual", prospect_id: c.prospect_id }, { onConflict: "email" });
        }
      }
      return json({ ok: true });
    }

    // ---------- ADD ----------
    if (action === "add_contact") {
      const prospectId = String(body.prospect_id || "");
      const type = String(body.type || "");
      const value = String(body.value || "").trim();
      if (!prospectId || !type || !value) return json({ error: "Dados inválidos." }, 400);
      if (type === "email" && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) return json({ error: "E-mail inválido." }, 400);
      const { error } = await admin.from("influencer_contacts").insert({
        prospect_id: prospectId,
        type,
        value,
        normalized_value: normalize(type, value),
        sources: [{ source: "manual", discovered_at: new Date().toISOString() }],
        confidence: body.confidence || "alta",
        status: "encontrado",
        note: body.note ?? null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- DELETE ----------
    if (action === "delete_contact") {
      const id = String(body.contact_id || "");
      if (!id) return json({ error: "contact_id obrigatório." }, 400);
      await admin.from("influencer_contacts").delete().eq("id", id);
      return json({ ok: true });
    }

    // ---------- FIND ----------
    if (action !== "find") return json({ error: "Ação desconhecida." }, 400);

    const ids: string[] = Array.isArray(body.prospect_ids)
      ? body.prospect_ids.filter(Boolean).slice(0, MAX_PROSPECTS_PER_RUN)
      : body.prospect_id ? [String(body.prospect_id)] : [];
    if (ids.length === 0) return json({ error: "Selecione ao menos um influenciador." }, 400);

    const { data: prospects } = await admin
      .from("influencer_prospects")
      .select("id, youtube_channel_id, channel_name, channel_url, channel_description, contact_email, instagram_url, website_url, contact_links, status")
      .in("id", ids);

    if (!prospects?.length) return json({ error: "Influenciadores não encontrados." }, 404);

    // YouTube: descrição completa + links do "Sobre" (batch de 50)
    const ytById = new Map<string, any>();
    if (youtubeKey) {
      const chIds = prospects.map((p: any) => p.youtube_channel_id).filter(Boolean);
      for (let i = 0; i < chIds.length; i += 50) {
        const slice = chIds.slice(i, i + 50);
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id=${slice.join(",")}&key=${youtubeKey}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("[influencer-contacts] youtube error", res.status, JSON.stringify(data)?.slice(0, 400));
          continue;
        }
        for (const item of data?.items ?? []) ytById.set(item.id, item);
      }
    }

    const results: any[] = [];

    for (const p of prospects) {
      const found: Found[] = [];
      const yt = ytById.get(p.youtube_channel_id);

      const aboutBlob = [
        p.channel_description,
        yt?.snippet?.description,
        yt?.brandingSettings?.channel?.description,
        yt?.brandingSettings?.channel?.keywords,
        Array.isArray(p.contact_links) ? p.contact_links.join("\n") : "",
      ].filter(Boolean).join("\n");

      found.push(...harvest(decodeHtmlEntities(aboutBlob), "youtube_about", "alta"));

      // contatos já existentes nas colunas legadas do prospect
      if (p.contact_email) found.push({ type: "email", value: p.contact_email, source: "youtube_about", confidence: "alta" });
      if (p.instagram_url) found.push({ type: "instagram", value: p.instagram_url, source: "youtube_about", confidence: "alta" });
      if (p.website_url) found.push({ type: "website", value: p.website_url, source: "youtube_about", confidence: "media" });

      // descrições dos vídeos recentes (fonte oficial do criador, porém secundária)
      const { data: videos } = await admin
        .from("influencer_videos").select("description").eq("prospect_id", p.id).limit(12);
      const videoBlob = (videos ?? []).map((v: any) => v.description).filter(Boolean).join("\n");
      if (videoBlob) found.push(...harvest(decodeHtmlEntities(videoBlob), "youtube_videos", "media"));

      // site oficial + página de contato
      const sites = Array.from(new Set(
        found.filter((f) => f.type === "website" || f.type === "contact_page").map((f) => f.value),
      )).slice(0, 2);

      for (const site of sites) {
        const html = decodeHtmlEntities(await fetchPage(site));
        if (html) found.push(...harvest(html, "site_oficial", "media"));
        try {
          const origin = new URL(site).origin;
          for (const path of ["/contato", "/contact"]) {
            const page = decodeHtmlEntities(await fetchPage(origin + path, 6000));
            if (page) found.push(...harvest(page, "pagina_contato", "media"));
          }
        } catch { /* URL inválida */ }
      }

      const stats = await persist(admin, p.id, found);

      // sincroniza colunas legadas (retrocompatibilidade com a tela atual)
      const { data: contacts } = await admin
        .from("influencer_contacts").select("type, value, confidence").eq("prospect_id", p.id);
      const pick = (t: string) => (contacts ?? []).find((c: any) => c.type === t)?.value ?? null;
      const legacyPatch: Record<string, unknown> = {
        contact_email: p.contact_email || pick("email"),
        instagram_url: p.instagram_url || pick("instagram"),
        website_url: p.website_url || pick("website"),
      };
      const hasEmail = !!legacyPatch.contact_email;
      if (["novo", "qualificado", "contato_encontrado"].includes(p.status)) {
        legacyPatch.status = hasEmail ? "pronto_abordagem" : (contacts?.length ? "contatos_identificados" : "sem_contato");
      }
      await admin.from("influencer_prospects").update(legacyPatch).eq("id", p.id);

      results.push({
        prospect_id: p.id,
        channel_name: p.channel_name,
        contacts_total: contacts?.length ?? 0,
        has_email: hasEmail,
        ...stats,
      });
    }

    return json({ ok: true, results });
  } catch (e) {
    console.error("[influencer-contacts]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
