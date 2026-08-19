-- ============================================================================
-- SQL COMPLETO PARA BANCO EXTERNO
-- Publicação: "Wiize Company & Investor Update — 2026"
-- Estrutura usada: public.blog_posts, public.blog_categories,
--                  public.blog_tags, public.blog_post_tags
-- Idempotente: pode ser executado mais de uma vez (ON CONFLICT).
-- Não altera nem apaga nenhum artigo existente.
--
-- >>> SUBSTITUIR MANUALMENTE (opcional):
--     <<COVER_URL>>  -> URL absoluta da imagem de capa (1200x630)
--     <<OG_IMAGE>>   -> URL absoluta da imagem Open Graph (pode ser a mesma)
--     Se não tiver imagem agora, deixe como está: o artigo funciona sem capa
--     (basta trocar os valores por NULL nas linhas indicadas).
-- ============================================================================

BEGIN;

-- 1) Categoria institucional -------------------------------------------------
INSERT INTO public.blog_categories (name, slug, description, color, sort_order)
VALUES ('Institucional', 'institucional', 'Atualizações estratégicas, cultura e visão de longo prazo da Wiize.', '#22c55e', 10)
ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description;

-- 2) Tags --------------------------------------------------------------------
INSERT INTO public.blog_tags (name, slug) VALUES
  ('Inteligência Comercial', 'inteligencia-comercial'),
  ('B2B', 'b2b'),
  ('SaaS', 'saas'),
  ('Investor Update', 'investor-update'),
  ('Estratégia', 'estrategia'),
  ('IA para Vendas', 'ia-para-vendas')
ON CONFLICT (slug) DO NOTHING;

