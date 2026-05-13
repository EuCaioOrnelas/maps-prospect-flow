
-- Categorias internas Wiize para templates de mensagem
CREATE TABLE IF NOT EXISTS public.wiize_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7C3AED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.wiize_template_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own template categories" ON public.wiize_template_categories;
CREATE POLICY "Users select own template categories" ON public.wiize_template_categories
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own template categories" ON public.wiize_template_categories;
CREATE POLICY "Users insert own template categories" ON public.wiize_template_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own template categories" ON public.wiize_template_categories;
CREATE POLICY "Users update own template categories" ON public.wiize_template_categories
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own template categories" ON public.wiize_template_categories;
CREATE POLICY "Users delete own template categories" ON public.wiize_template_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Biblioteca de templates de mensagem (reutilizáveis em campanhas Meta)
CREATE TABLE IF NOT EXISTS public.wiize_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.wiize_template_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  body text NOT NULL,
  language text NOT NULL DEFAULT 'pt_BR',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wiize_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own message templates" ON public.wiize_message_templates;
CREATE POLICY "Users select own message templates" ON public.wiize_message_templates
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own message templates" ON public.wiize_message_templates;
CREATE POLICY "Users insert own message templates" ON public.wiize_message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own message templates" ON public.wiize_message_templates;
CREATE POLICY "Users update own message templates" ON public.wiize_message_templates
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own message templates" ON public.wiize_message_templates;
CREATE POLICY "Users delete own message templates" ON public.wiize_message_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wiize_message_templates_user ON public.wiize_message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_wiize_message_templates_category ON public.wiize_message_templates(category_id);

-- Trigger updated_at (idempotente)
DROP TRIGGER IF EXISTS trg_wiize_template_categories_updated ON public.wiize_template_categories;
CREATE TRIGGER trg_wiize_template_categories_updated
  BEFORE UPDATE ON public.wiize_template_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wiize_message_templates_updated ON public.wiize_message_templates;
CREATE TRIGGER trg_wiize_message_templates_updated
  BEFORE UPDATE ON public.wiize_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
