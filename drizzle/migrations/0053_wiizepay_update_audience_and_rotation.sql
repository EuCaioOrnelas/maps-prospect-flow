UPDATE storage.objects SET metadata = jsonb_set(metadata,'{mimetype}','"video/mp4"') WHERE bucket_id='wiize-updates' AND name='7c1e2a90-3b4d-4f5e-8a6b-1c2d3e4f5a60/2b6f1d3e-7a8c-4e9d-9f0a-3c4d5e6f7a81.mp4';

CREATE OR REPLACE FUNCTION public.updates_validate() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $f$
BEGIN
IF NOT public.is_current_user_admin() AND current_user NOT IN ('postgres','supabase_admin','service_role') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
IF length(trim(NEW.title)) NOT BETWEEN 1 AND 180 OR length(NEW.content)>10000 OR NEW.expires_at<=NEW.start_at OR NEW.frequency NOT IN ('once','7','15','30','login','custom') OR NEW.frequency_days NOT BETWEEN 1 AND 365 OR NEW.status NOT IN ('draft','scheduled','published','paused','ended','archived') OR NEW.target_type NOT IN ('all','free','plans','users','companies','roles','no_wiizepay') OR NEW.media_type NOT IN ('none','image','video') THEN RAISE EXCEPTION 'Configuração inválida'; END IF;
IF NEW.button_destination IS NOT NULL AND NEW.button_destination<>'' AND NOT (NEW.button_destination ~ '^/[A-Za-z0-9][A-Za-z0-9/_?=&%#.+-]*$' OR NEW.button_destination ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?(/[^[:space:]\\]*)?$') THEN RAISE EXCEPTION 'Destino inseguro'; END IF;
IF NEW.media_path IS NOT NULL AND NEW.media_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$' THEN RAISE EXCEPTION 'Mídia inválida'; END IF;
IF NEW.poster_path IS NOT NULL AND NEW.poster_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$' THEN RAISE EXCEPTION 'Capa inválida'; END IF;
NEW.updated_at=now(); NEW.created_by=coalesce(NEW.created_by,auth.uid()); RETURN NEW; END $f$;

-- 'no_wiizepay': only accounts without an active WiizePay connection
CREATE OR REPLACE FUNCTION public.update_audience_matches(a announcements, u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
SELECT EXISTS(SELECT 1 FROM public.profiles p LEFT JOIN public.profiles owner ON owner.id=p.parent_owner_id WHERE p.id=u AND CASE a.target_type WHEN 'all' THEN true WHEN 'free' THEN coalesce(owner.plan,p.plan)='free' WHEN 'plans' THEN coalesce(owner.plan,p.plan)=ANY(a.target_values) WHEN 'users' THEN p.id::text=ANY(a.target_values) WHEN 'companies' THEN coalesce(p.parent_owner_id,p.id)::text=ANY(a.target_values) WHEN 'roles' THEN p.account_role::text=ANY(a.target_values)
WHEN 'no_wiizepay' THEN NOT EXISTS(SELECT 1 FROM public.integration_connections c WHERE c.owner_user_id=coalesce(p.parent_owner_id,p.id) AND c.provider='wiize_pay' AND c.status='connected' AND c.revoked_at IS NULL)
ELSE false END) $f$;

-- Never-seen / least recently seen first, newest first among them
CREATE OR REPLACE FUNCTION public.updates_list_due() RETURNS SETOF announcements LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
SELECT a.* FROM public.announcements a LEFT JOIN public.announcement_user_state s ON s.announcement_id=a.id AND s.user_id=auth.uid()
WHERE auth.uid() IS NOT NULL AND public.update_is_available(a,auth.uid()) AND public.update_is_due(a,s,coalesce(auth.jwt()->>'session_id',auth.jwt()->>'iat',''))
ORDER BY s.last_viewed_at ASC NULLS FIRST, a.start_at DESC LIMIT 50 $f$;

UPDATE public.announcements SET
 title='WiizePay: a plataforma de cobranças e pagamentos da Wiize',
 content='Conheça a WiizePay, a plataforma de cobranças e pagamentos da Wiize, feita para empresas de serviços. Receba por Pix, Pix Automático, boleto e cartão em um link único, com cobranças avulsas, parceladas ou recorrentes, tudo unificado num só lugar.

• Contrato digital assinado antes do pagamento
• Lembretes automáticos antes e depois do vencimento
• Pagamento confirmado atualiza cliente, saldo e financeiro sozinho
• Checkout com a sua marca, portal do cliente e notas fiscais
• Integrada ao CRM da Wiize: negociação e cobrança conectadas

Oferta de lançamento: taxa zero no Pix e boleto por 3 meses. Sem mensalidade e com aprovação rápida.',
 category='Novidade', media_type='video',
 media_path='7c1e2a90-3b4d-4f5e-8a6b-1c2d3e4f5a60/2b6f1d3e-7a8c-4e9d-9f0a-3c4d5e6f7a81.mp4',
 poster_path='7c1e2a90-3b4d-4f5e-8a6b-1c2d3e4f5a60/4e8a2c6b-1d3f-4a5b-8c7d-9e0f1a2b3c4d.jpg',
 frequency='30', frequency_days=30, target_type='no_wiizepay', start_at=now(), button_label='Criar conta grátis'
WHERE id='7c1e2a90-3b4d-4f5e-8a6b-1c2d3e4f5a60';