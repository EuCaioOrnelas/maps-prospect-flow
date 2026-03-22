UPDATE renewal_email_templates SET content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Sua assinatura do plano <strong>{{plan_name}}</strong> vence em <strong>{{due_date}}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">Renove agora via PIX e garanta acesso contínuo à plataforma.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#92400e;">💡 Pode pagar com antecedência — a renovação será contabilizada a partir da data de vencimento atual.</p>
</div>' WHERE stage = 'D-5';

UPDATE renewal_email_templates SET content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Seu plano <strong>{{plan_name}}</strong> vence em <strong>3 dias</strong> ({{due_date}}).</p>
<p style="margin:0 0 16px;font-size:15px;">Para evitar qualquer interrupção no acesso, renove agora via PIX.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#92400e;">💡 Pode pagar com antecedência — a renovação será contabilizada a partir da data de vencimento atual.</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fef2f2;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#991b1b;">⚠️ Após o vencimento, o acesso será suspenso em até 24 horas.</p>
</div>' WHERE stage = 'D-3';

UPDATE renewal_email_templates SET content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Sua assinatura do <strong>{{plan_name}}</strong> vence <strong>amanhã</strong> ({{due_date}}).</p>
<p style="margin:0 0 16px;font-size:15px;">Se não renovar, seu acesso será suspenso em até 24 horas após o vencimento.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#92400e;">💡 Pode pagar com antecedência — a renovação será contabilizada a partir da data de vencimento atual.</p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fef2f2;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#991b1b;">⚠️ Após o vencimento, o acesso será suspenso em até 24 horas.</p>
</div>' WHERE stage = 'D-1';

UPDATE renewal_email_templates SET content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Seu plano <strong>{{plan_name}}</strong> vence <strong>hoje</strong> ({{due_date}}).</p>
<p style="margin:0 0 16px;font-size:15px;">Se o pagamento não for confirmado, seu acesso será suspenso em até 24 horas.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fef2f2;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#991b1b;">⚠️ Após o vencimento, o acesso será suspenso em até 24 horas.</p>
</div>' WHERE stage = 'D0';

UPDATE renewal_email_templates SET content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Seu plano <strong>{{plan_name}}</strong> venceu e o acesso foi <strong>suspenso</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">Para restaurar imediatamente, faça o pagamento via PIX.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<p style="margin:20px 0 0;font-size:14px;color:#71717a;">Assim que o pagamento for confirmado, seu acesso será restaurado automaticamente.</p>' WHERE stage = 'D+1';