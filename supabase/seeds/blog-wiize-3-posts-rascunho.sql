-- ============================================================================
-- BLOG WIIZE — 3 novas publicações (RASCUNHO, sem imagem de capa)
-- 1) Templates Meta API Oficial
-- 2) Formulários de captação integrados ao CRM e fluxos
-- 3) Wiize API: prospecção e análise de leads via API
--
-- Todos entram com status 'draft' e cover_image_url NULL.
-- No Admin > Blog: adicione a capa, revise e publique.
-- Seguro para rodar mais de uma vez (não duplica pelo slug).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- POST 1 — Templates Meta API Oficial
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt, status, featured, published_at,
  reading_time_minutes, seo_title, seo_description, seo_keywords,
  ai_short_answer, ai_entities, faq
)
SELECT
  'templates-whatsapp-meta-api-oficial-como-criar-e-aprovar',
  'Templates do WhatsApp na Meta API Oficial: como criar, aprovar e usar mensagens fora da janela de 24h',
  'O novo sistema de templates da Wiize permite criar, enviar para aprovação e usar modelos oficiais da Meta em campanhas, fluxos e no chat, tudo em um só lugar.',
  'Entenda o que são templates do WhatsApp na Meta API Oficial, por que eles são obrigatórios fora da janela de 24h, quais categorias existem e como o novo sistema de templates da Wiize simplifica criação, aprovação e uso.',
  $HTML$
<p class="lead"><strong>Templates do WhatsApp são modelos de mensagem pré-aprovados pela Meta e são obrigatórios para iniciar uma conversa ou responder um contato depois de 24 horas da última mensagem dele.</strong> Com o novo sistema de templates da Wiize, você cria, envia para aprovação, acompanha o status e usa esses modelos em campanhas, fluxos de automação e no chat, sem sair da plataforma.</p>

<h2>O que é um template do WhatsApp na Meta API Oficial?</h2>
<p>Um template (também chamado de modelo de mensagem ou HSM) é um texto estruturado que sua empresa cadastra na conta do WhatsApp Business (WABA) e que passa por revisão da Meta. Depois de aprovado, ele pode ser enviado a qualquer contato que tenha dado consentimento, inclusive fora da janela de atendimento.</p>
<p>Um template pode conter:</p>
<ul>
  <li><strong>Cabeçalho:</strong> texto, imagem, vídeo ou documento;</li>
  <li><strong>Corpo:</strong> a mensagem principal, com variáveis como <code>{{1}}</code> para nome do contato ou empresa;</li>
  <li><strong>Rodapé:</strong> texto curto complementar;</li>
  <li><strong>Botões:</strong> respostas rápidas, link para site ou ligação.</li>
</ul>

<h2>O que é a janela de 24 horas do WhatsApp?</h2>
<p>Sempre que um contato envia uma mensagem para sua empresa, abre-se uma janela de 24 horas. Dentro dela, você pode responder livremente com texto, áudio, imagem ou documento. <strong>Fora dessa janela, a Meta só permite enviar templates aprovados.</strong> É uma regra da plataforma para proteger os usuários contra spam, e respeitá-la mantém a qualidade e a reputação do seu número.</p>

<h2>Quais são as categorias de templates?</h2>
<table>
  <thead><tr><th>Categoria</th><th>Quando usar</th><th>Exemplo</th></tr></thead>
  <tbody>
    <tr><td><strong>Marketing</strong></td><td>Divulgação, reengajamento, novidades e convites</td><td>"Olá {{1}}, temos uma novidade para a sua empresa."</td></tr>
    <tr><td><strong>Utilidade</strong></td><td>Atualizações de algo que o cliente já solicitou</td><td>"Seu agendamento foi confirmado para {{1}}."</td></tr>
    <tr><td><strong>Autenticação</strong></td><td>Códigos de verificação e acesso</td><td>"Seu código é {{1}}."</td></tr>
  </tbody>
</table>
<p>A categoria escolhida influencia a aprovação e a forma de cobrança da Meta. Escolher a categoria correta reduz reprovações.</p>

