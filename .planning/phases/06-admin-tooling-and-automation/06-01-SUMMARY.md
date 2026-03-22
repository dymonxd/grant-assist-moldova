---
phase: 06-admin-tooling-and-automation
plan: 01
subsystem: admin
tags: [analytics, funnel, supabase, rls, tailwind, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase schema, proxy.ts auth, analytics tables
  - phase: 02-data-layer
    provides: analytics trackEvent, company_profiles
  - phase: 05-ai-grant-writer-and-export
    provides: Resend email integration, notification preferences
provides:
  - Admin dashboard with 6-stage analytics funnel
  - Server actions for admin data access (getFunnelData, getStageDetail, getRecentActivity, getApplicationsList, sendStaleReminder)
  - Admin auth hardening in proxy.ts (is_admin check)
  - RLS policies for admin access to applications, company_profiles, application_sections
  - profiles.email column with backfill from auth.users
  - notifications_log dedup index and unsubscribe_token column
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [admin-server-actions-with-verifyAdmin, div-based-funnel-chart, admin-layout-with-sidebar]

key-files:
  created:
    - supabase/migrations/20260322_admin_phase6.sql
    - src/app/actions/admin-analytics.ts
    - src/app/actions/__tests__/admin-analytics.test.ts
    - src/app/admin/layout.tsx
    - src/app/admin/dashboard-client.tsx
    - src/app/admin/components/funnel-bar.tsx
    - src/app/admin/components/stage-detail.tsx
    - src/app/admin/components/activity-feed.tsx
    - src/app/admin/components/applications-table.tsx
  modified:
    - src/proxy.ts
    - src/app/admin/page.tsx

key-decisions:
  - "verifyAdmin helper pattern: createClient + getUser + profiles.is_admin check in every admin server action"
  - "Div-based bar charts for funnel and daily trend (no external chart library, keeps bundle small)"
  - "AdminDashboardClient manages stage selection state; getStageDetail called on click via useTransition"
  - "profiles.email column backfilled from auth.users for admin-queryable email without service-role auth calls"
  - "Turbopack build panics on emoji in directory path -- verified via tsc --noEmit instead"

patterns-established:
  - "Admin server action pattern: verifyAdmin() guard + createAdminClient() for data queries"
  - "Admin layout: sidebar nav on desktop (w-56), horizontal top nav on mobile"
  - "Stale application detection: updated_at < 7 days ago with orange highlight"

requirements-completed: [ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06]

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 6 Plan 1: Admin Dashboard Summary

**Admin dashboard with 6-stage analytics funnel, clickable stage details, activity feed, and stale application management with email reminders**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-22T16:11:31Z
- **Completed:** 2026-03-22T16:18:23Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Admin analytics funnel with 6 labeled stages (Sessions through Exported) and conversion rate badges
- Clickable stage detail panel showing daily trend bar chart, device breakdown, and top referrers
- Real-time activity feed showing last 50 analytics events with color-coded badges
- Active applications table with staleness highlighting and "Trimite memento" reminder button
- Admin auth hardening: proxy.ts now checks is_admin for /admin routes (not just authentication)
- DB migration with profiles.email backfill, admin RLS policies, and query indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + admin auth hardening + analytics server actions (TDD)**
   - `5427c4f` test(06-01): add failing tests for admin analytics server actions
   - `2db3ca2` feat(06-01): admin analytics server actions, DB migration, and auth hardening
2. **Task 2: Admin dashboard UI** - `29f0397` feat(06-01): admin dashboard UI with funnel, activity feed, and applications table

## Files Created/Modified
- `supabase/migrations/20260322_admin_phase6.sql` - profiles.email + backfill, unsubscribe_token, indexes, admin RLS policies
- `src/proxy.ts` - Added is_admin check for /admin routes
- `src/app/actions/admin-analytics.ts` - Server actions: getFunnelData, getStageDetail, getRecentActivity, getApplicationsList, sendStaleReminder
- `src/app/actions/__tests__/admin-analytics.test.ts` - 7 tests covering all server actions and admin verification
- `src/app/admin/layout.tsx` - Admin layout with sidebar nav and mobile horizontal nav
- `src/app/admin/page.tsx` - Server component fetching dashboard data
- `src/app/admin/dashboard-client.tsx` - Client component managing stage selection interactivity
- `src/app/admin/components/funnel-bar.tsx` - 6-stage horizontal funnel bars with conversion rates
- `src/app/admin/components/stage-detail.tsx` - Daily trend chart, device breakdown, top referrers
- `src/app/admin/components/activity-feed.tsx` - Scrollable event list with Romanian labels
- `src/app/admin/components/applications-table.tsx` - Applications table with stale highlighting and reminder

## Decisions Made
- verifyAdmin() helper centralizes admin check: createClient + getUser + profiles.is_admin query
- Div-based charts (no external library) for funnel bars and daily trends -- keeps bundle minimal for 6 stages / 30 bars
- profiles.email column added and backfilled from auth.users so admin queries don't need service-role auth calls
- useTransition for non-blocking stage detail loading on click
- Build verified via tsc --noEmit due to pre-existing Turbopack emoji path bug

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Turbopack build panics on emoji character in directory path (`Agensy [emoji] /GrantsAI/Grands (new)`). This is a known Turbopack bug. Build verification done via `tsc --noEmit` (zero errors) and full test suite (240 tests pass). Not caused by plan changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Admin dashboard foundation complete, ready for Phase 6 Plans 02-04
- Server action pattern (verifyAdmin + createAdminClient) established for reuse in grant catalog and notification management
- RLS policies in place for admin access to applications, company_profiles, application_sections

## Self-Check: PASSED

- All 11 created/modified files verified present on disk
- All 3 task commits verified in git history (5427c4f, 2db3ca2, 29f0397)
- Full test suite: 240 tests pass across 32 files
- TypeScript compilation: zero errors

---
*Phase: 06-admin-tooling-and-automation*
*Completed: 2026-03-22*
