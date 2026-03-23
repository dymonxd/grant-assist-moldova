# Phase 6: Admin Tooling and Automation - Research

**Researched:** 2026-03-22
**Status:** Ready for planning

## Executive Summary

Phase 6 builds the operational backbone: admin dashboard with analytics funnel, grant catalog management with AI-assisted PDF extraction, notification log viewer, and automated cron jobs for reminders/aggregation. The database schema, RLS policies, and Resend email integration are already in place from Phase 1. The admin page at `/admin` exists as a placeholder. This phase fills it with functional UI and backend logic.

## Existing Infrastructure Inventory

### Database (ready to use)
- **profiles**: `is_admin` boolean, `email_notifications` boolean
- **grants**: `status` (draft/active/expired), `eligibility_rules` JSONB, `scoring_rubric` JSONB, `required_documents` JSONB, `guidelines_pdf_path`, `source_form_url`, `last_scraped_at`
- **grant_application_fields**: `grant_id`, `field_order`, `field_label`, `field_type`, `is_required`, `character_limit`, `helper_text`
- **notifications_log**: `user_id`, `application_id`, `grant_id`, `type` (deadline_reminder/abandoned_draft/grant_expiring/new_grant_match), `channel` (email/sms), `sent_at`
- **analytics_events**: `session_id`, `user_id`, `event_type`, `event_data`, `referrer_url`, `device_type`, `created_at`
- **analytics_daily_summary**: `date`, `stage`, `count`, `device_type`, `top_referrers` JSONB — composite PK (date, stage, device_type)
- **applications**: `user_id`, `grant_id`, `company_profile_id`, `status` (in_progress/completed/exported), `updated_at`
- **RLS**: Admin-only SELECT/INSERT on analytics_events, analytics_daily_summary, notifications_log. Admin full CRUD on grants and grant_application_fields.
- **is_admin()** function: `SECURITY DEFINER STABLE` — checks profiles.is_admin for auth.uid()

### Auth & Access
- **proxy.ts**: Redirects unauthenticated users from `/admin/*` to `/login`
- Admin page backup: Server-side getClaims() check in page.tsx
- **Gap**: proxy.ts checks authentication but NOT admin role (`is_admin`). Only checks `data?.claims` exists. Need to add `is_admin` check or rely on page-level + RLS.

### Email (Resend)
- **Package**: `resend@^6.9.4` installed
- **Existing**: `sendApplicationEmail()` in `src/app/actions/export.ts` — sends via `onboarding@resend.dev` (dev sender)
- **Email template**: `buildApplicationEmailHtml()` in `src/lib/email/application-email.tsx` — inline-style HTML templates
- **Reminder opt-in**: `saveReminderOptIn()` already inserts `deadline_reminder` into notifications_log

### Analytics
- **trackEvent()** server action: Uses adminClient, inserts into analytics_events with session_id from iron-session
- **Event types**: session_start, idno_entered, idea_entered, profile_created, grants_viewed, account_created, writer_started, section_generated, section_saved, application_exported
- **Settings page**: `/settings` with `NotificationToggle` component for email_notifications preference

### AI
- **Package**: `ai@^6.0.134`, `@ai-sdk/openai@^3.0.47`
- **Existing pattern**: `generateText` + `Output.object()` with Zod schemas (used in `infer-profile.ts`, `rank-grants.ts`, `generate-section.ts`)
- **Model**: `gpt-5.4-nano` via `@ai-sdk/openai` (direct, not AI Gateway — decided in Phase 3 due to billing)

## Technical Research by Area

### 1. Admin Dashboard & Analytics Funnel (ADMIN-01 through ADMIN-06)

**Funnel stages** (from requirements): Sessions → IDNO Entered → Grants Viewed → Account Created → Writer Started → Exported

**Implementation approach**:
- Analytics aggregation cron (AUTO-03) populates `analytics_daily_summary` nightly
- Dashboard reads from `analytics_daily_summary` for funnel + trends
- For real-time "recent activity" feed (ADMIN-04), query `analytics_events` directly (last 50)
- Active/stale applications (ADMIN-05/06): Query `applications` table with `status = 'in_progress'`, join profiles for user info, calculate staleness from `updated_at`