-- 3) Publicação --------------------------------------------------------------
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt,
  author_name, author_bio,
  category_id, status, featured, reading_time_minutes, published_at,
  seo_title, seo_description, seo_keywords, canonical_url,
  robots_index, robots_follow, og_image_url,
  ai_summary, ai_short_answer, ai_entities, ai_related_topics, ai_questions, faq
)
VALUES (
  'wiize-company-investor-update-2026',
  'A evolução da Wiize: de disparos em massa à inteligência comercial B2B',
  'Como transformamos dados, IA e tecnologia comercial em uma plataforma construída para aumentar a eficiência de operações B2B.',
  'Wiize Company & Investor Update 2026: uma visão transparente sobre nossa evolução, os aprendizados que mudaram nossa estratégia, os números já construídos e o futuro que estamos construindo.',
  $html$
<div class="wz-report">
<style>
.wz-report{--wz-line:hsl(var(--border));--wz-mut:hsl(var(--muted-foreground));--wz-fg:hsl(var(--foreground));--wz-acc:hsl(var(--primary));font-feature-settings:"tnum" 0;}
.wz-report *{box-sizing:border-box}
.wz-report .wz-hero{border:1px solid var(--wz-line);border-radius:20px;padding:44px 32px;margin:8px 0 40px;background:hsl(var(--card))}
.wz-report .wz-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--wz-acc);margin:0 0 20px}
.wz-report .wz-hero h2{font-size:2.1rem;line-height:1.15;margin:0 0 16px;font-weight:800;letter-spacing:-.02em}
.wz-report .wz-hero p{font-size:1.05rem;color:var(--wz-mut);margin:0;max-width:62ch;line-height:1.7}
.wz-report .wz-chip{display:inline-block;margin-top:24px;font-size:12px;font-weight:600;color:var(--wz-mut);border:1px solid var(--wz-line);border-radius:999px;padding:6px 14px}
.wz-report h2{font-size:1.75rem;margin:56px 0 8px;font-weight:800;letter-spacing:-.02em}
.wz-report h3{font-size:1.15rem;margin:32px 0 8px;font-weight:700}
.wz-report .wz-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--wz-mut);margin:56px 0 4px}
.wz-report .wz-kicker + h2{margin-top:0}
.wz-report .wz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:28px 0}
.wz-report .wz-card{border:1px solid var(--wz-line);border-radius:16px;padding:24px;background:hsl(var(--card));transition:border-color .2s ease,transform .2s ease}
.wz-report .wz-card:hover{border-color:hsl(var(--primary)/.45);transform:translateY(-2px)}
.wz-report .wz-num{font-size:2.4rem;font-weight:800;letter-spacing:-.03em;line-height:1;display:block;margin-bottom:10px}
.wz-report .wz-lbl{font-size:.82rem;color:var(--wz-mut);line-height:1.5;display:block}
.wz-report .wz-tagreal{display:inline-block;margin-top:14px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--wz-acc);border:1px solid hsl(var(--primary)/.35);border-radius:6px;padding:3px 7px}
.wz-report .wz-tagproj{color:var(--wz-mut);border-color:var(--wz-line)}
.wz-report .wz-quote{border-left:3px solid var(--wz-acc);padding:6px 0 6px 22px;margin:36px 0;font-size:1.3rem;font-weight:600;line-height:1.5;letter-spacing:-.01em}
.wz-report .wz-ba{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;border:1px solid var(--wz-line);border-radius:14px;padding:16px 18px;margin:12px 0;background:hsl(var(--card))}
.wz-report .wz-ba span{font-size:.95rem}
.wz-report .wz-ba .wz-from{color:var(--wz-mut);text-decoration:line-through;text-decoration-color:hsl(var(--muted-foreground)/.5)}
.wz-report .wz-ba .wz-to{font-weight:700}
.wz-report .wz-ba .wz-arrow{color:var(--wz-acc);font-weight:700}
.wz-report .wz-bar{display:flex;align-items:center;gap:14px;margin:10px 0}
.wz-report .wz-bar b{width:64px;font-size:.85rem;font-weight:700;flex:none}
.wz-report .wz-track{flex:1;height:12px;border-radius:999px;background:hsl(var(--muted));overflow:hidden}
.wz-report .wz-fill{height:100%;border-radius:999px;background:var(--wz-acc);opacity:.9}
.wz-report .wz-fill.wz-soft{background:hsl(var(--muted-foreground)/.45)}
.wz-report .wz-val{width:110px;text-align:right;font-size:.85rem;font-weight:700;flex:none}
.wz-report .wz-phase{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:24px 0}
.wz-report .wz-phase div{border:1px solid var(--wz-line);border-radius:14px;padding:20px;background:hsl(var(--card))}
.wz-report .wz-phase strong{display:block;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:var(--wz-mut);margin-bottom:8px}
.wz-report .wz-tl{border-left:2px solid var(--wz-line);margin:28px 0 28px 6px;padding-left:26px}
.wz-report .wz-tl > div{position:relative;padding-bottom:26px}
.wz-report .wz-tl > div:last-child{padding-bottom:0}
.wz-report .wz-tl > div::before{content:"";position:absolute;left:-33px;top:6px;width:10px;height:10px;border-radius:999px;background:var(--wz-acc)}
.wz-report .wz-tl h4{margin:0 0 4px;font-size:1rem;font-weight:800}
.wz-report .wz-tl p{margin:0;color:var(--wz-mut);font-size:.95rem}
.wz-report .wz-note{border:1px dashed var(--wz-line);border-radius:12px;padding:16px 18px;font-size:.82rem;color:var(--wz-mut);line-height:1.65;margin:20px 0}
.wz-report .wz-rule{height:1px;background:var(--wz-line);border:0;margin:56px 0}
.wz-report .wz-big{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:0 0 8px}
.wz-report ul{margin:16px 0;padding-left:20px}
.wz-report li{margin:6px 0}
@media (max-width:640px){
.wz-report .wz-hero{padding:28px 20px;border-radius:16px}
.wz-report .wz-hero h2{font-size:1.55rem}
.wz-report h2{font-size:1.4rem}
.wz-report .wz-num{font-size:2rem}
.wz-report .wz-big{font-size:1.9rem}
.wz-report .wz-ba{grid-template-columns:1fr;text-align:left}
.wz-report .wz-bar b{width:52px}
.wz-report .wz-val{width:88px}
}
</style>

