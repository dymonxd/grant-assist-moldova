-- GrantAssist Moldova: Initial Schema
-- 10 application tables + RLS policies + indexes + triggers + functions
-- Note: auth.users is managed by Supabase automatically (11th table)

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLES (in dependency order)
-- =============================================================================

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. company_profiles
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  idno TEXT,
  business_idea TEXT,
  company_name TEXT,
  industry TEXT,
  location TEXT,
  legal_form TEXT,
  purchase_need TEXT,
  enriched_data JSONB,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  share_token_expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. grants
CREATE TABLE public.grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_agency TEXT NOT NULL,
  description TEXT,
  max_funding NUMERIC,
  currency TEXT DEFAULT 'MDL',
  deadline TIMESTAMPTZ,
  status TEXT CHECK (status IN ('draft', 'active', 'expired')) DEFAULT 'draft',
  source_type TEXT CHECK (source_type IN ('online_form', 'uploaded_template', 'manual')),
  eligibility_rules JSONB,
  scoring_rubric JSONB,
  required_documents JSONB,
  source_form_url TEXT,
  guidelines_pdf_path TEXT,
  form_template_path TEXT,
  excel_template_path TEXT,
  version INTEGER DEFAULT 1,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. grant_application_fields
CREATE TABLE public.grant_application_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES public.grants(id) ON DELETE CASCADE NOT NULL,
  field_order INTEGER NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'textarea',
  is_required BOOLEAN DEFAULT true,
  character_limit INTEGER,
  helper_text TEXT
);

-- 5. saved_grants
CREATE TABLE public.saved_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  grant_id UUID REFERENCES public.grants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, grant_id)
);

-- 6. applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.grants(id) NOT NULL,
  company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'exported')) DEFAULT 'in_progress',
  field_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. application_sections
CREATE TABLE public.application_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  grant_field_id UUID REFERENCES public.grant_application_fields(id),
  user_brief TEXT,
  ai_draft TEXT,
  final_text TEXT,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. notifications_log
CREATE TABLE public.notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('deadline_reminder', 'abandoned_draft', 'grant_expiring', 'new_grant_match')) NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'sms')) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 9. analytics_events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  referrer_url TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. analytics_daily_summary
CREATE TABLE public.analytics_daily_summary (
  date DATE NOT NULL,
  stage TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  device_type TEXT NOT NULL DEFAULT '',
  top_referrers JSONB,
  PRIMARY KEY (date, stage, device_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE UNIQUE INDEX idx_company_profiles_idno
  ON public.company_profiles (idno) WHERE idno IS NOT NULL;

CREATE INDEX idx_analytics_events_created
  ON public.analytics_events (created_at);

CREATE INDEX idx_applications_user
  ON public.applications (user_id);

CREATE INDEX idx_applications_status
  ON public.applications (status);

CREATE INDEX idx_grants_status_deadline
  ON public.grants (status, deadline);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER: is_admin check function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- profiles: users read/update own row, admins read all
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- company_profiles: authenticated users read/update own, shared via token
CREATE POLICY "company_profiles_select_own"
  ON public.company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "company_profiles_select_shared"
  ON public.company_profiles FOR SELECT
  TO anon, authenticated
  USING (
    share_token IS NOT NULL
    AND share_token_expires_at > now()
  );

CREATE POLICY "company_profiles_update_own"
  ON public.company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "company_profiles_insert_own"
  ON public.company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- grants: anon+authenticated can read active, admins manage all
CREATE POLICY "grants_select_active"
  ON public.grants FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "grants_select_admin"
  ON public.grants FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "grants_insert_admin"
  ON public.grants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "grants_update_admin"
  ON public.grants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "grants_delete_admin"
  ON public.grants FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- grant_application_fields: public read, admin manage
CREATE POLICY "grant_fields_select_public"
  ON public.grant_application_fields FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "grant_fields_insert_admin"
  ON public.grant_application_fields FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "grant_fields_update_admin"
  ON public.grant_application_fields FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "grant_fields_delete_admin"
  ON public.grant_application_fields FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- saved_grants: authenticated users manage own
CREATE POLICY "saved_grants_select_own"
  ON public.saved_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "saved_grants_insert_own"
  ON public.saved_grants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_grants_delete_own"
  ON public.saved_grants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- applications: authenticated users manage own
CREATE POLICY "applications_select_own"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "applications_insert_own"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_update_own"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- application_sections: access via application ownership
CREATE POLICY "app_sections_select_own"
  ON public.application_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_sections.application_id
        AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "app_sections_insert_own"
  ON public.application_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_sections.application_id
        AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "app_sections_update_own"
  ON public.application_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_sections.application_id
        AND applications.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = application_sections.application_id
        AND applications.user_id = auth.uid()
    )
  );

-- notifications_log: admin only
CREATE POLICY "notifications_select_admin"
  ON public.notifications_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "notifications_insert_admin"
  ON public.notifications_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- analytics_events: admin only
CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "analytics_events_insert_admin"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- analytics_daily_summary: admin only
CREATE POLICY "analytics_summary_select_admin"
  ON public.analytics_daily_summary FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "analytics_summary_insert_admin"
  ON public.analytics_daily_summary FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "analytics_summary_update_admin"
  ON public.analytics_daily_summary FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Merge anonymous profile to authenticated user
CREATE OR REPLACE FUNCTION public.claim_company_profile(p_profile_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.company_profiles
  SET user_id = p_user_id
  WHERE id = p_profile_id AND user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS: updated_at on tables that have it
-- =============================================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.application_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
