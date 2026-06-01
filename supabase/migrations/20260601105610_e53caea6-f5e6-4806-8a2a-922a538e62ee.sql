DROP FUNCTION IF EXISTS public.get_account_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_account_owner() CASCADE;
DROP FUNCTION IF EXISTS public.current_account_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_account_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_owner_user_id_from_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_responsible_default() CASCADE;

CREATE FUNCTION public.get_account_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.parent_owner_id, p.id, _uid)
  FROM public.profiles p WHERE p.id = _uid
  UNION ALL
  SELECT _uid WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid)
  LIMIT 1;
$$;

CREATE FUNCTION public.current_account_owner()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_account_owner(auth.uid());
$$;

CREATE FUNCTION public.current_account_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT account_role::text FROM public.profiles WHERE id = auth.uid()), 'owner');
$$;

CREATE FUNCTION public.is_account_member(_target_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _target_owner IS NOT NULL AND _target_owner = public.get_account_owner(auth.uid());
$$;

CREATE FUNCTION public.set_owner_user_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_user_id boolean;
  source_uid uuid;
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=TG_TABLE_NAME AND column_name='user_id'
  ) INTO has_user_id;
  IF has_user_id THEN
    EXECUTE format('SELECT ($1).user_id') USING NEW INTO source_uid;
  END IF;
  NEW.owner_user_id := public.get_account_owner(COALESCE(source_uid, auth.uid()));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_responsible_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.responsible_user_id IS NULL THEN
    NEW.responsible_user_id := COALESCE(NEW.user_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  has_uid boolean;
  tables text[] := ARRAY[
    'leads','pipeline_stages','crm_tags',
    'lead_activities','lead_deals','lead_deal_attachments',
    'lead_files','lead_notes','lead_origins','ignored_contacts',
    'revenue_leads','revenue_conversations','revenue_events','revenue_alerts',
    'revenue_score_logs','revenue_score_snapshots','revenue_score_rules',
    'revenue_settings','revenue_number_config','revenue_reports','revenue_intent_logs',
    'chat_conversations','chat_messages',
    'ai_agents','user_ai_agents','agent_templates',
    'agent_conversations','agent_message_buffer','agent_message_logs',
    'whatsapp_numbers','user_waba_connections',
    'whatsapp_campaigns','campaign_drafts','campaign_responses','campaign_incidents',
    'meta_campaigns','meta_user_settings',
    'wa_automation_flows','wa_flow_executions',
    'wiize_message_templates','wiize_template_categories',
    'warming_sessions','warming_interactions','warming_search_assignments',
    'company_profiles','company_services','search_history',
    'user_ai_credentials','user_google_tokens','user_drive_connections'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_user_id uuid', t);
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='user_id') INTO has_uid;
    IF has_uid THEN
      EXECUTE format('UPDATE public.%I SET owner_user_id = public.get_account_owner(user_id) WHERE owner_user_id IS NULL AND user_id IS NOT NULL', t);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (owner_user_id)', 'idx_' || t || '_owner_user_id', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_owner_user_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_owner_user_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_owner_user_id_from_user()', t);
  END LOOP;
END $$;

ALTER TABLE public.leads         ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
ALTER TABLE public.revenue_leads ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
UPDATE public.leads         SET responsible_user_id = user_id WHERE responsible_user_id IS NULL AND user_id IS NOT NULL;
UPDATE public.revenue_leads SET responsible_user_id = user_id WHERE responsible_user_id IS NULL AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_responsible_user_id ON public.leads(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_leads_responsible_user_id ON public.revenue_leads(responsible_user_id);

DROP TRIGGER IF EXISTS trg_set_responsible_default ON public.leads;
CREATE TRIGGER trg_set_responsible_default BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_responsible_default();
DROP TRIGGER IF EXISTS trg_set_responsible_default ON public.revenue_leads;
CREATE TRIGGER trg_set_responsible_default BEFORE INSERT ON public.revenue_leads FOR EACH ROW EXECUTE FUNCTION public.set_responsible_default();

DROP POLICY IF EXISTS "Users can view their own leads"   ON public.leads;
DROP POLICY IF EXISTS "Users can create their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;

CREATE POLICY "Account members view leads (scoped by role)" ON public.leads FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id) AND (public.current_account_role() IN ('owner','admin') OR responsible_user_id = auth.uid()));
CREATE POLICY "Account members create leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update leads (scoped by role)" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_account_member(owner_user_id) AND (public.current_account_role() IN ('owner','admin') OR responsible_user_id = auth.uid()));
CREATE POLICY "Owners/admins delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.is_account_member(owner_user_id) AND public.current_account_role() IN ('owner','admin'));

