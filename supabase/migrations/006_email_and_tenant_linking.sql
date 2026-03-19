-- ============================================================
-- MIGRATION 006 — Add email to public.users + tenant auto-linking
-- ============================================================

-- 1. Add email column to public.users
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Update handle_new_user trigger to include email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Auto-link tenant records when auth user is created or email confirmed
-- ============================================================
-- This fires when a tenant signs in via magic link for the first time:
-- finds any tenants.email match with user_id IS NULL and links them.
CREATE OR REPLACE FUNCTION public.link_tenant_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_link_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_tenant_on_signup();

-- 4. Populate email for all existing auth users
-- (backfill for already-created accounts)
-- ============================================================
UPDATE public.users pu
SET email = au.email
FROM auth.users au
WHERE pu.id = au.id
  AND (pu.email IS NULL OR pu.email = '');
