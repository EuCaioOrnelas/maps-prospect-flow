UPDATE auth.users 
SET email_confirmed_at = now()
WHERE id = '091c8c4a-d755-4c42-9732-b682dbf8fef5'
  AND email_confirmed_at IS NULL;