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

// Apenas dois tipos de contato são capturados: e-mail e Instagram.
const INSTAGRAM_RE = /(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{2,30})/gi;

const SOCIAL_HOSTS = /(youtube\.com|youtu\.be|instagram\.com|instagr\.am|facebook\.com|twitter\.com|x\.com|tiktok\.com|threads\.(net|com)|whatsapp\.com|wa\.me|t\.me|spotify\.com|discord\.gg|twitch\.tv|kwai|pinterest\.|apple\.com|amazon\.|google\.com\/maps)/i;

// agregadores de links: não são contato, mas costumam esconder e-mail/Instagram
const LINK_HUBS = /(linktr\.ee|beacons\.ai|linkme\.bio|bio\.link|lnk\.bio|campsite\.bio|linklist\.bio|many\.link|carrd\.co|about\.me)/i;

const SOCIAL_JUNK = /^(p|reel|reels|explore|share|watch|profile|pages|groups|hashtag|home|feed|about|privacy|legal|policies|sharer|tr|intent|login|signup|accounts|status|i|stories|tv|direct)$/i;

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

// extrai apenas e-mails e perfis de Instagram
function harvest(text: string, source: string, confidence: "alta" | "media" | "baixa"): Found[] {
  const out: Found[] = [];
  if (!text) return out;

  const seen = new Set<string>();

  for (const raw of text.match(EMAIL_RE) ?? []) {
    const email = raw.toLowerCase().replace(/[.,;)'"]+$/, "");
    if (BAD_EMAIL.test(email)) continue;
    if (seen.has(`e${email}`)) continue;
    seen.add(`e${email}`);
    out.push({ type: "email", value: email, source, confidence });
  }

  const re = new RegExp(INSTAGRAM_RE.source, INSTAGRAM_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const handle = m[1];
    if (SOCIAL_JUNK.test(handle)) continue;
    if (seen.has(`i${handle.toLowerCase()}`)) continue;
    seen.add(`i${handle.toLowerCase()}`);
    out.push({
      type: "instagram",
      value: `https://instagram.com/${handle}`,
      source,
      confidence,
      status: confidence === "baixa" ? "possivel" : "encontrado",
    });
  }

  return out;
}

// links a visitar em busca de e-mail/Instagram (não viram contato)
function crawlableLinks(text: string): string[] {
  if (!text) return [];
  const raw = (text.match(/https?:\/\/[^\s)<>"'\\]+/g) ?? []).map((l) =>
    l.replace(/[.,;'"]+$/, "").replace(/&amp;/g, "&"),
  );
  const out: string[] = [];
  for (let l of raw) {
    // links do YouTube vêm embrulhados em /redirect?q=<url>
    const redirect = l.match(/youtube\.com\/redirect\?[^\s]*[?&]q=([^&\s]+)/i);
    if (redirect) {
      try { l = decodeURIComponent(redirect[1]); } catch { continue; }
    }
    if (SOCIAL_HOSTS.test(l)) continue;
    if (/\.(png|jpe?g|gif|webp|svg|css|js|ico|mp4|pdf)(\?|$)/i.test(l)) continue;
    out.push(l);
  }
  return Array.from(new Set(out));
}

function rankLinks(links: string[]): string[] {
  const score = (l: string) =>
    (/(contato|contact|fale-conosco|parcerias|imprensa|midia|media-?kit|business|sobre|about)/i.test(l) ? 0 : 1) +
    (LINK_HUBS.test(l) ? -1 : 0);
  return [...links].sort((a, b) => score(a) - score(b));
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

// Cloudflare email protection: <a data-cfemail="hexhex...">
function decodeCfEmails(s: string) {
  return s.replace(/data-cfemail=["']([0-9a-f]+)["']/gi, (_, hex: string) => {
    try {
      const key = parseInt(hex.slice(0, 2), 16);
      let email = "";
      for (let i = 2; i < hex.length; i += 2) {
        email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
      }
      return ` ${email} `;
    } catch {
      return " ";
    }
  });
}

function decodeHtmlEntities(s: string) {
  let out = decodeCfEmails(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/\\u0040/gi, "@")
    .replace(/%40/gi, "@");

  // mailto: em atributos, inclusive com parâmetros (?subject=)
  out = out.replace(/mailto:([^"'\s>?&]+)/gi, (_, e) => ` ${e} `);

  // e-mails ofuscados: nome (arroba) dominio (ponto) com, nome [at] dominio [dot] com
  out = out
    .replace(/\s*[\[({<]\s*(?:at|arroba|@)\s*[\])}>]\s*/gi, "@")
    .replace(/\s+(?:arroba|at)\s+/gi, "@")
    .replace(/\s*[\[({<]\s*(?:dot|ponto|\.)\s*[\])}>]\s*/gi, ".")
    .replace(/\s+(?:ponto|dot)\s+/gi, ".");

  // espaços ao redor do @ e do ponto final do domínio: "nome @ dominio . com"
  out = out.replace(
    /([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9-]+(?:\s*\.\s*[a-zA-Z0-9-]+)+)/g,
    (_, user: string, domain: string) => `${user}@${domain.replace(/\s*\.\s*/g, ".")}`,
  );

  return out;
}

// páginas que dependem de JavaScript: leitura em texto puro como último recurso
async function fetchRendered(url: string, timeoutMs = 12000): Promise<string> {
  try {
    const clean = url.replace(/^https?:\/\//, "");
    return await fetchPage(`https://r.jina.ai/http://${clean}`, timeoutMs);
  } catch {
    return "";
  }
}

function hasEmailIn(text: string) {
  for (const raw of text.match(EMAIL_RE) ?? []) {
    if (!BAD_EMAIL.test(raw)) return true;
  }
  return false;
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

      const aboutText = decodeHtmlEntities(aboutBlob);
      found.push(...harvest(aboutText, "youtube_about", "alta"));

      // contatos já existentes nas colunas legadas do prospect
      if (p.contact_email) found.push({ type: "email", value: p.contact_email, source: "youtube_about", confidence: "alta" });
      if (p.instagram_url) found.push({ type: "instagram", value: p.instagram_url, source: "youtube_about", confidence: "alta" });

      // descrições dos vídeos recentes (fonte oficial do criador, porém secundária)
      const { data: videos } = await admin
        .from("influencer_videos").select("description").eq("prospect_id", p.id).limit(12);
      const videoBlob = (videos ?? []).map((v: any) => v.description).filter(Boolean).join("\n");
      const videoText = decodeHtmlEntities(videoBlob);
      if (videoText) found.push(...harvest(videoText, "youtube_videos", "media"));

      // página pública do canal (traz links do "Sobre" que a API não devolve)
      let channelText = "";
      const channelUrls = [
        p.youtube_channel_id ? `https://www.youtube.com/channel/${p.youtube_channel_id}/about?hl=pt-BR` : "",
        p.channel_url ? `${String(p.channel_url).replace(/\/+$/, "")}/about?hl=pt-BR` : "",
      ].filter(Boolean);
      for (const url of channelUrls) {
        const html = await fetchPage(url, 9000);
        if (!html) continue;
        channelText = decodeHtmlEntities(html.replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
        found.push(...harvest(channelText, "youtube_about", "alta"));
        break;
      }

      // sites oficiais e agregadores de links citados pelo criador
      const candidateLinks = rankLinks([
        ...(p.website_url ? [String(p.website_url)] : []),
        ...crawlableLinks(aboutText),
        ...crawlableLinks(channelText),
        ...crawlableLinks(videoText),
      ]).slice(0, 4);

      const visited = new Set<string>();
      for (const site of candidateLinks) {
        if (visited.has(site)) continue;
        visited.add(site);
        const html = decodeHtmlEntities(await fetchPage(site));
        if (!html) continue;
        const isHub = LINK_HUBS.test(site);
        found.push(...harvest(html, isHub ? "agregador_links" : "site_oficial", "media"));

        if (isHub) {
          // dentro do agregador, visita o site próprio do criador
          for (const inner of rankLinks(crawlableLinks(html)).slice(0, 2)) {
            if (visited.has(inner) || LINK_HUBS.test(inner)) continue;
            visited.add(inner);
            const innerHtml = decodeHtmlEntities(await fetchPage(inner, 7000));
            if (innerHtml) found.push(...harvest(innerHtml, "site_oficial", "media"));
          }
          continue;
        }

        try {
          const origin = new URL(site).origin;
          for (const path of ["/contato", "/contact", "/fale-conosco", "/parcerias", "/sobre", "/about"]) {
            if (visited.has(origin + path)) continue;
            visited.add(origin + path);
            const page = decodeHtmlEntities(await fetchPage(origin + path, 6000));
            if (page) found.push(...harvest(page, "pagina_contato", "media"));
          }
        } catch { /* URL inválida */ }
      }

      // mantém apenas e-mail e Instagram (limpa tipos antigos: site, tiktok, etc.)
      await admin
        .from("influencer_contacts")
        .delete()
        .eq("prospect_id", p.id)
        .not("type", "in", "(email,instagram)");

      const stats = await persist(admin, p.id, found);

      // sincroniza colunas legadas (retrocompatibilidade com a tela atual)
      const { data: contacts } = await admin
        .from("influencer_contacts").select("type, value, confidence").eq("prospect_id", p.id);
      const pick = (t: string) => (contacts ?? []).find((c: any) => c.type === t)?.value ?? null;
      const legacyPatch: Record<string, unknown> = {
        contact_email: p.contact_email || pick("email"),
        instagram_url: p.instagram_url || pick("instagram"),
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
