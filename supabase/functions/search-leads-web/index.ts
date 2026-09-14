import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reaproveita exatamente as mesmas credenciais de busca já usadas pela
// Prospecção Completa (SerpAPI). Aqui usamos engine=google (web), não maps.
const SERP_API_KEYS = [
  Deno.env.get("SERP_API_KEY"),
  Deno.env.get("SERP_API_KEY_2"),
  Deno.env.get("SERP_API_KEY_3"),
  Deno.env.get("SERP_API_KEY_4"),
  Deno.env.get("SERP_API_KEY_5"),
  Deno.env.get("SERP_API_KEY_6"),
].filter((k) => k && k.trim() !== "") as string[];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MIN_VALID_RESULTS = 10;
const MAX_VALID_RESULTS = 30;
const MAX_SERP_PAGES = 6;

/** Domínios que nunca contam como site próprio de uma empresa. */
const BLOCKED_DOMAINS = [
  // redes sociais (podem enriquecer, mas não são site válido)
  "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
  "youtube.com", "youtu.be", "tiktok.com", "pinterest.com", "threads.net", "wa.me",
  "api.whatsapp.com", "whatsapp.com", "t.me", "telegram.me", "kwai.com", "snapchat.com",
  // marketplaces / agregadores / diretórios
  "google.com", "google.com.br", "goo.gl", "maps.app.goo.gl", "bing.com", "yahoo.com",
  "mercadolivre.com.br", "olx.com.br", "americanas.com.br", "magazineluiza.com.br",
  "shopee.com.br", "amazon.com", "amazon.com.br", "aliexpress.com", "elo7.com.br",
  "ifood.com.br", "rappi.com.br", "booking.com", "airbnb.com", "tripadvisor.com",
  "tripadvisor.com.br", "doctoralia.com.br", "boaconsulta.com", "gupy.io",
  "apontador.com.br", "telelistas.net", "guiamais.com.br", "solutudo.com.br",
  "encontra.com.br", "hotfrog.com.br", "cnpj.biz", "econodata.com.br", "empresascnpj.com",
  "consultacnpj.com", "casadosdados.com.br", "reclameaqui.com.br", "jusbrasil.com.br",
  "yelp.com", "foursquare.com", "getninjas.com.br", "workana.com", "99freelas.com.br",
  "wikipedia.org", "glassdoor.com.br", "catho.com.br", "indeed.com", "vagas.com.br",
  "medium.com", "blogspot.com", "wordpress.com", "wixsite.com", "gov.br", "jus.br",
  "sebrae.com.br", "receita.fazenda.gov.br", "linktr.ee", "beacons.ai",
];

const SOCIAL_HOSTS: Record<string, string> = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "tiktok.com": "tiktok",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (error) return { allowed: true };
    return { allowed: data?.allowed !== false, retryAfter: data?.retry_after };
  } catch {
    return { allowed: true };
  }
}

/** Normaliza o domínio: minúsculo, sem www, sem porta, sem path. */
function normalizeDomain(rawUrl: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const host = new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((b) => domain === b || domain.endsWith(`.${b}`));
}

function socialNetworkOf(domain: string): string | null {
  for (const [host, key] of Object.entries(SOCIAL_HOSTS)) {
    if (domain === host || domain.endsWith(`.${host}`)) return key;
  }
  return null;
}

/** Nome de empresa a partir do título do resultado. */
function companyNameFromTitle(title: string, domain: string): string {
  const cleaned = (title || "")
    .split(/\s[|\-–—]\s/)[0]
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 3 && cleaned.length <= 90) return cleaned;
  const base = domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Telefone BR normalizado em E.164 (55DDDNUMERO) ou null. */
function normalizePhoneBR(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 10 || d.length === 11) {
    const ddd = Number(d.slice(0, 2));
    if (ddd < 11 || ddd > 99) return null;
    const rest = d.slice(2);
    if (/^(\d)\1+$/.test(rest)) return null;
    if (d.length === 11 && rest[0] !== "9") return null;
    return `55${d}`;
  }
  return null;
}

function isMobileBR(e164: string): boolean {
  return e164.length === 13 && e164[4] === "9";
}

