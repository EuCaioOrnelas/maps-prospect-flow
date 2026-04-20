
-- 1. Add payment_method column
ALTER TABLE public.renewal_email_templates
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix';

-- 2. Mark existing templates as pix
UPDATE public.renewal_email_templates SET payment_method = 'pix' WHERE payment_method IS NULL OR payment_method = 'pix';

-- 3. Drop old unique on stage and create composite unique (stage, payment_method)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'renewal_email_templates_stage_key'
  ) THEN
    ALTER TABLE public.renewal_email_templates DROP CONSTRAINT renewal_email_templates_stage_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS renewal_email_templates_stage_method_idx
  ON public.renewal_email_templates(stage, payment_method);

-- 4. Insert card templates (D-5, D-3, D-1, D0, D+1)
INSERT INTO public.renewal_email_templates (stage, payment_method, subject, preview_text, title, content, cta_text, is_published, version)
VALUES
('D-5', 'card',
  'Sua Wiize renova em 5 dias — confira seu cartão',
  'Garanta que seu cartão tenha limite disponível para a renovação automática.',
  'Renovação automática em 5 dias',
  '<p>Olá <strong>{{user_name}}</strong>,</p>
   <p>Sua assinatura <strong>{{plan_name}}</strong> será renovada automaticamente no <strong>cartão de crédito</strong> em <strong>{{due_date}}</strong>, no valor de <strong>{{amount}}</strong>.</p>
   <p>✅ <strong>Você não precisa fazer nada</strong> — a cobrança ocorre de forma automática.</p>
   <p>Para evitar qualquer problema, recomendamos:</p>
   <ul>
     <li>Verificar se seu cartão tem <strong>limite disponível</strong></li>
     <li>Confirmar que o cartão não expirou</li>
     <li>Atualizar o cartão pelo portal, se necessário</li>
   </ul>',
  'Gerenciar minha assinatura', true, 1),

('D-3', 'card',
  'Renovação em 3 dias — verifique limite do cartão',
  'Faltam 3 dias para a cobrança automática no seu cartão.',
  'Faltam 3 dias para sua renovação',
  '<p>Olá <strong>{{user_name}}</strong>,</p>
   <p>Faltam apenas <strong>3 dias</strong> para a renovação automática da sua assinatura <strong>{{plan_name}}</strong> ({{amount}}) no dia <strong>{{due_date}}</strong>.</p>
   <p>A cobrança ocorre direto no <strong>cartão cadastrado</strong>. Para evitar suspensão do acesso:</p>
   <ul>
     <li>Confirme que há <strong>limite disponível</strong> no cartão</li>
     <li>Verifique a data de validade</li>
     <li>Atualize seus dados de pagamento se algo mudou</li>
   </ul>',
  'Verificar dados do cartão', true, 1),

('D-1', 'card',
  'Sua Wiize renova amanhã — última verificação',
  'Amanhã haverá a cobrança automática no seu cartão.',
  'Renovação automática amanhã',
  '<p>Olá <strong>{{user_name}}</strong>,</p>
   <p>⚠️ Amanhã (<strong>{{due_date}}</strong>) faremos a cobrança automática de <strong>{{amount}}</strong> no seu cartão para renovar a assinatura <strong>{{plan_name}}</strong>.</p>
   <p>Esta é sua última chance de garantir que tudo está em ordem:</p>
   <ul>
     <li>Limite disponível no cartão</li>
     <li>Cartão não expirado nem bloqueado</li>
     <li>Dados de pagamento atualizados</li>
   </ul>
   <p>Se a cobrança falhar, seu acesso pode ser suspenso.</p>',
  'Verificar agora', true, 1),

('D0', 'card',
  'Renovação automática em andamento hoje',
  'Hoje cobramos sua assinatura no cartão cadastrado.',
  'Renovação acontece hoje',
  '<p>Olá <strong>{{user_name}}</strong>,</p>
   <p>Hoje, <strong>{{due_date}}</strong>, faremos a cobrança automática de <strong>{{amount}}</strong> no seu cartão de crédito para renovar sua assinatura <strong>{{plan_name}}</strong>.</p>
   <p>Você não precisa fazer nada — basta garantir que o cartão tenha limite disponível.</p>
   <p>Se receber a confirmação de pagamento, está tudo certo. Caso contrário, atualize seus dados de pagamento o quanto antes.</p>',
  'Acessar minha conta', true, 1),

('D+1', 'card',
  '⚠️ Cobrança no cartão falhou — atualize seu pagamento',
  'Não conseguimos cobrar seu cartão. Atualize para reativar o acesso.',
  'Cobrança no cartão não autorizada',
  '<p>Olá <strong>{{user_name}}</strong>,</p>
   <p>⛔ Tentamos cobrar <strong>{{amount}}</strong> no seu cartão para renovar a assinatura <strong>{{plan_name}}</strong>, mas a operação <strong>não foi autorizada</strong>.</p>
   <p>Possíveis causas:</p>
   <ul>
     <li>Limite do cartão insuficiente</li>
     <li>Cartão expirado, bloqueado ou cancelado</li>
     <li>Dados desatualizados</li>
   </ul>
   <p>Atualize seus dados de pagamento o quanto antes para reativar seu acesso completo.</p>',
  'Atualizar pagamento', true, 1)
ON CONFLICT (stage, payment_method) DO NOTHING;
