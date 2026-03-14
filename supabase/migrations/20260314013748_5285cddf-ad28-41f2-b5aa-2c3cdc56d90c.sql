
ALTER TABLE profiles DISABLE TRIGGER protect_profile_fields;
UPDATE profiles SET searches_limit = 1200 WHERE email = 'caiowiize@gmail.com';
ALTER TABLE profiles ENABLE TRIGGER protect_profile_fields;