<h2>O que muda com o novo sistema de templates da Wiize?</h2>
<h3>1. Criação guiada, com pré-visualização</h3>
<p>Você monta cabeçalho, corpo, rodapé e botões e vê em tempo real como a mensagem vai aparecer no WhatsApp do contato.</p>
<h3>2. Envio para aprovação direto da plataforma</h3>
<p>O template é enviado para a Meta pela integração oficial da sua conta. Não é preciso acessar outro painel.</p>
<h3>3. Status sempre atualizado</h3>
<p>Acompanhe se cada modelo está <em>em análise</em>, <em>aprovado</em> ou <em>reprovado</em>, e ajuste o que for necessário.</p>
<h3>4. Uso em campanhas, fluxos e chat</h3>
<p>Templates aprovados ficam disponíveis para:</p>
<ul>
  <li><strong>Campanhas:</strong> disparos para listas de contatos e leads do CRM, com intervalos de segurança;</li>
  <li><strong>Fluxos de automação:</strong> mensagens automáticas em etapas da jornada, como boas-vindas, lembretes e follow-up;</li>
  <li><strong>Chat:</strong> retomar uma conversa quando a janela de 24h já fechou.</li>
</ul>
<h3>5. Variáveis preenchidas com dados do CRM</h3>
<p>Nome do contato, empresa e outros campos podem ser inseridos automaticamente, deixando cada mensagem personalizada.</p>

<h2>Como criar um template que seja aprovado pela Meta</h2>
<ol>
  <li><strong>Escolha a categoria certa:</strong> não use Utilidade para mensagens promocionais.</li>
  <li><strong>Seja claro e específico:</strong> explique o motivo do contato logo no início.</li>
  <li><strong>Evite promessas exageradas</strong>, letras maiúsculas em excesso e linguagem agressiva.</li>
  <li><strong>Use variáveis com contexto:</strong> não comece nem termine o corpo com uma variável solta.</li>
  <li><strong>Inclua uma forma de parar de receber</strong> mensagens em templates de marketing.</li>
  <li><strong>Envie apenas para quem autorizou</strong> contato pela sua empresa.</li>
</ol>

<h2>Boas práticas para manter a qualidade do número</h2>
<ul>
  <li>Segmente os contatos: mensagens relevantes geram menos bloqueios.</li>
  <li>Respeite intervalos entre disparos em campanhas.</li>
  <li>Responda rápido quando o contato interagir; a conversa volta para a janela de 24h.</li>
  <li>Acompanhe respostas e bloqueios para ajustar o texto dos modelos.</li>
</ul>

<h2>Conclusão</h2>
<p>Templates são a base de qualquer comunicação ativa no WhatsApp oficial. Com o novo sistema da Wiize, criar, aprovar e usar esses modelos fica integrado ao CRM, às campanhas e aos fluxos, para sua equipe falar com o cliente certo, no momento certo e dentro das regras da Meta.</p>
<p><a href="/signup/escolher-plano"><strong>Teste a Wiize grátis por 7 dias</strong></a> e conecte seu Número de Marketing (API Oficial).</p>
$HTML$,
  NULL,
  'Criação de templates do WhatsApp na Meta API Oficial dentro da Wiize',
  'draft', false, NULL, 7,
  'Templates WhatsApp Meta API Oficial: como criar e aprovar | Wiize',
  'Saiba o que são templates do WhatsApp na Meta API Oficial, a regra da janela de 24h, categorias e como criar, aprovar e usar modelos em campanhas e fluxos.',
  ARRAY[
    'templates whatsapp','template meta api','whatsapp api oficial','janela de 24 horas whatsapp',
    'modelo de mensagem whatsapp','hsm whatsapp','aprovar template whatsapp','whatsapp business api',
    'campanhas whatsapp','automação whatsapp','wiize'
  ],
  'Templates do WhatsApp são modelos de mensagem aprovados pela Meta, obrigatórios para contatar clientes fora da janela de 24 horas após a última mensagem deles. Eles têm categorias de Marketing, Utilidade e Autenticação e podem incluir variáveis, mídia e botões. Na Wiize, é possível criar, enviar para aprovação e usar templates em campanhas, fluxos e no chat.',
  ARRAY[
    'WhatsApp Business Platform','Meta API Oficial','WhatsApp Cloud API','Template HSM',
    'Janela de 24 horas','WABA','Template de Marketing','Template de Utilidade','Template de Autenticação','CRM Wiize'
  ],
  '[
    {"question":"Posso enviar mensagem no WhatsApp oficial sem template?","answer":"Sim, mas apenas dentro da janela de 24 horas contada a partir da última mensagem do contato. Fora desse período, a Meta exige o uso de um template aprovado para iniciar ou retomar a conversa."},
    {"question":"Quanto tempo a Meta leva para aprovar um template?","answer":"O prazo varia. Muitos templates são analisados rapidamente, mas alguns podem levar mais tempo ou exigir ajustes. Na Wiize você acompanha o status de cada modelo e sabe quando ele está pronto para uso."},
    {"question":"Por que meu template foi reprovado?","answer":"Os motivos mais comuns são categoria incorreta, texto vago, variáveis mal posicionadas, conteúdo promocional em categoria de utilidade ou linguagem que viola as políticas da Meta. Ajustar o texto e a categoria costuma resolver."},
    {"question":"Posso personalizar templates com o nome do cliente?","answer":"Sim. Templates aceitam variáveis, e na Wiize elas podem ser preenchidas com dados do CRM, como nome do contato e da empresa, deixando cada mensagem personalizada."},
    {"question":"Onde posso usar os templates aprovados na Wiize?","answer":"Em campanhas para listas de contatos, em etapas de fluxos de automação e no chat, para retomar conversas quando a janela de 24 horas já foi encerrada."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'templates-whatsapp-meta-api-oficial-como-criar-e-aprovar');

