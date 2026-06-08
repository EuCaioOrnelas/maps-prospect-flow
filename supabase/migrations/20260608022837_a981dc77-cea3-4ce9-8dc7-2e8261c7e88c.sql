
-- Make sub-users (account members) operate as full equivalents of the owner.

-- 1) account_members visibility for all members in the same account
DROP POLICY IF EXISTS "account_members_select_own_account" ON public.account_members;
CREATE POLICY "account_members_select_own_account" ON public.account_members
FOR SELECT USING (
  public.is_account_member(owner_user_id)
);

-- 2) leads — drop role-gating
DROP POLICY IF EXISTS "Account members view leads (scoped by role)" ON public.leads;
CREATE POLICY "Account members view leads" ON public.leads
FOR SELECT USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Account members update leads (scoped by role)" ON public.leads;
CREATE POLICY "Account members update leads" ON public.leads
FOR UPDATE USING (public.is_account_member(owner_user_id))
WITH CHECK (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Owners/admins delete leads" ON public.leads;
CREATE POLICY "Account members delete leads" ON public.leads
FOR DELETE USING (public.is_account_member(owner_user_id));

-- 3) revenue_leads
DROP POLICY IF EXISTS "Account members view revenue leads (scoped by role)" ON public.revenue_leads;
CREATE POLICY "Account members view revenue leads" ON public.revenue_leads
FOR SELECT USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Account members update revenue leads (scoped by role)" ON public.revenue_leads;
CREATE POLICY "Account members update revenue leads" ON public.revenue_leads
FOR UPDATE USING (public.is_account_member(owner_user_id))
WITH CHECK (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Owners/admins delete revenue leads" ON public.revenue_leads;
CREATE POLICY "Account members delete revenue leads" ON public.revenue_leads
FOR DELETE USING (public.is_account_member(owner_user_id));

-- 4) whatsapp_numbers
DROP POLICY IF EXISTS "Account members view numbers (scoped by role)" ON public.whatsapp_numbers;
CREATE POLICY "Account members view numbers" ON public.whatsapp_numbers
FOR SELECT USING (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Account members update numbers (scoped by role)" ON public.whatsapp_numbers;
CREATE POLICY "Account members update numbers" ON public.whatsapp_numbers
FOR UPDATE USING (public.is_account_member(user_id))
WITH CHECK (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Owners/admins delete numbers" ON public.whatsapp_numbers;
CREATE POLICY "Account members delete numbers" ON public.whatsapp_numbers
FOR DELETE USING (public.is_account_member(user_id));

-- 5) chat_conversations
DROP POLICY IF EXISTS "Account members view chat conversations (scoped by role)" ON public.chat_conversations;
CREATE POLICY "Account members view chat conversations" ON public.chat_conversations
FOR SELECT USING (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Account members update chat conversations (scoped by role)" ON public.chat_conversations;
CREATE POLICY "Account members update chat conversations" ON public.chat_conversations
FOR UPDATE USING (public.is_account_member(user_id))
WITH CHECK (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Owners/admins delete chat conversations" ON public.chat_conversations;
CREATE POLICY "Account members delete chat conversations" ON public.chat_conversations
FOR DELETE USING (public.is_account_member(user_id));

-- 6) chat_messages — scope by account membership
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Account members view chat messages" ON public.chat_messages
FOR SELECT USING (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Account members update chat messages" ON public.chat_messages
FOR UPDATE USING (public.is_account_member(user_id))
WITH CHECK (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Account members delete chat messages" ON public.chat_messages
FOR DELETE USING (public.is_account_member(user_id));

DROP POLICY IF EXISTS "Users can create own messages" ON public.chat_messages;
CREATE POLICY "Account members create chat messages" ON public.chat_messages
FOR INSERT WITH CHECK (public.is_account_member(COALESCE(user_id, public.current_account_owner())));

-- 7) ai_agents
DROP POLICY IF EXISTS "Users can view their own agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can create their own agents" ON public.ai_agents;

CREATE POLICY "Account members view ai_agents" ON public.ai_agents
FOR SELECT USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members create ai_agents" ON public.ai_agents
FOR INSERT WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update ai_agents" ON public.ai_agents
FOR UPDATE USING (public.is_account_member(COALESCE(owner_user_id, user_id)))
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members delete ai_agents" ON public.ai_agents
FOR DELETE USING (public.is_account_member(COALESCE(owner_user_id, user_id)));

-- 8) company_services
DROP POLICY IF EXISTS "Users can view their own services" ON public.company_services;
DROP POLICY IF EXISTS "Users can update their own services" ON public.company_services;
DROP POLICY IF EXISTS "Users can delete their own services" ON public.company_services;
DROP POLICY IF EXISTS "Users can create their own services" ON public.company_services;

CREATE POLICY "Account members view company_services" ON public.company_services
FOR SELECT USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members create company_services" ON public.company_services
FOR INSERT WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update company_services" ON public.company_services
FOR UPDATE USING (public.is_account_member(COALESCE(owner_user_id, user_id)))
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members delete company_services" ON public.company_services
FOR DELETE USING (public.is_account_member(COALESCE(owner_user_id, user_id)));

-- 9) wa_automation_flows
DROP POLICY IF EXISTS "Users manage own flows" ON public.wa_automation_flows;

CREATE POLICY "Account members view wa_flows" ON public.wa_automation_flows
FOR SELECT USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members create wa_flows" ON public.wa_automation_flows
FOR INSERT WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update wa_flows" ON public.wa_automation_flows
FOR UPDATE USING (public.is_account_member(COALESCE(owner_user_id, user_id)))
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members delete wa_flows" ON public.wa_automation_flows
FOR DELETE USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
