
ALTER TABLE profiles DISABLE TRIGGER protect_profile_fields;

UPDATE profiles SET plan = 'scale', searches_limit = 1000, admin_assigned_plan = true, updated_at = now() WHERE email = 'caiowiize@gmail.com';

ALTER TABLE profiles ENABLE TRIGGER protect_profile_fields;
