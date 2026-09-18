// Wiize · Influenciadores — Abordagem individual pesquisada por IA
//
// Conceito: NÃO é "IA que escreve mensagem", é "IA que pesquisa o influenciador
// antes de abordá-lo". A função coleta os dados reais disponíveis (perfil,
// bio/descrição, redes, vídeos recentes/antigos do YouTube) e só então pede ao
// modelo uma abordagem personalizada — proibido inventar qualquer informação.
//
// Ações (admin):
//   generate → pesquisa + gera abordagem (salva como rascunho)
//   history  → últimas abordagens geradas para o influenciador
//   mark_sent→ marca uma abordagem como enviada (após envio via influencer-outreach)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPENAI_MODEL = "gpt-4o-mini";
const TEMPLATE_VERSION = 2;

// ───────────────────────── pesquisa: YouTube ─────────────────────────
async function yt(path: string, params: Record<string, string>, key: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error("[youtube]", path, res.status, await res.text());
    return null;
  }
  return await res.json();
}

/** Vídeos recentes + vídeos antigos mais vistos (quota barata: playlistItems + videos). */
async function researchYouTube(channelId: string, key: string) {
  const ch = await yt("channels", { part: "contentDetails,snippet,statistics", id: channelId }, key);
  const item = ch?.items?.[0];
  if (!item) return null;
  const uploads = item.contentDetails?.relatedPlaylists?.uploads;
  const description = item.snippet?.description ?? "";
  if (!uploads) return { description, recent: [], top: [] };

  const pl = await yt("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: "40" }, key);
  const ids = (pl?.items ?? []).map((i: any) => i.contentDetails?.videoId).filter(Boolean).slice(0, 40);
  if (!ids.length) return { description, recent: [], top: [] };

  const vids = await yt("videos", { part: "snippet,statistics", id: ids.join(",") }, key);
  const rows = (vids?.items ?? []).map((v: any) => ({
    title: v.snippet?.title ?? "",
    published_at: v.snippet?.publishedAt ?? null,
    description: String(v.snippet?.description ?? "").slice(0, 400),
    views: Number(v.statistics?.viewCount ?? 0),
    tags: (v.snippet?.tags ?? []).slice(0, 8),
  })).filter((v: any) => v.title);

  const recent = [...rows].sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))).slice(0, 12);
  const recentIds = new Set(recent.map((r) => r.title));
  const top = [...rows].sort((a, b) => b.views - a.views).filter((r) => !recentIds.has(r.title)).slice(0, 6);
  return { description, recent, top };
}

// ───────────────────────── OpenAI ─────────────────────────
async function openai(messages: unknown[], apiKey: string, temperature = 0.6) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature, response_format: { type: "json_object" } }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[openai]", res.status, t);
    throw new Error(res.status === 429 ? "Limite da OpenAI atingido. Tente novamente em instantes." : `Erro na IA (${res.status}).`);
  }
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  } catch {
    throw new Error("A IA devolveu um formato inválido. Tente regenerar.");
  }
}

const SYSTEM = `Você pesquisa o conteúdo de um criador ou especialista para personalizar uma abordagem comercial da Wiize.

Sua tarefa NÃO é escrever nem reescrever o e-mail. A copy é fixa. Você deve identificar somente a referência real que completará esta frase:
"Conheci seu conteúdo através de [REFERÊNCIA] e achei que existe uma conexão muito interessante com o que estamos construindo."

REGRAS DA REFERÊNCIA:
- Use apenas conteúdos, vídeos, posts, temas ou canais presentes nos DADOS PESQUISADOS.
- Prefira um conteúdo específico e relevante. Exemplo: "do seu vídeo sobre gestão comercial".
- Quando só houver dados gerais, use o canal ou perfil real. Exemplo: "do canal Empresa X" ou "do seu perfil no Instagram".
- A referência deve começar com "do", "da", "de um" ou "de uma", encaixando naturalmente depois de "através".
- Máximo de 140 caracteres, sem ponto final, elogio ou afirmação inventada.
- Nunca altere valores, oferta, assinatura ou qualquer outra parte do e-mail.

Responda SOMENTE em JSON com este formato:
{
  "nicho": "nicho identificado",
  "conteudo_usado": "título do vídeo/post ou tema real usado na personalização (ou 'Nenhum conteúdo específico encontrado')",
  "por_que": "explicação curta de por que esse conteúdo foi escolhido",
  "oportunidade": "por que essa pessoa seria uma boa parceira da Wiize",
  "personalizado": true,
  "confianca": "alta|media|baixa",
  "referencia": "trecho curto e verdadeiro que começa com do/da/de um/de uma"
}`;

