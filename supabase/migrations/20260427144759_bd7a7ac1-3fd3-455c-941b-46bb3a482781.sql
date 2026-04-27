ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'ab_test';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'random_split';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'google_sheets';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'google_calendar';
ALTER TYPE public.wa_flow_node_type ADD VALUE IF NOT EXISTS 'gmail';