async function serpSearch(
  query: string,
  start: number,
  location?: string | null,
): Promise<any | null> {
  // SerpAPI (engine=google) precisa apenas de: q, start/num e, opcionalmente,
  // location. Se a localização não for reconhecida, refazemos sem ela.
  for (const key of SERP_API_KEYS) {
    for (const useLocation of location ? [true, false] : [false]) {
      const url =
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}` +
        (useLocation ? `&location=${encodeURIComponent(location as string)}` : "") +
        `&hl=pt-br&gl=br&google_domain=google.com.br&num=20&start=${start}&api_key=${key}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[web-search] SERP ${res.status} — tentando novamente`);
          continue;
        }
        const data = await res.json();
        if (data?.error) {
          console.error(`[web-search] SERP error: ${data.error}`);
          continue;
        }
        return data;
      } catch (e) {
        console.error("[web-search] SERP fetch falhou", String(e));
      }
    }
  }
  return null;
}


type WebCandidate = {
  domain: string;
  website: string;
  title: string;
  snippet: string;
};

type Enrichment = {
  phone: string | null;
  phones: string[];
  email: string | null;
  social: Record<string, string>;
  address: string | null;
  hasWhatsApp: boolean;
};

const EMPTY_ENRICHMENT: Enrichment = {
  phone: null, phones: [], email: null, social: {}, address: null, hasWhatsApp: false,
};

async function fetchHtml(url: string, timeoutMs = 7000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WiizeBot/1.0; +https://wiize.com.br)",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    const text = await res.text();
    return text.slice(0, 400_000);
  } catch {
    return null;
  }
}

/** Extrai contatos reais do HTML. Nunca inventa dados. */
function extractFromHtml(html: string, enr: Enrichment) {
  // WhatsApp / telefones em links
  const linkRe = /(?:href|data-href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    if (/wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) {
      const num = href.match(/(\d{10,15})/);
      const p = num ? normalizePhoneBR(num[1]) : null;
      if (p) {
        enr.hasWhatsApp = true;
        if (!enr.phones.includes(p)) enr.phones.unshift(p);
      }
    } else if (/^tel:/i.test(href)) {
      const p = normalizePhoneBR(href.replace(/^tel:/i, ""));
      if (p && !enr.phones.includes(p)) enr.phones.push(p);
    } else if (/^mailto:/i.test(href)) {
      const mail = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
      if (!enr.email && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)) enr.email = mail;
    } else {
      const d = normalizeDomain(href);
      if (d) {
        const net = socialNetworkOf(d);
        if (net && !enr.social[net]) {
          const abs = /^https?:\/\//i.test(href) ? href : `https://${href.replace(/^\/+/, "")}`;
          enr.social[net] = abs;
        }
      }
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  // Telefones no texto: (44) 99999-9999 / 44 3333-3333 / +55 44 ...
  const phoneRe = /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-.\s]?\d{4}/g;
  const found = text.match(phoneRe) || [];
  for (const raw of found) {
    const p = normalizePhoneBR(raw);
    if (p && !enr.phones.includes(p)) enr.phones.push(p);
    if (enr.phones.length >= 6) break;
  }

  if (!enr.email) {
    const mail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (mail && !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(mail[0])) {
      enr.email = mail[0].toLowerCase();
    }
  }

  if (!enr.address) {
    const addr = text.match(
      /((?:Rua|Av\.?|Avenida|Travessa|Rodovia|Alameda|Praça|Estrada)\s+[^,;|]{3,60},?\s*n?º?\s*\d{1,6}[^|]{0,80}?CEP[:\s]*\d{5}-?\d{3})/i,
    ) || text.match(
      /((?:Rua|Av\.?|Avenida|Travessa|Rodovia|Alameda|Praça|Estrada)\s+[^,;|]{3,60},\s*\d{1,6}[^|]{0,60})/i,
    );
    if (addr) enr.address = addr[1].replace(/\s+/g, " ").trim().slice(0, 200);
  }

  // Prioriza celular (WhatsApp provável)
  const mobile = enr.phones.find(isMobileBR);
  enr.phone = mobile || enr.phones[0] || null;
  if (mobile) enr.hasWhatsApp = true;
}