**Funnel stage mapping** (event_type → funnel stage):
| Funnel Stage | event_type | Notes |
|---|---|---|
| Sessions | session_start | Count distinct session_ids |
| IDNO Entered | idno_entered | |
| Grants Viewed | grants_viewed | |
| Account Created | account_created | |
| Writer Started | writer_started | |
| Exported | application_exported | |

**Clickable stage detail** (ADMIN-03): When admin clicks a funnel stage, show:
- Daily trend chart (last 30 days from analytics_daily_summary)
- Device breakdown (from analytics_daily_summary device_type column)
- Top referrers (from analytics_daily_summary top_referrers JSONB)

**UI components needed**: Funnel visualization (horizontal pipeline bars), line/bar chart for trends, data table for activity feed and applications list.

**Chart library decision**: Use simple div-based bar charts with Tailwind (no external chart library). The funnel is 6 stages — CSS flexbox bars with percentage widths are sufficient. Daily trend can be a simple bar chart with 30 div columns. Keeps bundle small.

### 2. Grant Catalog Management (AGRANT-01 through AGRANT-10)

**Grant table UI** (AGRANT-01): DataTable with columns: name, provider, deadline, status badge, app count (aggregate from applications), last_scraped_at, actions dropdown.

**Status badges** (AGRANT-02): Derive from data:
- `Draft`: status = 'draft'
- `Active`: status = 'active' AND deadline > now()
- `Expiring soon`: status = 'active' AND deadline within 14 days
- `Expired`: status = 'expired' OR (status = 'active' AND deadline < now())

**Note**: The schema has status enum (draft/active/expired). "Expiring soon" is a computed display state, not stored. Need migration to add 'expiring' or compute it client-side. Recommend: compute client-side from deadline proximity.

**Inline deadline edit** (AGRANT-03): Inline date picker on the deadline cell. Server action updates grants table.

**Actions** (AGRANT-04):
- **Edit**: Navigate to `/admin/grants/[id]/edit` form
- **Duplicate**: Server action copies grant + fields, sets status=draft
- **Deactivate**: Server action sets status=expired
- **Re-scrape**: Server action triggers scraper for source_form_url (AGRANT-09)
- **View applications**: Navigate to filtered applications list

**Publish validation** (AGRANT-05): Before setting status=active, validate: name, provider_agency, deadline (future), at least 1 eligibility_rule in JSONB, at least 1 grant_application_field row.

**3-step grant wizard** (AGRANT-06):
1. **Basic info**: name, provider, deadline, description, max_funding, source_type
2. **AI extraction**: Upload PDF → extract eligibility rules, scoring rubric, fields, required docs
3. **Review & publish**: Show extracted data, allow edits, publish button

**PDF upload** (AGRANT-07):
- Client-side MIME validation (application/pdf), max 20MB
- Upload to Supabase Storage bucket (or process in-memory via Route Handler)
- Recommendation: Process in-memory — extract text server-side, don't store PDFs long-term
- PDF text extraction: Use `pdf-parse` npm package (lightweight, works in Node.js serverless)

**AI extraction** (AGRANT-08):
- Extract PDF text → send to AI with structured output schema
- Zod schema for extraction: `{ eligibility_rules: string[], scoring_rubric: { criterion: string, weight: number }[], application_fields: { label: string, type: string, required: boolean, characterLimit: number | null }[], required_documents: string[] }`
- Use existing `generateText` + `Output.object()` pattern with `gpt-5.4-nano`
- Insert extracted fields into `grant_application_fields` table

**SSRF protection** (AGRANT-09): Domain whitelist for re-scrape URLs:
- Allow only known Moldovan grant agency domains
- Validate URL before fetch: parse with URL constructor, check hostname against whitelist
- No internal/private IP ranges (10.x, 192.168.x, 127.x, etc.)

