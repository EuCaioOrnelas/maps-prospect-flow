-- ============================================================
-- Wiize , Trial Email Flow | Copy V4 Premium Leitura
-- Execute este arquivo inteiro no editor SQL.
-- Atualiza as 9 etapas existentes sem criar ou duplicar envios.
-- ============================================================

BEGIN;

DO $$
DECLARE
  campaign_count integer;
  step_count integer;
BEGIN
  SELECT count(*) INTO campaign_count
  FROM public.lifecycle_campaigns
  WHERE key = 'trial_wiize';

  IF campaign_count <> 1 THEN
    RAISE EXCEPTION 'Campanha trial_wiize não encontrada ou duplicada. Nada foi alterado.';
  END IF;

  SELECT count(DISTINCT s.key) INTO step_count
  FROM public.lifecycle_campaign_steps s
  JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
  WHERE c.key = 'trial_wiize'
    AND s.key IN ('day_0','day_1','day_2','day_3','day_4','day_5','day_6','day_7','day_8');

  IF step_count <> 9 THEN
    RAISE EXCEPTION 'Foram encontradas % de 9 etapas. Nada foi alterado.', step_count;
  END IF;
END $$;

WITH new_copy (key, name, subject, preheader, content) AS (
  VALUES
  (
    'day_0',
    'Comece seu teste',
    '🚀 {{user.name}}, sua operação comercial começa aqui',
    'Dê o primeiro passo e encontre uma oportunidade real hoje.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Bem-vindo à Wiize</p>
      <h1>🚀 Encontre sua próxima oportunidade</h1>
      <p>Olá, <strong>{{user.name}}</strong>. Seu teste já está ativo , e você não precisa configurar tudo para começar.</p>
      <blockquote><strong>Seu primeiro objetivo:</strong> encontrar uma empresa que realmente combine com o que você vende.</blockquote>
      <p>Faça uma busca por <strong>nicho e localização</strong>. Em poucos minutos, você terá contexto para decidir onde vale investir atenção.</p>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Encontrar minha primeira oportunidade →</a></p>
      <p style="font-size:13px;color:#9ca3af;text-align:center;">Comece pequeno. Uma oportunidade real já muda o jogo.</p>
    $email$
  ),
  (
    'day_1',
    'Encontre empresas certas',
    '🎯 Pare de prospectar no escuro',
    'Descubra empresas com contexto antes do primeiro contato.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Prospecção com direção</p>
      <h1>🎯 Sua lista deveria mostrar onde agir</h1>
      <p>Uma lista grande não garante um funil forte. <strong>Contexto é o que transforma nomes em oportunidades.</strong> <em>Comece por quem tem mais aderência à sua oferta.</em></p>
      <h2>Hoje, faça uma busca intencional</h2>
      <ul><li>Escolha um nicho em que sua oferta tenha força.</li><li>Defina a região que você atende.</li><li>Analise os sinais antes de abordar.</li></ul>
      <blockquote>Não procure todo mundo. Encontre quem merece uma conversa.</blockquote>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Descobrir empresas agora →</a></p>
    $email$
  ),
  (
    'day_2',
    'Transforme buscas em conversas',
    '💬 O lead certo está a uma conversa de distância',
    'Use contexto para começar conversas que não parecem mensagem em massa.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Da descoberta à conversa</p>
      <h1>💬 Lead parado não vira oportunidade</h1>
      <p>Você já sabe quem abordar. Agora, use o contexto encontrado para criar uma mensagem que tenha <strong>motivo para existir</strong>.</p>
      <blockquote><strong>Uma boa abertura não tenta vender tudo.</strong> Ela mostra que você entendeu algo relevante sobre aquela empresa.</blockquote>
      <p><em>Escolha uma oportunidade, revise o diagnóstico e inicie uma conversa clara pelo WhatsApp.</em></p>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Iniciar uma conversa com contexto →</a></p>
    $email$
  ),
  (
    'day_3',
    'Organize seu funil',
    '📈 Sua próxima venda pode estar esquecida no funil',
    'Veja cada oportunidade e saiba qual movimento fazer agora.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">CRM que orienta</p>
      <h1>📈 Não deixe uma boa conversa desaparecer</h1>
      <p>Oportunidades esfriam quando ninguém sabe qual é o próximo passo. <strong>Seu CRM deve conduzir a ação, não apenas guardar dados.</strong></p>
      <ul><li>Veja o que precisa avançar.</li><li>Retome conversas com contexto.</li><li>Priorize quem pede atenção agora.</li></ul>
      <blockquote>Um próximo passo claro vale mais que dezenas de contatos parados.</blockquote>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Organizar meu funil →</a></p>
    $email$
  ),
  (
    'day_4',
    'Atenda com IA',
    '🤖 Sua operação pode responder mesmo quando você não pode',
    'Configure uma IA que entende sua empresa e reconhece a hora do atendimento humano.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Velocidade com contexto</p>
      <h1>🤖 Transforme espera em atendimento</h1>
      <p>Quando o cliente demonstra interesse, <strong>cada minuto importa</strong>. Sua equipe não precisa estar disponível o tempo inteiro para manter a conversa viva.</p>
      <blockquote><strong>A IA não substitui sua equipe.</strong> Ela prepara o caminho para que pessoas entrem onde geram mais valor.</blockquote>
      <p><em>Defina o que sua empresa oferece, como se comunica e quando o atendimento deve passar para uma pessoa.</em></p>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Configurar meu agente de IA →</a></p>
    $email$
  ),
  (
    'day_5',
    'Automatize o follow-up',
    '⚡ O silêncio do lead não precisa encerrar a venda',
    'Crie continuidade sem depender da memória da sua equipe.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Continuidade automática</p>
      <h1>⚡ Não confunda silêncio com desinteresse</h1>
      <p>Reuniões, prioridades e distrações interrompem conversas promissoras. <strong>Sem follow-up, o timing decide por você.</strong></p>
      <h2>Crie uma continuidade inteligente</h2>
      <p>Defina <strong>quem entra no fluxo</strong>, quando a próxima ação acontece e qual mensagem preserva o contexto da conversa.</p>
      <blockquote>Automatizar não é insistir. É impedir que uma oportunidade relevante seja esquecida.</blockquote>
      <p style="margin:26px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Criar meu primeiro fluxo →</a></p>
    $email$
  ),
  (
    'day_6',
    'Aproveite o tempo restante',
    '⏳ {{user.name}}, ainda dá tempo de sentir a Wiize funcionando',
    'Seu teste termina em {{trial.days_remaining}} dia(s). Complete uma jornada real hoje.',
    $email$
      <p style="margin:0 0 10px;color:#b45309;font-size:13px;font-weight:800;text-transform:uppercase;">Seu trial termina em breve</p>
      <h1>⏳ Teste o caminho que você quer repetir</h1>
      <p>Seu acesso vai até <strong>{{trial.end_date}}</strong>. Ainda dá tempo de experimentar a Wiize em uma situação real.</p>
      <ul><li>Encontre uma empresa alinhada.</li><li>Analise o contexto.</li><li>Organize a oportunidade.</li><li>Crie a próxima ação.</li></ul>
      <blockquote><em>Você não precisa testar tudo.</em> Precisa provar o fluxo que mais importa para sua operação.</blockquote>
      <p style="margin:26px 0 12px;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Continuar meu teste →</a></p>
      <p style="margin:0;text-align:center;"><a href="{{checkout_url}}" style="color:#199b68;font-weight:800;font-size:14px;">Ver planos da Wiize</a></p>
    $email$
  ),
  (
    'day_7',
    'Último dia do teste',
    '🔥 Último dia: mantenha sua operação em movimento',
    'Seu trabalho está salvo. Escolha como sua operação continua.',
    $email$
      <p style="margin:0 0 10px;color:#dc2626;font-size:13px;font-weight:800;text-transform:uppercase;">Último dia do trial</p>
      <h1>🔥 O teste termina hoje. Seu avanço não precisa.</h1>
      <p>Você conheceu uma forma de unir <strong>prospecção, conversas, CRM, IA e automação</strong> em uma operação mais clara.</p>
      <blockquote><strong>A decisão de hoje é simples:</strong> voltar ao improviso ou continuar construindo um processo que mostra onde agir.</blockquote>
      <p><em>Se a Wiize faz sentido para sua empresa</em>, escolha o plano que mantém seu trabalho e sua rotina em movimento.</p>
      <p style="margin:26px 0 12px;text-align:center;"><a href="{{checkout_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Escolher meu plano →</a></p>
      <p style="margin:0;text-align:center;"><a href="{{dashboard_url}}" style="color:#199b68;font-weight:800;font-size:14px;">Acessar a Wiize antes do fim</a></p>
    $email$
  ),
  (
    'day_8',
    'Seu trial terminou',
    '✨ Seu trial terminou , mas sua operação não precisa voltar atrás',
    'Retome o que você construiu e continue de onde parou.',
    $email$
      <p style="margin:0 0 10px;color:#199b68;font-size:13px;font-weight:800;text-transform:uppercase;">Seu trabalho continua salvo</p>
      <h1>✨ Você não precisa recomeçar do zero</h1>
      <p>Seu teste terminou, mas <strong>o que você configurou permanece vinculado à sua conta</strong>.</p>
      <p><strong>Ao escolher um plano, você retoma de onde parou:</strong> oportunidades, contexto, organização e automações trabalhando na mesma direção.</p>
      <blockquote>O trial acabou. A possibilidade de transformar sua operação, não.</blockquote>
      <p style="margin:26px 0 12px;text-align:center;"><a href="{{checkout_url}}" style="display:inline-block;background:#199b68;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:800;font-size:15px;">Retomar minha operação →</a></p>
      <p style="margin:0;text-align:center;"><a href="https://wiize.com.br/contato" style="color:#199b68;font-weight:800;font-size:14px;">Falar com a equipe Wiize</a></p>
    $email$
  )
)
UPDATE public.lifecycle_campaign_steps AS step
SET name = new_copy.name,
    subject = new_copy.subject,
    preheader = new_copy.preheader,
    content = new_copy.content,
    updated_at = now()
FROM new_copy
JOIN public.lifecycle_campaigns campaign ON campaign.key = 'trial_wiize'
WHERE step.campaign_id = campaign.id
  AND step.key = new_copy.key;

DO $$
DECLARE updated_step_count integer;
BEGIN
  SELECT count(*) INTO updated_step_count
  FROM public.lifecycle_campaign_steps s
  JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
  WHERE c.key = 'trial_wiize'
    AND s.key IN ('day_0','day_1','day_2','day_3','day_4','day_5','day_6','day_7','day_8')
    AND s.updated_at >= transaction_timestamp();

  IF updated_step_count <> 9 THEN
    RAISE EXCEPTION 'A atualização atingiu % de 9 etapas. Tudo será cancelado.', updated_step_count;
  END IF;
END $$;

COMMIT;

SELECT s.day_offset AS dia, s.key, s.name, s.subject, s.preheader, s.updated_at
FROM public.lifecycle_campaign_steps s
JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
WHERE c.key = 'trial_wiize'
  AND s.key IN ('day_0','day_1','day_2','day_3','day_4','day_5','day_6','day_7','day_8')
ORDER BY s.day_offset;