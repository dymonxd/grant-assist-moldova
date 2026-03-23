---
phase: 04-authentication-and-profile-merge
plan: 01
subsystem: auth
tags: [supabase-auth, server-actions, iron-session, profile-merge, shadcn]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase client setup, iron-session, auth callback route
  - phase: 02-data-layer
    provides: company_profiles table, server action patterns, admin client
provides:
  - signup server action with profile merge, phone update, notification preference
  - signIn server action with password authentication
  - signOut server action
  - toggleSavedGrant server action (bookmark toggle)
  - getSavedGrants server action (list saved grant IDs)
  - shadcn Dialog, Checkbox, Label UI components
affects: [04-02-account-wall-modal, 05-writer]

# Tech tracking
tech-stack:
  added: [shadcn-dialog, shadcn-checkbox, shadcn-label]
  patterns: [server-action-auth, anonymous-to-authenticated-profile-merge, tdd-for-actions]

key-files:
  created:
    - src/app/actions/auth.ts
    - src/app/actions/saved-grants.ts
    - src/app/actions/__tests__/auth.test.ts
    - src/app/actions/__tests__/saved-grants.test.ts
    - src/components/ui/dialog.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/label.tsx
  modified: []

key-decisions:
  - "signup uses createClient (server) for auth.signUp and createAdminClient for privileged RPC/profile updates"
  - "toggleSavedGrant uses authenticated server client (not admin) to leverage RLS on saved_grants"
  - "redirect() throws internally in Next.js -- tests catch RedirectError to verify redirect URL"

patterns-established:
  - "Auth server actions: return {error: string} on failure, redirect() on success"
  - "Profile merge flow: signUp -> claim_company_profile RPC -> update profiles -> clear session"
  - "Saved grants: authenticated server client with RLS, not admin client"

requirements-completed: [AUTH-02, AUTH-03, AUTH-05, AUTH-06, AUTH-07]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 4 Plan 01: Auth Actions Summary

**Supabase auth server actions (signup with anonymous-to-authenticated profile merge, signIn, signOut) plus saved grants toggle/list, backed by 22 TDD tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T19:47:58Z
- **Completed:** 2026-03-21T19:51:36Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Installed shadcn Dialog, Checkbox, and Label UI components for account wall modal
- Implemented signup with full profile merge flow: Supabase user creation with metadata, claim_company_profile RPC, phone/notification update in profiles, iron-session clear
- Implemented signIn (password auth) and signOut with Romanian error messages
- Implemented toggleSavedGrant (bookmark toggle with RLS) and getSavedGrants (list saved grant IDs)
- 22 TDD tests covering all auth and saved-grants server actions (15 auth + 7 saved-grants)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn Dialog, Checkbox, and Label** - `1d6c42a` (chore)
2. **Task 2: Auth server actions (TDD)**
   - RED: `bc9b171` (test) - failing auth tests
   - GREEN: `125fedf` (feat) - auth implementation passes all 15 tests
3. **Task 3: Saved grants server actions (TDD)**
   - RED: `a5d61ed` (test) - failing saved-grants tests
   - GREEN: `53dbbf3` (feat) - saved-grants implementation passes all 7 tests

_TDD tasks have separate test and implementation commits_

## Files Created/Modified
- `src/components/ui/dialog.tsx` - shadcn Dialog component for account wall modal
- `src/components/ui/checkbox.tsx` - shadcn Checkbox for notification opt-in
- `src/components/ui/label.tsx` - shadcn Label for form labels
- `src/app/actions/auth.ts` - signup (with profile merge), signIn, signOut server actions
- `src/app/actions/saved-grants.ts` - toggleSavedGrant, getSavedGrants server actions
- `src/app/actions/__tests__/auth.test.ts` - 15 tests for auth actions
- `src/app/actions/__tests__/saved-grants.test.ts` - 7 tests for saved-grants actions

## Decisions Made
- signup uses createClient (server) for auth.signUp and createAdminClient for privileged RPC/profile updates -- separates auth-level from admin-level operations
- toggleSavedGrant uses authenticated server client (not admin) to leverage RLS on saved_grants -- ownership validation via auth.uid() = user_id policy
- redirect() throws NEXT_REDIRECT internally in Next.js -- tests catch RedirectError to verify redirect URL was correct

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth server actions ready for Plan 02 (account wall modal UI) to wire directly
- signup handles full anonymous-to-authenticated flow including profile merge
- Saved grants actions ready for bookmark UI integration
- All 114 tests pass across the full suite (84 existing + 22 new + 8 from parallel plan)

## Self-Check: PASSED

All 7 files verified present. All 5 commits verified in git log.

---
*Phase: 04-authentication-and-profile-merge*
*Completed: 2026-03-21*