function firstName(value: unknown) {
  const clean = String(value || "").replace(/[^\p{L}\p{N}\s._-]/gu, "").trim();
  const first = clean.split(/[\s._-]+/)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Olá";
}

function fallbackReference(prospect: any) {
  const name = String(prospect?.channel_name || "").trim();
  if (name) return prospect?.platform === "instagram" ? `do perfil ${name} no Instagram` : `do canal ${name}`;
  return prospect?.platform === "instagram" ? "do seu perfil no Instagram" : "do seu canal";
}

function sanitizeReference(value: unknown, prospect: any) {
  const reference = String(value || "").replace(/[\r\n]+/g, " ").replace(/[.!?]+$/g, "").trim().slice(0, 140);
  return /^(d[oa]s?|de (?:um|uma))\b/i.test(reference) ? reference : fallbackReference(prospect);
}

function buildFixedEmail(prospect: any, reference: string) {
  const name = firstName(prospect?.channel_name);
  const subjectName = String(prospect?.channel_name || name).trim().slice(0, 180);
  return {
    subject: `Parceria com ${subjectName} - Wiize`,
    message: `Olá, ${name}! Tudo bem?\n\nMeu nome é Caio e sou fundador da Wiize, um software com tudo o que empresas precisam para vender B2B em um só lugar. Hoje, mais de 600 empresas utilizam a plataforma.\n\nConheci seu conteúdo através ${reference} e achei que existe uma conexão muito interessante com o que estamos construindo.\n\nA Wiize reúne prospecção com IA, SDR inteligente que vende no automático e agenda reuniões, IA de análise de engajamento e gestão comercial completa em um só lugar.\n\nEstamos em uma etapa de crescimento nas redes sociais e selecionando alguns criadores e especialistas para construir parcerias comerciais de longo prazo.\n\nO modelo é simples: você apresenta a Wiize para sua audiência através de um link personalizado e cupom próprio. Para cada cliente que comprar pelo seu link ou cupom, você recebe 50% de comissão sobre a assinatura do primeiro mês + 10% de comissão recorrente, podendo chegar a 15%.\n\nAcredito que seu conteúdo tenha bastante sinergia com a Wiize.\n\nSe fizer sentido, posso te enviar mais detalhes da parceria.\n\nAbraço,\n\nCaio | Fundador da Wiize\n\n(44) 9 9148-7211\n\nhttps://www.wiize.com.br/`,
  };
}

function buildResearchPrompt(p: any, contacts: any[], research: any, variant: number, previous: string[]) {
  const dados: Record<string, unknown> = {
    nome_ou_canal: p.channel_name,
    plataforma: p.platform === "instagram" ? "Instagram" : "YouTube",
    handle: p.channel_handle || p.username || null,
    url: p.channel_url || null,
    bio_ou_descricao: (research?.description || p.channel_description || "").slice(0, 1500) || null,
    categoria: p.category_name || p.fit_category || null,
    inscritos_ou_seguidores: p.subscriber_count || null,
    total_publicacoes: p.video_count || null,
    engajamento: p.engagement_rate ? `${p.engagement_rate}%` : null,
    resumo_ia_existente: p.ai_summary || null,
    motivo_relevancia: p.relevance_reason || null,
    instagram: p.instagram_url || null,
    site: p.website_url || null,
    outras_redes: contacts.filter((c) => c.type !== "email").map((c) => `${c.type}: ${c.value}`),
    videos_recentes: research?.recent?.map((v: any) => ({
      titulo: v.title, publicado_em: v.published_at, views: v.views, resumo: v.description?.slice(0, 220),
    })) ?? [],
    videos_antigos_relevantes: research?.top?.map((v: any) => ({
      titulo: v.title, publicado_em: v.published_at, views: v.views,
    })) ?? [],
  };

  const variantHint = variant > 0
    ? `\n\nESTA É UMA REGERAÇÃO (variação ${variant}). Mude a abertura, o argumento, a forma de apresentar a oportunidade, o CTA e o estilo em relação às versões anteriores:\n${previous.map((m, i) => `--- versão ${i + 1} ---\n${m.slice(0, 700)}`).join("\n")}`
    : "";

  return `DADOS PESQUISADOS (tudo que existe; o que não está aqui NÃO existe):\n${JSON.stringify(dados, null, 2)}${variantHint}`;
}