-- ---------------------------------------------------------------------------
-- POST 2 — Formulários de captação integrados ao CRM e fluxos
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt, status, featured, published_at,
  reading_time_minutes, seo_title, seo_description, seo_keywords,
  ai_short_answer, ai_entities, faq
)
SELECT
  'formulario-captacao-leads-integrado-crm-automacao',
  'Formulário de captação de leads integrado ao CRM: como transformar cada resposta em oportunidade automaticamente',
  'Os novos Forms da Wiize capturam leads em sites, links e redes sociais e já enviam cada contato para o CRM, iniciam fluxos de automação no WhatsApp e mostram de onde vem cada resultado.',
  'Veja como um formulário de captação integrado ao CRM e a fluxos de automação elimina planilhas, acelera o primeiro contato e mostra a origem de cada lead. Conheça os novos Forms da Wiize.',
  $HTML$
<p class="lead"><strong>Um formulário de captação integrado ao CRM registra cada lead automaticamente no funil de vendas, no momento em que ele responde, e pode disparar um fluxo de atendimento imediato.</strong> Com os novos Forms da Wiize, a captação, o cadastro no CRM, a automação no WhatsApp e a análise de origem acontecem no mesmo sistema.</p>

<h2>Por que formulários soltos fazem você perder vendas</h2>
<p>Muitas empresas ainda captam leads com formulários desconectados: as respostas chegam por e-mail ou vão para uma planilha, alguém copia para o CRM e só depois o time faz contato. Nesse caminho acontecem três problemas:</p>
<ul>
  <li><strong>Demora no primeiro contato:</strong> o lead esfria enquanto espera;</li>
  <li><strong>Dados perdidos ou duplicados</strong> por digitação manual;</li>
  <li><strong>Falta de visibilidade:</strong> não se sabe qual canal ou campanha gerou o lead.</li>
</ul>

<h2>O que é um formulário de captação integrado ao CRM?</h2>
<p>É um formulário em que cada envio cria ou atualiza automaticamente um contato no CRM, com as respostas vinculadas ao lead, a etapa correta do funil e a origem registrada. Quando também está ligado a fluxos de automação, ele inicia a conversa sem depender de ação manual.</p>

<h2>Como funcionam os novos Forms da Wiize</h2>
<h3>1. Criador visual de formulários</h3>
<p>Monte formulários com os campos que sua operação precisa: nome, empresa, WhatsApp, e-mail, segmento, necessidade e perguntas personalizadas. Personalize a aparência para ficar com a identidade da sua marca.</p>
<h3>2. Publique onde quiser</h3>
<ul>
  <li><strong>Link próprio</strong> para bio do Instagram, anúncios e mensagens;</li>
  <li><strong>Incorporado ao seu site</strong> ou landing page;</li>
  <li><strong>Links rastreados</strong> para cada canal, campanha ou parceiro.</li>
