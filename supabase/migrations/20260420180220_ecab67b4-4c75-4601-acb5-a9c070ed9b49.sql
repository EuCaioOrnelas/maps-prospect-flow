
-- Rewrite card templates to match PIX visual design (price card + warning box)

UPDATE public.renewal_email_templates SET
  title = 'Renovação automática em 5 dias 💳',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Em 5 dias ({{due_date}}) sua assinatura do <strong>{{plan_name}}</strong> será renovada automaticamente no seu cartão de crédito.</p>
<p style="margin:0 0 16px;font-size:15px;">Você não precisa fazer nada — apenas confira se o cartão está com limite disponível e dados atualizados.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fff7ed;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#9a3412;">⚠️ Verifique o limite disponível no cartão para evitar interrupção do serviço.</p>
</div>'
WHERE stage = 'D-5' AND payment_method = 'card';

UPDATE public.renewal_email_templates SET
  title = 'Faltam 3 dias para sua renovação 💳',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Em 3 dias ({{due_date}}) sua assinatura do <strong>{{plan_name}}</strong> será renovada automaticamente no cartão cadastrado.</p>
<p style="margin:0 0 16px;font-size:15px;">Garanta que o cartão tenha limite disponível e não esteja expirado para a cobrança ser processada sem problemas.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fff7ed;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#9a3412;">⚠️ Confira limite e validade do cartão para evitar suspensão do acesso.</p>
</div>'
WHERE stage = 'D-3' AND payment_method = 'card';

UPDATE public.renewal_email_templates SET
  title = 'Renovação amanhã 💳',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Amanhã ({{due_date}}) faremos a cobrança automática da sua assinatura <strong>{{plan_name}}</strong> no seu cartão de crédito.</p>
<p style="margin:0 0 16px;font-size:15px;">Esta é sua última verificação: confirme limite disponível, validade do cartão e dados atualizados para a renovação ocorrer sem falhas.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fff7ed;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#9a3412;">⚠️ Se a cobrança falhar, seu acesso pode ser suspenso em até 24 horas.</p>
</div>'
WHERE stage = 'D-1' AND payment_method = 'card';

UPDATE public.renewal_email_templates SET
  title = 'Renovação acontece hoje 🔄',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Hoje ({{due_date}}) faremos a cobrança automática da sua assinatura <strong>{{plan_name}}</strong> no cartão cadastrado.</p>
<p style="margin:0 0 16px;font-size:15px;">Você não precisa fazer nada — basta garantir que o cartão tenha limite disponível.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fff7ed;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#9a3412;">⚠️ Caso o pagamento não seja autorizado, atualize seus dados o quanto antes.</p>
</div>'
WHERE stage = 'D0' AND payment_method = 'card';

UPDATE public.renewal_email_templates SET
  title = 'Cobrança não autorizada ⚠️',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Tentamos renovar sua assinatura <strong>{{plan_name}}</strong> no cartão cadastrado, mas a cobrança <strong>não foi autorizada</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">Possíveis causas: limite insuficiente, cartão expirado/bloqueado ou dados desatualizados.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor pendente</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fef2f2;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#991b1b;">⛔ Atualize seus dados de pagamento para reativar seu acesso completo.</p>
</div>'
WHERE stage = 'D+1' AND payment_method = 'card';

-- Also update PIX templates so {{amount}} can be pre-formatted by cron (no hardcoded /mês)
-- We'll still keep visual structure; just rely on cron to send "R$ 297/mês" or "R$ 2.964/ano" already formatted
UPDATE public.renewal_email_templates SET
  content = REPLACE(content, '{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span>', '{{amount}}')
WHERE payment_method = 'pix';
