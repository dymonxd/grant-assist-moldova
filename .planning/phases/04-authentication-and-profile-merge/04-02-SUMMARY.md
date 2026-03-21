---
phase: 04-authentication-and-profile-merge
plan: 02
subsystem: auth-ui
tags: [account-wall, signup-form, save-button, auth-gating, shadcn-dialog, useActionState]

# Dependency graph
requires:
  - phase: 04-authentication-and-profile-merge
    provides: signup server action, toggleSavedGrant action, shadcn Dialog/Checkbox/Label components
  - phase: 03-grant-matching
    provides: HeroCard, MatchCard, MatchList, GrantCard components with grant display
provides:
  - AccountWallModal controlled dialog with signup form and skip option
  - SignupForm using useActionState with signup server action
  - SaveButton bookmark toggle for authenticated users, modal trigger for anonymous
  - Auth-aware HeroCard, MatchCard, GrantCard with conditional rendering
  - Results page and browse page auth state propagation
affects: [05-writer]

# Tech tracking
tech-stack:
  added: []
  patterns: [auth-aware-card-pattern, controlled-dialog-modal, save-button-toggle]

key-files:
  created:
    - src/components/auth/account-wall-modal.tsx
    - src/components/auth/signup-form.tsx
    - src/components/auth/__tests__/account-wall-modal.test.ts
    - src/components/grants/save-button.tsx
  modified:
    - src/components/grants/hero-card.tsx
    - src/components/grants/match-card.tsx
    - src/components/grants/match-list.tsx
    - src/app/results/page.tsx
    - src/app/results/[token]/page.tsx
    - src/app/grants/browse/grant-card.tsx
    - src/app/grants/browse/grant-list.tsx
    - src/app/grants/browse/page.tsx
    - src/components/grants/__tests__/hero-card.test.ts
    - src/components/grants/__tests__/match-card.test.ts
    - src/app/grants/browse/__tests__/grant-card.test.ts

key-decisions:
  - "Grant cards converted to 'use client' with useState for modal -- auth state passed as props from server pages"
  - "Shared results page passes isAuthenticated=false since it is a public view with no auth context"
  - "SaveButton handles both authenticated (toggle) and unauthenticated (modal trigger) states in a single component"

patterns-established:
  - "Auth-aware card pattern: server page checks getUser(), passes isAuthenticated + savedGrantIds through component tree"
  - "Controlled modal pattern: card has useState for showModal, AccountWallModal as sibling with open/onOpenChange"
  - "SaveButton pattern: single component handles both auth states -- toggle for authenticated, onAuthRequired callback for anonymous"

requirements-completed: [AUTH-01, AUTH-04, AUTH-07]

# Metrics
duration: 6min
completed: 2026-03-21
---

# Phase 4 Plan 02: Account Wall Modal and Auth-Aware Grant Cards Summary

**Account wall modal with signup form and "Continua fara cont" skip option, SaveButton bookmark toggle, and auth-aware conditional rendering across HeroCard, MatchCard, and GrantCard components**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T19:55:09Z
- **Completed:** 2026-03-21T20:01:56Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Created AccountWallModal with controlled shadcn Dialog, signup form, and "Continua fara cont" skip link for zero-friction UX
- Created SignupForm using useActionState with all required fields (name, email, phone, password, notifications checkbox, hidden redirectTo)
- Created SaveButton with dual behavior: bookmark toggle for authenticated users, modal trigger for anonymous
- Converted HeroCard, MatchCard, and GrantCard to auth-aware components with conditional Aplica acum (link vs modal button)
- Wired auth state from server pages (results + browse) through component tree via getUser() + getSavedGrants()
- Updated shared results page to pass isAuthenticated=false for public view
- Updated all existing card tests to pass with new auth props -- 125 tests pass across 18 files
- TDD for modal: 8 tests covering dialog rendering, skip link, form fields, and closed state

## Task Commits

