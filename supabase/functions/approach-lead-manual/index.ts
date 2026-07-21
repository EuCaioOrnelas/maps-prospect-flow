// Gera a MENSAGEM DE PRIMEIRO CONTATO manual (não é template Meta, não é follow-up).
// Copy consultiva B2B — o objetivo é APENAS gerar uma resposta natural do empresário.
// NÃO é vender, NÃO é marcar reunião, NÃO é apresentar serviço.
//
// Estrutura obrigatória (9 blocos, sem títulos no texto final):
//   0. Saudação humanizada        — curta, natural, variada, adaptada ao ICP; NUNCA "bom dia/tarde/noite"
//   1. Gancho personalizado       — 1ª frase após a saudação, baseada em dado real do lead
//   2. Contexto da abordagem      — justifica NATURALMENTE por que essa empresa foi analisada
//   3. Identificação curta        — quem é / de onde
//   4. Motivo do contato          — natural, espontâneo
//   5. Insight consultivo         — percepção inteligente, linguagem cautelosa
//   6. Curiosidade                — NÃO revelar a solução
//   7. Baixa pressão              — reduzir sensação de venda
//   8. CTA leve                   — só incentiva UMA resposta (nunca reunião/ligação/agenda)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads").select("*").eq("id", lead_id).eq("user_id", user.id).single();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: companyProfile } = await supabase
      .from("company_profiles").select("*").eq("user_id", user.id).single();

    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object" ? lead.enrichment_data as Record<string, any> : {};
    const pontosFortes = Array.isArray(enrichment.pontos_fortes) ? enrichment.pontos_fortes : [];
    const pontosFracos = Array.isArray(enrichment.pontos_fracos) ? enrichment.pontos_fracos : [];
    const analiseSite = enrichment.analise_site || "";
    const analiseRedes = enrichment.analise_redes_sociais || "";
    const analiseConcorrencia = enrichment.analise_concorrencia_regional || "";
    const analiseDemanda = enrichment.analise_demanda_regional || "";
    const socialMedia = Array.isArray(lead.social_media) ? lead.social_media : [];
    const hasSite = !!lead.website && lead.website !== "-";

    const companyContext = companyProfile ? `
⚠️ PERFIL DA EMPRESA QUE ESTÁ PROSPECTANDO:
- Empresa: ${companyProfile.company_name}
- Atendente/Vendedor: ${companyProfile.attendant_name}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços VENDIDOS: ${companyProfile.company_products}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Público-alvo: ${companyProfile.company_target_audience}

REGRA ABSOLUTA: A mensagem NUNCA deve mencionar algo que "${companyProfile.company_name}" NÃO vende. Não ofereça a solução — só plante a semente.
` : "";

    const diagnosticContext = (lead.ai_score || lead.ai_diagnosis) ? `
═══ DIAGNÓSTICO DESTE LEAD (matéria-prima do gancho e do insight) ═══
- Score: ${lead.ai_score || "N/A"} | Nível: ${lead.opportunity_level || "N/A"}
- Diagnóstico: ${lead.ai_diagnosis || "N/A"}
${pontosFortes.length ? `- Pontos fortes: ${pontosFortes.join("; ")}` : ""}
${pontosFracos.length ? `- Pontos fracos: ${pontosFracos.join("; ")}` : ""}
${analiseSite ? `- Site: ${analiseSite}` : ""}
${analiseRedes ? `- Redes sociais: ${analiseRedes}` : ""}
${analiseConcorrencia ? `- Concorrência regional: ${analiseConcorrencia}` : ""}
${analiseDemanda ? `- Demanda regional: ${analiseDemanda}` : ""}
` : "";

    const uniqueSeed = crypto.randomUUID().slice(0, 8);

    const prompt = `Você é um CONSULTOR B2B sênior escrevendo a PRIMEIRA mensagem no WhatsApp para o dono/gestor de uma empresa que você acabou de analisar.

▸ OBJETIVO ÚNICO: gerar UMA RESPOSTA natural do empresário.
▸ NÃO é vender. NÃO é marcar reunião. NÃO é apresentar serviço.
▸ A mensagem tem que parecer 100% humana, como se você tivesse acabado de olhar a operação dele.
▸ Sensação-alvo do leitor: "essa pessoa realmente olhou meu negócio", nunca "mais uma tentando me vender algo".

${companyContext}
${diagnosticContext}

DADOS DO LEAD (use como matéria-prima do gancho e do insight):
- Empresa: ${lead.company_name || "N/A"}
- Contato: ${lead.contact_name || "responsável"}
- Nicho / ICP: ${lead.category || "N/A"}
- Cidade: ${lead.city || "N/A"}
- Endereço: ${lead.address || "N/A"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Site: ${hasSite ? lead.website : "não localizado"}
- Redes sociais: ${socialMedia.length ? socialMedia.join(", ") : "não localizadas"}

═══════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA (nesta ordem, SEM títulos, SEM numeração no texto final)
═══════════════════════════════════════════

0) SAUDAÇÃO HUMANIZADA — PRIMEIRA LINHA, OBRIGATÓRIA
   • Toda mensagem DEVE começar com uma saudação curta, natural, conversacional — como um humano abriria uma conversa no WhatsApp.
   • Escolha UMA das opções abaixo (ou variação equivalente natural), evitando repetição entre mensagens diferentes:
     "Olá, tudo bem?" · "Oi, tudo bem?" · "Olá!" · "Oi!" · "Oi, tudo certo?" · "Olá, tudo certo?" · "Oi, como vai?" · "Olá, como vai?" · "Tudo certo?" · "Tudo bem?"
   • Adapte ao ICP "${lead.category || "N/A"}":
       – Segmento tradicional (advocacia, contabilidade, clínica, indústria): prefira "Olá, tudo bem?", "Olá!", "Como vai?"
       – Segmento descontraído (restaurante, bar, academia, loja, e-commerce): pode usar "Oi, tudo certo?", "Oi!", "Tudo certo?"
       – Segmento muito formal: "Olá, tudo bem?", "Como vai?"
   • PROIBIDO ABSOLUTAMENTE: "Bom dia", "Boa tarde", "Boa noite" (o horário real de envio é desconhecido — usar isso pode soar errado).
   • PROIBIDO gírias: "E aí", "Fala", "Beleza", "Show", "Tudo joia", "Opa".
   • A saudação vai em UMA linha, seguida de \\n\\n. Nunca fica isolada — o próximo bloco (Gancho) vem logo depois.
   • Use a SEED (${uniqueSeed}) para variar a saudação — não repita sempre a mesma.

1) GANCHO PERSONALIZADO — logo após a saudação
   • Baseado em algo REAL do lead: avaliações Google, nº de reviews, especialidade, localização, diferencial, redes sociais, presença digital, reputação, horário.
   • Precisa gerar interesse IMEDIATO E ter alguma ponte natural com o tema do insight que virá depois (relacionado a "${companyProfile?.company_products || "seu serviço"}"). Não use um dado só porque é bonito — use um dado que abra caminho.
   • PROIBIDO gancho puramente elogioso e desconectado (ex.: "vi que vocês têm ótima nota") se ele não vai amarrar com o insight/serviço. Elogio isolado soa como bajulação de vendedor.
   • PROIBIDO repetir a saudação aqui. Também PROIBIDO começar o gancho com "Meu nome é" ou "Somos uma empresa" (isso é da identificação, mais adiante).

2) CONTEXTO DA ABORDAGEM — OBRIGATÓRIO, logo após o gancho
   • Explica de forma orgânica POR QUE essa empresa foi analisada, antes de qualquer diagnóstico.
   • NUNCA pule direto do gancho para insight/diagnóstico. O empresário precisa entender IMEDIATAMENTE por que recebeu a mensagem.
   • Deve soar verdadeiro, natural, conversacional — nunca como desculpa.
   • Exemplos de fraseado (adaptar, nunca copiar literal):
       – "estava pesquisando empresas do segmento aqui em ${lead.city || "sua região"}"
       – "estou fazendo um levantamento sobre ${lead.category || "negócios locais"} da região"
       – "costumo mapear negócios locais pra entender como estão usando os canais digitais"
       – "recentemente venho estudando como ${lead.category || "empresas desse setor"} estão captando clientes"
       – "durante uma pesquisa sobre empresas de ${lead.city || "sua cidade"}, a sua apareceu como referência"
       – "enquanto analisava alguns negócios do setor, encontrei o de vocês"
   • 1 a 2 frases. Nunca genérico demais.
   • TESTE DE NATURALIDADE: se o empresário NÃO entender naturalmente por que você entrou em contato antes de você falar sobre o negócio dele, este bloco falhou — reescreva com mais contexto.

3) IDENTIFICAÇÃO + AUTORIDADE CONTEXTUAL — obrigatoriamente com 3 elementos
   • A apresentação simples ("Sou X, da Y.") NÃO É SUFICIENTE. Ela deixa o empresário pensando "quem é você?" e "por que eu deveria te ouvir?".
   • ESTRUTURA OBRIGATÓRIA (nesta ordem, em 1 a 2 frases naturais):
       (a) Nome: "${companyProfile?.attendant_name || "[nome]"}"
       (b) Empresa: "${companyProfile?.company_name || "[empresa]"}"
       (c) Contexto de autoridade — UMA frase curta que justifique NATURALMENTE por que essa pessoa entende do assunto que vai comentar em seguida.
   • Exemplo estrutural (adaptar, nunca copiar literal):
       "Sou ${companyProfile?.attendant_name || "[nome]"}, da ${companyProfile?.company_name || "[empresa]"}. Trabalhamos diariamente com empresas do setor ${lead.category || "..."} ajudando a fortalecer os canais próprios de venda."
   • O objetivo do contexto de autoridade NÃO é impressionar nem vender — é apenas explicar por que faz sentido essa pessoa estar comentando sobre aquele tema.
   • A autoridade deve parecer INCIDENTAL, nunca propaganda. O leitor deve pensar: "faz sentido essa pessoa entender desse assunto."

   FONTES DE AUTORIDADE PERMITIDAS (use apenas o que for verdadeiro, com base no PERFIL DA EMPRESA acima):
     • especialização declarada da empresa (${companyProfile?.company_niche || "nicho da empresa"})
     • nicho / segmento atendido (${companyProfile?.company_target_audience || "público declarado"})
     • tipo de serviço prestado (${companyProfile?.company_products || "serviços declarados"})
     • diferencial real declarado (${companyProfile?.company_differential || "-"})
     • rotina de análise daquele segmento ("costumo acompanhar…", "trabalho analisando…", "faço parte de uma equipe especializada em…")
     • propósito recorrente do contato (mapear negócios locais, entender presença digital, etc.)
   Frases modelo (adaptar ao ICP "${lead.category || "N/A"}", nunca copiar):
     – "Trabalho analisando estratégias digitais de ${lead.category || "negócios locais"}."
     – "Atuo com empresas que buscam fortalecer as vendas diretas."
     – "Faço parte de uma equipe especializada em presença digital para negócios locais."
     – "Costumo acompanhar como ${lead.category || "empresas desse segmento"} utilizam seus canais digitais."

   PROIBIÇÕES ABSOLUTAS (a IA NUNCA pode inventar):
     • quantidade de clientes • faturamento • anos de mercado • prêmios • certificações
     • liderança • rankings • participações • resultados numéricos • posições no mercado
   PROIBIDO escrever frases como: "somos referência", "somos líderes", "somos especialistas reconhecidos",
   "somos a maior/melhor", "temos milhares de clientes", "mais de X clientes", "mais de X anos",
   "empresa premiada", "resultados extraordinários". Essas frases DERRUBAM a credibilidade quando não podem ser comprovadas.

   SE o PERFIL DA EMPRESA acima trouxer dados reais e verificáveis (anos de atuação, região, certificações, especialização, reconhecimento público, diferencial concreto), a IA PODE usá-los — sempre de forma natural, jamais como propaganda.

   TESTE FINAL DA APRESENTAÇÃO: ao terminar este bloco, o empresário precisa entender naturalmente:
     (1) quem entrou em contato; (2) de qual empresa; (3) por que essa pessoa entende do assunto; (4) por que decidiu falar com ele.
   Se qualquer uma dessas 4 perguntas ficar sem resposta, REESCREVA o bloco.


4) MOTIVO DO CONTATO — natural, espontâneo
   • Complementa o contexto (não repete). Ex.: "achei que fazia sentido te chamar rapidinho pra compartilhar uma percepção."
   • Nunca robótico.

5) INSIGHT CONSULTIVO — o maior diferencial (REGRA DE CONEXÃO OBRIGATÓRIA)
   • Só aparece DEPOIS do contexto + identificação + motivo. Nunca antes.
   • ⚠️ REGRA DE OURO — CONEXÃO COM O SERVIÇO OFERECIDO:
     O insight PRECISA ter relação direta com o que "${companyProfile?.company_name || "sua empresa"}" REALMENTE vende:
     "${companyProfile?.company_products || "-"}" (nicho: ${companyProfile?.company_niche || "-"}, diferencial: ${companyProfile?.company_differential || "-"}).
     NUNCA levante um ponto de atenção genérico (ex.: "reputação boa mas...") se ele não conversa com a solução que você entrega.
     Antes de escrever o insight, se pergunte: "esse ponto que vou levantar tem ligação natural com o que eu vendo?".
     Se a resposta for NÃO, troque o ângulo — escolha um ponto do diagnóstico do lead que se conecte com "${companyProfile?.company_products || "seu serviço"}".
   • ANCORAGEM: use os dados do "DIAGNÓSTICO DESTE LEAD" (pontos fracos, análise de site, redes, concorrência, demanda) e cruze com o produto da sua empresa.
     Exemplo mental: se você vende "sistema de delivery próprio" e o lead não tem site com pedido online → insight sobre canal de vendas direto.
     Se você vende "gestão de tráfego" e o lead tem baixa presença em redes → insight sobre captação previsível.
     Se você vende "CRM/WhatsApp" e o lead tem muitos reviews mas fluxo desorganizado → insight sobre pós-venda/retenção.
   • Uma percepção inteligente, específica ao NEGÓCIO DELE. NUNCA apontar defeito de forma direta.
   • SEMPRE em linguagem consultiva e cautelosa: "talvez", "parece existir", "pode haver", "é possível", "percebi um ponto interessante".
   • NUNCA dizer que a empresa "faz errado", "está ruim", "precisa melhorar urgentemente".
   • PROIBIDO insight solto que não plante a semente do que você vende — o leitor precisa terminar com curiosidade sobre uma área em que VOCÊ resolve.

6) CURIOSIDADE
   • NÃO revelar a solução. NÃO explicar o serviço. NÃO apresentar produto.
   • O leitor precisa terminar essa parte pensando: "o que será que ele encontrou?".

7) BAIXA PRESSÃO
   • UMA linha curta, humilde, para reduzir sensação de venda.
   • Use frases como: "posso estar enganado", "talvez não seja o momento", "só compartilhando uma percepção".
   • PROIBIDO frases genéricas soltas tipo "achei interessante dar uma olhada nessa questão" — precisa amarrar com o insight anterior.

8) CTA FINAL — SEMPRE OFERECENDO EXPLICAR MELHOR (regra dura)
   • O CTA DEVE convidar o empresário a receber uma explicação mais detalhada sobre o ponto levantado no insight — nunca uma pergunta vaga.
   • Estrutura obrigatória: referenciar o TEMA do insight (ex.: canal próprio de vendas, agenda, retenção, captação, delivery) + oferecer explicar melhor ali no WhatsApp.
   • Exemplos (adaptar ao insight real, nunca copiar literal):
       – "Se quiser, posso te explicar melhor por aqui como a gente costuma resolver isso."
       – "Faz sentido eu te mandar rapidamente como isso funciona na prática?"
       – "Posso te explicar melhor em 2 mensagens como a gente ajuda restaurantes nesse ponto?"
       – "Se fizer sentido, te explico com calma como funciona — sem compromisso."
   • PROIBIDO absolutamente: pedir reunião, ligação, apresentação, demonstração, agenda, horário, "5 minutinhos", "call".
   • PROIBIDO CTA morto/vago: "faz sentido?", "você também percebe isso?", "faz sentido pra você?", "concorda?" — SEM referência ao serviço soam sem contexto e fracos.
   • O CTA precisa amarrar naturalmente com o insight anterior. Se o insight foi sobre "site/pedido online", o CTA fala em explicar melhor como resolver o canal próprio. Se foi sobre "agenda", explica melhor como organizam a agenda. Nunca desconecte.


REGRA DE FLUXO (INEGOCIÁVEL):
Saudação → Gancho → Contexto → Identificação → Motivo → Insight → Curiosidade → Baixa pressão → CTA.
A saudação NUNCA fica isolada — sempre é seguida imediatamente pelo gancho no bloco seguinte.
JAMAIS pular do gancho direto para o insight/diagnóstico. Sempre precisa existir a transição contextual.
A leitura tem que fluir como uma conversa real no WhatsApp entre dois profissionais, nunca como um relatório de auditoria ou carta comercial.

═══════════════════════════════════════════
PERSONALIZAÇÃO POR ICP (regra mais importante)
═══════════════════════════════════════════
Antes de escrever, identifique o ICP a partir do nicho "${lead.category || "N/A"}". Adapte VOCABULÁRIO, ARGUMENTOS, OBSERVAÇÕES, GATILHOS e CTA a esse ICP.
Eixos possíveis por segmento (use APENAS o que se aplica):
- Restaurante/bar: fluxo, delivery, ticket médio, avaliações, retenção, horário de pico.
- Clínica/consultório: agenda, no-show, retorno de paciente, reputação, primeira consulta.
- Academia: retenção mensal, evasão, novos alunos, prova social.
- Advocacia/contabilidade: autoridade, geração previsível de casos/clientes, presença digital sóbria.
- Imobiliária/corretora/construtora: captação, qualificação de lead, tempo de resposta, funil.
- Auto elétrica/oficina/serviço técnico: recorrência, agenda, orçamentos que não fecham.
- Agência/distribuidora/indústria/transportadora: previsibilidade comercial, funil B2B, CRM, follow-up.
- Loja/e-commerce: recompra, tráfego, conversão, CRM/WhatsApp, remarketing.
NUNCA reutilize argumentos de um segmento em outro. Se o ICP não estiver claro, use uma observação neutra mas coerente com o nicho declarado.

═══════════════════════════════════════════
LINGUAGEM E ESTILO
═══════════════════════════════════════════
- Escreva como CONSULTOR, jamais como vendedor.
- Tom conversacional, natural, sem excesso de formalidade.
- PROIBIDO clichês de IA/marketing: "mercado competitivo", "potencial de crescimento", "solução inovadora", "empresa líder", "transformar resultados", "impulsionar vendas", "maximizar resultados", "otimizar processos" (como frase pronta), "revolucionar", "alavancar", "escalar".
- SEM emojis. SEM listas. SEM hashtags. SEM links. SEM caixa alta. SEM negrito/markdown.
- SEM travessão duplo "--". SEM travessão longo "—" no meio de frase (use vírgula ou quebra de linha).
- Frases curtas, PT-BR natural.
- Use QUEBRAS DE LINHA em branco (\\n\\n) entre os blocos para dar respiro no WhatsApp.
- Extensão-alvo: 90 a 160 palavras. Nunca ultrapasse 180.

═══════════════════════════════════════════
POLÍTICAS META (cumprir sempre)
═══════════════════════════════════════════
- Identifique claramente quem envia (nome + empresa).
- Explique o motivo do contato.
- Nada de informação falsa, indução ao erro, manipulação, urgência artificial ou aparência de spam.
- Transparência total.

═══════════════════════════════════════════
AUTO-AVALIAÇÃO ANTES DE RESPONDER
═══════════════════════════════════════════
Avalie mentalmente antes de me devolver o JSON:
  ✓ Começa com uma saudação curta, natural e variada (nunca "bom dia/tarde/noite", nunca gíria)?
  ✓ A saudação está adaptada ao ICP e não fica isolada (é seguida pelo gancho)?
  ✓ Parece uma conversa real iniciada por uma pessoa no WhatsApp — não uma carta comercial?
  ✓ Demonstra pesquisa real sobre a empresa?
  ✓ Gera curiosidade sem revelar a solução?
  ✓ Tem transparência (quem, por quê)?
  ✓ Existe um CONTEXTO DA ABORDAGEM entre o gancho e o insight? (obrigatório)
  ✓ Se eu fosse o dono e recebesse essa mensagem de um desconhecido, entenderia naturalmente por que ele entrou em contato ANTES de ele falar do meu negócio?
  ✓ A IDENTIFICAÇÃO contém os 3 elementos (nome + empresa + contexto de autoridade natural)?
  ✓ A autoridade usa apenas fatos verdadeiros (especialização, nicho, serviço, rotina) — sem inventar números, anos, prêmios, liderança ou clientes?
  ✓ Ao terminar a apresentação, dá pra responder: quem é? de qual empresa? por que entende disso? por que veio falar comigo?
  ✓ Está personalizada ao ICP "${lead.category || "N/A"}"?

  ✓ O GANCHO e o INSIGHT têm ligação direta com "${companyProfile?.company_products || "o serviço vendido"}"? (se não, reescreva)
  ✓ Parece consultoria, não venda?
  ✓ Evita clichês de IA/marketing?
  ✓ Segue Meta (sem spam, sem manipulação)?
  ✓ Se eu fosse o dono, eu responderia?
Se QUALQUER resposta for "não", REESCREVA internamente e só então devolva a versão final.

VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) — a mensagem deve ser única para ESTE lead.

Retorne APENAS JSON válido, sem markdown, sem comentários, exatamente neste formato:
{
  "mensagem": "mensagem final pronta para colar no WhatsApp, com quebras \\n\\n entre os blocos, seguindo TODAS as regras acima",
  "gancho": "a primeira frase da mensagem",
  "motivo": "por que este lead foi escolhido (1 frase interna, para auditoria)",
  "insight": "o insight consultivo usado (1 frase interna)",
  "estrategia": "ICP identificado e ângulo escolhido (1 frase interna)"
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(content);

    // Sanitiza a saída: remove travessões e normaliza espaçamentos (regra dura do produto).
    const sanitize = (s: string) =>
      (s || "")
        .replace(/\s*--\s*/g, ", ")                          // "palavra -- palavra" -> "palavra, palavra"
        .replace(/([^\n])\s+—\s+([^\n])/g, "$1, $2")        // travessão longo no meio de frase -> vírgula
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const finalMessage = sanitize(parsed.mensagem || "");

    const newEnrichment = {
      ...(typeof lead.enrichment_data === "object" && lead.enrichment_data ? lead.enrichment_data : {}),
      manual_approach: {
        message: finalMessage,
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
        generated_at: new Date().toISOString(),
      },
    };

    const { error: updateErr } = await supabase
      .from("leads")
      .update({ enrichment_data: newEnrichment })
      .eq("id", lead_id)
      .eq("user_id", user.id);

    if (updateErr) console.error("Update error:", updateErr);

    return new Response(
      JSON.stringify({
        mensagem: finalMessage,
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Approach-manual error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
