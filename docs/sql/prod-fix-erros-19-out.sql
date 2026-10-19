-- Corrige o erro 42P10 (ON CONFLICT sem regra única) nas tabelas usadas pelo sistema.
-- Rode tudo de uma vez. Pode rodar várias vezes.

-- 1) Avisos dispensados: apaga repetidos (mantém o mais antigo) e cria a regra única
DELETE FROM public.user_dismissed_popups a
USING public.user_dismissed_popups b
WHERE a.user_id = b.user_id AND a.popup_key = b.popup_key AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS user_dismissed_popups_user_popup_uidx
  ON public.user_dismissed_popups (user_id, popup_key);

-- 2) Perfis de inteligência dos leads: mesma correção
DELETE FROM public.intel_lead_profiles a
USING public.intel_lead_profiles b
WHERE a.owner_user_id = b.owner_user_id AND a.phone_e164 = b.phone_e164 AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS intel_lead_profiles_owner_phone_uidx
  ON public.intel_lead_profiles (owner_user_id, phone_e164);

-- Conferência
SELECT indexname FROM pg_indexes
WHERE indexname IN ('user_dismissed_popups_user_popup_uidx','intel_lead_profiles_owner_phone_uidx');