</ul>
<h3>3. Lead direto no CRM</h3>
<p>Cada resposta vira um contato no CRM da Wiize, com as informações do formulário no histórico do lead. Sem planilha e sem copiar e colar.</p>
<h3>4. Fluxos de automação disparados na hora</h3>
<p>O envio do formulário pode iniciar um fluxo: mensagem de boas-vindas no WhatsApp, qualificação com perguntas, distribuição para um responsável, agendamento ou atendimento por Agente de IA. O lead recebe retorno enquanto o interesse ainda está alto.</p>
<h3>5. Análise de resultados e origem</h3>
<p>Acompanhe visualizações, respostas e taxa de conversão de cada formulário e descubra quais canais e links trazem mais oportunidades.</p>

<h2>Exemplo de jornada automatizada</h2>
<ol>
  <li>O lead clica no link da campanha e preenche o formulário.</li>
  <li>A Wiize cria o contato no CRM com origem e respostas registradas.</li>
  <li>Um fluxo envia uma mensagem no WhatsApp confirmando o recebimento.</li>
  <li>O fluxo faz perguntas de qualificação ou encaminha para o time comercial.</li>
  <li>O responsável continua a conversa no chat, com todo o contexto do lead.</li>
</ol>

<h2>Boas práticas para aumentar a conversão do formulário</h2>
<ul>
  <li><strong>Peça só o necessário:</strong> menos campos, mais respostas.</li>
  <li><strong>Deixe claro o que o lead recebe</strong> ao enviar.</li>
  <li><strong>Responda rápido:</strong> use um fluxo automático para o primeiro contato.</li>
  <li><strong>Use um link rastreado por canal</strong> para comparar resultados.</li>
  <li><strong>Informe como os dados serão usados</strong>, em conformidade com a LGPD.</li>
</ul>

<h2>Conclusão</h2>
<p>Captar lead é só o começo. O resultado vem quando o contato chega no CRM na hora certa, recebe um retorno rápido e segue uma jornada organizada. Os Forms da Wiize unem captação, CRM, automação e análise em um só lugar.</p>
<p><a href="/signup/escolher-plano"><strong>Teste a Wiize grátis por 7 dias</strong></a> e crie seu primeiro formulário integrado.</p>
$HTML$,
  NULL,
  'Formulário de captação de leads integrado ao CRM e a fluxos de automação da Wiize',
  'draft', false, NULL, 7,
  'Formulário de captação de leads integrado ao CRM | Wiize',
  'Crie formulários de captação que enviam leads direto ao CRM, disparam fluxos no WhatsApp e mostram a origem de cada oportunidade. Conheça os Forms da Wiize.',
  ARRAY[
    'formulário de captação de leads','formulário integrado ao crm','captação de leads','geração de leads b2b',
    'automação de marketing','fluxo de automação whatsapp','links rastreados','landing page formulário',
    'crm com formulário','qualificação de leads','wiize'
  ],
  'Um formulário de captação integrado ao CRM registra cada lead automaticamente no funil no momento do envio, com respostas e origem salvas, evitando planilhas e cópia manual. Quando ligado a fluxos de automação, ele também inicia o primeiro contato, por exemplo no WhatsApp. Na Wiize, os Forms unem captação, CRM, automação e análise de conversão.',
  ARRAY[
    'Formulário de captação','CRM','Geração de leads','Fluxo de automação','WhatsApp',
    'Links rastreados','Taxa de conversão','Qualificação de leads','LGPD','Funil de vendas'
  ],
  '[
    {"question":"O que é um formulário integrado ao CRM?","answer":"É um formulário em que cada resposta cria ou atualiza automaticamente um contato no CRM, com as informações preenchidas e a origem do lead registradas, sem necessidade de digitação manual."},
    {"question":"Posso colocar o formulário da Wiize no meu site?","answer":"Sim. O formulário pode ser incorporado ao seu site ou landing page, ou compartilhado por um link próprio em redes sociais, anúncios e mensagens."},
    {"question":"O formulário pode iniciar uma conversa no WhatsApp automaticamente?","answer":"Sim. O envio do formulário pode disparar um fluxo de automação da Wiize, que envia mensagens, faz perguntas de qualificação ou encaminha o lead para um responsável."},
    {"question":"Como sei qual canal traz mais leads?","answer":"Usando links rastreados para cada canal ou campanha e acompanhando as métricas do formulário, como visualizações, respostas e taxa de conversão."},
    {"question":"Quantos campos um formulário de captação deve ter?","answer":"O ideal é pedir apenas o necessário para qualificar e fazer o primeiro contato. Menos campos geralmente aumentam a quantidade de respostas; informações complementares podem ser coletadas depois, na conversa."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'formulario-captacao-leads-integrado-crm-automacao');

