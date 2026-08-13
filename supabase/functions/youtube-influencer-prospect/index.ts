import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_MODEL = "gpt-4o-mini";
export const INFLUENCER_ANALYSIS_PROMPT_VERSION = "v1";

// ---- Limites de uso (proteção de quota YouTube + custo OpenAI) ----
export const LIMITS = {
  /** Buscas por administrador por dia (janela 24h corridas) */
  DAILY_PER_ADMIN: 10,
  /** Buscas somadas de todos os admins por dia (protege a quota global da API) */
  DAILY_GLOBAL: 25,
  /** Intervalo mínimo entre duas buscas do mesmo admin (segundos) */
  COOLDOWN_SECONDS: 60,
  /** Rajada: máximo de buscas por admin dentro de 10 minutos */
  BURST_MAX: 3,
  BURST_WINDOW_SECONDS: 600,
  /** Teto de canais analisados por busca (cada canal = 1 chamada OpenAI) */
  MAX_RESULTS_PER_SEARCH: 50,
};

const DAY_MS = 86400000;

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

// Usuário da requisição atual (para atribuir custo de IA nos logs)
let CURRENT_USER_ID: string | null = null;

const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
};

async function logAiUsage(p: {
  feature: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  metadata?: Record<string, unknown>;
}) {
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
        metadata: p.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}

async function openai(messages: unknown[], apiKey: string, jsonMode = true, feature = "influencer-prospect") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
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


async function yt(path: string, params: Record<string, string>, key: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.error("[youtube] error", path, res.status, body);
    if (res.status === 403 && /quota/i.test(body)) throw new Error("YOUTUBE_QUOTA_EXCEEDED");
    if (res.status === 400 && /API key/i.test(body)) throw new Error("YOUTUBE_INVALID_KEY");
    throw new Error(`YOUTUBE_ERROR_${res.status}`);
  }
  return await res.json();
}

/**
 * Consolida o uso das últimas 24h (por admin e global) a partir da tabela
 * `influencer_searches`, que é a fonte de verdade das buscas executadas.
 */