<section class="wz-hero">
  <p class="wz-eyebrow">Wiize Company &amp; Investor Update — 2026</p>
  <h2>A evolução da Wiize: de disparos em massa à inteligência comercial B2B</h2>
  <p>Uma visão transparente sobre nossa evolução, os aprendizados que mudaram nossa estratégia, os números que já construímos e o futuro que estamos construindo.</p>
  <span class="wz-chip">Atualização estratégica • 2026</span>
</section>

<p>Este documento é uma atualização institucional. Ele descreve o que a Wiize construiu até aqui, por que mudamos de direção em 2026, o que aprendemos com essa mudança e como enxergamos os próximos anos. Sempre que um número aparece, ele é identificado como <strong>dado real</strong>, <strong>meta</strong>, <strong>projeção</strong> ou <strong>cenário ilustrativo</strong>.</p>

<p class="wz-kicker">Seção 01</p>
<h2>Os números por trás da evolução</h2>
<p>Dados registrados pela plataforma até 2026.</p>

<div class="wz-grid">
  <div class="wz-card"><span class="wz-num">458</span><span class="wz-lbl">Empresas que já utilizaram a plataforma</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">563</span><span class="wz-lbl">Usuários</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">1,08 mi</span><span class="wz-lbl">Oportunidades processadas</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">776 mil</span><span class="wz-lbl">Mensagens e ações comerciais processadas</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">R$ 577</span><span class="wz-lbl">Ticket médio</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">17%</span><span class="wz-lbl">Conversão média do trial para cliente pago</span><span class="wz-tagreal">Dado real • em validação</span></div>
  <div class="wz-card"><span class="wz-num">0%</span><span class="wz-lbl">Churn registrado</span><span class="wz-tagreal">Dado real • período observado</span></div>
</div>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 02</p>
<h2>Onde a Wiize começou</h2>
<p>A Wiize começou como uma ferramenta focada em disparos em massa. Esse mercado trouxe aprendizados importantes sobre entregabilidade, comportamento de canal e operação em volume — mas também revelou problemas estruturais:</p>
<ul>
  <li>mercado extremamente competitivo;</li>
  <li>grande dependência de volume;</li>
  <li>bloqueios recorrentes de canal;</li>
  <li>churn elevado;</li>
  <li>usuários com baixo valor potencial;</li>
  <li>dificuldade de construir relação de longo prazo com os clientes;</li>
  <li>pressão constante por preço.</li>
</ul>
<p>Com o tempo, ficou claro que o problema real dos nossos clientes não era enviar mais mensagens. Era vender melhor. Esse aprendizado foi determinante para a mudança de direção da empresa.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 03</p>
<h2>O ponto de inflexão</h2>
<p class="wz-big">29 de maio de 2026</p>
<p>O dia em que mudamos a direção da Wiize. A partir dessa data, começamos a reposicionar o produto: de uma ferramenta de disparos em massa para uma plataforma de inteligência comercial e dados.</p>
<p>A nova visão passou a ser clara: <strong>aumentar a eficiência comercial das empresas sem simplesmente aumentar o número de pessoas necessárias para executar a operação.</strong></p>
<p>Na prática, a Wiize passou a trabalhar com dados, inteligência artificial, automação, análise comercial, organização de oportunidades, engajamento de leads, identificação de gargalos, otimização de tarefas comerciais e apoio à tomada de decisão.</p>

<div class="wz-ba"><span class="wz-from">Disparos em massa</span><span class="wz-arrow">→</span><span class="wz-to">Inteligência comercial</span></div>
<div class="wz-ba"><span class="wz-from">Volume</span><span class="wz-arrow">→</span><span class="wz-to">Eficiência</span></div>
<div class="wz-ba"><span class="wz-from">Enviar mais mensagens</span><span class="wz-arrow">→</span><span class="wz-to">Tomar melhores decisões comerciais</span></div>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 04</p>
<h2>O custo de escolher o caminho certo</h2>
<p>Mudar de posicionamento tem preço, e não faz sentido esconder isso. Entre o início de janeiro e maio de 2026, a Wiize apresentou aproximadamente <strong>500% de crescimento</strong>. Após a mudança de posicionamento, entre junho e agosto, o crescimento desacelerou aproximadamente <strong>70%</strong>.</p>