**Publish notification** (AGRANT-10): On publish, query company_profiles with matching criteria, find users with email_notifications=true, send batch notification emails.

### 3. Notification Management (ANOTIF-01 through ANOTIF-03)

**Notification log view** (ANOTIF-01): DataTable reading from `notifications_log` joined with profiles (for user name/email) and grants (for grant name). Columns: user, grant, type badge, channel, sent_at.

**Filters** (ANOTIF-02): Filter by `type` column values: deadline_reminder, abandoned_draft, grant_expiring, new_grant_match.

**Manual bulk send** (ANOTIF-03):
- Admin selects notification type + target audience
- Preview shows count and sample recipients
- Confirmation dialog before sending
- Server action iterates recipients, sends via Resend, logs to notifications_log

### 4. Cron Jobs & Automation (AUTO-01 through AUTO-07)

**Vercel Cron Jobs**: Configured in `vercel.json` `crons` array. Each cron hits an API route. Free plan: 2 cron jobs, 1/day each. Pro plan: 40 cron jobs. Since we need 3 daily crons, this requires Pro plan or consolidate into 1 cron route with type parameter.

**Recommendation**: Single cron endpoint `/api/cron` with query param `?type=deadlines|abandoned|analytics` to stay within free tier limits. Or 3 separate routes if on Pro.

**Cron route pattern**:
```
vercel.json: { "crons": [{ "path": "/api/cron/deadlines", "schedule": "0 9 * * *" }] }
```

**CRON_SECRET validation** (AUTO-04): Check `Authorization: Bearer <CRON_SECRET>` header in each cron route. Vercel automatically sends this header for configured crons.

**Deadline reminders** (AUTO-01): Daily at 9:00 UTC
1. Query grants where deadline is 7 or 3 days from now
2. For each grant, find users with applications (status != 'exported') OR notifications_log entries with type=deadline_reminder
3. Check `profiles.email_notifications = true`
4. Check notifications_log for existing sent reminder (prevent duplicates — AUTO-05)
5. Send email via Resend with deadline info + unsubscribe link
6. Log to notifications_log

**Abandoned draft nudge** (AUTO-02): Daily at 10:00 UTC
1. Query applications where status='in_progress' AND updated_at < now() - 7 days
2. Join to profiles for email, check email_notifications
3. Check notifications_log for existing abandoned_draft sent (prevent duplicates)
4. Send nudge email
5. Log to notifications_log

**Analytics aggregation** (AUTO-03): Daily at 2:00 UTC
1. Query analytics_events for previous day (created_at between yesterday 00:00 and today 00:00)
2. Group by event_type (mapped to stage), device_type
3. Count events per group
4. Aggregate top referrers per stage (top 5 referrer_urls by count)
5. Upsert into analytics_daily_summary

**Duplicate prevention** (AUTO-05): Before sending any notification, query:
```sql
SELECT 1 FROM notifications_log
WHERE user_id = $1 AND grant_id = $2 AND type = $3
AND sent_at > now() - interval '24 hours'
```

**Notification preferences** (AUTO-06): Always check `profiles.email_notifications` before sending.

**Unsubscribe link** (AUTO-07): Each email includes a link like `/settings?unsubscribe=true` that navigates to settings page where user can toggle notifications. Alternative: signed token URL that directly updates the preference without login.

### 5. Schema Changes Needed

**New migration required**:
1. **profiles.email**: TEXT column — email lives in auth.users but admin/cron batch operations need it queryable. Backfill from auth.users, update handle_new_user trigger to copy email on signup.
2. **notifications_log.unsubscribe_token**: UUID column for one-click unsubscribe without auth
3. **Index on notifications_log**: (user_id, grant_id, type, sent_at) for duplicate prevention queries
4. **Index on applications**: (status, updated_at) for stale application queries
5. **Admin RLS for applications**: Admin needs SELECT on applications for dashboard — currently only user's own applications visible
6. **Admin RLS for company_profiles**: Admin needs to see all profiles for notification targeting
7. **Admin RLS for application_sections**: Admin needs read access for application view