async function getUsage(admin: any, adminId: string) {
  const since = new Date(Date.now() - DAY_MS).toISOString();

  const [mine, global, last] = await Promise.all([
    admin
      .from("influencer_searches")
      .select("id", { count: "exact", head: true })
      .eq("admin_id", adminId)
      .gte("created_at", since),
    admin
      .from("influencer_searches")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("influencer_searches")
      .select("created_at")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const usedToday = mine.count ?? 0;
  const usedGlobal = global.count ?? 0;
  const lastAt = last.data?.created_at ? new Date(last.data.created_at).getTime() : null;
  const cooldownRemaining = lastAt
    ? Math.max(0, Math.ceil((lastAt + LIMITS.COOLDOWN_SECONDS * 1000 - Date.now()) / 1000))
    : 0;

  return {
    used_today: usedToday,
    daily_limit: LIMITS.DAILY_PER_ADMIN,
    remaining_today: Math.max(0, LIMITS.DAILY_PER_ADMIN - usedToday),
    used_global_today: usedGlobal,
    global_daily_limit: LIMITS.DAILY_GLOBAL,
    cooldown_seconds_remaining: cooldownRemaining,
    cooldown_seconds: LIMITS.COOLDOWN_SECONDS,
    max_results_per_search: LIMITS.MAX_RESULTS_PER_SEARCH,
    burst_max: LIMITS.BURST_MAX,
    burst_window_minutes: LIMITS.BURST_WINDOW_SECONDS / 60,
    resets_at: new Date(Date.now() + DAY_MS).toISOString(),
  };
}

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

    // ---------- QUOTA ----------
    if (action === "quota") {
      return json({ usage: await getUsage(admin, u.user.id) });
    }

    // ---------- STATUS / SAVE ----------
    if (action === "update_status") {
      const { prospect_id, status } = body;
      if (!prospect_id || !status) return json({ error: "Dados inválidos." }, 400);
      const { error } = await admin
        .from("influencer_prospects")
        .update({ status })
        .eq("id", prospect_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "save_prospect") {
      const { prospect_id, saved } = body;
      if (!prospect_id) return json({ error: "Dados inválidos." }, 400);
      const { error } = await admin
        .from("influencer_prospects")
        .update({ saved: saved !== false, status: saved === false ? "novo" : "qualificado" })
        .eq("id", prospect_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action !== "search") return json({ error: "Ação desconhecida." }, 400);

    // ---------- SEARCH ----------
    const youtubeKey = Deno.env.get("YOUTUBE_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!youtubeKey) return json({ error: "A chave da YouTube API não está configurada no backend." }, 500);
    if (!openaiKey) return json({ error: "A chave da OpenAI não está configurada no backend." }, 500);

    const description: string = (body.query_description || "").trim();
    if (description.length < 10) return json({ error: "Descreva melhor o tipo de criador que você procura." }, 400);

    // ---- RATE LIMIT (servidor é a única fonte de verdade) ----
    const usage = await getUsage(admin, u.user.id);

    if (usage.cooldown_seconds_remaining > 0) {
      return json(
        {
          error: `Aguarde ${usage.cooldown_seconds_remaining}s antes de iniciar outra prospecção.`,
          code: "COOLDOWN",
          usage,
        },
        429,
      );
    }
    if (usage.remaining_today <= 0) {
      return json(
        {
          error: `Você atingiu o limite de ${LIMITS.DAILY_PER_ADMIN} prospecções nas últimas 24h. Isso protege a quota diária da YouTube API.`,
          code: "DAILY_LIMIT",
          usage,
        },
        429,
      );
    }
    if (usage.used_global_today >= LIMITS.DAILY_GLOBAL) {
      return json(
        {
          error: `O limite global de ${LIMITS.DAILY_GLOBAL} prospecções nas últimas 24h foi atingido pela equipe. Tente novamente mais tarde.`,
          code: "GLOBAL_LIMIT",
          usage,
        },
        429,
      );
    }

    // Rajada: no máximo BURST_MAX buscas por admin dentro da janela curta
    const { data: burst } = await admin.rpc("check_rate_limit", {
      p_identifier: u.user.id,
      p_endpoint: "influencer_prospect_search",
      p_max_requests: LIMITS.BURST_MAX,
      p_window_seconds: LIMITS.BURST_WINDOW_SECONDS,
    });
    if (burst && burst.allowed === false) {
      return json(
        {
          error: `Muitas prospecções seguidas. Aguarde alguns minutos antes de tentar novamente (máximo de ${LIMITS.BURST_MAX} a cada ${LIMITS.BURST_WINDOW_SECONDS / 60} minutos).`,
          code: "BURST_LIMIT",
          usage,
        },
        429,
      );
    }

    const country = (body.country || "BR").toUpperCase();
    const language = body.language || "pt";
    const keywords: string[] = Array.isArray(body.keywords) ? body.keywords.filter(Boolean).slice(0, 15) : [];
    const minSubs = Number(body.min_subscribers ?? 5000);
    const maxSubs = Number(body.max_subscribers ?? 100000);
    const minViews = body.min_views ? Number(body.min_views) : null;
    const recencyDays = Number(body.recency_days ?? 90);
    const resultsRequested = Math.min(
      Math.max(Number(body.results_requested ?? 20) || 20, 5),
      LIMITS.MAX_RESULTS_PER_SEARCH,
    );

    const { data: searchRow, error: searchErr } = await admin
      .from("influencer_searches")
      .insert({
        admin_id: u.user.id,
        query_description: description,
        country,
        language,
        keywords,
        min_subscribers: minSubs,
        max_subscribers: maxSubs,
        min_views: minViews,
        recency_days: recencyDays,
        results_requested: resultsRequested,
        status: "running",
      })
      .select()
      .single();
    if (searchErr) return json({ error: searchErr.message }, 400);

    const failSearch = async (message: string) => {
      await admin
        .from("influencer_searches")
        .update({ status: "error", error_message: message })
        .eq("id", searchRow.id);
    };

    try {
      // 1) Gerar variações semânticas de pesquisa (content-first)
      const queryGen = await openai(
        [
          {
            role: "system",
            content:
              "Você gera consultas de busca para o YouTube. Responda SOMENTE JSON no formato {\"queries\":[\"...\"]} com 8 a 12 consultas curtas (2 a 5 palavras) no idioma pedido, focadas em CONTEÚDO/temas (não em nomes de canais).",
          },
          {
            role: "user",
            content: `ICP: ${description}\nPalavras-chave informadas: ${keywords.join(", ") || "nenhuma"}\nPaís: ${country}\nIdioma: ${language}`,
          },
        ],
        openaiKey,
        true,
        "influencer-prospect (queries)",
      );
      const generatedQueries: string[] = Array.from(
        new Set([...(queryGen.queries || []), ...keywords].map((q: string) => String(q).trim()).filter(Boolean)),
      ).slice(0, 12);

      await admin.from("influencer_searches").update({ generated_queries: generatedQueries }).eq("id", searchRow.id);

      // 2) Buscar vídeos → channel IDs (quota controlada)
      const publishedAfter = new Date(Date.now() - recencyDays * 86400000).toISOString();
      const maxQueries = resultsRequested <= 20 ? 5 : resultsRequested <= 50 ? 8 : 12;
      const perQuery = resultsRequested <= 20 ? 15 : 25;
      const channelIds = new Set<string>();

      const queriesToRun = generatedQueries.slice(0, maxQueries);
      const searchResults = await Promise.all(
        queriesToRun.map(async (q) => {
          try {
            return await yt(
              "search",
              {
                part: "snippet",
                q,
                type: "video",
                maxResults: String(perQuery),
                order: "relevance",
                publishedAfter,
                regionCode: country,
                relevanceLanguage: language,
              },
              youtubeKey,
            );
          } catch (e) {
            if ((e as Error).message === "YOUTUBE_QUOTA_EXCEEDED") throw e;
            console.error("[search] query falhou", q, e);
            return null;
          }
        }),
      );
      for (const data of searchResults) {
        for (const item of data?.items || []) {
          const cid = item?.snippet?.channelId;
          if (cid) channelIds.add(cid);
        }
      }


      if (channelIds.size === 0) {
        await admin.from("influencer_searches").update({ status: "done", results_found: 0 }).eq("id", searchRow.id);
        return json({ search_id: searchRow.id, prospects: [], total_channels: 0, message: "Nenhum canal encontrado para esse perfil." });
      }

      // 3) Dados dos canais (batches de 50)
      const ids = Array.from(channelIds);
      const channels: any[] = [];
      for (let i = 0; i < ids.length; i += 50) {
        const data = await yt(
          "channels",
          { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") },
          youtubeKey,
        );
        channels.push(...(data.items || []));
      }

      // 4) Filtrar por tamanho
      const filtered = channels
        .filter((c) => {
          if (c.statistics?.hiddenSubscriberCount) return false;
          const subs = Number(c.statistics?.subscriberCount ?? 0);
          const views = Number(c.statistics?.viewCount ?? 0);
          if (subs < minSubs || subs > maxSubs) return false;
          if (minViews && views < minViews) return false;
          return true;
        })
        .sort((a, b) => Number(b.statistics?.subscriberCount ?? 0) - Number(a.statistics?.subscriberCount ?? 0))
        .slice(0, resultsRequested);

      if (filtered.length === 0) {
        await admin.from("influencer_searches").update({ status: "done", results_found: 0 }).eq("id", searchRow.id);
        return json({
          search_id: searchRow.id,
          prospects: [],
          total_channels: channels.length,
          message: "Encontramos canais, mas nenhum dentro da faixa de inscritos/visualizações definida.",
        });
      }

      // 5) Vídeos recentes de cada canal (limitado a 5 por canal)
      const results: any[] = [];
      const processChannel = async (ch: any) => {

        let videos: any[] = [];
        try {
          const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
          let videoIds: string[] = [];
          if (uploads) {
            const pl = await yt("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: "5" }, youtubeKey);
            videoIds = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
          }
          if (videoIds.length) {
            const vd = await yt("videos", { part: "snippet,statistics", id: videoIds.join(",") }, youtubeKey);
            videos = (vd.items || []).map((v: any) => ({
              youtube_video_id: v.id,
              title: v.snippet?.title ?? null,
              description: (v.snippet?.description ?? "").slice(0, 500),
              published_at: v.snippet?.publishedAt ?? null,
              view_count: Number(v.statistics?.viewCount ?? 0),
              like_count: v.statistics?.likeCount ? Number(v.statistics.likeCount) : null,
              comment_count: v.statistics?.commentCount ? Number(v.statistics.commentCount) : null,
              video_url: `https://www.youtube.com/watch?v=${v.id}`,
            }));
          }
        } catch (e) {
          if ((e as Error).message === "YOUTUBE_QUOTA_EXCEEDED") throw e;
          console.error("[videos] falhou para canal", ch.id, e);
        }

        const avgViews = videos.length
          ? Math.round(videos.reduce((s, v) => s + (v.view_count || 0), 0) / videos.length)
          : null;
        const latestVideoAt = videos.length
          ? videos.map((v) => v.published_at).filter(Boolean).sort().reverse()[0]
          : null;

        // 6) Análise IA
        let analysis: any = null;
        try {
          analysis = await openai(
            [
              {
                role: "system",
                content: `Você é um analista de parcerias da Wiize, plataforma de inteligência comercial e prospecção B2B.
Avalie se um canal do YouTube tem potencial para ser parceiro/afiliado/canal de aquisição da Wiize.
Avalie EXCLUSIVAMENTE com base nos dados fornecidos. NUNCA invente audiência, receita, e-mail, dados demográficos, localização ou patrocínios. Quando não for possível comprovar, use "não identificado" ou marque como estimativa.
Priorize canais sobre vendas B2B, prospecção, SDR, outbound, CRM, geração de leads, marketing B2B, automação comercial, gestão de vendas e empreendedorismo empresarial. Não penalize excessivamente canais menores com forte aderência ao ICP.
Distribuição do Fit Score (0-100): Content Fit 30, Audience/ICP Fit 25, Reach & Engagement 20, Commercial/Partnership Potential 15, Content Quality & Consistency 10.
Responda SOMENTE JSON:
{"fit_score":0,"content_fit_score":0,"audience_fit_score":0,"reach_score":0,"commercial_score":0,"quality_score":0,
"content_fit_reason":"","audience_fit_reason":"","reach_reason":"","commercial_reason":"","quality_reason":"",
"summary":"","strengths":[""],"weaknesses":[""],"recommendation":"Abordar|Considerar|Não priorizar","recommendation_reason":"",
"content_topics":[""],"audience_profile":"","partnership_opportunities":[""]}
Escreva em português.`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  icp: description,
                  keywords,
                  country,
                  language,
                  channel: {
                    name: ch.snippet?.title,
                    description: (ch.snippet?.description ?? "").slice(0, 1500),
                    country: ch.snippet?.country ?? null,
                    published_at: ch.snippet?.publishedAt,
                    subscriber_count: Number(ch.statistics?.subscriberCount ?? 0),
                    video_count: Number(ch.statistics?.videoCount ?? 0),
                    total_view_count: Number(ch.statistics?.viewCount ?? 0),
                    avg_recent_views: avgViews,
                  },
                  recent_videos: videos.map((v) => ({
                    title: v.title,
                    published_at: v.published_at,
                    view_count: v.view_count,
                    like_count: v.like_count,
                    comment_count: v.comment_count,
                  })),
                }),
              },
            ],
            openaiKey,
            true,
            "influencer-prospect (fit score)",
          );
        } catch (e) {
          console.error("[ai] falhou para canal", ch.id, e);
        }

        const score = Math.max(0, Math.min(100, Number(analysis?.fit_score ?? 0)));
        const handle = ch.snippet?.customUrl ?? null;

        const prospectPayload = {
          search_id: searchRow.id,
          platform: "youtube",
          youtube_channel_id: ch.id,
          channel_handle: handle,
          channel_name: ch.snippet?.title ?? "Não informado",
          channel_url: handle
            ? `https://www.youtube.com/${handle.startsWith("@") ? handle : "@" + handle}`
            : `https://www.youtube.com/channel/${ch.id}`,
          channel_description: ch.snippet?.description ?? null,
          thumbnail_url: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          country: ch.snippet?.country ?? null,
          subscriber_count: Number(ch.statistics?.subscriberCount ?? 0),
          video_count: Number(ch.statistics?.videoCount ?? 0),
          total_view_count: Number(ch.statistics?.viewCount ?? 0),
          avg_recent_views: avgViews,
          latest_video_at: latestVideoAt,
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
          created_by: u.user.id,
        };

        const { data: prospect, error: pErr } = await admin
          .from("influencer_prospects")
          .upsert(prospectPayload, { onConflict: "platform,youtube_channel_id" })
          .select()
          .single();
        if (pErr) {
          console.error("[db] upsert prospect", pErr);
          return;
        }

        if (videos.length) {
          await admin
            .from("influencer_videos")
            .upsert(
              videos.map((v) => ({ ...v, prospect_id: prospect.id })),
              { onConflict: "prospect_id,youtube_video_id" },
            );
        }

        if (analysis) {
          await admin.from("influencer_analysis").insert({
            prospect_id: prospect.id,
            search_id: searchRow.id,
            model: OPENAI_MODEL,
            prompt_version: INFLUENCER_ANALYSIS_PROMPT_VERSION,
            analysis_json: analysis,
          });
        }

        results.push({ ...prospect, videos });
      };

      // Processa canais em paralelo (concorrência limitada) para evitar timeout de 150s
      const CONCURRENCY = 6;
      const queue = [...filtered];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (queue.length) {
            const ch = queue.shift();
            if (!ch) break;
            await processChannel(ch);
          }
        }),
      );


      results.sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));

      await admin
        .from("influencer_searches")
        .update({ status: "done", results_found: results.length })
        .eq("id", searchRow.id);

      return json({
        search_id: searchRow.id,
        prospects: results,
        total_channels: channelIds.size,
        usage: await getUsage(admin, u.user.id),
      });
    } catch (e) {
      const msg = (e as Error).message;
      await failSearch(msg);
      console.error("[prospect] erro", msg, e);
      if (msg === "YOUTUBE_QUOTA_EXCEEDED")
        return json({ error: "Não foi possível consultar o YouTube porque a quota diária da API foi atingida. Tente novamente mais tarde." }, 429);
      if (msg === "YOUTUBE_INVALID_KEY")
        return json({ error: "A chave da YouTube API é inválida ou não tem a YouTube Data API v3 habilitada." }, 400);
      if (msg.startsWith("OPENAI_"))
        return json({ error: "A análise por IA falhou temporariamente. Tente novamente em alguns instantes." }, 502);
      return json({ error: "Não foi possível concluir a prospecção. Tente novamente." }, 500);
    }
  } catch (e) {
    console.error("[prospect] erro inesperado", e);
    return json({ error: "Erro inesperado. Tente novamente." }, 500);
  }
});