<h3>Gráfico 1 — Evolução por fase</h3>
<div class="wz-bar"><b>Jan–Mai</b><div class="wz-track"><div class="wz-fill" style="width:100%"></div></div><span class="wz-val">≈ +500%</span></div>
<div class="wz-bar"><b>Jun–Ago</b><div class="wz-track"><div class="wz-fill wz-soft" style="width:30%"></div></div><span class="wz-val">≈ −70%</span></div>
<div class="wz-note">Visualização conceitual de fases. Representa a variação relativa do ritmo de crescimento informada acima; não representa valores absolutos mensais.</div>

<p>Essa desaceleração foi deliberada. Percebemos que parte relevante da aquisição anterior vinha de um público que não correspondia ao ICP que queremos construir no longo prazo. Em vez de perseguir crescimento de curto prazo com clientes de baixa aderência, escolhemos reduzir a velocidade de aquisição para aumentar a qualidade da carteira.</p>

<blockquote class="wz-quote">“Nem todo crescimento constrói valor. Às vezes, crescer menos é a decisão necessária para construir melhor.”</blockquote>

<p>A estratégia atual é recuperar o ritmo de aquisição — agora direcionado ao ICP correto.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 05</p>
<h2>Para quem estamos construindo</h2>
<p>A Wiize está direcionada principalmente para empresas B2B estruturadas que já possuem operação comercial:</p>
<ul>
  <li>empresas de serviços B2B;</li>
  <li>agências;</li>
  <li>consultorias empresariais;</li>
  <li>softwares e empresas SaaS;</li>
  <li>times comerciais;</li>
  <li>empresas que dependem de prospecção ativa;</li>
  <li>empresas com processos comerciais estruturados.</li>
</ul>
<p>Não estamos buscando ser uma ferramenta genérica para qualquer pessoa que queira enviar mensagens. O foco é atender empresas que possuem estrutura comercial e conseguem capturar valor real através de inteligência, dados e automação. Outros perfis continuam sendo bem-vindos, mas não fazem parte do ICP prioritário deste momento.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 06</p>
<h2>O que estamos construindo</h2>
<p>A Wiize está evoluindo para uma plataforma que conecta uma cadeia contínua:</p>
<div class="wz-phase">
  <div><strong>01</strong>Dados</div>
  <div><strong>02</strong>Inteligência</div>
  <div><strong>03</strong>Decisão</div>
  <div><strong>04</strong>Execução</div>
  <div><strong>05</strong>Resultado</div>
</div>
<p>O objetivo é ajudar equipes comerciais a identificar oportunidades, organizar dados, entender o comportamento dos leads, encontrar gargalos, priorizar ações, automatizar tarefas repetitivas, melhorar o acompanhamento, aumentar a produtividade e tomar decisões melhores.</p>
<p>A inteligência artificial, aqui, não é um recurso isolado: é uma camada de inteligência aplicada ao processo comercial.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 07</p>
<h2>Escala de uso</h2>
<div class="wz-grid">
  <div class="wz-card"><span class="wz-num">1,08 mi</span><span class="wz-lbl">Oportunidades processadas pela infraestrutura da Wiize</span><span class="wz-tagreal">Dado real</span></div>
  <div class="wz-card"><span class="wz-num">776 mil</span><span class="wz-lbl">Mensagens e ações comerciais processadas</span><span class="wz-tagreal">Dado real</span></div>
