CREATE OR REPLACE FUNCTION public.admin_manage_user_access(_user_id uuid, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 p public.profiles%ROWTYPE;
 a text := _payload->>'action';
 chosen_plan text := _payload->>'plan';
 note text := trim(coalesce(_payload->>'notes',''));
 request_id uuid := (_payload->>'request_id')::uuid;
 deadline timestamptz;
 base_date timestamptz := now();
 days integer;
 amount integer := 0;
 method text := _payload->>'payment_method';
 sub_id uuid;
 before_data jsonb;
 limit_value integer;
 number_limit integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
   RAISE EXCEPTION 'Somente administradores podem editar o acesso.' USING ERRCODE='42501';
 END IF;
 IF request_id IS NULL OR length(note) < 3 OR length(note) > 1000 OR a NOT IN ('edit','trial','activate','renew','expiry') OR a IS NULL THEN
   RAISE EXCEPTION 'Informe uma ação válida e o motivo da alteração.';
 END IF;
 SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;
 IF EXISTS (SELECT 1 FROM public.security_audit_log WHERE action='admin_manual_user_access' AND resource_id=_user_id::text AND metadata->>'request_id'=request_id::text) THEN
   RETURN jsonb_build_object('success',true,'already_applied',true);
 END IF;
 IF (_payload->>'expected_updated_at') IS NULL OR p.updated_at IS DISTINCT FROM (_payload->>'expected_updated_at')::timestamptz THEN
   RAISE EXCEPTION 'Este usuário foi atualizado. Feche a janela e abra novamente antes de salvar.';
 END IF;
 before_data := jsonb_build_object('name',p.name,'phone',p.phone,'plan',p.plan,'trial_end_at',p.trial_end_at,'period_end',p.subscription_current_period_end,'provider',p.payment_provider);
 IF a='edit' THEN
   IF length(trim(coalesce(_payload->>'name',''))) NOT BETWEEN 1 AND 255 OR length(coalesce(_payload->>'phone',''))>30 THEN
     RAISE EXCEPTION 'Verifique o nome e o telefone.';
   END IF;
   UPDATE public.profiles SET name=trim(_payload->>'name'), phone=nullif(trim(_payload->>'phone'),''), updated_at=now() WHERE id=_user_id;
 ELSE
   IF p.parent_owner_id IS NOT NULL AND p.parent_owner_id <> p.id THEN RAISE EXCEPTION 'Gerencie o plano na conta principal, não no membro da equipe.'; END IF;
   IF lower(coalesce(p.payment_provider,'')) NOT IN ('','free','manual') OR p.asaas_subscription_id IS NOT NULL OR p.trial_asaas_subscription_id IS NOT NULL THEN
     RAISE EXCEPTION 'Esta conta possui cobrança externa. Gerencie a assinatura atual antes de trocar para pagamento manual.';
   END IF;
   IF a IN ('renew','expiry') AND p.payment_provider IS DISTINCT FROM 'manual' THEN
     RAISE EXCEPTION 'Ative primeiro um plano manual ou uma cortesia para este usuário.';
   END IF;
   IF a='expiry' THEN chosen_plan:=p.plan; END IF;
   IF chosen_plan IS NULL OR chosen_plan NOT IN ('start','growth','scale') THEN RAISE EXCEPTION 'Escolha Atendimento, Growth IA ou Enterprise.'; END IF;
   IF a='trial' AND public.user_has_real_payment(_user_id) THEN RAISE EXCEPTION 'Este cliente já pagou. Use renovar ou alterar a expiração para preservar o histórico comercial.'; END IF;
   IF a='renew' OR (a='trial' AND p.trial_end_at IS NOT NULL) THEN
     base_date:=greatest(now(),coalesce(p.subscription_current_period_end,p.trial_end_at,now()));
   END IF;
   IF nullif(_payload->>'end_date','') IS NOT NULL THEN
     deadline:=(((_payload->>'end_date')::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 millisecond';
   ELSE
     IF a='expiry' THEN RAISE EXCEPTION 'Informe a data de expiração.'; END IF;
     days:=(_payload->>'days')::integer;
     IF days IS NULL OR days NOT BETWEEN 1 AND 3660 THEN RAISE EXCEPTION 'Informe uma quantidade válida de dias.'; END IF;
     deadline:=(((base_date AT TIME ZONE 'America/Sao_Paulo')::date + days + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 millisecond';
   END IF;
   IF deadline<=now() THEN RAISE EXCEPTION 'A expiração precisa ser uma data futura.'; END IF;
   IF a='renew' AND deadline<=base_date THEN RAISE EXCEPTION 'A renovação precisa acrescentar dias ao período atual.'; END IF;
   IF a IN ('activate','renew') THEN
     amount:=(_payload->>'amount_cents')::integer;
     IF (_payload->>'payment_confirmed')::boolean IS DISTINCT FROM true OR amount IS NULL OR amount<=0 OR method IS NULL OR method NOT IN ('pix','transfer','card','cash','other') THEN
       RAISE EXCEPTION 'Confirme o recebimento e informe um valor e uma forma de pagamento válidos.';
     END IF;
   END IF;
   limit_value:=CASE chosen_plan WHEN 'scale' THEN 10000 ELSE 1000 END;
   number_limit:=CASE chosen_plan WHEN 'scale' THEN 10 WHEN 'growth' THEN 2 ELSE 1 END;
   IF a='expiry' THEN
     UPDATE public.custom_subscriptions SET ends_at=deadline,is_lifetime=false,status='active',canceled_at=null,cancel_reason=null,updated_at=now()
       WHERE id=p.custom_subscription_id AND user_id=_user_id;
     UPDATE public.profiles SET subscription_current_period_end=deadline,
       trial_end_at=CASE WHEN p.trial_end_at IS NOT NULL THEN deadline ELSE null END,
       is_blocked=false,updated_at=now() WHERE id=_user_id;
   ELSE
     INSERT INTO public.custom_subscriptions(user_id,created_by_admin_id,plan,subscription_label,searches_limit,whatsapp_numbers_limit,monthly_value_cents,total_value_cents,payment_method,is_lifetime,starts_at,ends_at,notes,status)
       VALUES(_user_id,auth.uid(),chosen_plan,CASE WHEN a='trial' THEN 'Cortesia / teste' ELSE 'Pagamento manual' END,
       coalesce(p.custom_searches_limit,limit_value),coalesce(p.custom_whatsapp_numbers_limit,number_limit),amount,amount,CASE WHEN a='trial' THEN 'free' ELSE method END,false,base_date,deadline,note,'active') RETURNING id INTO sub_id;
     UPDATE public.custom_subscriptions SET status='renewed',renewed_into_id=sub_id,updated_at=now() WHERE user_id=_user_id AND status='active' AND id<>sub_id;
     IF a='renew' AND p.custom_subscription_id IS NOT NULL THEN
       INSERT INTO public.custom_subscription_renewals(user_id,renewed_by_admin_id,previous_subscription_id,new_subscription_id,notes)
         VALUES(_user_id,auth.uid(),p.custom_subscription_id,sub_id,note);
     END IF;
     IF a IN ('activate','renew') THEN
       INSERT INTO public.custom_subscription_payments(custom_subscription_id,user_id,recorded_by_admin_id,amount_cents,payment_method,paid_at,notes)
         VALUES(sub_id,_user_id,auth.uid(),amount,method,now(),note);
     END IF;
     UPDATE public.profiles SET plan=chosen_plan,payment_provider='manual',admin_assigned_plan=true,is_custom_subscription=true,
       custom_subscription_id=sub_id,searches_limit=coalesce(p.custom_searches_limit,limit_value),
       custom_searches_limit=coalesce(p.custom_searches_limit,limit_value),custom_whatsapp_numbers_limit=coalesce(p.custom_whatsapp_numbers_limit,number_limit),
       subscription_current_period_end=deadline,subscription_price_cents=amount,is_blocked=false,requires_payment_setup=false,
       trial_start_at=CASE WHEN a='trial' THEN coalesce(p.trial_start_at,now()) ELSE null END,
       trial_end_at=CASE WHEN a='trial' THEN deadline ELSE null END,
       trial_will_charge_at=null,trial_auto_charge_cancelled=false,trial_auto_charge_cancelled_at=null,
       first_paid_at=CASE WHEN amount>0 THEN coalesce(p.first_paid_at,now()) ELSE p.first_paid_at END,
       updated_at=now() WHERE id=_user_id;
   END IF;
 END IF;
 INSERT INTO public.security_audit_log(user_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),'admin_manual_user_access','profiles',_user_id::text,
 jsonb_build_object('request_id',request_id,'operation',a,'notes',note,'before',before_data,'deadline',deadline,'amount_cents',amount,'payment_method',method));
 RETURN jsonb_build_object('success',true,'expires_at',deadline);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_manage_user_access(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_access(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; owner_id uuid;
BEGIN
 IF _user_id IS NULL THEN RETURN false; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=_user_id;
 IF NOT FOUND OR coalesce(p.is_blocked,false) THEN RETURN false; END IF;
 IF public.has_role(_user_id,'admin'::app_role) THEN RETURN true; END IF;
 owner_id:=coalesce(p.parent_owner_id,p.id);
 IF owner_id<>p.id THEN
   IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;
   RETURN public.has_active_access(owner_id);
 END IF;
 IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;
 IF lower(coalesce(p.payment_provider,''))='manual' AND p.subscription_current_period_end IS NOT NULL THEN
   RETURN p.plan<>'free' AND p.subscription_current_period_end>now();
 END IF;
 IF public.is_downgrade_protected(_user_id) THEN RETURN true; END IF;
 IF p.trial_will_charge_at>now() OR p.trial_end_at>now() THEN RETURN true; END IF;
 RETURN coalesce(p.plan,'free')<>'free' AND p.subscription_current_period_end IS NOT NULL AND p.subscription_current_period_end+interval '7 days'>now();
END;
$$;