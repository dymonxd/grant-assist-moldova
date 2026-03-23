---
phase: 06-admin-tooling-and-automation
plan: 02
subsystem: admin
tags: [grants, crud, table, status-badges, inline-editing, publish-validation, supabase]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase admin client, Tailwind/shadcn base styles
  - phase: 02-data-layer
    provides: grants table schema, grant_application_fields, applications tables
provides:
  - Grant CRUD server actions (getGrantsCatalog, updateDeadline, duplicateGrant, deactivateGrant, publishGrant, updateGrant)
  - Grant catalog admin page at /admin/grants
  - StatusBadge component (Draft/Active/Expiring/Expired)
  - DeadlineEditor inline component
  - Grant edit page with publish validation
  - Applications viewer per grant
affects: [06-admin-tooling-and-automation]

# Tech tracking
tech-stack:
  added: []
  patterns: [admin-verify-pattern, computed-displayStatus, inline-edit-with-useTransition]

key-files:
  created:
    - src/app/actions/admin-grants.ts
    - src/app/actions/__tests__/admin-grants.test.ts
    - src/app/admin/grants/page.tsx
    - src/app/admin/grants/components/grant-table.tsx
    - src/app/admin/grants/components/status-badge.tsx
    - src/app/admin/grants/components/deadline-editor.tsx
    - src/app/admin/grants/[id]/edit/page.tsx
    - src/app/admin/grants/[id]/edit/edit-grant-form.tsx
    - src/app/admin/grants/[id]/applications/page.tsx
  modified: []

key-decisions:
  - "Admin verification via profiles.is_admin check using createAdminClient (service role)"
  - "Supabase join for profiles returns array -- handled with Array.isArray guard"
  - "Record<string, unknown> typing for Supabase untyped rows in applications page"

patterns-established:
  - "verifyAdmin pattern: createClient for auth + createAdminClient for profiles.is_admin check"
  - "computeDisplayStatus: pure function deriving Draft/Active/Expiring/Expired from status + deadline"
  - "Inline editor: click-to-edit with useTransition for non-blocking server action calls"

requirements-completed: [AGRANT-01, AGRANT-02, AGRANT-03, AGRANT-04, AGRANT-05]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 6 Plan 2: Grant Catalog Management Summary

**Grant catalog admin table with 4-color status badges, inline deadline editor, duplicate/deactivate actions, edit form with 5-point publish validation, and applications viewer**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-22T16:10:59Z
- **Completed:** 2026-03-22T16:17:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Full grant CRUD server actions with admin-only access verification
- Publish validation enforcing 5 required fields (name, provider, deadline, rules, application fields) with Romanian error messages
- Grant catalog table with color-coded status badges (Draft grey, Active green, Expiring orange, Expired red)
- Inline deadline editing with click-to-edit UX and useTransition for non-blocking saves
- Actions dropdown with Edit, Duplicate (copie suffix), Deactivate (confirmation), and View applications
- Edit page with full grant form including JSON editors for eligibility rules, scoring rubric, and required documents
- Applications page showing per-grant application list with user info

## Task Commits

Each task was committed atomically:

1. **Task 1: Grant catalog server actions with publish validation** - `376b8c2` (feat) [TDD: 16 tests]
2. **Task 2: Grant catalog table UI with status badges, inline editing, and actions** - `1d5c748` (feat)

## Files Created/Modified
- `src/app/actions/admin-grants.ts` - Grant CRUD server actions with verifyAdmin, computeDisplayStatus, and publish validation
- `src/app/actions/__tests__/admin-grants.test.ts` - 16 tests covering auth, catalog, deadline, duplicate, deactivate, publish validation, and update
- `src/app/admin/grants/page.tsx` - Server component catalog page with empty state
- `src/app/admin/grants/components/grant-table.tsx` - Client table with actions dropdown, deadline editor integration
- `src/app/admin/grants/components/status-badge.tsx` - Color-coded status badge (4 states, Romanian labels)
- `src/app/admin/grants/components/deadline-editor.tsx` - Inline click-to-edit date with ro-MD formatting
- `src/app/admin/grants/[id]/edit/page.tsx` - Server component fetching grant for edit form
- `src/app/admin/grants/[id]/edit/edit-grant-form.tsx` - Client form with JSON editors, save/publish buttons
- `src/app/admin/grants/[id]/applications/page.tsx` - Server component showing applications per grant

## Decisions Made
- Admin verification uses createClient for auth.getUser + createAdminClient for profiles.is_admin check (consistent pattern)
- Supabase join profiles returns array in untyped context -- added Array.isArray guard for type safety
- Record<string, unknown> typing for Supabase rows in applications page map callback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase join type mismatch in applications page**
- **Found during:** Task 2 (applications page)
- **Issue:** Supabase `.select('profiles(full_name, email)')` returns profiles as array in untyped context, TypeScript expected single object
- **Fix:** Added Array.isArray guard to handle both array and single-object shapes, used Record<string, unknown> for map callback typing
- **Files modified:** src/app/admin/grants/[id]/applications/page.tsx
- **Verification:** TypeScript compilation passes with no errors in non-test files
- **Committed in:** 1d5c748 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type safety fix for Supabase join return type. No scope creep.

## Issues Encountered
- Turbopack build fails due to emoji in directory path (pre-existing issue, not related to this plan's changes) -- TypeScript type-check used as alternative verification

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Grant catalog management fully operational at /admin/grants
- Ready for remaining Phase 6 plans (admin analytics, automation)
- Edit page provides foundation for future grant creation flow at /admin/grants/new

## Self-Check: PASSED

All 10 files verified present. Both task commits (376b8c2, 1d5c748) verified in git log.

---
*Phase: 06-admin-tooling-and-automation*
*Completed: 2026-03-22*
