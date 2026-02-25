
-- Allow users to view their own revenue_leads
CREATE POLICY "Users can view own revenue leads"
ON public.revenue_leads
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own revenue_leads (for notes, tags, etc.)
CREATE POLICY "Users can update own revenue leads"
ON public.revenue_leads
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to view their own revenue_events
CREATE POLICY "Users can view own revenue events"
ON public.revenue_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM revenue_leads rl
  WHERE rl.id = revenue_events.lead_id AND rl.user_id = auth.uid()
));

-- Allow users to view their own revenue_score_logs
CREATE POLICY "Users can view own score logs"
ON public.revenue_score_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM revenue_leads rl
  WHERE rl.id = revenue_score_logs.lead_id AND rl.user_id = auth.uid()
));

-- Allow users to view their own revenue_conversations
CREATE POLICY "Users can view own revenue conversations"
ON public.revenue_conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to view their own revenue_score_snapshots
CREATE POLICY "Users can view own score snapshots"
ON public.revenue_score_snapshots
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM revenue_leads rl
  WHERE rl.id = revenue_score_snapshots.lead_id AND rl.user_id = auth.uid()
));

-- Allow users to view their own revenue_alerts
CREATE POLICY "Users can view own revenue alerts"
ON public.revenue_alerts
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to mark alerts as read
CREATE POLICY "Users can update own revenue alerts"
ON public.revenue_alerts
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to view their own revenue_reports
CREATE POLICY "Users can view own revenue reports"
ON public.revenue_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to view/manage their own revenue_settings
CREATE POLICY "Users can view own revenue settings"
ON public.revenue_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own revenue settings"
ON public.revenue_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own revenue settings"
ON public.revenue_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to view/manage their own revenue_score_rules
CREATE POLICY "Users can view own score rules"
ON public.revenue_score_rules
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own score rules"
ON public.revenue_score_rules
FOR UPDATE
USING (auth.uid() = user_id);