Each task was committed atomically:

1. **Task 1: Account wall modal and signup form (TDD)**
   - RED: `995301b` (test) - failing tests for modal and signup form
   - GREEN: `b3801f9` (feat) - implementation passes all 8 tests
2. **Task 2: Save button and auth-aware grant cards** - `75ff4f4` (feat)

_TDD Task 1 has separate test and implementation commits_

## Files Created/Modified
- `src/components/auth/account-wall-modal.tsx` - Controlled Dialog with signup form and skip link
- `src/components/auth/signup-form.tsx` - useActionState signup form with all required fields
- `src/components/auth/__tests__/account-wall-modal.test.ts` - 8 tests for modal and signup form
- `src/components/grants/save-button.tsx` - Bookmark toggle (auth) / modal trigger (anon)
- `src/components/grants/hero-card.tsx` - Auth-aware Aplica acum + SaveButton + modal
- `src/components/grants/match-card.tsx` - Auth-aware Aplica acum + SaveButton + modal
- `src/components/grants/match-list.tsx` - Passes isAuthenticated + savedGrantIds to cards
- `src/app/results/page.tsx` - Added getUser() auth check and getSavedGrants()
- `src/app/results/[token]/page.tsx` - Passes isAuthenticated=false for public view
- `src/app/grants/browse/grant-card.tsx` - Auth-aware Aplica + SaveButton + modal
- `src/app/grants/browse/grant-list.tsx` - Passes isAuthenticated + savedGrantIds to cards
- `src/app/grants/browse/page.tsx` - Added getUser() auth check and getSavedGrants()
- `src/components/grants/__tests__/hero-card.test.ts` - Updated for new auth props
- `src/components/grants/__tests__/match-card.test.ts` - Updated for new auth props
- `src/app/grants/browse/__tests__/grant-card.test.ts` - Updated for new auth props

## Decisions Made
- Grant cards converted to 'use client' with useState for modal control -- auth state passed as props from server component pages to avoid server-only imports in client components
- Shared results page passes isAuthenticated=false since it is a public view without auth context
- SaveButton handles both authenticated (toggle with server action) and unauthenticated (onAuthRequired callback) states in a single component rather than separate components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing card tests for new props**
- **Found during:** Task 2
- **Issue:** Existing tests for HeroCard, MatchCard, and GrantCard called components without the new isAuthenticated/isSaved props, causing test failures
- **Fix:** Updated all three test files to pass auth props and mock auth/navigation/link dependencies
- **Files modified:** hero-card.test.ts, match-card.test.ts, grant-card.test.ts
- **Committed in:** `75ff4f4` (part of Task 2 commit)

**2. [Rule 1 - Bug] Updated shared results page for new MatchList props**
- **Found during:** Task 2
- **Issue:** `src/app/results/[token]/page.tsx` called MatchList without new required isAuthenticated/savedGrantIds props
- **Fix:** Added isAuthenticated=false and savedGrantIds=[] for public shared view
- **Files modified:** src/app/results/[token]/page.tsx
- **Committed in:** `75ff4f4` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from changed component interfaces)
**Impact on plan:** Both auto-fixes necessary for correctness -- component interface changes required updates to all consumers. No scope creep.

## Issues Encountered
- Test DOM bleed in modal tests: initial test run found multiple elements due to missing cleanup between renders. Fixed by adding afterEach(cleanup) and using container-scoped queries for SignupForm tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Account wall modal and auth-aware grant cards complete for Phase 5 (Writer)
- All grant card interactions (Aplica acum, Salveaza) properly gate behind auth
- "Continua fara cont" provides zero-friction path to grant writer without account
- SaveButton ready for use in any future grant card variant
- 125 tests pass across the full suite

## Self-Check: PASSED

All 12 source files verified present. All 3 commits verified in git log.

---
*Phase: 04-authentication-and-profile-merge*
*Completed: 2026-03-21*
