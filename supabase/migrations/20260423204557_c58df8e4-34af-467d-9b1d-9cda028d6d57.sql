-- =====================================================
-- PARTNER APPLICATIONS (landing pública /parceiros)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  profile TEXT, -- 'agency' | 'consultant' | 'creator' | 'sales_pro' | 'other'
  audience_size TEXT, -- '<1k' | '1k-10k' | '10k-50k' | '50k+'
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_by_admin_id UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  source TEXT, -- 'landing' | 'admin' | 'referral'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_applications_email ON public.partner_applications(email);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application"
  ON public.partner_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins manage applications"
  ON public.partner_applications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_partner_applications_updated_at BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PARTNER MATERIALS (marketing assets)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'banner' | 'copy' | 'video' | 'social' | 'email'
  title TEXT NOT NULL,
  description TEXT,
  content_text TEXT, -- for copies / scripts
  asset_url TEXT, -- for downloadable files / images
  preview_url TEXT, -- thumbnail
  format TEXT, -- 'png' | 'jpg' | 'mp4' | 'pdf' | 'text'
  dimensions TEXT, -- e.g. '1080x1080'
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_materials_category ON public.partner_materials(category, display_order);

ALTER TABLE public.partner_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active partners view materials"
  ON public.partner_materials FOR SELECT TO authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM partners WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins manage materials"
  ON public.partner_materials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_partner_materials_updated_at BEFORE UPDATE ON public.partner_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default materials
INSERT INTO public.partner_materials (category, title, description, content_text, format, display_order) VALUES
  ('copy', 'Mensagem de WhatsApp — Apresentação', 'Use para apresentar a Wiize a um contato próximo.', 'Oi! Tudo bem? Quero te apresentar uma plataforma que está revolucionando a prospecção B2B no Brasil: a Wiize. Ela usa IA para encontrar leads qualificados, qualificar com WhatsApp e gerenciar todo o funil. Tem teste grátis de 7 dias. Confere aqui: {{LINK}}', 'text', 10),
  ('copy', 'Mensagem de WhatsApp — Curto e direto', 'Versão curta para envio em massa.', '{{NOME}}, achei que isso pode te interessar: a Wiize automatiza a prospecção B2B com IA e gera oportunidades qualificadas todo dia. Teste grátis: {{LINK}}', 'text', 20),
  ('copy', 'E-mail de apresentação', 'Modelo de e-mail formal para enviar a empresas.', 'Assunto: Como gerar 10x mais oportunidades B2B com IA

Olá {{NOME}},

Estou ajudando empresas a encontrar mais clientes usando a Wiize, uma plataforma brasileira que une IA, WhatsApp e CRM em um único lugar.

Em poucos minutos a plataforma encontra leads, qualifica com IA e dispara mensagens personalizadas — gerando oportunidades reais todos os dias.

Tem teste grátis de 7 dias e quero te dar acesso pelo meu link: {{LINK}}

Qualquer dúvida estou à disposição.', 'text', 30),
  ('social', 'Post para Instagram', 'Texto pronto para publicação no feed.', '🚀 Quer encontrar clientes B2B sem perder horas garimpando contatos?

A Wiize automatiza a prospecção com IA: ela encontra leads, qualifica com WhatsApp e organiza tudo no CRM.

✅ Mais oportunidades reais
✅ Menos trabalho manual
✅ Time comercial mais produtivo

Teste grátis 7 dias pelo meu link: {{LINK}}

#prospeccao #vendas #b2b #ia', 'text', 40),
  ('social', 'Post para LinkedIn', 'Texto profissional para LinkedIn.', 'Toda semana converso com gestores comerciais frustrados com o mesmo problema: time gastando 70% do tempo procurando contatos em vez de vender.

A Wiize resolve isso. A plataforma usa IA para:
→ Encontrar leads B2B qualificados em qualquer nicho
→ Qualificar via WhatsApp automaticamente
→ Entregar oportunidades prontas para fechar

Resultado: o time comercial foca no que importa — fechar negócios.

Indico fortemente. Vale o teste de 7 dias: {{LINK}}', 'text', 50),
  ('copy', 'Bio Instagram / Linktree', 'Texto curto para perfil.', '🔗 Wiize — IA para prospecção B2B
Teste grátis de 7 dias 👇
{{LINK}}', 'text', 60),
  ('copy', 'Story Instagram (texto)', 'Sugestão de stories sequenciais.', 'STORY 1: "Vou te contar como aumentei a geração de leads B2B em 10x"
STORY 2: "Comecei a usar a @wiize.app — uma IA que encontra e qualifica leads sozinha"
STORY 3: "Em 7 dias de teste eu já vi resultado. Link no meu perfil."
STORY 4: "Se quiser testar grátis, swipe up: {{LINK}}"', 'text', 70),
  ('copy', 'Pitch oral (cold call)', 'Roteiro para abordagem por telefone.', '"Oi {{NOME}}, aqui é {{SEU_NOME}}. Sou parceiro da Wiize, uma plataforma de prospecção B2B com IA. Em vez de o seu time gastar tempo procurando leads no Google e LinkedIn, a Wiize entrega oportunidades qualificadas direto no CRM, todo dia. Quer que eu te mande o link com 7 dias grátis para você testar?"', 'text', 80)
ON CONFLICT DO NOTHING;