</div>
<p>Esses números representam o volume de dados e interações que já passaram pela plataforma. Quanto mais operações passam pela Wiize, maior é a quantidade de padrões e comportamentos observáveis que podem ser usados para melhorar o produto e a experiência dos times comerciais.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 08</p>
<h2>Trial, conversão e aprendizado operacional</h2>
<p>O modelo de trial atual começou a ser validado em agosto de 2026. Até aqui, registramos <strong>17% de conversão média do trial para cliente pago</strong>.</p>
<p>Tratamos essa métrica como um indicador inicial: o modelo é recente e a amostra ainda está em fase de validação. Ela não deve ser lida como número consolidado estatisticamente.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 09</p>
<h2>Crescer também significa proteger a operação</h2>
<p>Durante julho de 2026, identificamos um volume relevante de comportamentos fraudulentos relacionados ao período gratuito. Alguns usuários cadastravam cartão, utilizavam o período gratuito e solicitavam cancelamento antes de qualquer cobrança. Mesmo sem cobrança efetivamente realizada, algumas disputas financeiras geravam impacto para a empresa.</p>
<p>Como resposta, implementamos <strong>3D Secure</strong>, exigindo uma etapa adicional de autenticação do cartão junto à instituição financeira. O objetivo é reduzir fraude, aumentar a segurança, proteger a operação, melhorar a qualidade da base e tornar o modelo de trial mais sustentável.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 10</p>
<h2>Retenção</h2>
<div class="wz-grid">
  <div class="wz-card"><span class="wz-num">0%</span><span class="wz-lbl">Churn registrado no histórico atual da empresa</span><span class="wz-tagreal">Dado real</span></div>
</div>
<p>Esse número representa o histórico atualmente registrado e deve ser interpretado considerando o estágio da base e o período de observação. Não é uma afirmação de retenção perfeita, e sim um indicador do momento atual.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 11</p>
<h2>Construindo uma empresa de grande escala</h2>
<p>A Wiize trabalha com metas internas agressivas de crescimento. Nosso cenário de planejamento considera:</p>

<h3>Gráfico 2 — Metas de MRR</h3>
<div class="wz-bar"><b>2026</b><div class="wz-track"><div class="wz-fill" style="width:1%"></div></div><span class="wz-val">R$ 50 mil</span></div>
<div class="wz-bar"><b>2027</b><div class="wz-track"><div class="wz-fill" style="width:5%"></div></div><span class="wz-val">R$ 250 mil</span></div>
<div class="wz-bar"><b>2028</b><div class="wz-track"><div class="wz-fill" style="width:20%"></div></div><span class="wz-val">R$ 1 milhão</span></div>
<div class="wz-bar"><b>2029</b><div class="wz-track"><div class="wz-fill" style="width:100%"></div></div><span class="wz-val">R$ 5 milhões</span></div>
<div class="wz-note">Metas e projeções internas. Não representam garantia de resultados futuros.</div>

<h3>Visão de ARR</h3>
<p>No cenário em que a empresa atingisse R$ 5 milhões de MRR, o equivalente anualizado seria de <strong>R$ 60 milhões de ARR</strong>. Trata-se de uma derivação matemática de uma meta — não de receita realizada.</p>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 12</p>
<h2>Como enxergamos a construção de valor</h2>
<p>Valuation não é determinada apenas por receita. Ela depende de crescimento, retenção, margem, qualidade da receita, mercado, tecnologia, capacidade de expansão, eficiência comercial, recorrência e expansão internacional.</p>

<h3>Gráfico 3 — Cenários ilustrativos sobre R$ 60 milhões de ARR</h3>
<div class="wz-bar"><b>4× ARR</b><div class="wz-track"><div class="wz-fill wz-soft" style="width:27%"></div></div><span class="wz-val">R$ 240 mi</span></div>
<div class="wz-bar"><b>7× ARR</b><div class="wz-track"><div class="wz-fill wz-soft" style="width:47%"></div></div><span class="wz-val">R$ 420 mi</span></div>
<div class="wz-bar"><b>10× ARR</b><div class="wz-track"><div class="wz-fill wz-soft" style="width:67%"></div></div><span class="wz-val">R$ 600 mi</span></div>
<div class="wz-bar"><b>15× ARR</b><div class="wz-track"><div class="wz-fill wz-soft" style="width:100%"></div></div><span class="wz-val">R$ 900 mi</span></div>
<div class="wz-note">Os múltiplos apresentados são referências para construção de cenários e não representam valuation oficial, oferta de investimento ou garantia de resultados futuros. A valuation efetiva dependerá de fatores como crescimento, retenção, margem, mercado, expansão internacional, composição da receita e condições de mercado no momento de eventual rodada ou evento de liquidez.</div>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 13</p>
<h2>Nossa visão para os próximos cinco anos</h2>
<p class="wz-big">Construir a maior empresa de inteligência comercial B2B da América Latina.</p>
<p>Essa é uma ambição de longo prazo, não uma descrição da posição atual da empresa.</p>