-- ---------------------------------------------------------------------------
-- POST 3 — Wiize API: prospecção e análise de leads via API
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_posts (
  slug, title, subtitle, excerpt, content,
  cover_image_url, cover_image_alt, status, featured, published_at,
  reading_time_minutes, seo_title, seo_description, seo_keywords,
  ai_short_answer, ai_entities, faq
)
SELECT
  'api-de-prospeccao-b2b-analise-de-leads-wiize-api',
  'API de prospecção B2B: como encontrar e analisar leads direto no seu sistema com a Wiize API',
  'A Wiize API leva a inteligência de prospecção e análise de leads da Wiize para dentro do seu CRM, ERP ou plataforma, com integração por chave de API.',
  'Conheça a Wiize API: uma API de prospecção B2B para buscar empresas, analisar leads e receber dados qualificados dentro do seu próprio sistema. Veja como funciona, casos de uso e boas práticas.',
  $HTML$
<p class="lead"><strong>Uma API de prospecção B2B permite que o seu próprio sistema busque empresas, analise leads e receba dados qualificados automaticamente, sem ninguém precisar operar outra ferramenta.</strong> A Wiize API leva a inteligência de prospecção e análise da Wiize para dentro do CRM, ERP ou plataforma que sua empresa já usa.</p>

<h2>O que é uma API de prospecção?</h2>
<p>API (Interface de Programação de Aplicações) é uma forma de dois sistemas conversarem entre si. Em uma API de prospecção, o seu sistema envia um pedido, por exemplo "empresas de determinado segmento em uma cidade", e recebe de volta uma lista de oportunidades com dados e análise, pronta para ser usada no seu processo comercial.</p>

<h2>Por que levar a prospecção para dentro do seu sistema?</h2>
<ul>
  <li><strong>Menos troca de ferramentas:</strong> o time trabalha onde já está acostumado;</li>
  <li><strong>Automação real:</strong> a busca pode ser disparada por regras do seu próprio produto;</li>
  <li><strong>Dados centralizados:</strong> os leads entram direto na sua base;</li>
  <li><strong>Escala:</strong> plataformas, agências e SaaS podem oferecer prospecção aos próprios clientes.</li>
</ul>

<h2>O que a Wiize API faz</h2>
<h3>1. Prospecção de empresas</h3>
<p>Busque oportunidades B2B por segmento e localização e receba empresas com informações públicas de contato e presença digital.</p>
<h3>2. Análise e qualificação de leads</h3>
<p>Cada oportunidade pode ser analisada com a inteligência da Wiize, trazendo sinais sobre a presença digital da empresa e indicadores que ajudam a priorizar quem abordar primeiro.</p>
<h3>3. Integração simples e segura</h3>
<p>O acesso é feito com chaves de API geradas no painel da Wiize API. Você acompanha o consumo e gerencia as chaves no mesmo lugar, podendo revogar uma chave a qualquer momento.</p>
<h3>4. Consumo transparente</h3>
<p>O painel mostra o uso da API, para você acompanhar o volume consultado e planejar a operação.</p>

<h2>Casos de uso</h2>
<table>
  <thead><tr><th>Quem usa</th><th>Como usa</th></tr></thead>
  <tbody>
    <tr><td><strong>Empresas com CRM próprio</strong></td><td>Alimentam a base com novos leads qualificados automaticamente.</td></tr>
    <tr><td><strong>Plataformas SaaS</strong></td><td>Oferecem prospecção B2B como funcionalidade para os próprios clientes.</td></tr>
    <tr><td><strong>Agências e consultorias</strong></td><td>Geram listas analisadas para campanhas de clientes.</td></tr>
    <tr><td><strong>Times de dados e BI</strong></td><td>Enriquecem análises de mercado por segmento e região.</td></tr>
  </tbody>
