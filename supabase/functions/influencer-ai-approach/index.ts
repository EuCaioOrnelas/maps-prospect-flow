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
const WHATSAPP = "(44) 99148-7211";

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

const SYSTEM = `Você é o Caio, fundador da Wiize, escrevendo pessoalmente a PRIMEIRA mensagem para um criador/profissional que você identificou como POTENCIAL PARCEIRO ESTRATÉGICO.

PERGUNTA QUE ORIENTA TUDO: "Por que especificamente essa pessoa seria uma boa parceira da Wiize, e como iniciar essa conversa mostrando que eu realmente entendi o trabalho dela?"

CONCEITO — PARCERIA, NUNCA AFILIAÇÃO:
- É o Programa de Parceiros Wiize. PROIBIDAS as palavras/ideias: afiliado, programa de afiliados, link de afiliado, cupom, renda extra, "ganhe dinheiro divulgando", "vender para ganhar comissão", multinível.
- A pessoa é abordada pela autoridade, conhecimento, audiência e relacionamento com empresas que já possui — não como divulgador.
- Tese: "existe uma oportunidade de parceria entre o que você já faz e o que estamos construindo".

POSICIONAMENTO DA WIIZE:
- "plataforma unificada de inteligência comercial para empresas venderem B2B, reunindo prospecção, CRM, IA e gestão comercial em um só lugar" (pode adaptar a redação ao perfil).
- NUNCA reduzir a: ferramenta de prospecção, de leads, CRM, automação, disparador ou ferramenta de WhatsApp. Escolha só os componentes que conversam com o perfil da pessoa.

REGRA ABSOLUTA — NUNCA INVENTAR:
- Só cite vídeos, posts, temas, projetos, números ou resultados que estejam explicitamente nos DADOS PESQUISADOS. Use títulos reais, exatos.
- Proibido afirmar que assiste, acompanha, conhece a audiência ou viu algo que não está nos dados.
- Sem material concreto, escreva algo honesto e mais curto ("Dei uma olhada no seu trabalho e..."), sem fingir intimidade.

ELOGIO ESPECÍFICO (obrigatório quando houver base):
- Diga O QUE chamou atenção e, se possível, POR QUÊ. Ex.: "gostei da forma como você trata X sem ficar na teoria", "achei interessante o ponto que você levanta sobre Y".
- Proibidos elogios que serviriam para qualquer pessoa: "seu conteúdo é incrível", "trabalho sensacional", "adorei seu perfil", "você é uma grande autoridade".

ESTRUTURA (adapte, nunca copie literalmente):
1. Abertura humana e direta: "Oi {nome}, aqui é o Caio, fundador da Wiize." Sem "espero que esteja bem", sem introdução corporativa.
2. Reconhecimento específico e real do trabalho dela.
3. Ponte: existe conexão entre o que ela já faz/ensina e o que estamos construindo na Wiize.
4. Apresentação da Wiize como plataforma unificada de inteligência comercial B2B, adaptada ao perfil.
5. Convite à parceria: "Estamos selecionando alguns profissionais e criadores do mercado para o nosso programa de parceiros" (ou variação).
6. Estrutura da parceria (benefício, não pitch): 50% de comissão na primeira mensalidade de cada cliente indicado; depois comissão recorrente que começa em 10% e pode chegar a 20% conforme o volume de clientes.
7. Potencial financeiro em linguagem condicional: tickets mais altos, planos/contratos acima de R$10 mil, "uma única indicação pode representar milhares de reais em comissão — em alguns casos até R$5 mil dependendo do plano e do contrato". NUNCA prometer ganhos.
8. Desejo: nova frente de receita sobre algo que ela já construiu, sem criar produto próprio nem montar operação comercial (adapte: especialista, criador, agência, consultor).
9. CTA curto em forma de pergunta: "Posso te explicar como funciona?" / "Faz sentido eu te mostrar como estruturamos essa parceria?".
10. WhatsApp ${WHATSAPP} é opcional, no máximo uma menção discreta ao final.

TOM: humano, confiante, inteligente, direto, cordial, empreendedor — o fundador falando, não um SDR nem um robô. Levemente informal quando combinar com o perfil. Nada de emojis em excesso, formalidade exagerada ou pressa em fechar.

TAMANHO: 120–200 palavras (qualidade acima de quantidade; mais curta se houver pouca informação real).

CHECKLIST INTERNO ANTES DE RESPONDER (se falhar, reescreva antes de devolver):
- Essa pessoa acreditaria que eu pesquisei o trabalho dela?
- O elogio poderia ser enviado para qualquer outro influenciador? Se sim, especifique mais.
- A mensagem parece proposta de afiliado? Se sim, reformule como parceria.
- A Wiize parece "mais uma ferramenta"? Se sim, reforce a plataforma unificada.
- Está vendendo demais? Reduza o pitch e aumente a curiosidade.

Responda SOMENTE em JSON com este formato:
{
  "nicho": "nicho identificado",
  "conteudo_usado": "título do vídeo/post ou tema real usado na personalização (ou 'Nenhum conteúdo específico encontrado')",
  "por_que": "explicação curta de por que esse conteúdo foi escolhido",
  "oportunidade": "por que essa pessoa seria uma boa parceira da Wiize",
  "personalizado": true,
  "confianca": "alta|media|baixa",
  "assunto": "assunto do e-mail, curto e pessoal",
  "mensagem": "texto final da abordagem, com quebras de linha entre parágrafos, sem assinatura corporativa"
}`;

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
function qualityCheck(out: any) {
  const issues: string[] = [];
  let msg = String(out?.mensagem || "").trim();
  const words = msg.split(/\s+/).filter(Boolean).length;
  if (!msg) issues.push("Mensagem vazia.");
  if (words < 100) issues.push("Mensagem muito curta.");
  if (words > 240) issues.push("Mensagem longa demais.");
  if (!/\?/.test(msg)) issues.push("Sem pergunta final (CTA).");
  const genericos = /(seu conte[úu]do é incr[íi]vel|adorei seu perfil|trabalho sensacional|espero que esta mensagem|grande autoridade)/i;
  if (genericos.test(msg)) issues.push("Elogio genérico detectado.");
  if (/afiliad|cupom|renda extra|multin[íi]vel/i.test(msg)) issues.push("Linguagem de afiliado detectada — deveria soar como parceria.");
  if (!/parceri/i.test(msg)) issues.push("A mensagem não posiciona a oportunidade como parceria.");
  // Nunca prometer ganho garantido.
  msg = msg.replace(/voc[êe] (vai|irá) (ganhar|faturar|receber)/gi, "é possível chegar a");
  return { message: msg, words, issues };
}

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
      return json({ ok: true, approach: data ?? null });
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

    // 3) Controle de qualidade.
    const qc = qualityCheck(out);

    const analysis = {
      nicho: String(out?.nicho || prospect.fit_category || "Não identificado"),
      conteudo_usado: String(out?.conteudo_usado || "Nenhum conteúdo específico encontrado"),
      por_que: String(out?.por_que || ""),
      oportunidade: String(out?.oportunidade || ""),
      personalizado: out?.personalizado !== false,
      confianca: String(out?.confianca || "media"),
      palavras: qc.words,
      alertas: qc.issues,
    };

    const researchMeta = {
      fonte: research ? "youtube_api" : "dados_do_perfil",
      videos_recentes: research?.recent?.length ?? 0,
      videos_antigos: research?.top?.length ?? 0,
      titulos: [...(research?.recent ?? []), ...(research?.top ?? [])].slice(0, 10).map((v: any) => v.title),
      tem_bio: !!(research?.description || prospect.channel_description),
    };

    const subject = String(out?.assunto || `Parceria Wiize com ${prospect.channel_name}`).slice(0, 300);

    const { data: saved } = await admin.from("influencer_ai_approaches").insert({
      prospect_id: prospectId,
      admin_id: u.user.id,
      channel: prospect.platform || "youtube",
      subject,
      message: qc.message.slice(0, 8000),
      analysis,
      research: researchMeta,
      status: "rascunho",
    }).select("*").maybeSingle();

    return json({ ok: true, approach: saved, analysis, research: researchMeta, subject, message: qc.message });
  } catch (e: any) {
    console.error("[influencer-ai-approach]", e);
    return json({ error: e?.message || "Erro inesperado." }, 500);
  }
});