**Note on profiles column names**: The profiles table column is `name` (not `full_name`). Device_type in analytics_daily_summary uses `NOT NULL DEFAULT ''` — map null values from analytics_events to empty string.

### 6. Email Templates Needed

Using the existing `buildApplicationEmailHtml` pattern (inline-style template literals):
1. **Deadline reminder**: Grant name, deadline date, days remaining, CTA to continue application
2. **Abandoned draft nudge**: Grant name, last activity date, CTA to resume
3. **Grant expiring**: Grant name, deadline, CTA to apply
4. **New grant match**: Grant name, match score, funding, CTA to view
5. All templates include unsubscribe link (AUTO-07)

### 7. File Structure

```
src/app/admin/
  page.tsx                    # Dashboard with funnel + activity feed
  layout.tsx                  # Admin layout with sidebar nav
  grants/
    page.tsx                  # Grant catalog table
    new/
      page.tsx                # 3-step grant wizard
    [id]/
      edit/
        page.tsx              # Edit grant form
      applications/
        page.tsx              # Applications for this grant
  notifications/
    page.tsx                  # Notification log viewer

src/app/api/cron/
  deadlines/route.ts          # Deadline reminder cron
  abandoned/route.ts          # Abandoned draft cron
  analytics/route.ts          # Analytics aggregation cron

src/app/actions/
  admin-grants.ts             # Grant CRUD, duplicate, deactivate, publish
  admin-analytics.ts          # Dashboard data fetching
  admin-notifications.ts      # Notification log, bulk send

src/lib/ai/
  extract-grant-pdf.ts        # AI extraction from PDF text

src/lib/email/
  notification-emails.tsx     # Email templates for all notification types
  unsubscribe.ts              # Token-based unsubscribe handler

src/app/api/unsubscribe/
  route.ts                    # One-click unsubscribe endpoint
```

## Validation Architecture

### Dimension 1: Requirement Coverage
Every ADMIN/AGRANT/ANOTIF/AUTO requirement maps to a specific plan task.

### Dimension 2: Integration Points
- Admin auth: proxy.ts + page-level checks + RLS
- Analytics: Reads from existing analytics_events + analytics_daily_summary
- Email: Extends existing Resend setup with new templates
- AI extraction: Uses established generateText + Output.object() pattern
- Cron: New API routes with CRON_SECRET validation

### Dimension 3: Data Flow
- Analytics events (written by trackEvent) → aggregated by cron → read by dashboard
- PDF upload → text extraction → AI structured output → grants + fields tables
- Cron triggers → query eligible users → check prefs/dupes → send email → log

### Dimension 4: Error Handling
- PDF extraction: Validate MIME type, file size, handle AI extraction failures with manual fallback
- Cron: Log failures, don't re-send on retry (idempotent via duplicate check)
- Email: Resend error handling, retry logic in cron

### Dimension 8: Testing Strategy
- Unit tests: Publish validation logic, duplicate prevention, funnel stage mapping
- Integration tests: Cron route with CRON_SECRET validation, admin data queries
- E2E: Grant wizard flow, notification bulk send

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| PDF text extraction quality varies | Medium | Fallback to manual entry if AI extraction confidence low |
| Cron free tier limits (2 jobs) | Low | Consolidate or confirm Pro plan |
| Email deliverability (onboarding@resend.dev) | Medium | Production needs verified domain |
| Admin auth gap in proxy.ts | High | Add is_admin check or rely on RLS (RLS already enforces) |
| Large notification batches | Low | Batch Resend sends (100/batch), use waitUntil for background |

## Dependencies on Previous Phases

- **Phase 1**: Supabase schema, proxy.ts, Resend setup - all complete
- **Phase 2**: Company profiles, analytics tracking - all complete
- **Phase 3**: Grant matching logic (reused for new grant match notifications) - complete
- **Phase 5**: Writer, export, notification preferences - all complete

All dependencies satisfied. Phase 6 can proceed immediately.

---

## RESEARCH COMPLETE

*Phase: 06-admin-tooling-and-automation*
*Research completed: 2026-03-22*