<div class="wz-tl">
  <div><h4>2026</h4><p>Validação do novo ICP e consolidação do novo posicionamento.</p></div>
  <div><h4>2027</h4><p>Escala comercial no Brasil.</p></div>
  <div><h4>2028</h4><p>Expansão da plataforma e consolidação do ecossistema de inteligência comercial.</p></div>
  <div><h4>2029</h4><p>Meta de R$ 5 milhões de MRR e preparação para expansão internacional.</p></div>
  <div><h4>Próxima fase</h4><p>Expansão internacional começando pela Europa, seguida pelos Estados Unidos e posteriormente Ásia.</p></div>
</div>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 14</p>
<h2>Construir valor, não vender a visão</h2>
<p>A Wiize já recebeu propostas e manifestações de interesse relacionadas ao negócio. O fundador, sócio único e majoritário, Caio Wiize, atualmente não tem como objetivo vender a empresa.</p>
<p>Hoje, nosso objetivo não é construir a Wiize para uma saída de curto prazo. Estamos construindo uma empresa para permanecer independente, preservar sua cultura e maximizar o valor criado ao longo do tempo — preservando missão, visão, autonomia, qualidade do produto, crescimento dos usuários e relacionamento com clientes.</p>
<blockquote class="wz-quote">“Nossa prioridade não é vender a Wiize. É construir uma empresa que gere valor real para seus usuários e para o mercado no longo prazo.”</blockquote>

<hr class="wz-rule" />

<p class="wz-kicker">Seção 15</p>
<h2>Nosso compromisso com os usuários</h2>
<p>A métrica mais importante da Wiize não será apenas o tamanho da empresa. Será o impacto que a plataforma gera nas empresas que a utilizam: encontrar melhores oportunidades, entender melhor os leads, reduzir trabalho manual, identificar gargalos, melhorar produtividade, tomar melhores decisões e aumentar a eficiência comercial.</p>
<blockquote class="wz-quote">“Nosso crescimento só faz sentido se nossos usuários crescerem junto com a Wiize.”</blockquote>

<hr class="wz-rule" />