/** Controle de qualidade determinístico antes de devolver a mensagem. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || "generate");

    // ── auth admin ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado." }, 401);
    const { data: roleCheck } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Acesso restrito a administradores." }, 403);

    const prospectId = String(body.prospect_id || "");

    if (action === "history") {
      if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);
      const { data } = await admin.from("influencer_ai_approaches")
        .select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(10);
      return json({ ok: true, items: data ?? [] });
    }

    // Último rascunho salvo — evita regerar (e gastar IA) a cada abertura do modal.
    if (action === "latest") {
      if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);
      const { data } = await admin.from("influencer_ai_approaches")
        .select("*").eq("prospect_id", prospectId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const isCurrentTemplate = Number((data?.analysis as any)?.template_version || 0) === TEMPLATE_VERSION;
      return json({ ok: true, approach: isCurrentTemplate ? data : null });
    }

    // Salva edições manuais do admin no rascunho.
    if (action === "save") {
      const id = String(body.approach_id || "");
      if (!UUID_RE.test(id)) return json({ error: "approach_id inválido." }, 400);
      await admin.from("influencer_ai_approaches").update({
        ...(body.subject !== undefined ? { subject: String(body.subject).slice(0, 300) } : {}),
        ...(body.message !== undefined ? { message: String(body.message).slice(0, 8000) } : {}),
      }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "mark_sent") {
      const id = String(body.approach_id || "");
      if (!UUID_RE.test(id)) return json({ error: "approach_id inválido." }, 400);
      await admin.from("influencer_ai_approaches").update({
        status: "enviado",
        sent_at: new Date().toISOString(),
        ...(body.subject ? { subject: String(body.subject).slice(0, 300) } : {}),
        ...(body.message ? { message: String(body.message).slice(0, 8000) } : {}),
      }).eq("id", id);
      return json({ ok: true });
    }

    if (action !== "generate") return json({ error: "Ação inválida." }, 400);
    if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);

    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!openaiKey) return json({ error: "OPENAI_API_KEY não configurada." }, 500);

    const { data: prospect } = await admin.from("influencer_prospects").select("*").eq("id", prospectId).maybeSingle();
    if (!prospect) return json({ error: "Influenciador não encontrado." }, 404);

    const { data: contacts } = await admin.from("influencer_contacts").select("*").eq("prospect_id", prospectId);

    // 1) Pesquisa real de conteúdos (YouTube quando houver channel_id + chave).
    let research: any = null;
    const ytKey = Deno.env.get("YOUTUBE_API_KEY") || "";
    if (prospect.platform !== "instagram" && prospect.youtube_channel_id && ytKey) {
      try {
        research = await researchYouTube(prospect.youtube_channel_id, ytKey);
      } catch (e) {
        console.error("[research] youtube falhou", String(e));
      }
    }

    const variant = Number(body.variant || 0);
    const previous: string[] = Array.isArray(body.previous_messages) ? body.previous_messages.slice(-3) : [];

    // 2) Geração com os dados pesquisados.
    const out = await openai([
      { role: "system", content: SYSTEM },
      { role: "user", content: buildResearchPrompt(prospect, contacts ?? [], research, variant, previous) },
    ], openaiKey, variant > 0 ? 0.85 : 0.6);

    // 3) A IA escolhe apenas a referência; assunto e copy permanecem determinísticos.
    const reference = sanitizeReference(out?.referencia, prospect);
    const fixedEmail = buildFixedEmail(prospect, reference);

    const analysis = {
      nicho: String(out?.nicho || prospect.fit_category || "Não identificado"),
      conteudo_usado: String(out?.conteudo_usado || "Nenhum conteúdo específico encontrado"),
      por_que: String(out?.por_que || ""),
      oportunidade: String(out?.oportunidade || ""),
      personalizado: out?.personalizado !== false,
      confianca: String(out?.confianca || "media"),
      referencia,
      template_version: TEMPLATE_VERSION,
      palavras: fixedEmail.message.split(/\s+/).filter(Boolean).length,
      alertas: [],
    };

    const researchMeta = {
      fonte: research ? "youtube_api" : "dados_do_perfil",
      videos_recentes: research?.recent?.length ?? 0,
      videos_antigos: research?.top?.length ?? 0,
      titulos: [...(research?.recent ?? []), ...(research?.top ?? [])].slice(0, 10).map((v: any) => v.title),
      tem_bio: !!(research?.description || prospect.channel_description),
    };

    const subject = fixedEmail.subject.slice(0, 300);

    const { data: saved } = await admin.from("influencer_ai_approaches").insert({
      prospect_id: prospectId,
      admin_id: u.user.id,
      channel: prospect.platform || "youtube",
      subject,
      message: fixedEmail.message.slice(0, 8000),
      analysis,
      research: researchMeta,
      status: "rascunho",
    }).select("*").maybeSingle();

    return json({ ok: true, approach: saved, analysis, research: researchMeta, subject, message: fixedEmail.message });
  } catch (e: any) {
    console.error("[influencer-ai-approach]", e);
    return json({ error: e?.message || "Erro inesperado." }, 500);
  }
});
