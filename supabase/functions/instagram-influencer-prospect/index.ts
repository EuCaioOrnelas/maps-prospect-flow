import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_MODEL = "gpt-4o-mini";
export const INSTAGRAM_ANALYSIS_PROMPT_VERSION = "ig-v1";
const PLATFORM = "instagram";
const DAY_MS = 86400000;

/** Limites — protegem a quota da SerpApi (1 busca de perfil = 1 crédito) e o custo OpenAI. */
export const LIMITS = {
  DAILY_PER_ADMIN: 10,
  DAILY_GLOBAL: 25,
  COOLDOWN_SECONDS: 60,
  BURST_MAX: 3,
  BURST_WINDOW_SECONDS: 600,
  MAX_RESULTS_PER_SEARCH: 50,
  /** Máximo de páginas de descoberta no Google por termo */
  MAX_DISCOVERY_PAGES: 3,
  /** Perfil coletado há menos disso é reaproveitado do banco (não gasta crédito) */
  PROFILE_CACHE_DAYS: 7,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function fitCategory(score: number) {
  if (score >= 90) return "EXCELENTE FIT";
  if (score >= 80) return "ALTO FIT";
  if (score >= 70) return "BOM FIT";
  if (score >= 60) return "FIT MODERADO";
  return "BAIXO FIT";
}

const SERP_API_KEYS = [
  Deno.env.get("SERP_API_KEY"),
  Deno.env.get("SERP_API_KEY_2"),
  Deno.env.get("SERP_API_KEY_3"),
  Deno.env.get("SERP_API_KEY_4"),
  Deno.env.get("SERP_API_KEY_5"),
  Deno.env.get("SERP_API_KEY_6"),
].filter((k): k is string => !!k && k.trim() !== "");

let SERP_CREDITS_USED = 0;

/** Chama a SerpApi com fallback automático entre as chaves configuradas. */
async function serp(params: Record<string, string>): Promise<any> {
  if (SERP_API_KEYS.length === 0) throw new Error("SERPAPI_NOT_CONFIGURED");
  let lastError = "";
  for (let i = 0; i < SERP_API_KEYS.length; i++) {
    const url = new URL("https://serpapi.com/search.json");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("api_key", SERP_API_KEYS[i]);
    try {
      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data?.error) {
        SERP_CREDITS_USED++;
        return data;
      }
      lastError = String(data?.error ?? res.status);
      // Erros de perfil inexistente/privado não devem trocar de chave
      if (/not found|no results|hasn't shared|private/i.test(lastError)) return { __empty: true, error: lastError };
      console.error(`[serpapi] chave ${i + 1} falhou:`, lastError);
    } catch (e) {
      lastError = String(e);
      console.error(`[serpapi] chave ${i + 1} erro de rede`, lastError);
    }
  }
  throw new Error(`SERPAPI_EXHAUSTED:${lastError}`);
}

let CURRENT_USER_ID: string | null = null;

const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
};

async function logAiUsage(p: { feature: string; model: string; tokens_in: number; tokens_out: number }) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const price = AI_PRICES[p.model] ?? AI_PRICES["gpt-4o-mini"];
    const cost = p.tokens_in * price.in + p.tokens_out * price.out;
    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: p.feature,
        model: p.model,
        user_id: CURRENT_USER_ID,
        tokens_in: Math.round(p.tokens_in),
        tokens_out: Math.round(p.tokens_out),
        cost_usd: Number(cost.toFixed(8)),
        metadata: {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}

async function openai(messages: unknown[], apiKey: string, feature: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[openai] error", res.status, t);
    throw new Error(`OPENAI_ERROR_${res.status}`);
  }
  const data = await res.json();
  logAiUsage({
    feature,
    model: OPENAI_MODEL,
    tokens_in: data.usage?.prompt_tokens ?? 0,
    tokens_out: data.usage?.completion_tokens ?? 0,
  });
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  } catch {
    throw new Error("OPENAI_INVALID_JSON");
  }
}

const RESERVED_IG_PATHS = new Set([
  "p", "reel", "reels", "tv", "explore", "stories", "accounts", "directory", "about",
  "developer", "legal", "privacy", "terms", "web", "s", "graphql", "challenge", "direct",
  "emails", "session", "topics", "locations", "invites", "help",
]);

