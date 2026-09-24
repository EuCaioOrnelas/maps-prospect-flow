-- ============================================================================
-- BLOG WIIZE — 3 PUBLICAÇÕES DE VENDA, SEO E GEO (RASCUNHOS)
-- Criado em 2026-09-24
--
-- Temas:
-- 1) Como prospectar clientes B2B com a Wiize
-- 2) Como automatizar o atendimento no WhatsApp com a Wiize
-- 3) Como criar um vendedor com IA que atua 24 horas por dia
--
-- Todos os artigos:
-- - entram como 'draft';
-- - ficam sem capa para inclusão posterior no Admin > Blog;
-- - incluem espaços visuais para prints de referência;
-- - possuem SEO, GEO, respostas diretas, entidades, tópicos e FAQ;
-- - são idempotentes: uma nova execução atualiza o mesmo slug, sem duplicar.
--
-- IMPORTANTE: revise os prints e o texto final no Admin > Blog antes de publicar.
-- ============================================================================

BEGIN;

-- Categoria compartilhada -----------------------------------------------------
INSERT INTO public.blog_categories (name, slug, description, color, sort_order)
VALUES (
  'Vendas e Automação',
  'vendas-e-automacao',
  'Guias práticos de prospecção B2B, atendimento no WhatsApp, CRM, automação e inteligência artificial para vendas.',
  '#16a34a',
  20
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Tags compartilhadas ---------------------------------------------------------
INSERT INTO public.blog_tags (name, slug) VALUES
  ('Prospecção B2B', 'prospeccao-b2b'),
  ('Automação no WhatsApp', 'automacao-whatsapp'),
  ('SDR Inteligente', 'sdr-inteligente'),
  ('IA para Vendas', 'ia-para-vendas'),
  ('CRM', 'crm'),
  ('Wiize', 'wiize')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- POST 1 — COMO PROSPECTAR CLIENTES B2B
-- Palavra-chave principal: prospecção B2B
-- Intenção: guia prático + solução comercial
-- ============================================================================
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt,
  author_name, author_bio, category_id,
  status, featured, published_at, scheduled_for, reading_time_minutes,
  seo_title, seo_description, seo_keywords, canonical_url,
  robots_index, robots_follow, og_image_url,
  ai_summary, ai_short_answer, ai_entities, ai_related_topics, ai_questions, faq
)
VALUES (
  'como-prospectar-clientes-b2b-passo-a-passo-wiize',
  'Como prospectar clientes B2B: passo a passo para encontrar, analisar e abordar empresas com a Wiize',
  'Um guia prático para definir o perfil ideal, buscar empresas, analisar oportunidades com IA, organizar os leads no CRM e preparar abordagens mais contextualizadas.',
  'Aprenda como fazer prospecção B2B passo a passo com a Wiize: crie sua conta, configure o perfil da empresa, encontre oportunidades na web, analise leads com IA e organize a abordagem no CRM.',
  $POST1$
<style>
.wz-guide{--line:hsl(var(--border));--muted:hsl(var(--muted-foreground));--card:hsl(var(--card));--primary:hsl(var(--primary));line-height:1.75}.wz-guide h2{margin-top:2.6rem}.wz-guide h3{margin-top:1.8rem}.wz-guide .lead{font-size:1.1rem}.wz-guide .answer{border-left:4px solid var(--primary);padding:1rem 1.2rem;background:var(--card);margin:1.5rem 0}.wz-guide .step{border:1px solid var(--line);padding:1.25rem;margin:1rem 0;border-radius:8px}.wz-guide .step strong{display:block;margin-bottom:.35rem}.wz-guide .shot{border:2px dashed var(--line);padding:2.25rem 1rem;text-align:center;color:var(--muted);margin:1.5rem 0;border-radius:8px}.wz-guide .cta{border:1px solid var(--line);padding:1.5rem;margin:2rem 0;border-radius:8px;background:var(--card)}.wz-guide table{width:100%;border-collapse:collapse}.wz-guide th,.wz-guide td{border:1px solid var(--line);padding:.75rem;text-align:left}
</style>
<article class="wz-guide">
<p class="lead"><strong>Prospecção B2B é o processo de identificar empresas com perfil para comprar sua solução, analisar o contexto de cada oportunidade e iniciar uma conversa comercial relevante.</strong> Na Wiize, busca, análise, abordagem e gestão acontecem em uma mesma operação, reduzindo planilhas, pesquisas manuais e contatos sem contexto.</p>

<div class="answer"><strong>Resposta rápida:</strong> para prospectar clientes B2B, defina seu perfil de cliente ideal, escolha segmento e localização, encontre empresas compatíveis, analise sinais reais do negócio, priorize as melhores oportunidades e faça uma abordagem personalizada. A Wiize reúne essas etapas em um fluxo conectado ao CRM.</div>

<h2>O que é prospecção B2B?</h2>
<p>Prospecção B2B é a busca ativa por empresas que podem se beneficiar do que outra empresa vende. Diferente de uma lista genérica, uma boa prospecção considera segmento, região, porte, presença digital, necessidade provável e aderência à oferta. O objetivo não é falar com o maior número possível de pessoas, mas encontrar empresas relevantes e iniciar conversas com contexto.</p>

<h2>Como prospectar clientes B2B em 7 etapas</h2>
<ol>
  <li>Defina o perfil de empresa que você deseja atender.</li>
  <li>Escolha o segmento e a região da busca.</li>
  <li>Encontre empresas com presença empresarial válida.</li>
  <li>Analise os dados públicos e o contexto de cada lead.</li>
  <li>Priorize as oportunidades mais alinhadas.</li>
  <li>Crie uma abordagem personalizada e sem afirmações inventadas.</li>
  <li>Acompanhe cada conversa e avanço no CRM.</li>
</ol>

<h2>Passo a passo: como fazer prospecção B2B na Wiize</h2>

<div class="step"><strong>Passo 1 — Crie sua conta na Wiize</strong><p>Acesse a Wiize, clique em <em>Criar conta</em> e escolha o plano adequado à sua operação. Conclua o cadastro e entre na plataforma. Antes de iniciar uma busca, tenha clareza sobre o que sua empresa vende e quais empresas pretende atender.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 1</strong><br>Print sugerido: tela de criação da conta ou escolha do plano<br>Alt sugerido: “Criar conta na Wiize para iniciar a prospecção B2B”</div>

<div class="step"><strong>Passo 2 — Configure o Perfil da Empresa</strong><p>No primeiro acesso à área de Prospecção, preencha o <em>Perfil da Empresa</em>. Informe o nome da empresa, como ela atua, o que vende, para quem vende e qual é o objetivo comercial. Esse contexto ajuda a IA a separar corretamente quem está vendendo de quem está sendo prospectado.</p></div>
<p><strong>Dica:</strong> descreva sua proposta com precisão. Em vez de “vendemos tecnologia”, explique qual solução oferece, para qual tipo de empresa e qual problema ela ajuda a resolver.</p>

<div class="step"><strong>Passo 3 — Abra Prospecção &gt; Prospecção Web</strong><p>No menu lateral, clique em <em>Prospecção</em> e depois em <em>Prospecção Web</em>. Essa área localiza sites empresariais e extrai os contatos públicos disponíveis, removendo redes sociais, diretórios, marketplaces e duplicidades da pesquisa.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 2</strong><br>Print sugerido: menu Prospecção aberto com “Prospecção Web” destacado<br>Alt sugerido: “Menu Prospecção Web da Wiize para encontrar clientes B2B”</div>

<div class="step"><strong>Passo 4 — Escreva o que deseja buscar</strong><p>No campo <em>O que você quer buscar</em>, escreva como pesquisaria no Google. Exemplo: “clínicas odontológicas em Curitiba PR”. A localização é opcional e pode ser usada para direcionar a pesquisa a uma região específica.</p></div>

<div class="step"><strong>Passo 5 — Clique em Buscar Oportunidades</strong><p>Revise o segmento e a localização e clique em <em>Buscar Oportunidades</em>. A Wiize pesquisa sites empresariais, verifica os resultados e analisa os contatos públicos encontrados. A busca pode levar alguns minutos porque cada site válido é processado individualmente.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 3</strong><br>Print sugerido: formulário com nicho, localização e botão “Buscar Oportunidades”<br>Alt sugerido: “Busca de oportunidades B2B por segmento e localização na Wiize”</div>

<div class="step"><strong>Passo 6 — Acesse Prospecção &gt; Gestão</strong><p>Depois da busca, abra <em>Prospecção</em> e clique em <em>Gestão</em>. Revise as empresas encontradas, os dados coletados e os sinais apresentados. Use o contexto real disponível para decidir quais oportunidades fazem sentido para sua oferta.</p></div>

<div class="step"><strong>Passo 7 — Gere uma abordagem contextualizada</strong><p>Selecione a oportunidade e use a geração de abordagem para preparar uma mensagem coerente com o perfil da sua empresa e com os dados reais do lead. Revise o texto antes de usar. A mensagem deve explicar por que o contato faz sentido, sem inventar problemas, resultados ou características que não foram confirmadas.</p></div>

<div class="step"><strong>Passo 8 — Organize o acompanhamento no CRM</strong><p>Leve a oportunidade para o CRM, registre interações e acompanhe a evolução da conversa. A centralização ajuda a equipe a saber quem já foi contatado, qual foi a resposta e qual é o próximo passo.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 4</strong><br>Print sugerido: Gestão de Oportunidades ou card do lead no CRM<br>Alt sugerido: “Gestão de oportunidades B2B e acompanhamento no CRM Wiize”</div>

<h2>Exemplo de prospecção B2B</h2>
<p>Imagine uma empresa que oferece internet corporativa e deseja prospectar academias em Curitiba. Ela configura o próprio perfil como fornecedora de conectividade, busca “academias em Curitiba PR”, revisa empresas encontradas e prioriza as que combinam com sua área de atendimento. Na abordagem, usa apenas o segmento, a localização e os dados públicos confirmados para iniciar uma conversa sobre continuidade operacional, sem afirmar que a academia enfrenta lentidão ou falhas.</p>

<h2>Prospecção B2B manual x prospecção com a Wiize</h2>
<table>
<thead><tr><th>Etapa</th><th>Processo manual</th><th>Com a Wiize</th></tr></thead>
<tbody>
<tr><td>Busca</td><td>Pesquisas separadas e listas manuais</td><td>Busca de oportunidades por segmento e região</td></tr>
<tr><td>Análise</td><td>Visita individual a cada fonte</td><td>Dados e sinais organizados por oportunidade</td></tr>
<tr><td>Abordagem</td><td>Textos genéricos ou copiados</td><td>Mensagem criada com o perfil da empresa e contexto do lead</td></tr>
<tr><td>Gestão</td><td>Planilhas e históricos dispersos</td><td>Oportunidades e conversas conectadas ao CRM</td></tr>
</tbody>
</table>

<h2>Boas práticas para conquistar clientes B2B</h2>
<ul>
  <li>Comece por um segmento específico e uma região realista.</li>
  <li>Use somente informações confirmadas sobre a empresa prospectada.</li>
  <li>Explique a relação entre o contexto observado e o motivo do contato.</li>
  <li>Evite transformar a primeira mensagem em catálogo ou proposta completa.</li>
  <li>Registre respostas, objeções e próximos passos no CRM.</li>
  <li>Respeite a LGPD e utilize dados públicos de forma legítima e compatível com a finalidade comercial B2B.</li>
</ul>

<h2>Por que usar a Wiize para prospecção B2B?</h2>
<p>A Wiize conecta descoberta, análise, inteligência artificial, mensagens e CRM. Isso permite que uma equipe comercial trabalhe com mais contexto e organização, sem depender de várias ferramentas desconectadas. O ganho está na qualidade do processo: encontrar empresas aderentes, entender cada oportunidade e acompanhar a conversa até o próximo passo.</p>

<div class="cta"><h2>Comece sua prospecção B2B com a Wiize</h2><p>Crie sua conta, configure o Perfil da Empresa e faça sua primeira busca em <em>Prospecção Web</em>.</p><p><a href="/signup/escolher-plano"><strong>Criar minha conta na Wiize</strong></a></p></div>
</article>
$POST1$,
  NULL,
  'Como prospectar clientes B2B passo a passo usando a Wiize',
  'Wian',
  'Equipe de conteúdo da Wiize, plataforma de inteligência comercial B2B, CRM, automação e IA para vendas.',
  (SELECT id FROM public.blog_categories WHERE slug = 'vendas-e-automacao' LIMIT 1),
  'draft', false, NULL, NULL, 11,
  'Prospecção B2B: como conquistar clientes com a Wiize',
  'Aprenda como prospectar clientes B2B: encontre empresas, analise oportunidades com IA, personalize abordagens e acompanhe tudo no CRM da Wiize.',
  ARRAY['prospecção b2b','como prospectar clientes b2b','prospecção de clientes','prospecção de empresas','geração de leads b2b','prospecção ativa','inteligência comercial','crm b2b','wiize'],
  'https://wiize.com.br/blog/como-prospectar-clientes-b2b-passo-a-passo-wiize',
  true, true, NULL,
  'Guia prático de prospecção B2B com a Wiize. Explica como criar a conta, configurar o perfil comercial, acessar Prospecção Web, buscar empresas por segmento e localização, revisar oportunidades na Gestão, gerar abordagens contextualizadas e acompanhar os leads no CRM. Reforça o uso de dados públicos, a revisão humana e o respeito à LGPD.',
  'Para prospectar clientes B2B, defina o perfil ideal, busque empresas por segmento e região, analise dados reais, priorize oportunidades, faça abordagens contextualizadas e acompanhe tudo no CRM. Na Wiize, o processo começa em Prospecção > Prospecção Web e continua em Prospecção > Gestão.',
  ARRAY['Wiize','prospecção B2B','Prospecção Web','Gestão de Oportunidades','CRM','inteligência artificial para vendas','LGPD','perfil de cliente ideal'],
  ARRAY['prospecção ativa','geração de leads B2B','abordagem comercial','qualificação de leads','CRM para vendas','inteligência comercial'],
  '["O que é prospecção B2B?","Como prospectar clientes B2B?","Como usar a Wiize para encontrar empresas?","Como personalizar uma abordagem comercial B2B?","Como organizar leads no CRM?"]'::jsonb,
  '[
    {"question":"O que é prospecção B2B?","answer":"É o processo de identificar empresas com perfil para comprar uma solução, analisar seu contexto e iniciar uma conversa comercial relevante. O foco está em organizações, e não em consumidores finais."},
    {"question":"Como prospectar clientes B2B na Wiize?","answer":"Crie sua conta, configure o Perfil da Empresa, abra Prospecção > Prospecção Web, informe o segmento e a região, clique em Buscar Oportunidades e revise os resultados em Prospecção > Gestão."},
    {"question":"A Wiize cria mensagens de prospecção?","answer":"Sim. A Wiize pode gerar uma abordagem considerando o perfil de quem vende e os dados disponíveis sobre a empresa prospectada. O texto deve ser revisado antes do uso e não deve apresentar como fato algo que não foi confirmado."},
    {"question":"É possível organizar os leads encontrados no CRM?","answer":"Sim. As oportunidades podem ser acompanhadas no CRM, onde a equipe registra interações, respostas, etapas e próximos passos."},
    {"question":"Prospecção B2B precisa respeitar a LGPD?","answer":"Sim. Dados públicos também devem ser tratados com finalidade legítima, necessidade, transparência e segurança. A empresa deve avaliar sua base legal e respeitar os direitos dos titulares."},
    {"question":"Qual a diferença entre lista de contatos e prospecção B2B?","answer":"Uma lista reúne dados. A prospecção B2B inclui definição de perfil, pesquisa, análise, priorização, abordagem contextualizada e acompanhamento comercial."}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, excerpt=EXCLUDED.excerpt,
  content=EXCLUDED.content, cover_image_alt=EXCLUDED.cover_image_alt,
  author_name=EXCLUDED.author_name, author_bio=EXCLUDED.author_bio,
  category_id=EXCLUDED.category_id, status='draft', featured=EXCLUDED.featured,
  published_at=NULL, scheduled_for=NULL, reading_time_minutes=EXCLUDED.reading_time_minutes,
  seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description,
  seo_keywords=EXCLUDED.seo_keywords, canonical_url=EXCLUDED.canonical_url,
  robots_index=EXCLUDED.robots_index, robots_follow=EXCLUDED.robots_follow,
  ai_summary=EXCLUDED.ai_summary, ai_short_answer=EXCLUDED.ai_short_answer,
  ai_entities=EXCLUDED.ai_entities, ai_related_topics=EXCLUDED.ai_related_topics,
  ai_questions=EXCLUDED.ai_questions, faq=EXCLUDED.faq, updated_at=now();

-- ============================================================================
-- POST 2 — COMO AUTOMATIZAR ATENDIMENTO NO WHATSAPP
-- Palavra-chave principal: automatizar atendimento WhatsApp
-- ============================================================================
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt,
  author_name, author_bio, category_id,
  status, featured, published_at, scheduled_for, reading_time_minutes,
  seo_title, seo_description, seo_keywords, canonical_url,
  robots_index, robots_follow, og_image_url,
  ai_summary, ai_short_answer, ai_entities, ai_related_topics, ai_questions, faq
)
VALUES (
  'como-automatizar-atendimento-whatsapp-passo-a-passo-wiize',
  'Como automatizar o atendimento no WhatsApp: passo a passo para criar fluxos com a Wiize',
  'Conecte um número pela API Oficial da Meta, crie um fluxo, organize mensagens e decisões e encaminhe a conversa para o time quando necessário.',
  'Veja como automatizar o atendimento no WhatsApp com a Wiize: conecte a Meta API Oficial, crie fluxos, use mensagens, botões, espera e IA e publique sua automação com segurança.',
  $POST2$
<style>
.wz-guide{--line:hsl(var(--border));--muted:hsl(var(--muted-foreground));--card:hsl(var(--card));--primary:hsl(var(--primary));line-height:1.75}.wz-guide h2{margin-top:2.6rem}.wz-guide h3{margin-top:1.8rem}.wz-guide .lead{font-size:1.1rem}.wz-guide .answer{border-left:4px solid var(--primary);padding:1rem 1.2rem;background:var(--card);margin:1.5rem 0}.wz-guide .step{border:1px solid var(--line);padding:1.25rem;margin:1rem 0;border-radius:8px}.wz-guide .step strong{display:block;margin-bottom:.35rem}.wz-guide .shot{border:2px dashed var(--line);padding:2.25rem 1rem;text-align:center;color:var(--muted);margin:1.5rem 0;border-radius:8px}.wz-guide .cta{border:1px solid var(--line);padding:1.5rem;margin:2rem 0;border-radius:8px;background:var(--card)}.wz-guide table{width:100%;border-collapse:collapse}.wz-guide th,.wz-guide td{border:1px solid var(--line);padding:.75rem;text-align:left}
</style>
<article class="wz-guide">
<p class="lead"><strong>Automatizar o atendimento no WhatsApp significa organizar respostas e ações que acontecem automaticamente quando um contato entra em uma jornada definida pela empresa.</strong> Com a Wiize, fluxos podem combinar mensagens, botões, condições, espera, coleta de dados, IA e encaminhamento humano usando um número conectado pela API Oficial da Meta.</p>

<div class="answer"><strong>Resposta rápida:</strong> para automatizar o atendimento no WhatsApp com a Wiize, conecte um número oficial da Meta, abra <em>Fluxos</em>, escolha <em>Criar novo fluxo</em>, <em>Usar template</em> ou <em>Criar com IA</em>, monte as etapas, teste a jornada e publique. Fora da janela de 24 horas, use um template aprovado pela Meta.</div>

<h2>O que é automação de atendimento no WhatsApp?</h2>
<p>É o uso de regras e etapas para responder, coletar informações, direcionar assuntos e executar tarefas sem depender de uma ação manual em cada mensagem. A automação não precisa eliminar o atendimento humano. Ela pode cuidar das etapas repetitivas e transferir a conversa para uma pessoa quando o caso exigir análise, negociação ou suporte específico.</p>

<h2>O que pode ser automatizado?</h2>
<ul>
  <li>Mensagem inicial e identificação do assunto.</li>
  <li>Respostas rápidas por botões.</li>
  <li>Coleta de nome, empresa, necessidade e outras informações.</li>
  <li>Qualificação inicial de contatos B2B.</li>
  <li>Distribuição da conversa para o responsável adequado.</li>
  <li>Espera entre etapas e respeito ao horário comercial.</li>
  <li>Atualizações no CRM e integração com etapas da operação.</li>
  <li>Interação com Agente de IA e passagem para atendimento humano.</li>
</ul>

<h2>Antes de começar: use a API Oficial da Meta</h2>
<p>Os fluxos da Wiize funcionam com números conectados pela API Oficial da Meta e com webhook verificado. Essa conexão permite que mensagens recebidas e enviadas sejam processadas pela automação e registradas corretamente.</p>
<p><strong>Regra importante:</strong> quando o contato envia uma mensagem, abre-se uma janela de atendimento de 24 horas. Dentro dela, a empresa pode responder livremente. Para iniciar ou retomar uma conversa fora dessa janela, a Meta exige um template previamente aprovado.</p>

<h2>Passo a passo: como automatizar o WhatsApp na Wiize</h2>

<div class="step"><strong>Passo 1 — Crie sua conta e acesse a Wiize</strong><p>Crie sua conta, escolha um plano compatível com sua operação e conclua o acesso. Dentro da plataforma, você encontrará as áreas de Meta, Chat, CRM e Fluxos.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 1</strong><br>Print sugerido: tela inicial da Wiize com menu lateral<br>Alt sugerido: “Painel da Wiize com CRM, Chat, Meta e Fluxos”</div>

<div class="step"><strong>Passo 2 — Conecte o número oficial</strong><p>Acesse a configuração do WhatsApp Oficial e conecte o número da empresa pela Meta API Oficial. Conclua a configuração e confirme que o webhook está verificado. Sem um número elegível, o fluxo não poderá ser ativado.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 2</strong><br>Print sugerido: configuração de número Meta API Oficial<br>Alt sugerido: “Conectar número de WhatsApp pela Meta API Oficial na Wiize”</div>

<div class="step"><strong>Passo 3 — Clique em Fluxos</strong><p>No menu lateral, abra <em>Fluxos</em>. A página <em>Fluxos de Automação</em> mostra os fluxos criados e oferece três caminhos: <em>Criar novo fluxo</em>, <em>Usar template</em> ou <em>Criar com IA</em>.</p></div>

<div class="step"><strong>Passo 4 — Escolha como começar</strong><p>Use <em>Criar novo fluxo</em> para montar tudo do zero. Escolha <em>Usar template</em> para partir de uma estrutura pronta. Se preferir descrever o processo em palavras, clique em <em>Criar com IA</em> e revise a estrutura gerada antes de ativar.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 3</strong><br>Print sugerido: botões “Criar novo fluxo”, “Usar template” e “Criar com IA”<br>Alt sugerido: “Opções para criar fluxo de automação no WhatsApp com a Wiize”</div>

<div class="step"><strong>Passo 5 — Defina o gatilho</strong><p>No editor, escolha como a jornada começa. O gatilho deve representar o evento real que inicia o atendimento, como a entrada do contato em um processo configurado ou uma interação prevista pela operação.</p></div>

<div class="step"><strong>Passo 6 — Adicione as etapas da conversa</strong><p>Monte o fluxo com os blocos necessários. Use mensagens para orientar, botões para oferecer escolhas claras, condições para separar caminhos, espera para controlar o tempo e ações de CRM para manter os dados organizados.</p></div>

<div class="step"><strong>Passo 7 — Configure a intervenção humana</strong><p>Defina em quais situações a automação deve parar e encaminhar a conversa. Um pedido explícito para falar com uma pessoa, uma dúvida não coberta ou uma negociação sensível são exemplos de pontos adequados para atendimento humano.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 4</strong><br>Print sugerido: editor visual com gatilho, mensagem, condição e atendimento humano<br>Alt sugerido: “Editor visual de fluxo de atendimento no WhatsApp da Wiize”</div>

<div class="step"><strong>Passo 8 — Revise templates e a janela de 24 horas</strong><p>Se alguma etapa precisar enviar mensagem fora da janela de atendimento, selecione um template aprovado na Meta. Não use uma mensagem comum onde a política exige template. Revise também consentimento, frequência e relevância do contato.</p></div>

<div class="step"><strong>Passo 9 — Teste antes de publicar</strong><p>Simule caminhos diferentes: uma resposta esperada, uma resposta inválida, ausência de resposta e pedido de atendimento humano. Confirme se os dados chegam ao local correto e se nenhuma etapa deixa a pessoa sem saída.</p></div>

<div class="step"><strong>Passo 10 — Publique e acompanhe</strong><p>Depois de revisar, publique o fluxo. Acompanhe as conversas no Chat e os contatos no CRM. Ajuste mensagens e caminhos com base em dúvidas reais, abandonos e solicitações que chegam ao time.</p></div>

<h2>Exemplo de fluxo de atendimento automatizado</h2>
<ol>
  <li>O contato inicia a conversa.</li>
  <li>A Wiize apresenta opções de assunto.</li>
  <li>O contato escolhe “Comercial” ou “Suporte”.</li>
  <li>O fluxo coleta as informações necessárias.</li>
  <li>O CRM é atualizado com o contexto.</li>
  <li>A conversa segue automaticamente ou é encaminhada para uma pessoa.</li>
</ol>

<h2>Automação simples x automação conectada à operação</h2>
<table>
<thead><tr><th>Automação isolada</th><th>Automação com a Wiize</th></tr></thead>
<tbody>
<tr><td>Responde sem histórico comercial</td><td>Conecta conversa, lead e CRM</td></tr>
<tr><td>Fluxos sem contexto de equipe</td><td>Permite passagem para atendimento humano</td></tr>
<tr><td>Dados espalhados</td><td>Informações organizadas na operação</td></tr>
<tr><td>Retomadas sem controle</td><td>Uso de templates aprovados fora da janela de 24h</td></tr>
</tbody>
</table>

<h2>Boas práticas para automatizar sem prejudicar a experiência</h2>
<ul>
  <li>Deixe as opções curtas e fáceis de entender.</li>
  <li>Nunca esconda a possibilidade de atendimento humano.</li>
  <li>Não repita a mesma pergunta quando a informação já foi coletada.</li>
  <li>Use templates aprovados quando a janela de 24 horas estiver fechada.</li>
  <li>Respeite consentimento, privacidade e regras da Meta.</li>
  <li>Revise o fluxo sempre que produtos, horários ou processos mudarem.</li>
</ul>

<h2>Por que automatizar o atendimento com a Wiize?</h2>
<p>A Wiize reúne Meta API Oficial, Chat, CRM, Fluxos e IA no mesmo ambiente. A automação deixa de ser apenas uma sequência de respostas e passa a fazer parte da operação: coleta contexto, organiza o lead e aciona a pessoa certa quando necessário.</p>

<div class="cta"><h2>Crie seu primeiro fluxo de atendimento</h2><p>Conecte seu número oficial, abra <em>Fluxos</em> e escolha a melhor forma de começar.</p><p><a href="/signup/escolher-plano"><strong>Criar minha conta na Wiize</strong></a></p></div>
</article>
$POST2$,
  NULL,
  'Como automatizar o atendimento no WhatsApp com fluxos da Wiize',
  'Wian',
  'Equipe de conteúdo da Wiize, plataforma de inteligência comercial B2B, CRM, automação e IA para vendas.',
  (SELECT id FROM public.blog_categories WHERE slug = 'vendas-e-automacao' LIMIT 1),
  'draft', false, NULL, NULL, 11,
  'Como automatizar atendimento no WhatsApp | Wiize',
  'Veja como automatizar o atendimento no WhatsApp com fluxos, CRM, IA e Meta API Oficial. Aprenda o passo a passo para configurar na Wiize.',
  ARRAY['automatizar atendimento whatsapp','automação de atendimento whatsapp','como automatizar atendimento no whatsapp','automação whatsapp business','fluxo de automação whatsapp','chatbot whatsapp','meta api oficial','whatsapp cloud api','crm whatsapp','wiize'],
  'https://wiize.com.br/blog/como-automatizar-atendimento-whatsapp-passo-a-passo-wiize',
  true, true, NULL,
  'Guia sobre automação de atendimento no WhatsApp com a Wiize. Explica o conceito, pré-requisito de número conectado pela Meta API Oficial, criação de fluxo do zero, por template ou com IA, configuração de gatilhos e etapas, intervenção humana, regra da janela de 24 horas, testes e publicação.',
  'Para automatizar o atendimento no WhatsApp com a Wiize, conecte um número pela Meta API Oficial, acesse Fluxos, escolha criar do zero, usar template ou criar com IA, configure as etapas, teste todos os caminhos e publique. Fora da janela de 24 horas, use template aprovado.',
  ARRAY['Wiize','WhatsApp Business Platform','Meta API Oficial','WhatsApp Cloud API','Fluxos de Automação','CRM','Chat','Agente de IA','janela de 24 horas','template de mensagem'],
  ARRAY['automação de atendimento','chatbot para WhatsApp','fluxo conversacional','atendimento humano','CRM integrado ao WhatsApp','templates Meta'],
  '["Como automatizar o atendimento no WhatsApp?","Como criar um fluxo de WhatsApp na Wiize?","Preciso da API Oficial da Meta?","O que é a janela de 24 horas?","Quando usar atendimento humano?"]'::jsonb,
  '[
    {"question":"Como automatizar o atendimento no WhatsApp?","answer":"Conecte um número oficial, defina o gatilho, organize mensagens e decisões em um fluxo, configure a passagem para uma pessoa, teste os caminhos e publique. Na Wiize, isso é feito na área Fluxos."},
    {"question":"A Wiize usa a API Oficial da Meta nos fluxos?","answer":"Sim. Os fluxos funcionam com números conectados pela API Oficial da Meta e com webhook verificado."},
    {"question":"Posso criar uma automação de WhatsApp com IA?","answer":"Sim. Na área Fluxos, a Wiize oferece a opção Criar com IA. A estrutura gerada deve ser revisada e testada antes da publicação."},
    {"question":"O atendimento humano continua disponível?","answer":"Sim. O fluxo pode incluir encaminhamento para uma pessoa. Isso é recomendado em negociações, dúvidas não previstas e quando o contato pede atendimento humano."},
    {"question":"Posso enviar qualquer mensagem fora da janela de 24 horas?","answer":"Não. Fora da janela de 24 horas aberta pela última mensagem do contato, a Meta exige um template previamente aprovado para iniciar ou retomar a conversa."},
    {"question":"O fluxo pode atualizar o CRM?","answer":"Sim. A automação pode fazer parte da operação conectada ao CRM, mantendo dados e contexto do contato organizados conforme as etapas configuradas."}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, excerpt=EXCLUDED.excerpt,
  content=EXCLUDED.content, cover_image_alt=EXCLUDED.cover_image_alt,
  author_name=EXCLUDED.author_name, author_bio=EXCLUDED.author_bio,
  category_id=EXCLUDED.category_id, status='draft', featured=EXCLUDED.featured,
  published_at=NULL, scheduled_for=NULL, reading_time_minutes=EXCLUDED.reading_time_minutes,
  seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description,
  seo_keywords=EXCLUDED.seo_keywords, canonical_url=EXCLUDED.canonical_url,
  robots_index=EXCLUDED.robots_index, robots_follow=EXCLUDED.robots_follow,
  ai_summary=EXCLUDED.ai_summary, ai_short_answer=EXCLUDED.ai_short_answer,
  ai_entities=EXCLUDED.ai_entities, ai_related_topics=EXCLUDED.ai_related_topics,
  ai_questions=EXCLUDED.ai_questions, faq=EXCLUDED.faq, updated_at=now();

-- ============================================================================
-- POST 3 — VENDEDOR COM IA / AGENTE DE IA PARA VENDAS
-- Palavra-chave principal: agente de IA para vendas
-- ============================================================================
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt,
  author_name, author_bio, category_id,
  status, featured, published_at, scheduled_for, reading_time_minutes,
  seo_title, seo_description, seo_keywords, canonical_url,
  robots_index, robots_follow, og_image_url,
  ai_summary, ai_short_answer, ai_entities, ai_related_topics, ai_questions, faq
)
VALUES (
  'vendedor-com-ia-como-criar-sdr-inteligente-24-horas-wiize',
  'Vendedor com IA: como criar um SDR Inteligente que atende leads 24 horas por dia com a Wiize',
  'Configure objetivo, canais, ativação, forma de conversar, estratégia, empresa, produtos, materiais, encerramento e regras para seu agente comercial de IA.',
  'Aprenda como criar um vendedor com IA na Wiize: configure um SDR Inteligente para responder, qualificar e conduzir leads no WhatsApp a qualquer hora, com regras e atendimento humano.',
  $POST3$
<style>
.wz-guide{--line:hsl(var(--border));--muted:hsl(var(--muted-foreground));--card:hsl(var(--card));--primary:hsl(var(--primary));line-height:1.75}.wz-guide h2{margin-top:2.6rem}.wz-guide h3{margin-top:1.8rem}.wz-guide .lead{font-size:1.1rem}.wz-guide .answer{border-left:4px solid var(--primary);padding:1rem 1.2rem;background:var(--card);margin:1.5rem 0}.wz-guide .step{border:1px solid var(--line);padding:1.25rem;margin:1rem 0;border-radius:8px}.wz-guide .step strong{display:block;margin-bottom:.35rem}.wz-guide .shot{border:2px dashed var(--line);padding:2.25rem 1rem;text-align:center;color:var(--muted);margin:1.5rem 0;border-radius:8px}.wz-guide .cta{border:1px solid var(--line);padding:1.5rem;margin:2rem 0;border-radius:8px;background:var(--card)}.wz-guide table{width:100%;border-collapse:collapse}.wz-guide th,.wz-guide td{border:1px solid var(--line);padding:.75rem;text-align:left}
</style>
<article class="wz-guide">
<p class="lead"><strong>Um vendedor com IA é um agente comercial configurado para interpretar mensagens, responder dúvidas, qualificar oportunidades, conduzir a conversa até um objetivo e encaminhar o lead para uma pessoa quando necessário.</strong> Na Wiize, esse recurso é chamado de <em>SDR Inteligente</em> e pode atuar no WhatsApp em horários nos quais a equipe não está disponível, conforme as regras e canais configurados.</p>

<div class="answer"><strong>Resposta rápida:</strong> para criar um vendedor com IA na Wiize, acesse <em>Prospecção &gt; SDR Inteligente</em>, clique em <em>Criar novo SDR</em> e conclua as 12 etapas: Objetivo, Onde atua, Ativação, Como conversa, Estratégia, Empresa, Produtos, Materiais, Encerramento, Situações, Inteligência e Revisão.</div>

<h2>O que é um vendedor com inteligência artificial?</h2>
<p>É um agente de IA treinado com regras e informações da empresa para apoiar uma parte do processo comercial. Ele pode receber um lead, entender o assunto, fazer perguntas, responder com base no contexto cadastrado e buscar o objetivo definido. Diferente de uma mensagem automática fixa, a IA interpreta a conversa antes de responder.</p>
<p>Isso não significa substituir todo o time comercial. A função do agente é ampliar a disponibilidade e executar etapas repetitivas com consistência. Casos sensíveis, negociações especiais, exceções e pedidos de atendimento humano devem ser encaminhados para uma pessoa.</p>

<h2>Um vendedor com IA realmente vende 24 horas por dia?</h2>
<p>Um SDR de IA pode <strong>atender, qualificar e conduzir conversas a qualquer hora</strong> quando está ativo, conectado ao canal e corretamente configurado. A disponibilidade técnica não garante vendas, respostas ou conversões. O resultado depende da oferta, do público, da qualidade dos dados, das regras, da mensagem e do acompanhamento humano.</p>

<h2>O que o SDR Inteligente da Wiize pode fazer?</h2>
<ul>
  <li>Interpretar cada mensagem recebida.</li>
  <li>Responder dúvidas dentro do contexto fornecido.</li>
  <li>Fazer perguntas para entender o lead.</li>
  <li>Conduzir a conversa até um objetivo definido.</li>
  <li>Programar follow-ups conforme a estratégia configurada.</li>
  <li>Usar informações da empresa, produtos e materiais.</li>
  <li>Reconhecer situações que exigem atendimento humano.</li>
  <li>Manter o contexto comercial conectado à operação.</li>
</ul>

<h2>Passo a passo: como criar um vendedor com IA na Wiize</h2>

<div class="step"><strong>Passo 1 — Crie sua conta e prepare o contexto da empresa</strong><p>Crie sua conta na Wiize e preencha as informações reais da empresa. Organize proposta, público, produtos, serviços, materiais e regras comerciais. Um agente de IA responde melhor quando recebe contexto específico e atualizado.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 1</strong><br>Print sugerido: Perfil da Empresa preenchido<br>Alt sugerido: “Perfil empresarial usado para configurar vendedor com IA na Wiize”</div>

<div class="step"><strong>Passo 2 — Acesse Prospecção &gt; SDR Inteligente</strong><p>No menu lateral, clique em <em>Prospecção</em> e depois em <em>SDR Inteligente</em>. Essa área mostra os agentes criados e indicadores como atendimentos, follow-ups, respostas, conversões e mensagens enviadas.</p></div>

<div class="step"><strong>Passo 3 — Clique em Criar novo SDR</strong><p>Abra o assistente de configuração. A Wiize divide a criação em 12 etapas para que objetivo, comportamento, dados comerciais e limites não fiquem misturados.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 2</strong><br>Print sugerido: tela SDR Inteligente com botão “Criar novo SDR”<br>Alt sugerido: “Criar novo SDR Inteligente na plataforma Wiize”</div>

<div class="step"><strong>Passo 4 — Objetivo</strong><p>Defina o resultado que o SDR deve buscar. Seja específico: qualificar a oportunidade, identificar interesse, conduzir para uma etapa comercial ou outro objetivo disponível na configuração. Evite instruções vagas como “vender mais”.</p></div>

<div class="step"><strong>Passo 5 — Onde atua</strong><p>Escolha o canal ou contexto em que o agente trabalhará. Confirme que a conexão necessária está ativa e associada à operação correta.</p></div>

<div class="step"><strong>Passo 6 — Ativação</strong><p>Defina quando o SDR começa a atuar. A ativação precisa estar alinhada ao processo comercial para evitar que o agente intervenha em conversas que deveriam permanecer com uma pessoa.</p></div>

<div class="step"><strong>Passo 7 — Como conversa</strong><p>Configure o estilo de comunicação. Informe tom, nível de formalidade, tamanho das respostas e forma de fazer perguntas. O texto deve combinar com a marca e com o público B2B.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 3</strong><br>Print sugerido: etapa “Como conversa” do assistente<br>Alt sugerido: “Configuração do tom de conversa do agente de IA para vendas”</div>

<div class="step"><strong>Passo 8 — Estratégia</strong><p>Explique como o agente deve conduzir a conversa. Defina a sequência lógica, quais informações precisa coletar e em que momento deve avançar, aguardar, fazer follow-up ou pedir ajuda humana.</p></div>

<div class="step"><strong>Passo 9 — Empresa</strong><p>Revise os dados da empresa representada pelo SDR. A IA deve entender que trabalha para sua empresa e conversa com o lead em nome dela. Não misture dados da empresa vendedora com informações da empresa prospectada.</p></div>

<div class="step"><strong>Passo 10 — Produtos</strong><p>Cadastre produtos ou serviços com nome, descrição e condições reais. Não inclua promessas que a empresa não possa cumprir. Se preço, prazo ou disponibilidade mudam, mantenha essas informações atualizadas.</p></div>

<div class="step"><strong>Passo 11 — Materiais</strong><p>Adicione os materiais que ajudam o SDR a responder com precisão. Use documentos atuais e aprovados pela empresa. Remova versões antigas para evitar respostas contraditórias.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 4</strong><br>Print sugerido: etapas Empresa, Produtos ou Materiais<br>Alt sugerido: “Base de conhecimento comercial do SDR Inteligente Wiize”</div>

<div class="step"><strong>Passo 12 — Encerramento</strong><p>Defina como o agente reconhece que o objetivo foi concluído e qual mensagem deve encerrar a etapa. Evite continuar insistindo depois de uma recusa clara ou após o atendimento ser transferido.</p></div>

<div class="step"><strong>Passo 13 — Situações</strong><p>Cadastre cenários especiais: pedido para falar com uma pessoa, dúvida sem resposta confirmada, objeção sensível, reclamação, solicitação fora do escopo ou qualquer situação que exija cuidado adicional.</p></div>

<div class="step"><strong>Passo 14 — Inteligência</strong><p>Ajuste as regras de interpretação e comportamento disponíveis. O agente deve admitir quando não tem uma informação, em vez de inventar resposta, preço, condição ou resultado.</p></div>

<div class="step"><strong>Passo 15 — Revisão</strong><p>Confira todas as etapas antes de concluir. Verifique especialmente objetivo, canal, identidade da empresa, produtos, limites e intervenção humana. Salve o SDR somente quando as informações estiverem coerentes.</p></div>
<div class="shot"><strong>ESPAÇO PARA IMAGEM 5</strong><br>Print sugerido: etapa final “Revisão” com resumo do agente<br>Alt sugerido: “Revisão das configurações do vendedor com IA da Wiize”</div>

<h2>Como treinar um agente de IA para vendas</h2>
<p>O treinamento prático começa com contexto de qualidade. Forneça respostas claras para cinco perguntas:</p>
<ol>
  <li>Quem é a empresa que o agente representa?</li>
  <li>O que ela vende e para quais empresas?</li>
  <li>Qual problema real ajuda a resolver?</li>
  <li>Qual é o objetivo da conversa?</li>
  <li>Quando o agente deve parar e chamar uma pessoa?</li>
</ol>
<p>Depois, teste perguntas simples, objeções, mensagens ambíguas, pedidos fora do escopo e solicitações de atendimento humano. Corrija o contexto quando a resposta ficar genérica ou imprecisa.</p>

<h2>Exemplo de jornada com SDR Inteligente</h2>
<ol>
  <li>Um lead responde no WhatsApp.</li>
  <li>O SDR identifica o contexto e responde conforme a estratégia.</li>
  <li>O agente faz perguntas de qualificação.</li>
  <li>As respostas orientam o próximo passo.</li>
  <li>Se o cenário exigir, a conversa é encaminhada para uma pessoa.</li>
  <li>Quando o objetivo é concluído, o SDR encerra a etapa conforme a regra definida.</li>
</ol>

<h2>Agente de IA x automação por respostas fixas</h2>
<table>
<thead><tr><th>Respostas fixas</th><th>SDR Inteligente</th></tr></thead>
<tbody>
<tr><td>Segue caminhos previamente definidos</td><td>Interpreta a mensagem antes de responder</td></tr>
<tr><td>Depende de opções esperadas</td><td>Lida com variações de linguagem dentro das regras</td></tr>
<tr><td>Usa textos estáticos</td><td>Usa contexto da empresa e da conversa</td></tr>
<tr><td>Encaminha por condição</td><td>Pode reconhecer situações de intervenção humana</td></tr>
</tbody>
</table>

<h2>Boas práticas para um vendedor com IA confiável</h2>
<ul>
  <li>Use informações reais e atualizadas.</li>
  <li>Defina claramente o objetivo e os limites.</li>
  <li>Não permita que o agente invente preço, prazo ou benefício.</li>
  <li>Garanta uma rota de atendimento humano.</li>
  <li>Revise conversas e ajuste o contexto com frequência.</li>
  <li>Respeite consentimento, LGPD e regras da Meta.</li>
  <li>Use template aprovado quando a conversa precisar ser iniciada ou retomada fora da janela de 24 horas.</li>
</ul>

<h2>Por que criar seu SDR Inteligente na Wiize?</h2>
<p>Na Wiize, o agente não fica isolado. Ele faz parte de uma operação que reúne WhatsApp oficial, Chat, CRM, Prospecção, Fluxos e dados comerciais. Assim, a empresa pode ampliar a disponibilidade do atendimento e manter contexto, regras e acompanhamento no mesmo ambiente.</p>

<div class="cta"><h2>Crie seu vendedor com IA na Wiize</h2><p>Abra <em>Prospecção &gt; SDR Inteligente</em>, clique em <em>Criar novo SDR</em> e configure cada etapa com as informações reais da sua empresa.</p><p><a href="/signup/escolher-plano"><strong>Criar minha conta na Wiize</strong></a></p></div>
</article>
$POST3$,
  NULL,
  'Como criar um vendedor com IA e SDR Inteligente na Wiize',
  'Wian',
  'Equipe de conteúdo da Wiize, plataforma de inteligência comercial B2B, CRM, automação e IA para vendas.',
  (SELECT id FROM public.blog_categories WHERE slug = 'vendas-e-automacao' LIMIT 1),
  'draft', false, NULL, NULL, 12,
  'Vendedor com IA: como criar um SDR 24 horas | Wiize',
  'Crie um vendedor com IA na Wiize para atender e qualificar leads no WhatsApp a qualquer hora, com regras, contexto comercial e passagem para humanos.',
  ARRAY['agente de ia para vendas','vendedor com ia','vendedor com inteligência artificial','ia para vendas b2b','sdr inteligente','sdr com ia','agente comercial ia','atendimento 24 horas','automação de vendas','wiize'],
  'https://wiize.com.br/blog/vendedor-com-ia-como-criar-sdr-inteligente-24-horas-wiize',
  true, true, NULL,
  'Guia para criar um vendedor com IA na Wiize usando o SDR Inteligente. Explica limites e disponibilidade, mostra o caminho Prospecção > SDR Inteligente > Criar novo SDR e detalha as 12 etapas do assistente: Objetivo, Onde atua, Ativação, Como conversa, Estratégia, Empresa, Produtos, Materiais, Encerramento, Situações, Inteligência e Revisão.',
  'Um vendedor com IA pode atender e qualificar leads a qualquer hora quando está ativo e conectado. Na Wiize, acesse Prospecção > SDR Inteligente, clique em Criar novo SDR e configure objetivo, canal, ativação, conversa, estratégia, empresa, produtos, materiais, encerramento, situações, inteligência e revisão.',
  ARRAY['Wiize','SDR Inteligente','agente de IA para vendas','vendedor com IA','WhatsApp Business Platform','CRM','inteligência artificial','follow-up','atendimento humano','LGPD'],
  ARRAY['IA para vendas B2B','SDR automatizado','qualificação de leads','automação comercial','agente de WhatsApp','atendimento 24 horas'],
  '["O que é um vendedor com IA?","Como criar um SDR Inteligente na Wiize?","Um agente de IA vende 24 horas por dia?","Como treinar uma IA para vendas?","Quando transferir a conversa para um humano?"]'::jsonb,
  '[
    {"question":"O que é um vendedor com IA?","answer":"É um agente comercial configurado para interpretar mensagens, responder com base no contexto da empresa, qualificar leads e conduzir conversas até um objetivo, com limites e encaminhamento humano."},
    {"question":"Como criar um vendedor com IA na Wiize?","answer":"Acesse Prospecção > SDR Inteligente, clique em Criar novo SDR e conclua as etapas de Objetivo, Onde atua, Ativação, Como conversa, Estratégia, Empresa, Produtos, Materiais, Encerramento, Situações, Inteligência e Revisão."},
    {"question":"O vendedor com IA funciona 24 horas por dia?","answer":"Ele pode atender e qualificar a qualquer hora quando está ativo, conectado e configurado. Isso não garante vendas ou conversões; resultados dependem da oferta, público, dados, estratégia e acompanhamento humano."},
    {"question":"O SDR Inteligente substitui vendedores humanos?","answer":"Não necessariamente. Ele amplia a disponibilidade e automatiza etapas repetitivas. Negociações especiais, exceções, dúvidas sem resposta e pedidos de atendimento humano devem ser encaminhados para uma pessoa."},
    {"question":"Que informações devo fornecer ao agente de IA?","answer":"Identidade da empresa, público, produtos ou serviços, objetivo da conversa, estilo de comunicação, materiais atualizados, regras comerciais e situações que exigem intervenção humana."},
    {"question":"O SDR pode fazer follow-up no WhatsApp?","answer":"O agente pode atuar em follow-ups conforme a estratégia e as regras configuradas. Para iniciar ou retomar conversas fora da janela de 24 horas, é necessário usar um template aprovado pela Meta."}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, excerpt=EXCLUDED.excerpt,
  content=EXCLUDED.content, cover_image_alt=EXCLUDED.cover_image_alt,
  author_name=EXCLUDED.author_name, author_bio=EXCLUDED.author_bio,
  category_id=EXCLUDED.category_id, status='draft', featured=EXCLUDED.featured,
  published_at=NULL, scheduled_for=NULL, reading_time_minutes=EXCLUDED.reading_time_minutes,
  seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description,
  seo_keywords=EXCLUDED.seo_keywords, canonical_url=EXCLUDED.canonical_url,
  robots_index=EXCLUDED.robots_index, robots_follow=EXCLUDED.robots_follow,
  ai_summary=EXCLUDED.ai_summary, ai_short_answer=EXCLUDED.ai_short_answer,
  ai_entities=EXCLUDED.ai_entities, ai_related_topics=EXCLUDED.ai_related_topics,
  ai_questions=EXCLUDED.ai_questions, faq=EXCLUDED.faq, updated_at=now();

-- Vínculos com tags -----------------------------------------------------------
INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.blog_posts p
JOIN public.blog_tags t ON t.slug IN ('prospeccao-b2b','crm','ia-para-vendas','wiize')
WHERE p.slug = 'como-prospectar-clientes-b2b-passo-a-passo-wiize'
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.blog_posts p
JOIN public.blog_tags t ON t.slug IN ('automacao-whatsapp','crm','ia-para-vendas','wiize')
WHERE p.slug = 'como-automatizar-atendimento-whatsapp-passo-a-passo-wiize'
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM public.blog_posts p
JOIN public.blog_tags t ON t.slug IN ('sdr-inteligente','ia-para-vendas','automacao-whatsapp','crm','wiize')
WHERE p.slug = 'vendedor-com-ia-como-criar-sdr-inteligente-24-horas-wiize'
ON CONFLICT DO NOTHING;

COMMIT;

-- Conferência: deve retornar 3 linhas, todas com status = draft e sem capa ----
SELECT
  slug,
  title,
  status,
  cover_image_url,
  seo_title,
  length(seo_description) AS seo_description_length,
  reading_time_minutes
FROM public.blog_posts
WHERE slug IN (
  'como-prospectar-clientes-b2b-passo-a-passo-wiize',
  'como-automatizar-atendimento-whatsapp-passo-a-passo-wiize',
  'vendedor-com-ia-como-criar-sdr-inteligente-24-horas-wiize'
)
ORDER BY slug;
