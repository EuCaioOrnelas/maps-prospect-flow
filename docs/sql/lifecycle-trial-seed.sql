-- Seed da campanha de lifecycle do Trial (Dia 0 → Dia 8).
-- Idempotente: pode ser executado novamente sem duplicar.

INSERT INTO public.lifecycle_campaigns (key, name, description, type, status, from_name, from_email)
VALUES ('trial_wiize', 'Trial Wiize',
        'Sequência de relacionamento do teste gratuito de 7 dias (Dia 0 a Dia 8).',
        'trial', 'draft', 'Wiize', 'no-reply@wiize.com.br')
ON CONFLICT (key) DO NOTHING;

WITH c AS (SELECT id FROM public.lifecycle_campaigns WHERE key = 'trial_wiize')
INSERT INTO public.lifecycle_campaign_steps
  (campaign_id, key, day_offset, name, subject, preheader, content, audience, is_active)
SELECT c.id, s.key, s.day_offset, s.name, s.subject, s.preheader, s.content, s.audience, true
FROM c, (VALUES
 ('day_0', 0, 'Comece seu teste',
  'Sua conta está pronta, {{user.name}}',
  'Os primeiros 10 minutos definem o resto do seu teste.',
  '<p>Encontrar empresas que realmente precisam do que você vende costuma tomar horas — e nem sempre traz resposta.</p><p>Sua conta Wiize já está ativa. A partir de agora, a busca por oportunidades acontece enquanto você cuida do resto.</p><p>Comece por uma busca. É o passo que faz tudo o mais fazer sentido.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Começar agora</a></p>',
  'trial_active'),
 ('day_1', 1, 'Encontre empresas que precisam de você',
  'Onde estão seus próximos clientes?',
  'Uma busca bem feita vale mais do que uma lista comprada.',
  '<p>Lista genérica gera contato genérico — e silêncio.</p><p>Na Wiize você escolhe o nicho e a região, e recebe empresas reais com diagnóstico de cada uma: o que já têm, o que falta e por onde começar a conversa.</p><p>Faça sua primeira busca com o nicho que você mais domina.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Buscar oportunidades</a></p>',
  'trial_active'),
 ('day_2', 2, 'Transforme buscas em conversas',
  'A oportunidade só existe quando vira conversa',
  'Do lead encontrado à primeira mensagem.',
  '<p>Lead salvo não paga conta. Conversa aberta, sim.</p><p>Com o WhatsApp conectado, você fala com quem acabou de encontrar sem trocar de aba, sem copiar número, sem perder o contexto do diagnóstico.</p><p>Conecte seu número e abra a primeira conversa ainda hoje.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Conectar meu WhatsApp</a></p>',
  'trial_active'),
 ('day_3', 3, 'Seu funil organizado',
  'Quantas oportunidades você já perdeu por esquecimento?',
  'O CRM que se preenche sozinho.',
  '<p>A maior parte das vendas não se perde no preço. Se perde no esquecimento.</p><p>No CRM da Wiize cada conversa vira um card, com etapa, histórico e pontuação — sem você alimentar planilha nenhuma.</p><p>Abra seu funil e veja onde cada oportunidade está parada.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Ver meu funil</a></p>',
  'trial_active'),
 ('day_4', 4, 'Deixe a IA atender por você',
  'E se ninguém mais ficasse sem resposta?',
  'Atendimento que não dorme.',
  '<p>Resposta que demora horas é venda que vai para o concorrente.</p><p>O agente de IA da Wiize responde no seu tom, qualifica e só chama você quando a conversa merece sua atenção.</p><p>Configure seu agente em poucos minutos.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Configurar meu agente</a></p>',
  'trial_active'),
 ('day_5', 5, 'Automatize o follow-up',
  'O follow-up que você não precisa lembrar de fazer',
  'Fluxos que continuam a conversa por você.',
  '<p>Quase todo negócio fechado passou por mais de um contato. E quase todo contato esquecido virou nada.</p><p>Com os fluxos da Wiize você define uma vez: quem não responder em X horas recebe uma nova mensagem, quem entrar em determinada etapa recebe outra.</p><p>Monte seu primeiro fluxo e veja o follow-up acontecer sozinho.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Criar meu fluxo</a></p>',
  'trial_active'),
 ('day_6', 6, 'Falta pouco',
  'Seu teste termina em {{trial.days_remaining}} dia(s)',
  'Ainda dá tempo de usar o que falta.',
  '<p>Alguns recursos só mostram o valor quando você usa — e é fácil deixar para depois.</p><p>Seu teste vai até {{trial.end_date}}. Este é um bom momento para fazer mais uma busca, abrir mais conversas e deixar um fluxo rodando.</p><p>Se quiser garantir a continuidade desde já, é só escolher seu plano.</p><p><a href="{{dashboard_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Voltar para a Wiize</a> &nbsp; <a href="{{checkout_url}}" style="color:#3daa57;font-weight:600;">Ver planos</a></p>',
  'trial_active'),
 ('day_7', 7, 'Último dia do seu teste',
  'Hoje é o último dia do seu teste',
  'Amanhã o acesso muda. Suas oportunidades continuam.',
  '<p>Amanhã seu acesso ao teste termina.</p><p>As empresas que você encontrou, as conversas abertas e o funil que começou a montar continuam onde estão — o que muda é a sua capacidade de continuar.</p><p>Escolher um plano hoje mantém tudo funcionando sem interrupção.</p><p><a href="{{checkout_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Escolher meu plano</a></p>',
  'trial_active'),
 ('day_8', 8, 'Seu Trial acabou. E agora?',
  'Seu teste acabou. As oportunidades, não.',
  'Você pode voltar de onde parou.',
  '<p>Seu teste chegou ao fim. Mas o problema que te trouxe aqui continua: encontrar empresas certas e não deixar conversa morrer no meio.</p><p>Tudo o que você construiu está salvo. Ao reativar, você volta exatamente de onde parou.</p><p>E se ficou alguma dúvida sobre plano, preço ou uso, fale com a gente — sem compromisso.</p><p><a href="{{checkout_url}}" style="display:inline-block;background:#3daa57;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">Voltar para a Wiize</a> &nbsp; <a href="https://wiize.com.br/contato" style="color:#3daa57;font-weight:600;">Fale com nosso time</a></p>',
  'trial_ended_no_subscription')
) AS s(key, day_offset, name, subject, preheader, content, audience)
ON CONFLICT (campaign_id, key) DO NOTHING;
