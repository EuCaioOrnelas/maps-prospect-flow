-- Update renewal email templates to friendly reminder tone (Asaas handles billing)

UPDATE renewal_email_templates SET
  subject = 'Lembrete: sua assinatura Wiize renova em breve',
  title = 'Sua renovação está chegando! ✨',
  cta_text = 'Ver minha assinatura',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Só passando para lembrar que sua assinatura do <strong>{{plan_name}}</strong> renova automaticamente em <strong>{{due_date}}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">Você não precisa fazer nada! O PIX será cobrado automaticamente na data de renovação.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#eff6ff;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#1e40af;">ℹ️ Caso deseje cancelar ou alterar seu plano, acesse seu perfil antes da data de renovação.</p>
</div>'
WHERE stage = 'D-5';

UPDATE renewal_email_templates SET
  subject = 'Sua Wiize renova em 3 dias',
  title = 'Renovação em breve 📅',
  cta_text = 'Ver minha conta',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Sua assinatura do <strong>{{plan_name}}</strong> renova automaticamente em <strong>3 dias</strong> ({{due_date}}).</p>
<p style="margin:0 0 16px;font-size:15px;">O valor será debitado automaticamente via PIX. Sem burocracia, sem interrupção.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#eff6ff;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#1e40af;">ℹ️ Quer cancelar ou trocar de plano? Acesse seu perfil a qualquer momento.</p>
</div>'
WHERE stage = 'D-3';

UPDATE renewal_email_templates SET
  subject = 'Sua assinatura Wiize renova amanhã',
  title = 'Renovação amanhã ⏰',
  cta_text = 'Ver minha conta',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Amanhã sua assinatura do <strong>{{plan_name}}</strong> será renovada automaticamente ({{due_date}}).</p>
<p style="margin:0 0 16px;font-size:15px;">Certifique-se de que há saldo disponível na conta vinculada ao PIX para que a cobrança seja processada sem problemas.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#92400e;">💡 Dica: mantenha saldo disponível para evitar falha na cobrança automática.</p>
</div>'
WHERE stage = 'D-1';

UPDATE renewal_email_templates SET
  subject = 'Sua assinatura Wiize renova hoje',
  title = 'Renovação hoje 🔄',
  cta_text = 'Ver minha conta',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Hoje é o dia da renovação do seu plano <strong>{{plan_name}}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">O valor será cobrado automaticamente via PIX. Se a cobrança for processada com sucesso, seu plano continua ativo normalmente.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<div style="margin:20px 0;padding:12px 16px;background:#eff6ff;border-radius:8px;">
  <p style="margin:0;font-size:13px;color:#1e40af;">ℹ️ Se houver algum problema com a cobrança, entraremos em contato.</p>
</div>'
WHERE stage = 'D0';

UPDATE renewal_email_templates SET
  subject = 'Houve um problema com sua renovação Wiize',
  title = 'Problema na renovação ⚠️',
  cta_text = 'Regularizar minha conta',
  content = '<p style="margin:0 0 16px;font-size:15px;">Olá, {{user_name}}!</p>
<p style="margin:0 0 16px;font-size:15px;">Não conseguimos processar a renovação automática do seu plano <strong>{{plan_name}}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;">Isso pode ter acontecido por saldo insuficiente ou limite na conta PIX. Seu acesso foi temporariamente suspenso.</p>
<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#71717a;">Valor para reativação</p>
  <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">{{amount}}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
</div>
<p style="margin:20px 0 0;font-size:14px;color:#71717a;">Clique no botão abaixo para regularizar e restaurar seu acesso imediatamente.</p>'
WHERE stage = 'D+1';
