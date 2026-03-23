---
phase: 06-admin-tooling-and-automation
plan: 05
subsystem: automation
tags: [cron, vercel, deadline-reminders, abandoned-drafts, analytics-aggregation, resend, notifications]

# Dependency graph
requires:
  - phase: 06-admin-tooling-and-automation
    provides: Admin auth, notifications_log schema, notification email templates, checkDuplicateNotification, Resend integration
  - phase: 05-ai-grant-writer-and-export
    provides: Notification preferences (email_notifications), analytics event tracking
provides:
  - Deadline reminder cron (daily 9:00 UTC) targeting grants expiring in 7/3 days
  - Abandoned draft nudge cron (daily 10:00 UTC) for 7+ day inactive applications
  - Analytics aggregation cron (nightly 2:00 UTC) populating analytics_daily_summary
  - CRON_SECRET Bearer token validation on all cron endpoints
  - Vercel cron schedule configuration (vercel.json)
affects: [06-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [cron-auth-validation, event-to-stage-mapping, analytics-aggregation-with-upsert]

key-files:
  created:
    - src/app/api/cron/deadlines/route.ts
    - src/app/api/cron/abandoned/route.ts
    - src/app/api/cron/analytics/route.ts
    - src/app/api/cron/__tests__/cron.test.ts
    - vercel.json
  modified: []

key-decisions:
  - "Shared validateCronSecret pattern inlined in each route (not shared module) for self-containment"
  - "Analytics event_type to funnel stage mapping skips unmapped types (section_generated, section_saved)"
  - "Null device_type mapped to empty string for analytics_daily_summary composite PK compatibility"
  - "vi.hoisted() for mock variable declarations in Vitest 4 to avoid hoisting initialization errors"

patterns-established:
  - "Cron auth pattern: validateCronSecret checks Bearer token against process.env.CRON_SECRET"
  - "Analytics aggregation: event_type -> stage mapping, group by (stage, device_type), top 5 referrers, upsert on conflict"
  - "Array.isArray guard for Supabase join results (consistent with 06-02 and 06-04 patterns)"

requirements-completed: [AUTO-01, AUTO-02, AUTO-03, AUTO-04]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 6 Plan 5: Cron Jobs Summary

**3 daily cron jobs with CRON_SECRET auth: deadline reminders (7/3 days), abandoned draft nudges (7+ days inactive), and nightly analytics aggregation into funnel stages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T16:33:11Z
- **Completed:** 2026-03-22T16:37:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 3 cron route handlers with CRON_SECRET Bearer token validation (401 on mismatch)
- Deadline cron finds grants expiring in 7 or 3 days, sends reminders to users with in-progress applications, checks notification preferences and 24h duplicate prevention
- Abandoned draft cron finds applications inactive 7+ days, sends nudge emails with re-engagement CTA
- Analytics cron aggregates previous day events by funnel stage and device type, computes top 5 referrers, upserts into analytics_daily_summary
- vercel.json with 3 cron schedules: deadlines 9:00 UTC, abandoned 10:00 UTC, analytics 2:00 UTC
- 13 tests covering auth validation, business logic, and edge cases (empty events, disabled notifications, duplicates)

## Task Commits

Each task was committed atomically:

1. **Task 1: Cron route handlers (TDD)**
   - `ca0ca08` test(06-05): add failing tests for cron route handlers
   - `169db79` feat(06-05): cron route handlers for deadlines, abandoned drafts, and analytics
   - `2e291c7` refactor(06-05): fix TypeScript Map iteration types in analytics cron
2. **Task 2: Vercel cron configuration** - `de453f5` chore(06-05): add vercel.json cron configuration

## Files Created/Modified
- `src/app/api/cron/deadlines/route.ts` - Deadline reminder cron handler: finds grants expiring in 7/3 days, sends emails via Resend, logs to notifications_log
- `src/app/api/cron/abandoned/route.ts` - Abandoned draft nudge cron handler: finds stale applications (7+ days), sends re-engagement emails
- `src/app/api/cron/analytics/route.ts` - Analytics aggregation cron handler: maps event_type to funnel stage, groups by device_type, upserts daily summary
- `src/app/api/cron/__tests__/cron.test.ts` - 13 tests: auth validation (6), deadline logic (3), abandoned logic (2), analytics logic (2)
- `vercel.json` - Cron schedule configuration with 3 daily jobs

## Decisions Made
- Shared validateCronSecret pattern inlined in each route rather than a shared module -- each route is self-contained
- Analytics event_type to funnel stage mapping skips unmapped types (section_generated, section_saved, etc.) as they are not funnel stages
- Null device_type mapped to empty string for analytics_daily_summary composite PK compatibility (matches schema convention from 01-01)
- vi.hoisted() used for mock variable declarations in Vitest 4 to resolve mock factory hoisting order

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript Map iteration types in analytics cron**
- **Found during:** Task 1 (post-implementation type check)
- **Issue:** Map iterator used `for...of` directly which required `--downlevelIteration`, and referrer entries lacked explicit tuple types
- **Fix:** Changed to `Array.from(map.entries())` with explicit `[string, number][]` type annotation
- **Files modified:** src/app/api/cron/analytics/route.ts
- **Verification:** Tests pass, tsc --noEmit shows no type errors in new files
- **Committed in:** 2e291c7

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** TypeScript type narrowing fix necessary for compilation. No scope creep.

## Issues Encountered
- Vitest 4 mock hoisting: `vi.mock()` factory cannot reference `const` variables declared at module scope because `vi.mock` is hoisted above all declarations. Fixed with `vi.hoisted()` which explicitly declares mock variables at the hoisted scope.
- Pre-existing Turbopack emoji path bug still present (not caused by plan changes).

## User Setup Required

**Environment variable:** `CRON_SECRET` must be set in Vercel project settings for production cron authentication. Generate a secure random string (e.g., `openssl rand -hex 32`).

## Next Phase Readiness
- All 3 cron jobs ready for production deployment
- vercel.json cron configuration will activate on next Vercel production deployment
- Note: 3 cron jobs requires Vercel Pro plan (free tier allows 2)
- Plan 06-06 (end-to-end verification checkpoint) is the final plan in Phase 6

## Self-Check: PASSED

- All 5 created files verified present on disk
- All 4 task commits verified in git history (ca0ca08, 169db79, 2e291c7, de453f5)
- Full cron test suite: 13 tests pass
- vercel.json: valid JSON with 3 cron entries

---
*Phase: 06-admin-tooling-and-automation*
*Completed: 2026-03-22*
