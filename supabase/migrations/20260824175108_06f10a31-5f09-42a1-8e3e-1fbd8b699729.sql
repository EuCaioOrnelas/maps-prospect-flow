CREATE OR REPLACE FUNCTION public.partner_create_referral_link(_label text, _video_title text DEFAULT NULL)
RETURNS public.partner_referral_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id uuid;
  _base text;
  _slug text;
  _i int := 0;
  _row public.partner_referral_links;
BEGIN
  SELECT id INTO _partner_id FROM public.partners WHERE user_id = auth.uid() AND status = 'active';
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Parceiro nao encontrado ou inativo';
  END IF;

  IF _label IS NULL OR length(btrim(_label)) < 2 THEN
    RAISE EXCEPTION 'Nome do conteudo invalido';
  END IF;

  IF (SELECT count(*) FROM public.partner_referral_links WHERE partner_id = _partner_id) >= 200 THEN
    RAISE EXCEPTION 'Limite de links atingido';
  END IF;

  _base := lower(btrim(_label));
  _base := translate(_base, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  _base := regexp_replace(_base, '[^a-z0-9]+', '-', 'g');
  _base := btrim(_base, '-');
  IF _base = '' THEN _base := 'link'; END IF;
  _base := left(_base, 40);

  _slug := _base;
  WHILE EXISTS (SELECT 1 FROM public.partner_referral_links WHERE slug = _slug) LOOP
    _i := _i + 1;
    _slug := _base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
    IF _i > 12 THEN
      RAISE EXCEPTION 'Nao foi possivel gerar um link unico';
    END IF;
  END LOOP;

  INSERT INTO public.partner_referral_links (partner_id, label, slug, description, internal_name, is_active, utm_source, utm_medium, utm_campaign)
  VALUES (_partner_id, btrim(_label), _slug, NULLIF(btrim(coalesce(_video_title, '')), ''), NULLIF(btrim(coalesce(_video_title, '')), ''), true, 'partner', 'content', _slug)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_create_referral_link(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.partner_create_referral_link(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_set_referral_link_status(_link_id uuid, _is_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id uuid;
BEGIN
  SELECT id INTO _partner_id FROM public.partners WHERE user_id = auth.uid();
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Parceiro nao encontrado';
  END IF;

  UPDATE public.partner_referral_links
     SET is_active = _is_active, updated_at = now()
   WHERE id = _link_id AND partner_id = _partner_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_set_referral_link_status(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.partner_set_referral_link_status(uuid, boolean) TO authenticated;