/** Extrai usernames do Instagram a partir de resultados orgânicos do Google. */
function extractUsernames(data: any): { username: string; title?: string; snippet?: string }[] {
  const out: { username: string; title?: string; snippet?: string }[] = [];
  const push = (link: string, title?: string, snippet?: string) => {
    const m = String(link || "").match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i);
    if (!m) return;
    const u = m[1].toLowerCase().replace(/\.$/, "");
    if (RESERVED_IG_PATHS.has(u)) return;
    out.push({ username: u, title, snippet });
  };
  for (const r of data?.organic_results ?? []) {
    push(r?.link, r?.title, r?.snippet);
    for (const s of r?.sitelinks?.inline ?? []) push(s?.link, s?.title);
  }
  for (const r of data?.related_results ?? []) push(r?.link, r?.title);
  return out;
}

/** Extrai contatos públicos (e-mail, WhatsApp, site) da bio e dos links do perfil. */
function extractContacts(texts: (string | null | undefined)[], links: string[]) {
  const blob = texts.filter(Boolean).join("\n");
  const email = blob.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]?.toLowerCase() ?? null;
  const all = Array.from(new Set(links.filter(Boolean).map((l) => l.replace(/[.,;]+$/, "")))).slice(0, 12);
  const IGNORE =
    /(instagram\.com|instagr\.am|facebook\.com|twitter\.com|x\.com|tiktok\.com|threads\.net|youtube\.com|youtu\.be)/i;
  const website = all.find((l) => !IGNORE.test(l)) ?? null;
  const whatsapp = all.find((l) => /wa\.me|api\.whatsapp\.com|whatsapp\.com/i.test(l)) ?? null;
  return { contact_email: email, website_url: website, whatsapp_url: whatsapp, contact_links: all };
}

