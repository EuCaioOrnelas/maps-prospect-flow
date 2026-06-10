import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public env');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `lovable-ref-${Date.now()}@example.com`;
const password = `Teste${Date.now()}!Aa9`;

const { data: clickData, error: clickError } = await supabase.rpc('register_partner_click', {
  _referral_code: 'teste1',
  _referral_link_slug: null,
  _landing_page: '/lovable-signup-test',
  _user_agent: 'lovable-signup-test',
  _utm_source: 'lovable',
  _utm_medium: 'audit',
  _utm_campaign: 'partner-referral-e2e',
  _utm_term: null,
  _utm_content: null,
  _session_id: `lovable-e2e-${Date.now()}`,
});
if (clickError) throw clickError;
const click = Array.isArray(clickData) ? clickData[0] : clickData;
if (!click?.click_id || !click?.partner_id) throw new Error('Click not registered');

const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${process.env.VITE_SITE_URL || 'https://wiize.com.br'}/login?email_confirmed=true`,
    data: {
      name: 'Lead Fake Lovable',
      signup_ip: 'lovable-test-ip',
      device_fingerprint: `lovable-device-${Date.now()}`,
      terms_accepted: 'true',
      trial_with_card: 'true',
      trial_plan_chosen: 'growth',
      trial_billing_period: 'monthly',
      trial_will_charge_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_subscription_id: `sub_lovable_${Date.now()}`,
      stripe_customer_id: `cus_lovable_${Date.now()}`,
      trial_card_last4: '4242',
      trial_card_brand: 'visa',
      partner_referral_code: 'teste1',
      partner_id: click.partner_id,
      partner_click_id: click.click_id,
      ...(click.referral_link_id ? { partner_referral_link_id: click.referral_link_id } : {}),
    },
  },
});
if (signupError) throw signupError;
if (!signupData.user?.id) throw new Error('Signup did not return user');

console.log(JSON.stringify({ email, userId: signupData.user.id, clickId: click.click_id, partnerId: click.partner_id }));