async function enrichCandidate(c: WebCandidate): Promise<Enrichment> {
  const enr: Enrichment = { ...EMPTY_ENRICHMENT, phones: [], social: {} };
  const base = `https://${c.domain}`;
  const paths = ["", "/contato"];
  for (const p of paths) {
    if (enr.phone && enr.email && Object.keys(enr.social).length > 0) break;
    const html = await fetchHtml(`${base}${p}`);
    if (!html) continue;
    extractFromHtml(html, enr);
  }
  return enr;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (i: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = undefined as unknown as R;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Configuração do servidor incompleta" }, 500);
    }
    if (SERP_API_KEYS.length === 0) {
      return json({ error: "Configuração do servidor incompleta" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const ipRl = await checkRateLimit(admin, getClientIP(req), "search_leads_web_ip", 30, 60);
    if (!ipRl.allowed) {
      return json({ error: "rate_limited", message: "Muitas requisições. Aguarde um instante." }, 429);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Usuário não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    // Só o necessário para o SerpAPI: o termo de busca (q) e, opcionalmente, a localização.
    const searchTerm = String(body?.query || body?.q || body?.niche || "").trim();
    const location = String(body?.location || "").trim();

    if (searchTerm.length < 2) {
      return json({ error: "Informe o que você quer buscar no Google." }, 400);
    }


    const userRl = await checkRateLimit(admin, user.id, "search_leads_web_user", 5, 60);
    if (!userRl.allowed) {
      const retryAfter = Math.max(1, Number(userRl.retryAfter) || 60);
      return json(
        { error: "rate_limited", message: `Aguarde ${retryAfter} segundos antes de uma nova busca.`, retry_after: retryAfter },
        429,
      );
    }

    // --- Créditos (mesma regra da Prospecção Completa) ---
    const PROFILE_COLS =
      "id, searches_used, searches_limit, plan, bonus_searches, extra_opportunities_packs, parent_owner_id";
    let { data: profileData } = await admin
      .from("profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle();
    if (!profileData) {
      return json({ error: "Seu perfil ainda está sendo criado. Tente novamente em instantes." }, 409);
    }
    let ownerId = user.id;
    let billingProfileId = user.id;
    if ((profileData as any).parent_owner_id) {
      ownerId = (profileData as any).parent_owner_id;
      const { data: ownerProfile } = await admin
        .from("profiles").select(PROFILE_COLS).eq("id", ownerId).maybeSingle();
      if (ownerProfile) {
        profileData = ownerProfile;
        billingProfileId = ownerId;
      }
    }
    const effectiveLimit =
      ((profileData as any).searches_limit || 0) +
      ((profileData as any).extra_opportunities_packs || 0) * 1000 +
      ((profileData as any).bonus_searches || 0);
    const remaining = effectiveLimit - ((profileData as any).searches_used || 0);
    if (remaining <= 0) {
      return json({
        error: "Limite de oportunidades atingido",
        message: "Faça upgrade do seu plano ou adicione a Expansão Comercial (+1.000 oportunidades) para continuar prospectando",
        limitReached: true,
      }, 403);
    }

    // A quantidade não é controlada pelo cliente: cada busca tenta entregar o
    // máximo possível, respeitando o teto operacional e o saldo da conta.
    const target = Math.min(MAX_VALID_RESULTS, remaining);
    // Buscamos uma margem maior porque diretórios, redes sociais e domínios já
    // existentes são descartados. A meta é salvar 30 oportunidades novas.
    const candidateTarget = Math.min(MAX_SERP_PAGES * 20, Math.max(60, target * 2));
    const query = searchTerm;

    // --- Busca + filtragem ---
    const seen = new Set<string>();
    const candidates: WebCandidate[] = [];
    let serpCalls = 0;
    let lastSerpFailed = false;

    for (let page = 0; page < MAX_SERP_PAGES && candidates.length < candidateTarget; page++) {
      const data = await serpSearch(query, page * 20, location || null);
      serpCalls++;
      if (!data) {
        lastSerpFailed = true;
        break;
      }
      const organic: any[] = Array.isArray(data.organic_results) ? data.organic_results : [];
      if (organic.length === 0) break;
      for (const r of organic) {
        const link = String(r?.link || "");
        const domain = normalizeDomain(link);
        if (!domain || isBlockedDomain(domain) || seen.has(domain)) continue;
        seen.add(domain);
        candidates.push({
          domain,
          website: `https://${domain}`,
          title: String(r?.title || ""),
          snippet: String(r?.snippet || ""),
        });
        if (candidates.length >= candidateTarget) break;
      }
    }

    if (candidates.length === 0) {
      if (lastSerpFailed) {
        return json({
          error: "search_unavailable",
          message: "O serviço de busca está indisponível no momento. Tente novamente em alguns minutos.",
        }, 503);
      }
      return json({
        error: "no_results",
        message: `Nenhum site válido encontrado para "${searchTerm}". Tente outro termo de busca.`,
      }, 422);
    }

    // Deduplicação por domínio dentro da conta
    const domains = candidates.map((c) => c.domain);
    const { data: existing } = await admin
      .from("leads")
      .select("domain")
      .eq("owner_user_id", ownerId)
      .in("domain", domains);
    const known = new Set((existing || []).map((e: any) => e.domain));
    const fresh = candidates.filter((c) => !known.has(c.domain)).slice(0, target);

    if (fresh.length < MIN_VALID_RESULTS) {
      return json({
        error: "insufficient_results",
        message:
          fresh.length === 0
            ? "Todos os sites encontrados já estão na sua base de oportunidades. Tente outro nicho, termo ou localização."
            : `Encontramos apenas ${fresh.length} sites novos e válidos (mínimo ${MIN_VALID_RESULTS}). Tente ampliar a localização ou usar outro termo.`,
        foundCount: fresh.length,
      }, 422);
    }

    // --- Enriquecimento (dados reais do site) ---
    const enrichments = await mapLimit(fresh, 10, enrichCandidate);

    // Dedup adicional por telefone dentro da conta
    const foundPhones = enrichments.map((e) => e?.phone).filter(Boolean) as string[];
    const knownPhones = new Set<string>();
    if (foundPhones.length > 0) {
      const { data: dupPhones } = await admin
        .from("leads").select("phone").eq("owner_user_id", ownerId).in("phone", foundPhones);
      for (const p of dupPhones || []) if (p.phone) knownPhones.add(p.phone);
    }

    const nowIso = new Date().toISOString();
    const rows: any[] = [];
    const usedPhones = new Set<string>();
    for (let i = 0; i < fresh.length; i++) {
      const c = fresh[i];
      const e = enrichments[i] || EMPTY_ENRICHMENT;
      let phone = e.phone;
      if (phone && (knownPhones.has(phone) || usedPhones.has(phone))) phone = null;
      if (phone) usedPhones.add(phone);
      rows.push({
        user_id: ownerId,
        owner_user_id: ownerId,
        created_by_user_id: user.id,
        responsible_user_id: user.id,
        company_name: companyNameFromTitle(c.title, c.domain),
        phone,
        phone_numbers: e.phones.length > 0 ? e.phones : null,
        email: e.email,
        website: c.website,
        domain: c.domain,
        address: e.address,
        city: location || null,
        category: searchTerm,
        social_media: Object.keys(e.social).length > 0 ? e.social : null,
        source: "web",
        origin: "oportunidades",
        search_query: query,
        search_location: location || null,
        web_title: c.title || null,
        web_snippet: c.snippet || null,
        whatsapp_status: e.hasWhatsApp ? "provavel" : null,
        prospected_at: nowIso,
      });
    }

    const { data: inserted, error: insertError } = await admin
      .from("leads")
      .insert(rows)
      .select("id, company_name, domain, phone, email, social_media");

    if (insertError || !inserted) {
      console.error("[web-search] erro ao salvar leads", insertError);
      return json({
        error: "save_failed",
        message: "Encontramos as empresas, mas não conseguimos salvá-las na Gestão de Oportunidades. Tente novamente.",
      }, 500);
    }

    const savedCount = inserted.length;

    // Débito somente do que foi realmente salvo
    if (savedCount > 0) {
      await admin
        .from("profiles")
        .update({ searches_used: ((profileData as any).searches_used || 0) + savedCount })
        .eq("id", billingProfileId);
    }

    const withPhone = inserted.filter((l: any) => !!l.phone).length;
    const withEmail = inserted.filter((l: any) => !!l.email).length;
    const withSocial = inserted.filter((l: any) => !!l.social_media).length;

    const { data: history } = await admin
      .from("search_history")
      .insert({
        user_id: user.id,
        owner_user_id: ownerId,
        keyword: searchTerm,
        location: location || null,
        extra_term: null,
        requested_count: target,
        results_count: savedCount,
        source: "web",
        status: "completed",
        leads: inserted.map((l: any) => ({ id: l.id, name: l.company_name, domain: l.domain })),
      })
      .select("id")
      .maybeSingle();

    return json({
      success: true,
      searchId: history?.id || null,
      searchQuery: query,
      leadIds: inserted.map((l: any) => l.id),
      summary: {
        found: fresh.length,
        saved: savedCount,
        withPhone,
        withWhatsApp: rows.filter((row) => row.whatsapp_status === "provavel").length,
        withEmail,
        withSocial,
        serpCalls,
      },
    });
  } catch (e) {
    console.error("[web-search] erro inesperado", e);
    return json({ error: "Erro inesperado ao buscar empresas na web." }, 500);
  }
});