async function getUsage(admin: any, adminId: string) {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [mine, global, last] = await Promise.all([
    admin
      .from("influencer_searches")
      .select("id", { count: "exact", head: true })
      .eq("admin_id", adminId)
      .eq("platform", PLATFORM)
      .gte("created_at", since),
    admin
      .from("influencer_searches")
      .select("id", { count: "exact", head: true })
      .eq("platform", PLATFORM)
      .gte("created_at", since),
    admin
      .from("influencer_searches")
      .select("created_at")
      .eq("admin_id", adminId)
      .eq("platform", PLATFORM)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const usedToday = mine.count ?? 0;
  const lastAt = last.data?.created_at ? new Date(last.data.created_at).getTime() : null;
  const cooldownRemaining = lastAt
    ? Math.max(0, Math.ceil((lastAt + LIMITS.COOLDOWN_SECONDS * 1000 - Date.now()) / 1000))
    : 0;

  return {
    platform: PLATFORM,
    used_today: usedToday,
    daily_limit: LIMITS.DAILY_PER_ADMIN,
    remaining_today: Math.max(0, LIMITS.DAILY_PER_ADMIN - usedToday),
    used_global_today: global.count ?? 0,
    global_daily_limit: LIMITS.DAILY_GLOBAL,
    cooldown_seconds_remaining: cooldownRemaining,
    cooldown_seconds: LIMITS.COOLDOWN_SECONDS,
    max_results_per_search: LIMITS.MAX_RESULTS_PER_SEARCH,
    burst_max: LIMITS.BURST_MAX,
    burst_window_minutes: LIMITS.BURST_WINDOW_SECONDS / 60,
    resets_at: new Date(Date.now() + DAY_MS).toISOString(),
  };
}

const AI_SYSTEM_PROMPT = `Você é um analista de parcerias da Wiize, plataforma de inteligência comercial e prospecção B2B.
Avalie se um perfil do Instagram tem potencial para ser parceiro/afiliado/canal de aquisição.
REGRA ABSOLUTA: o ICP descrito pelo usuário e as palavras-chave informadas definem a relevância. Se o conteúdo do perfil não trata desses temas, o fit_score deve ficar abaixo de 30 e a recomendação deve ser "Não priorizar", independentemente do tamanho do perfil.
Avalie EXCLUSIVAMENTE com base nos dados fornecidos. NUNCA invente audiência, receita, e-mail, dados demográficos, localização ou patrocínios. Quando não for possível comprovar, use "não identificado".
Não penalize excessivamente perfis menores com forte aderência ao ICP. Perfis privados ou sem posts públicos devem receber pontuação baixa em Qualidade e Alcance.
Distribuição do Fit Score (0-100): Content Fit 30, Audience/ICP Fit 25, Reach & Engagement 20, Commercial/Partnership Potential 15, Content Quality & Consistency 10. O fit_score é a soma dessas cinco notas.
Responda SOMENTE JSON:
{"fit_score":0,"content_fit_score":0,"audience_fit_score":0,"reach_score":0,"commercial_score":0,"quality_score":0,
"content_fit_reason":"","audience_fit_reason":"","reach_reason":"","commercial_reason":"","quality_reason":"",
"summary":"","strengths":[""],"weaknesses":[""],"recommendation":"Abordar|Considerar|Não priorizar","recommendation_reason":"",
"content_topics":[""],"audience_profile":"","partnership_opportunities":[""]}
Escreva em português.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return json({ error: "Acesso restrito a administradores." }, 403);
    CURRENT_USER_ID = u.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action || "search";

    if (action === "quota") return json({ usage: await getUsage(admin, u.user.id) });

    // ---------- REANÁLISE (sem custo de SerpApi) ----------
    if (action === "reanalyze") {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) return json({ error: "A chave da OpenAI não está configurada no backend." }, 500);
      const ids: string[] = Array.isArray(body.prospect_ids) ? body.prospect_ids.filter(Boolean) : [];
      if (ids.length === 0) return json({ error: "Informe ao menos um perfil." }, 400);
      const description = String(body.query_description ?? "").trim();
      const keywords: string[] = Array.isArray(body.keywords) ? body.keywords : [];

      const { data: rows } = await admin
        .from("influencer_prospects")
        .select("*")
        .in("id", ids.slice(0, 25))
        .eq("platform", PLATFORM);

      let updated = 0;
      for (const p of rows ?? []) {
        try {
          const analysis = await openai(
            [
              { role: "system", content: AI_SYSTEM_PROMPT },
              {
                role: "user",
                content: JSON.stringify({
                  icp: description || p.relevance_reason || "",
                  keywords,
                  profile: {
                    username: p.username,
                    full_name: p.channel_name,
                    biography: p.channel_description,
                    followers: p.subscriber_count,
                    following: p.following_count,
                    posts_count: p.video_count,
                    category: p.category_name,
                    is_verified: p.is_verified,
                    is_business_account: p.is_business_account,
                    is_private: p.is_private,
                    avg_likes: p.avg_likes,
                    avg_comments: p.avg_comments,
                    engagement_rate: p.engagement_rate,
                  },
                }),
              },
            ],
            openaiKey,
            "instagram-prospect (reanálise)",
          );
          const score = Math.max(0, Math.min(100, Number(analysis?.fit_score ?? 0)));
          await admin
            .from("influencer_prospects")
            .update({
              fit_score: score,
              content_fit_score: Number(analysis?.content_fit_score ?? 0),
              audience_fit_score: Number(analysis?.audience_fit_score ?? 0),
              reach_score: Number(analysis?.reach_score ?? 0),
              commercial_score: Number(analysis?.commercial_score ?? 0),
              quality_score: Number(analysis?.quality_score ?? 0),
              fit_category: fitCategory(score),
              ai_summary: analysis?.summary ?? null,
              ai_recommendation: analysis?.recommendation ?? null,
              ai_reasoning: analysis ?? {},
            })
            .eq("id", p.id);
          await admin.from("influencer_analysis").insert({
            prospect_id: p.id,
            model: OPENAI_MODEL,
            prompt_version: INSTAGRAM_ANALYSIS_PROMPT_VERSION,
            analysis_json: analysis,
          });
          updated++;
        } catch (e) {
          console.error("[reanalyze] falhou", p.id, e);
        }
      }
      return json({ ok: true, updated });
    }

    if (action !== "search") return json({ error: "Ação desconhecida." }, 400);

    // ---------- SEARCH ----------
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (SERP_API_KEYS.length === 0)
      return json({ error: "Nenhuma chave da SerpApi está configurada no backend." }, 500);
    if (!openaiKey) return json({ error: "A chave da OpenAI não está configurada no backend." }, 500);

    const description: string = String(body.query_description ?? "").trim();
    const terms: string[] = Array.isArray(body.terms) ? body.terms.map(String).filter(Boolean).slice(0, 10) : [];
    const keywords: string[] = Array.isArray(body.keywords) ? body.keywords.map(String).filter(Boolean).slice(0, 15) : [];
    if (description.length < 10 && terms.length === 0)
      return json({ error: "Descreva o tipo de criador ou informe ao menos um termo de busca." }, 400);

    const usage = await getUsage(admin, u.user.id);
    if (usage.cooldown_seconds_remaining > 0)
      return json(
        { error: `Aguarde ${usage.cooldown_seconds_remaining}s antes de iniciar outra prospecção.`, code: "COOLDOWN", usage },
        429,
      );
    if (usage.remaining_today <= 0)
      return json(
        {
          error: `Você atingiu o limite de ${LIMITS.DAILY_PER_ADMIN} prospecções de Instagram nas últimas 24h. Isso protege os créditos da SerpApi.`,
          code: "DAILY_LIMIT",
          usage,
        },
        429,
      );
    if (usage.used_global_today >= LIMITS.DAILY_GLOBAL)
      return json(
        {
          error: `O limite global de ${LIMITS.DAILY_GLOBAL} prospecções de Instagram nas últimas 24h foi atingido pela equipe.`,
          code: "GLOBAL_LIMIT",
          usage,
        },
        429,
      );

    const { data: burst } = await admin.rpc("check_rate_limit", {
      p_identifier: u.user.id,
      p_endpoint: "instagram_prospect_search",
      p_max_requests: LIMITS.BURST_MAX,
      p_window_seconds: LIMITS.BURST_WINDOW_SECONDS,
    });
    if (burst && burst.allowed === false)
      return json(
        {
          error: `Muitas prospecções seguidas. Aguarde alguns minutos (máximo de ${LIMITS.BURST_MAX} a cada ${LIMITS.BURST_WINDOW_SECONDS / 60} minutos).`,
          code: "BURST_LIMIT",
          usage,
        },
        429,
      );

    const country = String(body.country ?? "BR").toUpperCase();
    const language = String(body.language ?? "pt");
    const minFollowers = Number(body.min_followers ?? 5000);
    const maxFollowers = Number(body.max_followers ?? 500000);
    const accountType = String(body.account_type ?? "all"); // all | business | personal | verified
    const includeExisting = body.include_existing === true;
    const resultsRequested = Math.min(
      Math.max(Number(body.results_requested ?? 20) || 20, 5),
      LIMITS.MAX_RESULTS_PER_SEARCH,
    );

    const { data: searchRow, error: searchErr } = await admin
      .from("influencer_searches")
      .insert({
        admin_id: u.user.id,
        platform: PLATFORM,
        query_description: description || terms.join(", "),
        country,
        language,
        keywords,
        terms,
        min_subscribers: minFollowers,
        max_subscribers: maxFollowers,
        recency_days: Number(body.recency_days ?? 90),
        results_requested: resultsRequested,
        status: "running",
      })
      .select()
      .single();
    if (searchErr) return json({ error: searchErr.message }, 400);

    const failSearch = async (message: string) => {
      await admin.from("influencer_searches").update({ status: "error", error_message: message }).eq("id", searchRow.id);
    };

    const runPipeline = async () => {
      try {
      // 1) Gerar consultas de descoberta com IA
      const queryGen = await openai(
        [
          {
            role: "system",
            content:
              'Você gera consultas de busca no Google para descobrir perfis do Instagram de criadores de conteúdo. Responda SOMENTE JSON {"queries":["..."]} com 8 a 12 consultas curtas (2 a 5 palavras) no idioma pedido, focadas em TEMAS de conteúdo e no público (não em nomes de pessoas). Não inclua "site:instagram.com" nas consultas — isso é adicionado depois.',
          },
          {
            role: "user",
            content: `ICP: ${description || terms.join(", ")}\nTermos informados: ${terms.join(", ") || "nenhum"}\nPalavras-chave: ${keywords.join(", ") || "nenhuma"}\nPaís: ${country}\nIdioma: ${language}`,
          },
        ],
        openaiKey,
        "instagram-prospect (queries)",
      );
      const generatedQueries: string[] = Array.from(
        new Set([...terms, ...keywords, ...(queryGen.queries ?? [])].map((q: string) => String(q).trim()).filter(Boolean)),
      ).slice(0, 12);

      await admin.from("influencer_searches").update({ generated_queries: generatedQueries }).eq("id", searchRow.id);

      // 2) Descoberta de usernames via Google (site:instagram.com)
      const gl = country.toLowerCase();
      const hl = language === "pt" ? "pt-br" : language;
      const found = new Map<string, { title?: string; snippet?: string }>();

      const discover = async (q: string, start: number) => {
        try {
          const data = await serp({
            engine: "google",
            q: `site:instagram.com ${q}`,
            google_domain: country === "BR" ? "google.com.br" : "google.com",
            gl,
            hl,
            num: "20",
            start: String(start),
          });
          for (const r of extractUsernames(data)) {
            if (!found.has(r.username)) found.set(r.username, { title: r.title, snippet: r.snippet });
          }
        } catch (e) {
          if (String((e as Error).message).startsWith("SERPAPI_EXHAUSTED")) throw e;
          console.error("[discovery] consulta falhou", q, e);
        }
      };

      const targetPool = Math.ceil(resultsRequested * 3);
      for (let page = 0; page < LIMITS.MAX_DISCOVERY_PAGES; page++) {
        await Promise.all(generatedQueries.map((q) => discover(q, page * 20)));
        if (found.size >= targetPool) break;
      }

      // 3) Deduplicação contra a base
      const allUsernames = Array.from(found.keys());
      const { data: existing } = await admin
        .from("influencer_prospects")
        .select("id, username, collected_at")
        .eq("platform", PLATFORM)
        .in("username", allUsernames.length ? allUsernames : ["__none__"]);
      const existingMap = new Map<string, any>((existing ?? []).map((e: any) => [String(e.username).toLowerCase(), e]));

      const freshLimit = Date.now() - LIMITS.PROFILE_CACHE_DAYS * DAY_MS;
      const candidates = allUsernames.filter((usernameKey) => {
        const prev = existingMap.get(usernameKey);
        if (!prev) return true;
        if (!includeExisting) return false;
        const collected = prev.collected_at ? new Date(prev.collected_at).getTime() : 0;
        return collected < freshLimit; // reativa só se o dado estiver velho
      });
      const duplicated = allUsernames.length - candidates.length;

      if (candidates.length === 0) {
        await admin
          .from("influencer_searches")
          .update({
            status: "done",
            results_found: 0,
            error_message: allUsernames.length
              ? "Todos os perfis encontrados já haviam sido prospectados antes. Marque \"incluir já prospectados\" ou tente outros termos."
              : "Nenhum perfil do Instagram foi encontrado para esses termos. Tente palavras-chave mais amplas.",
            stats: { discovered: allUsernames.length, duplicated, analyzed: 0, serp_credits: SERP_CREDITS_USED },
          })
          .eq("id", searchRow.id);
        return;
      }


      // 4) Coleta de perfis (1 crédito SerpApi por perfil) — limitada ao pedido
      const toFetch = candidates.slice(0, Math.min(resultsRequested * 2, LIMITS.MAX_RESULTS_PER_SEARCH * 2));
      const results: any[] = [];
      let analyzed = 0;
      let filteredOut = 0;

      const processProfile = async (username: string) => {
        if (results.length >= resultsRequested) return;
        let raw: any;
        try {
          raw = await serp({ engine: "instagram_profile", profile_id: username });
        } catch (e) {
          if (String((e as Error).message).startsWith("SERPAPI_EXHAUSTED")) throw e;
          console.error("[profile] falhou", username, e);
          return;
        }
        const pr = raw?.profile_results;
        if (!pr || raw?.__empty) return;

        const followers = Number(pr.followers ?? 0);
        if (followers < minFollowers || (maxFollowers > 0 && followers > maxFollowers)) {
          filteredOut++;
          return;
        }
        if (accountType === "business" && !pr.is_business_account) return void filteredOut++;
        if (accountType === "personal" && pr.is_business_account) return void filteredOut++;
        if (accountType === "verified" && !pr.is_verified) return void filteredOut++;

        const posts = (pr.posts ?? []).slice(0, 12).map((p: any) => ({
          youtube_video_id: String(p.shortcode ?? p.id),
          title: (p.media_captions?.[0] ?? "").slice(0, 140) || null,
          description: (p.media_captions?.[0] ?? "").slice(0, 500) || null,
          video_url: p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : null,
          published_at: p.taken_at_timestamp ? new Date(p.taken_at_timestamp * 1000).toISOString() : null,
          view_count: Number(p.video_view_count ?? 0),
          like_count: p.liked_by_count != null ? Number(p.liked_by_count) : null,
          comment_count: p.comments_count != null ? Number(p.comments_count) : null,
        }));

        const likeVals = posts.map((p) => p.like_count ?? 0).filter((v) => v > 0);
        const commentVals = posts.map((p) => p.comment_count ?? 0).filter((v) => v > 0);
        const avgLikes = likeVals.length ? Math.round(likeVals.reduce((a, b) => a + b, 0) / likeVals.length) : null;
        const avgComments = commentVals.length
          ? Math.round(commentVals.reduce((a, b) => a + b, 0) / commentVals.length)
          : null;
        const engagement =
          followers > 0 && (avgLikes || avgComments)
            ? Number((((avgLikes ?? 0) + (avgComments ?? 0)) / followers * 100).toFixed(2))
            : null;
        const latestPostAt = posts.map((p) => p.published_at).filter(Boolean).sort().reverse()[0] ?? null;

        const bioLinks = (pr.bio_links ?? []).map((l: any) => l?.url).filter(Boolean);
        const contacts = extractContacts(
          [pr.biography, ...posts.map((p) => p.description)],
          [...bioLinks, pr.external_url].filter(Boolean),
        );

        // 5) Análise por IA
        let analysis: any = null;
        try {
          analysis = await openai(
            [
              { role: "system", content: AI_SYSTEM_PROMPT },
              {
                role: "user",
                content: JSON.stringify({
                  icp: description || terms.join(", "),
                  keywords,
                  country,
                  language,
                  profile: {
                    username: pr.username,
                    full_name: pr.full_name,
                    biography: pr.biography,
                    category: pr.category_name,
                    followers,
                    following: Number(pr.following ?? 0),
                    posts_count: Number(pr.posts_count ?? 0),
                    is_verified: !!pr.is_verified,
                    is_business_account: !!pr.is_business_account,
                    is_private: !!pr.is_private,
                    external_url: pr.external_url ?? null,
                    avg_likes: avgLikes,
                    avg_comments: avgComments,
                    engagement_rate: engagement,
                  },
                  recent_posts: posts.map((p) => ({
                    caption: p.description,
                    like_count: p.like_count,
                    comment_count: p.comment_count,
                    published_at: p.published_at,
                  })),
                }),
              },
            ],
            openaiKey,
            "instagram-prospect (fit score)",
          );
          analyzed++;
        } catch (e) {
          console.error("[ai] falhou para perfil", username, e);
        }

        const score = Math.max(0, Math.min(100, Number(analysis?.fit_score ?? 0)));
        const payload = {
          search_id: searchRow.id,
          platform: PLATFORM,
          // reaproveita a coluna de identificador único da plataforma
          youtube_channel_id: `ig:${String(pr.username ?? username).toLowerCase()}`,
          username: String(pr.username ?? username).toLowerCase(),
          profile_id: pr.id ? String(pr.id) : null,
          channel_handle: `@${pr.username ?? username}`,
          channel_name: pr.full_name || pr.username || username,
          channel_url: `https://www.instagram.com/${pr.username ?? username}/`,
          channel_description: pr.biography ?? null,
          thumbnail_url: pr.serpapi_profile_pic_url ?? pr.profile_pic_url ?? null,
          country: country,
          subscriber_count: followers,
          following_count: Number(pr.following ?? 0),
          video_count: Number(pr.posts_count ?? 0),
          category_name: pr.category_name && pr.category_name !== "None" ? pr.category_name : null,
          is_verified: !!pr.is_verified,
          is_business_account: !!pr.is_business_account,
          is_professional_account: !!pr.is_professional_account,
          is_private: !!pr.is_private,
          avg_likes: avgLikes,
          avg_comments: avgComments,
          engagement_rate: engagement,
          avg_recent_views: avgLikes,
          latest_video_at: latestPostAt,
          collected_at: new Date().toISOString(),
          contact_email: contacts.contact_email,
          instagram_url: `https://www.instagram.com/${pr.username ?? username}/`,
          website_url: contacts.website_url,
          contact_links: contacts.contact_links,
          relevance_reason: found.get(username)?.snippet ?? null,
          fit_score: score,
          content_fit_score: Number(analysis?.content_fit_score ?? 0),
          audience_fit_score: Number(analysis?.audience_fit_score ?? 0),
          reach_score: Number(analysis?.reach_score ?? 0),
          commercial_score: Number(analysis?.commercial_score ?? 0),
          quality_score: Number(analysis?.quality_score ?? 0),
          fit_category: fitCategory(score),
          ai_summary: analysis?.summary ?? null,
          ai_recommendation: analysis?.recommendation ?? null,
          ai_reasoning: analysis ?? {},
          status: analysis ? "novo" : "aguardando_analise",
          created_by: u.user.id,
        };

        const { data: prospect, error: pErr } = await admin
          .from("influencer_prospects")
          .upsert(payload, { onConflict: "platform,youtube_channel_id" })
          .select()
          .single();
        if (pErr) {
          console.error("[db] upsert prospect", pErr);
          return;
        }

        if (posts.length) {
          await admin
            .from("influencer_videos")
            .upsert(
              posts.map((p) => ({ ...p, prospect_id: prospect.id })),
              { onConflict: "prospect_id,youtube_video_id" },
            );
        }
        if (analysis) {
          await admin.from("influencer_analysis").insert({
            prospect_id: prospect.id,
            search_id: searchRow.id,
            model: OPENAI_MODEL,
            prompt_version: INSTAGRAM_ANALYSIS_PROMPT_VERSION,
            analysis_json: analysis,
          });
        }
        results.push({ ...prospect, videos: posts });
      };

      const CONCURRENCY = 6;
      const queue = [...toFetch];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (queue.length && results.length < resultsRequested) {
            const username = queue.shift();
            if (!username) break;
            await processProfile(username);
          }
        }),
      );

      results.sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));

      await admin
        .from("influencer_searches")
        .update({
          status: "done",
          results_found: results.length,
          stats: {
            discovered: allUsernames.length,
            duplicated,
            analyzed,
            filtered_out: filteredOut,
            serp_credits: SERP_CREDITS_USED,
          },
        })
        .eq("id", searchRow.id);

      } catch (e) {
        const msg = (e as Error).message;
        console.error("[instagram-prospect] erro", msg, e);
        if (msg.startsWith("SERPAPI_EXHAUSTED"))
          await failSearch("Todas as chaves da SerpApi falharam ou estão sem créditos. Verifique as chaves no painel de APIs.");
        else if (msg === "SERPAPI_NOT_CONFIGURED")
          await failSearch("Nenhuma chave da SerpApi está configurada no backend.");
        else if (msg.startsWith("OPENAI_"))
          await failSearch("A análise por IA falhou temporariamente. Tente novamente em alguns instantes.");
        else await failSearch("Não foi possível concluir a prospecção. Tente novamente.");
      }
    };

    // Executa em segundo plano: a busca pode passar de 150s (limite de idle da edge function).
    // @ts-ignore EdgeRuntime é global no runtime do Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(runPipeline());
    else runPipeline();

    return json({
      search_id: searchRow.id,
      status: "running",
      async: true,
      usage: await getUsage(admin, u.user.id),
    });
  } catch (e) {
    console.error("[instagram-prospect] erro inesperado", e);
    return json({ error: "Erro inesperado. Tente novamente." }, 500);
  }
});
