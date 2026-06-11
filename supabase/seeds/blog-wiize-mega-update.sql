-- ============================================================================
-- 🚀 POST DO BLOG: Mega Atualização da Wiize + Novo Posicionamento
-- ----------------------------------------------------------------------------
-- ⚠️ ATENÇÃO: este SQL roda no banco EXTERNO do Blog (projeto Supabase do blog),
-- NÃO no Lovable Cloud. Cole-o no SQL Editor do projeto de blog.
--
-- Antes de rodar:
--   1) Faça upload da capa (ex.: /mnt/documents/wiize-mega-update-cover.jpg) no
--      bucket "blog-images" e copie a URL pública/assinada gerada.
--   2) Substitua o valor de cover_image_url abaixo (procure por <<COVER_URL>>).
--   3) Opcional: ajuste category_id se quiser vincular a uma categoria existente.
-- ============================================================================

INSERT INTO public.blog_posts (
  slug,
  title,
  subtitle,
  excerpt,
  content,
  cover_image_url,
  cover_image_alt,
  status,
  featured,
  published_at,
  reading_time_minutes,
  seo_title,
  seo_description,
  seo_keywords,
  ai_short_answer,
  ai_entities,
  faq
) VALUES (
  'wiize-mega-atualizacao-inteligencia-comercial-ia',
  'A Wiize Acabou de Mudar Para Sempre: a Era da Inteligência Comercial Assistida Por IA Começa Agora',
  'Mega atualização: chat oficial Meta no celular e PC, cockpit móvel, agentes de IA, fluxos otimizados, Wian IA no suporte e um novo posicionamento que redefine o que sua operação comercial pode ser.',
  'Conheça a mega atualização da Wiize: novo chat via Meta API Oficial (mobile + desktop), cockpit no celular, campanhas e fluxos com Meta API, Agente de IA atendendo seu número, Wian IA no suporte e o novo posicionamento da Wiize como plataforma de Inteligência Comercial Assistida por IA.',
  $HTML$
<p class="lead"><strong>Hoje a Wiize deixa de ser apenas mais uma ferramenta de vendas e se torna uma plataforma de Inteligência Comercial Assistida por Inteligência Artificial.</strong> Esta é a maior atualização da nossa história — e ela foi construída para um único objetivo: <em>aumentar a capacidade comercial da sua empresa sem precisar aumentar o tamanho do seu time</em>.</p>

<figure>
  <img src="<<COVER_URL>>" alt="Mega atualização da Wiize: Inteligência Comercial Assistida por IA" loading="eager" width="1600" height="900" />
  <figcaption>Wiize — Inteligência Comercial Assistida por IA</figcaption>
</figure>

<h2>O mercado mudou. A Wiize também.</h2>
<p>Encontrar mão de obra qualificada está cada vez mais difícil. Ao mesmo tempo, a pressão por gerar mais oportunidades e bater meta só aumenta. A resposta da maioria das empresas é contratar mais gente. A nossa resposta é outra: <strong>multiplicar a capacidade da equipe que você já tem</strong>, usando IA, automação e dados — de ponta a ponta.</p>

<blockquote>
  <p>A maioria das plataformas ajuda empresas a <em>controlar</em> vendas.<br/>
  A Wiize ajuda empresas a <strong>ampliar sua capacidade comercial</strong>.</p>
</blockquote>

<h2>🚀 O que chega nesta mega atualização</h2>

<h3>1. Novo Chat com Meta API Oficial — no celular e no PC</h3>
<p>Um chat completamente reconstruído sobre a <strong>WhatsApp Cloud API (Meta API Oficial)</strong>, com a mesma experiência fluida no desktop e no mobile. Conversas centralizadas, janela de 24h controlada de forma inteligente, templates HSM, anexos, colagem com <kbd>Ctrl</kbd>+<kbd>V</kbd>, drag &amp; drop e preview no estilo WhatsApp.</p>
<ul>
  <li>Conexão 100% oficial — sem risco de banimento.</li>
  <li>Mesma conversa no PC e no celular, em tempo real.</li>
  <li>Detecção automática de saudações, despedidas e intenção de compra.</li>
</ul>

<h3>2. Cockpit Mobile: sua operação na palma da mão</h3>
<p>O novo <strong>Painel Cockpit</strong> chega otimizado para o celular. Você acompanha receita projetada, oportunidades ativas, SLA de resposta, conversões por etapa e alertas executivos em tempo real — direto do bolso, com a mesma profundidade do desktop.</p>

<h3>3. Campanhas e Fluxos otimizados com Meta API Oficial</h3>
<p>Reescrevemos todo o motor de campanhas e fluxos para operar exclusivamente com números conectados via Meta API com webhook validado. Resultado:</p>
<ul>
  <li>Disparos mais estáveis, com limites e delays de segurança nativos.</li>
  <li>Fluxos com nós de <strong>Mensagem, Botões, Mídia, Agente IA, Espera, Gmail, Sheets e Calendar</strong> — todos compatíveis com a janela de 24h e templates de reabertura.</li>
  <li>Suporte a templates HSM para reativar conversas fora da janela automaticamente.</li>
</ul>

<h3>4. Agente de IA atendendo seu número</h3>
<p>Conecte um <strong>Agente de IA</strong> ao seu número Meta Oficial e deixe ele qualificar leads, responder dúvidas, agendar reuniões e mover o CRM sozinho — com handoff humano automático quando você responde manualmente. Cada agente segue regras de silenciamento, limites de mensagens e identifica estágio do funil.</p>

<h3>5. Wian IA no Suporte: sua copilota dentro da conta</h3>
<p><strong>Wian</strong> é a inteligência da Wiize que vive dentro da sua conta. Ela responde dúvidas, sugere melhorias na sua operação, abre chamados automaticamente quando detecta um bug e te guia em jornadas como warming, criação de fluxos e setup de campanhas. Suporte deixou de ser tickets — virou conversa inteligente.</p>

<h3>6. Sistema de Score e Engajamento 100% Meta</h3>
<p>Todo o cálculo de score e engajamento dos leads agora roda sobre os dados oficiais da Meta API: rodadas de conversa, SLA de resposta, decay temporal a cada 24h, detecção de intenção, saudações e despedidas — para qualificar leads com precisão de nível enterprise.</p>

<h2>🧭 Novo posicionamento: deixamos de ser CRM</h2>
<p>A Wiize não é mais um CRM. Não é mais uma ferramenta de disparos. Não é mais uma plataforma de automação isolada.</p>
<p><strong>A Wiize é uma plataforma de Inteligência Comercial Assistida por IA</strong> — construída para empresas que precisam vender mais sem depender de contratar mais gente.</p>

<h3>Antes da Wiize</h3>
<ul>
  <li>Muito trabalho manual</li>
  <li>Dependência de pessoas</li>
  <li>Processos desorganizados</li>
  <li>Baixa produtividade</li>
  <li>Pouca previsibilidade</li>
  <li>Crescimento limitado</li>
</ul>

<h3>Depois da Wiize</h3>
<ul>
  <li>Inteligência comercial aplicada ao dia a dia</li>
  <li>Automações que substituem tarefas repetitivas</li>
  <li>IA aplicada ao comercial — não só ao marketing</li>
  <li>Mais produtividade por pessoa</li>
  <li>Mais oportunidades qualificadas</li>
  <li>Mais previsibilidade e escalabilidade</li>
</ul>

<h2>🌎 Visão de longo prazo</h2>
<p>Acreditamos que o futuro das vendas será definido pela capacidade das empresas de combinar <strong>pessoas, processos e inteligência artificial</strong>. Nossa missão é liderar essa transformação na América Latina — tornando operações comerciais mais eficientes, escaláveis e previsíveis.</p>

<h2>🟢 E agora?</h2>
<p>Tudo isso já está sendo liberado para os clientes Wiize. Acesse sua conta, conecte seu número via Meta API Oficial e ative o cockpit, os fluxos e o agente de IA. A nova era da sua operação comercial começa hoje.</p>

<p><em>— Time Wiize</em></p>
$HTML$,
  '<<COVER_URL>>',
  'Mega atualização da Wiize — Inteligência Comercial Assistida por IA',
  'published',
  TRUE,
  NOW(),
  7,
  'Wiize: Mega Atualização e Nova Era da Inteligência Comercial com IA',
  'A Wiize lança chat Meta API Oficial (mobile + PC), cockpit no celular, campanhas e fluxos otimizados, Agente de IA, Wian no suporte e um novo posicionamento como plataforma de Inteligência Comercial Assistida por IA.',
  ARRAY[
    'wiize',
    'inteligência comercial',
    'inteligência artificial vendas',
    'meta api oficial',
    'whatsapp cloud api',
    'crm com ia',
    'automação comercial',
    'agente de ia whatsapp',
    'cockpit comercial',
    'prospecção b2b'
  ],
  'A Wiize lançou sua maior atualização: chat e campanhas via Meta API Oficial (celular e PC), cockpit mobile, Agente de IA atendendo seu número, Wian IA no suporte e um novo posicionamento como plataforma de Inteligência Comercial Assistida por IA, focada em ampliar a capacidade comercial sem aumentar o time.',
  ARRAY[
    'Wiize',
    'Inteligência Comercial Assistida',
    'Meta API Oficial',
    'WhatsApp Cloud API',
    'Agente de IA',
    'Wian IA',
    'Cockpit Comercial',
    'CRM com IA',
    'Automação de Vendas',
    'Prospecção B2B'
  ],
  '[
    {
      "question": "O que é a Wiize hoje?",
      "answer": "A Wiize é uma plataforma de Inteligência Comercial Assistida por Inteligência Artificial. Ela combina IA, prospecção inteligente, automações, CRM e WhatsApp via Meta API Oficial para ampliar a capacidade comercial das empresas sem que elas precisem aumentar o time proporcionalmente."
    },
    {
      "question": "O que muda com a nova atualização?",
      "answer": "Chega um novo chat via Meta API Oficial (mobile e desktop), um cockpit otimizado para celular, campanhas e fluxos reescritos para Meta API, Agente de IA atendendo seu número, Wian IA no suporte dentro da conta e um sistema de score de leads 100% baseado em dados oficiais da Meta."
    },
    {
      "question": "A Wiize ainda é um CRM?",
      "answer": "A Wiize deixou de se posicionar como CRM. Ela continua tendo todas as funcionalidades de CRM, mas agora se posiciona como plataforma de Inteligência Comercial Assistida por IA — porque vai além: prospecta, automatiza, qualifica, atende e prevê resultados."
    },
    {
      "question": "Por que usar Meta API Oficial e não Evolution ou outras?",
      "answer": "A Meta API Oficial garante estabilidade, evita banimentos, libera templates HSM aprovados, suporta webhook em tempo real e permite operar campanhas e atendimentos em escala com segurança. Toda a operação de chat, campanhas e fluxos da Wiize agora roda nessa base."
    },
    {
      "question": "Quem é a Wian IA?",
      "answer": "Wian é a inteligência da Wiize que vive dentro da sua conta. Ela responde dúvidas, sugere melhorias na operação, ajuda em dificuldades, abre chamados quando detecta bugs e te guia em jornadas como criar fluxos, campanhas e configurar warming."
    },
    {
      "question": "Como o Agente de IA atende meu número?",
      "answer": "Você conecta seu número via Meta API Oficial, configura um Agente de IA com instruções e regras de negócio, e ele passa a responder leads automaticamente — qualificando, agendando, movendo CRM e silenciando assim que você responde manualmente, com handoff humano automático."
    }
  ]'::jsonb
);
