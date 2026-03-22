-- Phase 6: Admin Dashboard - Schema Changes
-- Adds email column to profiles, admin RLS policies, indexes for admin queries

-- =============================================================================
-- 1. profiles.email column + backfill + trigger update
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users
UPDATE public.profiles
SET email = u.email
FROM auth.users u
WHERE u.id = public.profiles.id
  AND public.profiles.email IS NULL;

-- Update handle_new_user trigger to also copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', ''), new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. notifications_log.unsubscribe_token
-- =============================================================================

ALTER TABLE public.notifications_log
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();

-- =============================================================================
-- 3. Indexes for admin queries
-- =============================================================================

-- Duplicate prevention: check recent notifications by user+grant+type
CREATE INDEX IF NOT EXISTS idx_notifications_log_dedup
  ON public.notifications_log (user_id, grant_id, type, sent_at);

-- Stale applications query: filter by status + order by updated_at
CREATE INDEX IF NOT EXISTS idx_applications_status_updated
  ON public.applications (status, updated_at);

-- =============================================================================
-- 4. Admin RLS policies for applications, company_profiles, application_sections
-- =============================================================================

-- Admin SELECT on applications (admin needs to see all for dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications' AND policyname = 'applications_select_admin'
  ) THEN
    CREATE POLICY "applications_select_admin"
      ON public.applications FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- Admin SELECT on company_profiles (admin needs to see all for notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_profiles' AND policyname = 'company_profiles_select_admin'
  ) THEN
    CREATE POLICY "company_profiles_select_admin"
      ON public.company_profiles FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- Admin SELECT on application_sections (admin needs read access for application view)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'application_sections' AND policyname = 'app_sections_select_admin'
  ) THEN
    CREATE POLICY "app_sections_select_admin"
      ON public.application_sections FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- Admin INSERT on notifications_log for user-context client (existing policy is admin-only via service role)
-- The notifications_insert_admin policy already exists from initial schema, but we also need
-- to allow the authenticated admin user's server client (not just service role) to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications_log' AND policyname = 'notifications_insert_auth_admin'
  ) THEN
    CREATE POLICY "notifications_insert_auth_admin"
      ON public.notifications_log FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;
END $$;
