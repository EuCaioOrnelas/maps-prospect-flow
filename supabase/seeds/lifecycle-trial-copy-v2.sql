-- ============================================================
-- Wiize — Trial Email Flow | Copy V2
-- Atualiza somente assunto, preheader, nome e conteúdo dos Dias 0–8.
-- Seguro para executar novamente: não cria campanhas, etapas ou envios.
-- A transação é cancelada por inteiro se a campanha ou alguma etapa faltar.
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
    RAISE EXCEPTION 'Campanha trial_wiize não encontrada ou duplicada. Nenhuma alteração foi aplicada.';
  END IF;

  SELECT count(DISTINCT s.key) INTO step_count
  FROM public.lifecycle_campaign_steps s
  JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
  WHERE c.key = 'trial_wiize'
    AND s.key IN ('day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6', 'day_7', 'day_8');

  IF step_count <> 9 THEN
    RAISE EXCEPTION 'Foram encontradas % de 9 etapas. Nenhuma alteração foi aplicada.', step_count;
  END IF;
END $$;

WITH new_copy (key, name, subject, preheader, content) AS (
  VALUES
  (
    'day_0',
    'Comece seu teste',
    'O crescimento da sua empresa não pode depender do acaso',
    'Sua operação comercial começa a mudar com uma decisão simples hoje.',
    $email$
      <h1>Seu próximo cliente não deveria depender da sorte.</h1>
      <p>Olá, <strong>{{user.name}}</strong>.</p>
      <p>Você não criou uma conta na Wiize para conhecer mais uma ferramenta. Você chegou até aqui porque sabe que <strong>uma operação comercial sem processo perde oportunidades todos os dias</strong>: empresas certas passam despercebidas, conversas esfriam e o time trabalha sem saber onde concentrar energia.</p>
      <blockquote><strong>Hoje você pode interromper esse ciclo.</strong> A Wiize reúne prospecção, inteligência, WhatsApp, CRM e automações para transformar esforço disperso em uma rotina comercial clara.</blockquote>
      <h2>Comece pelo movimento que abre todas as outras possibilidades</h2>
      <p>Entre na plataforma e faça sua primeira busca. Escolha o mercado em que sua empresa tem mais autoridade e encontre negócios que façam sentido para a sua oferta.</p>
      <p><strong>Não tente configurar tudo agora.</strong> Encontre a primeira oportunidade. Veja o diagnóstico. Entenda o contexto. É assim que a Wiize deixa de ser uma promessa e começa a trabalhar a favor da sua operação.</p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Acessar a Wiize e começar</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">Seu teste já está ativo. A primeira oportunidade pode estar a uma busca de distância.</p>
    $email$
  ),
  (
    'day_1',
    'Encontre empresas que precisam de você',
    'Pare de prospectar empresas que nunca deveriam estar na sua lista',
    'Menos listas genéricas. Mais contexto para escolher quem realmente merece sua atenção.',
    $email$
      <h1>Uma lista cheia pode esconder um funil vazio.</h1>
      <p>Quando a prospecção começa por uma lista genérica, o restante da operação nasce fraco. O time perde tempo pesquisando, aborda empresas sem aderência e recebe o silêncio como resposta.</p>
      <p><strong>O problema não é falta de esforço. É falta de contexto antes do primeiro contato.</strong></p>
      <h2>Imagine começar a conversa sabendo onde existe espaço</h2>
      <p>Na Wiize, você pesquisa por nicho e localização, encontra empresas reais e analisa sinais que ajudam a decidir onde vale investir atenção. Em vez de abordar todo mundo, você passa a construir uma lista com intenção.</p>
      <ul>
        <li><strong>Escolha um nicho</strong> em que sua solução tenha força.</li>
        <li><strong>Defina a região</strong> que sua operação consegue atender.</li>
        <li><strong>Analise cada oportunidade</strong> antes de iniciar a abordagem.</li>
      </ul>
      <blockquote>A prospecção muda quando você deixa de perguntar “para quem eu mando mensagem?” e começa a enxergar <strong>“por que esta empresa deveria conversar comigo?”</strong>.</blockquote>
      <p>Faça uma busca agora. Não para acumular contatos — para encontrar uma empresa que você realmente gostaria de conquistar.</p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Encontrar oportunidades agora</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">Acesse sua conta e transforme pesquisa em direção comercial.</p>
    $email$
  ),
  (
    'day_2',
    'Transforme buscas em conversas',
    'Lead encontrado não é oportunidade até existir uma conversa',
    'A distância entre descobrir uma empresa e iniciar uma venda precisa ser menor.',
    $email$
      <h1>Encontrar o lead e não agir é entregar a oportunidade ao tempo.</h1>
      <p>Você pode ter o contato certo, o diagnóstico certo e uma oferta relevante. Mas, enquanto tudo isso permanece parado em uma tela, <strong>não existe conversa, avanço ou venda possível</strong>.</p>
      <p>É nesse intervalo — entre encontrar e abordar — que muitas oportunidades desaparecem.</p>
      <h2>A Wiize foi feita para encurtar essa distância</h2>
      <p>Conecte seu WhatsApp e leve o contexto da prospecção para a conversa. Assim, sua abordagem pode nascer da realidade daquela empresa, em vez de parecer mais uma mensagem genérica enviada em massa.</p>
      <blockquote><strong>Uma boa primeira mensagem não tenta vender tudo.</strong> Ela mostra que existe um motivo verdadeiro para aquela conversa começar.</blockquote>
      <p>Ao entrar na plataforma hoje:</p>
      <ul>
        <li>Escolha uma oportunidade que faça sentido.</li>
        <li>Revise o diagnóstico antes de escrever.</li>
        <li>Conecte seu número e dê o primeiro passo com contexto.</li>
      </ul>
      <p><strong>Seu funil não precisa de mais nomes. Precisa de conversas vivas.</strong></p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Acessar e iniciar uma conversa</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">A oportunidade ganha valor quando alguém decide agir.</p>
    $email$
  ),
  (
    'day_3',
    'Seu funil organizado',
    'O cliente não disse não. Talvez sua operação apenas tenha esquecido dele.',
    'Veja como transformar conversas soltas em um processo comercial que você consegue conduzir.',
    $email$
      <h1>Oportunidades raramente desaparecem de uma vez.</h1>
      <p>Elas somem aos poucos: uma resposta que ninguém acompanhou, uma conversa sem próxima ação, um contato promissor esquecido entre abas, planilhas e anotações.</p>
      <p><strong>Quando ninguém sabe exatamente onde cada negociação está, o funil deixa de orientar — e passa apenas a registrar atrasos.</strong></p>
      <h2>Agora imagine abrir sua operação e enxergar o próximo movimento</h2>
      <p>O CRM da Wiize organiza contatos, conversas, etapas e informações comerciais em um só lugar. Você visualiza o que está começando, o que precisa avançar e o que corre risco de esfriar.</p>
      <ul>
        <li><strong>Prioridade:</strong> concentre energia nas oportunidades que pedem ação.</li>
        <li><strong>Contexto:</strong> retome conversas sem começar do zero.</li>
        <li><strong>Continuidade:</strong> dê ao time uma visão comum do processo.</li>
      </ul>
      <blockquote>Organização não serve para deixar o quadro bonito. Serve para <strong>não permitir que uma venda possível morra por falta de acompanhamento</strong>.</blockquote>
      <p>Abra seu funil agora e escolha uma oportunidade para avançar. Um único próximo passo claro vale mais do que dezenas de contatos parados.</p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Organizar meu funil agora</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">Entre na Wiize e transforme informação em próxima ação.</p>
    $email$
  ),
  (
    'day_4',
    'Deixe a IA atender por você',
    'Quantas oportunidades esfriam enquanto sua equipe está ocupada?',
    'Use a IA para sustentar o atendimento sem apagar a personalidade da sua empresa.',
    $email$
      <h1>O interesse do cliente tem um ritmo. Sua operação precisa acompanhá-lo.</h1>
      <p>Quando uma mensagem chega, existe uma janela de atenção aberta. Se a resposta demora, a urgência diminui, a dúvida cresce e outra empresa pode ocupar aquele espaço.</p>
      <p>Mas manter pessoas disponíveis o tempo inteiro não é uma solução sustentável. <strong>É exatamente aqui que uma IA bem configurada deixa de ser novidade e vira capacidade operacional.</strong></p>
      <h2>Atenda com velocidade sem transformar sua marca em um robô</h2>
      <p>Na Wiize, você configura um agente com o contexto, o tom e os objetivos da sua empresa. Ele pode conduzir o início da conversa, fazer perguntas relevantes e ajudar a identificar quando a atenção humana é necessária.</p>
      <blockquote>Não se trata de afastar pessoas. Trata-se de <strong>reservar o tempo humano para as conversas em que ele produz mais valor</strong>.</blockquote>
      <p>Entre hoje e configure a base do seu agente:</p>
      <ul>
        <li>Explique o que sua empresa oferece.</li>
        <li>Defina como ela deve se comunicar.</li>
        <li>Determine o que precisa ser identificado em cada conversa.</li>
      </ul>
      <p><strong>A experiência do cliente começa antes de alguém do seu time conseguir parar para responder.</strong></p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Configurar meu agente de IA</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">Acesse a Wiize e desenhe uma experiência que continue mesmo quando sua equipe estiver ocupada.</p>
    $email$
  ),
  (
    'day_5',
    'Automatize o follow-up',
    'A maioria dos contatos não responde no seu primeiro tempo',
    'Crie uma continuidade comercial que não dependa da memória de alguém.',
    $email$
      <h1>O silêncio do lead não é sempre um “não”.</h1>
      <p>Às vezes é reunião, prioridade, dúvida, distração ou simplesmente o momento errado. O problema começa quando sua operação interpreta qualquer silêncio como fim da conversa — ou depende de alguém lembrar de tentar novamente.</p>
      <p><strong>Sem continuidade, até uma abordagem promissora vira apenas mais uma conversa abandonada.</strong></p>
      <h2>Transforme intenção em processo</h2>
      <p>Os fluxos da Wiize permitem definir o que deve acontecer quando um contato não responde, muda de etapa ou alcança uma condição importante. Você desenha a lógica uma vez e cria consistência para os próximos movimentos.</p>
      <ul>
        <li>Defina <strong>quem</strong> deve entrar no fluxo.</li>
        <li>Escolha <strong>quando</strong> uma nova ação deve acontecer.</li>
        <li>Construa mensagens que preservem contexto e intenção.</li>
      </ul>
      <blockquote>Automação não é insistir sem critério. É garantir que <strong>uma oportunidade relevante receba a continuidade que merece</strong>.</blockquote>
      <p>Crie hoje um fluxo simples para um cenário real da sua empresa. Comece pequeno, observe a lógica e transforme o follow-up em parte do sistema — não em mais uma tarefa esquecida.</p>
      <p style="margin:28px 0;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Criar meu primeiro fluxo</a></p>
      <p style="font-size:14px;color:#71717a;text-align:center;">Entre na Wiize e dê continuidade às conversas que ainda podem avançar.</p>
    $email$
  ),
  (
    'day_6',
    'Falta pouco',
    'Seu teste está terminando — mas a decisão mais importante ainda cabe hoje',
    'Use o tempo restante para sentir a Wiize trabalhando dentro da sua operação.',
    $email$
      <h1>Seu teste termina em {{trial.days_remaining}} dia(s). Não deixe a experiência terminar antes de começar.</h1>
      <p>Existe uma diferença enorme entre <strong>olhar recursos</strong> e <strong>usar a plataforma em uma situação real</strong>. É no segundo momento que você percebe se a Wiize pode fazer parte da rotina da sua empresa.</p>
      <p>Seu acesso de teste vai até <strong>{{trial.end_date}}</strong>. Ainda há tempo para conectar as partes e enxergar a operação completa:</p>
      <ul>
        <li>Encontre uma empresa alinhada ao seu mercado.</li>
        <li>Analise o contexto antes da abordagem.</li>
        <li>Organize a oportunidade no CRM.</li>
        <li>Configure uma automação para sustentar a continuidade.</li>
      </ul>
      <blockquote>Você não precisa testar tudo. Precisa testar <strong>o caminho que mais se parece com a venda que sua empresa quer repetir</strong>.</blockquote>
      <p>Volte agora e conclua esse caminho. Se a Wiize fizer sentido para sua operação, escolha o plano que preserva o que você começou a construir.</p>
      <p style="margin:28px 0 14px;text-align:center;"><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Continuar meu teste agora</a></p>
      <p style="margin:0;text-align:center;"><a href="{{checkout_url}}" style="color:#3daa57;font-weight:700;font-size:15px;">Conhecer os planos da Wiize →</a></p>
    $email$
  ),
  (
    'day_7',
    'Último dia do seu teste',
    'Hoje é o último dia para decidir como sua operação continua',
    'O que você começou na Wiize pode se tornar parte permanente do seu processo comercial.',
    $email$
      <h1>Hoje termina o teste. A necessidade de crescer com processo, não.</h1>
      <p>Nos últimos dias, você teve acesso a uma forma diferente de conduzir a operação comercial: encontrar oportunidades, entender contexto, iniciar conversas, organizar o funil e construir continuidade no mesmo ambiente.</p>
      <p>A pergunta agora não é apenas “qual recurso eu gostei?”. A pergunta é:</p>
      <blockquote><strong>Quanto custa continuar dependendo de tarefas manuais, informações espalhadas e oportunidades que ninguém acompanha até o fim?</strong></blockquote>
      <h2>O que você começou não precisa parar aqui</h2>
      <p>Ao escolher um plano, sua empresa mantém o acesso à estrutura necessária para continuar desenvolvendo essa rotina. Seus dados e o trabalho já realizado permanecem vinculados à sua conta.</p>
      <p><strong>Não assine por impulso.</strong> Continue se você reconhece que prospecção, atendimento e gestão precisam funcionar como um sistema — e que voltar ao improviso não é o caminho desejado.</p>
      <p>Hoje é o momento de transformar o teste em continuidade.</p>
      <p style="margin:28px 0 14px;text-align:center;"><a href="{{checkout_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Escolher meu plano e continuar</a></p>
      <p style="margin:0;text-align:center;"><a href="{{dashboard_url}}" style="color:#3daa57;font-weight:700;font-size:15px;">Acessar a Wiize antes do fim do teste →</a></p>
    $email$
  ),
  (
    'day_8',
    'Seu Trial acabou. E agora?',
    'Seu teste terminou. O problema que trouxe você até aqui continua esperando uma decisão.',
    'Sua estrutura está salva. Você pode retomar a operação que começou a construir.',
    $email$
      <h1>O teste acabou. A oportunidade de mudar sua operação, não.</h1>
      <p>Talvez você tenha explorado cada área. Talvez a rotina tenha tomado o tempo e você tenha usado menos do que pretendia. Em qualquer um dos casos, existe algo que não mudou:</p>
      <blockquote><strong>Sua empresa ainda precisa encontrar as oportunidades certas, responder no momento certo e impedir que boas conversas desapareçam por falta de processo.</strong></blockquote>
      <p>A Wiize existe para reunir essas partes. Não para adicionar mais uma tela à sua rotina, mas para ajudar prospecção, atendimento, CRM, IA e automações a trabalharem na mesma direção.</p>
      <h2>Você não precisa recomeçar do zero</h2>
      <p>O que você configurou e organizou permanece vinculado à sua conta. Ao escolher um plano, você pode retomar de onde parou e continuar construindo uma operação comercial mais clara, consistente e preparada para agir.</p>
      <ul>
        <li><strong>Menos dispersão</strong> entre ferramentas e tarefas.</li>
        <li><strong>Mais contexto</strong> para abordar e atender.</li>
        <li><strong>Mais continuidade</strong> para oportunidades que ainda podem avançar.</li>
      </ul>
      <p>Se este é o tipo de operação que você quer construir, <strong>não deixe a decisão desaparecer junto com o fim do teste</strong>.</p>
      <p style="margin:28px 0 14px;text-align:center;"><a href="{{checkout_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:700;font-size:16px;">Reativar minha conta agora</a></p>
      <p style="margin:0;text-align:center;"><a href="https://wiize.com.br/contato" style="color:#3daa57;font-weight:700;font-size:15px;">Ainda tenho dúvidas — falar com a Wiize →</a></p>
    $email$
  )
)
UPDATE public.lifecycle_campaign_steps AS step
SET
  name = new_copy.name,
  subject = new_copy.subject,
  preheader = new_copy.preheader,
  content = new_copy.content,
  updated_at = now()
FROM new_copy
JOIN public.lifecycle_campaigns campaign
  ON campaign.key = 'trial_wiize'
WHERE step.campaign_id = campaign.id
  AND step.key = new_copy.key;

DO $$
DECLARE
  updated_step_count integer;
BEGIN
  SELECT count(*) INTO updated_step_count
  FROM public.lifecycle_campaign_steps s
  JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
  WHERE c.key = 'trial_wiize'
    AND s.key IN ('day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6', 'day_7', 'day_8')
    AND s.updated_at >= transaction_timestamp();

  IF updated_step_count <> 9 THEN
    RAISE EXCEPTION 'A atualização atingiu % de 9 etapas. A transação será cancelada.', updated_step_count;
  END IF;
END $$;

COMMIT;

-- Confirmação: o resultado deve exibir exatamente 9 linhas, do Dia 0 ao Dia 8.
SELECT
  s.day_offset AS dia,
  s.key,
  s.name,
  s.subject,
  s.preheader,
  s.updated_at
FROM public.lifecycle_campaign_steps s
JOIN public.lifecycle_campaigns c ON c.id = s.campaign_id
WHERE c.key = 'trial_wiize'
  AND s.key IN ('day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6', 'day_7', 'day_8')
ORDER BY s.day_offset;