</table>

<h2>Como começar</h2>
<ol>
  <li>Acesse a área da Wiize API e crie sua conta.</li>
  <li>Gere uma chave de API no painel.</li>
  <li>Consulte a documentação e faça a primeira requisição de prospecção.</li>
  <li>Receba as oportunidades e salve na sua base.</li>
  <li>Acompanhe o consumo no painel.</li>
</ol>

<h2>Boas práticas de uso</h2>
<ul>
  <li><strong>Guarde a chave com segurança:</strong> use-a apenas no servidor, nunca exposta no navegador ou em aplicativos públicos.</li>
  <li><strong>Evite consultas duplicadas:</strong> armazene os resultados já recebidos.</li>
  <li><strong>Defina segmentos claros</strong> para receber leads mais aderentes ao seu perfil de cliente ideal.</li>
  <li><strong>Respeite a LGPD</strong> e as regras de contato comercial B2B ao usar os dados.</li>
</ul>

<h2>Conclusão</h2>
<p>Prospecção não precisa ficar presa a uma tela. Com a Wiize API, encontrar e analisar leads vira uma funcionalidade do seu próprio sistema, automatizada e escalável.</p>
<p><a href="/api"><strong>Conheça a Wiize API</strong></a> e comece a prospectar pelo seu sistema.</p>
$HTML$,
  NULL,
  'Wiize API: prospecção e análise de leads B2B via API dentro do sistema do cliente',
  'draft', false, NULL, 6,
  'API de prospecção B2B e análise de leads | Wiize API',
  'Com a Wiize API, seu CRM, ERP ou plataforma busca empresas, analisa leads e recebe oportunidades B2B qualificadas via API. Veja como funciona e casos de uso.',
  ARRAY[
    'api de prospecção','api de leads','api de prospecção b2b','api de dados de empresas',
    'análise de leads','qualificação de leads api','enriquecimento de dados b2b','geração de leads b2b',
    'integração crm api','wiize api'
  ],
  'Uma API de prospecção B2B permite que um sistema busque empresas por segmento e localização, analise os leads encontrados e receba os dados automaticamente, sem operar outra ferramenta. A Wiize API oferece prospecção e análise de leads via chave de API, com painel de consumo, para integração com CRMs, ERPs, plataformas SaaS e agências.',
  ARRAY[
    'API REST','Chave de API','Prospecção B2B','Qualificação de leads','Enriquecimento de dados',
    'CRM','ERP','SaaS','Perfil de cliente ideal (ICP)','LGPD'
  ],
  '[
    {"question":"O que é uma API de prospecção de leads?","answer":"É uma interface que permite ao seu sistema solicitar a busca de empresas por critérios como segmento e localização e receber de volta os leads encontrados, com dados e análise, de forma automática."},
    {"question":"Preciso usar a plataforma Wiize para usar a API?","answer":"Não. A Wiize API foi feita para que a prospecção e a análise aconteçam dentro do seu próprio sistema. O painel da Wiize API serve para gerar chaves, acompanhar consumo e configurar a conta."},
    {"question":"Quem pode usar a Wiize API?","answer":"Empresas com CRM ou sistema próprio, plataformas SaaS que querem oferecer prospecção aos clientes, agências, consultorias e times de dados que precisam de leads B2B analisados."},
    {"question":"A Wiize API é segura?","answer":"O acesso é feito por chaves de API que podem ser gerenciadas e revogadas no painel. A recomendação é usar a chave apenas no servidor, nunca exposta em navegador ou aplicativos públicos."},
    {"question":"Os dados da Wiize API respeitam a LGPD?","answer":"A Wiize é uma plataforma exclusivamente B2B e trabalha com informações de empresas. Cabe a quem integra usar os dados de acordo com a LGPD e as boas práticas de contato comercial."}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'api-de-prospeccao-b2b-analise-de-leads-wiize-api');

COMMIT;

-- Conferência:
-- SELECT slug, title, status FROM public.blog_posts
-- WHERE slug IN (
--   'templates-whatsapp-meta-api-oficial-como-criar-e-aprovar',
--   'formulario-captacao-leads-integrado-crm-automacao',
--   'api-de-prospeccao-b2b-analise-de-leads-wiize-api'
-- );