<p class="wz-kicker">Conclusão</p>
<h2>A próxima fase começa agora</h2>
<p>A Wiize começou aprendendo a gerar volume. Depois aprendeu que volume, sozinho, não é suficiente. Agora está construindo inteligência. A próxima fase é transformar essa inteligência em eficiência comercial para empresas B2B em escala.</p>
<p>458 empresas já passaram pela nossa plataforma. Mais de 1 milhão de oportunidades já foram processadas. Centenas de usuários já utilizaram nossa tecnologia. Mas acreditamos que isso ainda representa apenas o começo.</p>
<blockquote class="wz-quote">Estamos construindo a Wiize para os próximos anos — não apenas para o próximo trimestre.</blockquote>
</div>
$html$,
  '<<COVER_URL>>',                       -- trocar por URL absoluta ou NULL
  'Wiize Company & Investor Update 2026',
  'Equipe Wiize',
  'Atualizações institucionais e estratégicas da Wiize.',
  (SELECT id FROM public.blog_categories WHERE slug = 'institucional'),
  'published',
  true,
  12,
  now(),
  'Wiize Company & Investor Update 2026 | Inteligência comercial B2B',
  'Como a Wiize evoluiu de disparos em massa para inteligência comercial B2B: números reais, mudança de posicionamento, novo ICP, metas de MRR e visão de longo prazo.',
  ARRAY['Wiize','inteligência comercial','inteligência comercial B2B','prospecção B2B','automação comercial','dados comerciais','IA para vendas','SaaS B2B','sales intelligence','inteligência de vendas'],
  'https://wiize.com.br/blog/wiize-company-investor-update-2026',
  true, true,
  '<<OG_IMAGE>>',                        -- trocar por URL absoluta ou NULL
  'Atualização institucional da Wiize em 2026: a empresa migrou de uma ferramenta de disparos em massa para uma plataforma de inteligência comercial B2B. Registra 458 empresas usuárias, 563 usuários, 1,08 milhão de oportunidades processadas, 776 mil mensagens e ações comerciais, ticket médio de R$ 577, 17% de conversão de trial e 0% de churn registrado. Metas internas: R$ 50 mil de MRR em 2026, R$ 250 mil em 2027, R$ 1 milhão em 2028 e R$ 5 milhões em 2029.',
  'A Wiize é uma plataforma brasileira de inteligência comercial B2B que usa dados, IA e automação para aumentar a eficiência de times comerciais. Em 29 de maio de 2026 deixou o posicionamento de disparos em massa e passou a focar em empresas B2B estruturadas.',
  ARRAY['Wiize','Caio Wiize','inteligência comercial B2B','SaaS','MRR','ARR','ICP','3D Secure','América Latina'],
  ARRAY['inteligência comercial','prospecção B2B','IA para vendas','métricas SaaS','estratégia de produto'],
  '[]'::jsonb,
  '[
    {"question":"O que é a Wiize?","answer":"A Wiize é uma plataforma de inteligência comercial B2B que combina dados, inteligência artificial e automação para aumentar a eficiência de operações comerciais, sem exigir aumento proporcional de equipe."},
    {"question":"Qual problema a Wiize resolve?","answer":"Ajuda empresas B2B a identificar oportunidades, organizar dados comerciais, entender o comportamento dos leads, encontrar gargalos, priorizar ações e automatizar tarefas repetitivas do processo de vendas."},
    {"question":"Quem é o público-alvo da Wiize?","answer":"Empresas B2B estruturadas com operação comercial: serviços B2B, agências, consultorias, SaaS, times comerciais e empresas que dependem de prospecção ativa."},
    {"question":"Como a Wiize evoluiu?","answer":"Começou como ferramenta de disparos em massa e, em 29 de maio de 2026, reposicionou-se como plataforma de inteligência comercial e dados, priorizando eficiência em vez de volume."},
    {"question":"Quais números a Wiize já registra?","answer":"458 empresas que já utilizaram a plataforma, 563 usuários, 1,08 milhão de oportunidades processadas, 776 mil mensagens e ações comerciais, ticket médio de R$ 577, 17% de conversão de trial para pago e 0% de churn registrado."},
    {"question":"Quais são as metas financeiras da Wiize?","answer":"Metas internas de MRR: R$ 50 mil em 2026, R$ 250 mil em 2027, R$ 1 milhão em 2028 e R$ 5 milhões em 2029 — equivalente a R$ 60 milhões de ARR anualizado. São projeções, não garantias."}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image_alt = EXCLUDED.cover_image_alt,
  author_name = EXCLUDED.author_name,
  author_bio = EXCLUDED.author_bio,
  category_id = EXCLUDED.category_id,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  reading_time_minutes = EXCLUDED.reading_time_minutes,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  canonical_url = EXCLUDED.canonical_url,
  ai_summary = EXCLUDED.ai_summary,
  ai_short_answer = EXCLUDED.ai_short_answer,
  ai_entities = EXCLUDED.ai_entities,
  ai_related_topics = EXCLUDED.ai_related_topics,
  faq = EXCLUDED.faq,
  updated_at = now();

-- 4) Vínculo post <-> tags ---------------------------------------------------
INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.blog_posts p
JOIN public.blog_tags t
  ON t.slug IN ('inteligencia-comercial','b2b','saas','investor-update','estrategia','ia-para-vendas')
WHERE p.slug = 'wiize-company-investor-update-2026'
ON CONFLICT DO NOTHING;

COMMIT;

-- URL final: https://wiize.com.br/blog/wiize-company-investor-update-2026