DROP POLICY IF EXISTS "Users can view own revenue leads"   ON public.revenue_leads;
DROP POLICY IF EXISTS "Users can update own revenue leads" ON public.revenue_leads;

CREATE POLICY "Account members view revenue leads (scoped by role)" ON public.revenue_leads FOR SELECT TO authenticated
  USING (public.is_account_member(owner_user_id) AND (public.current_account_role() IN ('owner','admin') OR responsible_user_id = auth.uid()));
CREATE POLICY "Account members create revenue leads" ON public.revenue_leads FOR INSERT TO authenticated
  WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update revenue leads (scoped by role)" ON public.revenue_leads FOR UPDATE TO authenticated
  USING (public.is_account_member(owner_user_id) AND (public.current_account_role() IN ('owner','admin') OR responsible_user_id = auth.uid()));
CREATE POLICY "Owners/admins delete revenue leads" ON public.revenue_leads FOR DELETE TO authenticated
  USING (public.is_account_member(owner_user_id) AND public.current_account_role() IN ('owner','admin'));

DO $$
DECLARE
  t text;
  pol text;
  cfg text[] := ARRAY['pipeline_stages','crm_tags','lead_origins'];
  pols text[] := ARRAY[
    'Users can view their own pipeline stages','Users can create their own pipeline stages','Users can update their own pipeline stages','Users can delete their own pipeline stages',
    'Users can view their own tags','Users can create their own tags','Users can update their own tags','Users can delete their own tags',
    'Users can view their own origins','Users can create their own origins','Users can delete their own origins'
  ];
BEGIN
  FOREACH t IN ARRAY cfg LOOP
    FOREACH pol IN ARRAY pols LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id))', 'Account members view ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())) AND public.current_account_role() IN (''owner'',''admin''))', 'Owners/admins insert ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_account_member(owner_user_id) AND public.current_account_role() IN (''owner'',''admin''))', 'Owners/admins update ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_account_member(owner_user_id) AND public.current_account_role() IN (''owner'',''admin''))', 'Owners/admins delete ' || t, t);
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
  pol text;
  children text[] := ARRAY['lead_notes','lead_deals','lead_files','lead_deal_attachments','lead_activities','ignored_contacts'];
  pols text[] := ARRAY[
    'Users can view their own lead notes','Users can create their own lead notes','Users can delete their own lead notes',
    'Users can view their own lead deals','Users can create their own lead deals','Users can update their own lead deals','Users can delete their own lead deals',
    'Users can view their own lead files','Users can create their own lead files','Users can update their own lead files','Users can delete their own lead files',
    'Users can view their own deal attachments','Users can create their own deal attachments','Users can delete their own deal attachments',
    'Users can view their own lead activities','Users can create their own lead activities',
    'Users can view their own ignored contacts','Users can insert their own ignored contacts','Users can delete their own ignored contacts'
  ];
BEGIN
  FOREACH t IN ARRAY children LOOP
    FOREACH pol IN ARRAY pols LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_account_member(owner_user_id))', 'Account members view ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())))', 'Account members create ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_account_member(owner_user_id))', 'Account members update ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_account_member(owner_user_id))', 'Account members delete ' || t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Account members can view sibling profiles" ON public.profiles;
CREATE POLICY "Account members can view sibling profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_account_owner(id) = public.current_account_owner());