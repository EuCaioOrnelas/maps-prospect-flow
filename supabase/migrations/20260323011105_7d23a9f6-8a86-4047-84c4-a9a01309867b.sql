
-- One-time data fix: reset test account and set correct free limit
-- Also fix the null subscription_current_period_end issue

-- Temporarily disable trigger to update test data
ALTER TABLE profiles DISABLE TRIGGER protect_profile_fields;

UPDATE profiles 
SET plan = 'start', 
    searches_limit = 200, 
    searches_used = 0, 
    subscription_current_period_end = (NOW() - INTERVAL '2 days')::timestamptz
WHERE email = 'nalaye3427@pazard.com';

ALTER TABLE profiles ENABLE TRIGGER protect_profile_fields;

-- Also fix any existing free users that got 5 instead of 10
UPDATE profiles SET searches_limit = 10 WHERE plan = 'free' AND searches_limit = 5;
