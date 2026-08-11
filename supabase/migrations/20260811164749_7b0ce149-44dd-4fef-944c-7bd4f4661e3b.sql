GRANT EXECUTE ON FUNCTION public.accessible_owner_ids() TO anon;

-- LEADS
DROP POLICY IF EXISTS "Account members view leads" ON public.leads;
CREATE POLICY "Account members view leads" ON public.leads FOR SELECT TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members update leads" ON public.leads;
CREATE POLICY "Account members update leads" ON public.leads FOR UPDATE TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())))
WITH CHECK (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members delete leads" ON public.leads;
CREATE POLICY "Account members delete leads" ON public.leads FOR DELETE
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members create leads" ON public.leads;
CREATE POLICY "Account members create leads" ON public.leads FOR INSERT TO authenticated
WITH CHECK (COALESCE(owner_user_id, public.current_account_owner()) IN (SELECT unnest(public.accessible_owner_ids())));

-- CHAT CONVERSATIONS
DROP POLICY IF EXISTS "Account members view chat conversations" ON public.chat_conversations;
CREATE POLICY "Account members view chat conversations" ON public.chat_conversations FOR SELECT
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members update chat conversations" ON public.chat_conversations;
CREATE POLICY "Account members update chat conversations" ON public.chat_conversations FOR UPDATE
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())))
WITH CHECK (user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members delete chat conversations" ON public.chat_conversations;
CREATE POLICY "Account members delete chat conversations" ON public.chat_conversations FOR DELETE
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())));

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Account members view chat messages" ON public.chat_messages;
CREATE POLICY "Account members view chat messages" ON public.chat_messages FOR SELECT
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members update chat messages" ON public.chat_messages;
CREATE POLICY "Account members update chat messages" ON public.chat_messages FOR UPDATE
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())))
WITH CHECK (user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members delete chat messages" ON public.chat_messages;
CREATE POLICY "Account members delete chat messages" ON public.chat_messages FOR DELETE
USING (user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members create chat messages" ON public.chat_messages;
CREATE POLICY "Account members create chat messages" ON public.chat_messages FOR INSERT
WITH CHECK (COALESCE(user_id, public.current_account_owner()) IN (SELECT unnest(public.accessible_owner_ids())));

-- LEAD DEALS
DROP POLICY IF EXISTS "Account members view lead_deals" ON public.lead_deals;
CREATE POLICY "Account members view lead_deals" ON public.lead_deals FOR SELECT TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members update lead_deals" ON public.lead_deals;
CREATE POLICY "Account members update lead_deals" ON public.lead_deals FOR UPDATE TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members delete lead_deals" ON public.lead_deals;
CREATE POLICY "Account members delete lead_deals" ON public.lead_deals FOR DELETE TO authenticated
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members create lead_deals" ON public.lead_deals;
CREATE POLICY "Account members create lead_deals" ON public.lead_deals FOR INSERT TO authenticated
WITH CHECK (COALESCE(owner_user_id, public.current_account_owner()) IN (SELECT unnest(public.accessible_owner_ids())));

-- REVENUE LEADS
DROP POLICY IF EXISTS "Account members view revenue leads" ON public.revenue_leads;
CREATE POLICY "Account members view revenue leads" ON public.revenue_leads FOR SELECT
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members update revenue leads" ON public.revenue_leads;
CREATE POLICY "Account members update revenue leads" ON public.revenue_leads FOR UPDATE
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())))
WITH CHECK (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members delete revenue leads" ON public.revenue_leads;
CREATE POLICY "Account members delete revenue leads" ON public.revenue_leads FOR DELETE
USING (owner_user_id IN (SELECT unnest(public.accessible_owner_ids())));

DROP POLICY IF EXISTS "Account members create revenue leads" ON public.revenue_leads;
CREATE POLICY "Account members create revenue leads" ON public.revenue_leads FOR INSERT TO authenticated
WITH CHECK (COALESCE(owner_user_id, public.current_account_owner()) IN (SELECT unnest(public.accessible_owner_ids())));