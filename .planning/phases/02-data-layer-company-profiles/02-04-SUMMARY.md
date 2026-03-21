---
phase: 02-data-layer-company-profiles
plan: 04
subsystem: ui
tags: [nextjs, supabase, shadcn, testing-library, vitest, react, server-components]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase server client (createClient), grants table schema, RLS policies, shadcn button, vitest config"
  - phase: 02-data-layer-company-profiles
    provides: "Vitest setup with path aliases from 02-01"
provides:
  - "Public /grants/browse page with server-side Supabase query"
  - "GrantCard component with Grant interface export"
  - "GrantFilters client component with URL search params"
  - "GrantList component with responsive grid and empty state"
  - "Behavioral test suite for GrantCard (4 tests)"
affects: [03-matching-engine, 04-auth-profiles, 05-ai-writer]

# Tech tracking
tech-stack:
  added: ["@testing-library/react", "@testing-library/jest-dom", "jsdom", "shadcn card", "shadcn input", "shadcn badge", "shadcn select"]
  patterns: ["Server Component with async searchParams (Next.js 16)", "URL search params for filter state", "TDD RED/GREEN for UI components", "jsdom vitest environment for React tests"]

key-files:
  created:
    - src/app/grants/browse/page.tsx
    - src/app/grants/browse/grant-card.tsx
    - src/app/grants/browse/filters.tsx
    - src/app/grants/browse/grant-list.tsx
    - src/app/grants/browse/__tests__/grant-card.test.ts
    - src/components/ui/card.tsx
    - src/components/ui/input.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/select.tsx
  modified:
    - src/app/globals.css
    - .gitignore

key-decisions:
  - "Used native HTML select for provider dropdown instead of shadcn Select (base-ui popover) for simplicity in URL-param-driven client component"
  - "Used jsdom vitest environment annotation per-file rather than global config change, preserving node environment for non-UI tests"
  - "Used Intl.NumberFormat('ro-MD') and Intl.DateTimeFormat('ro-MD') for Romanian locale formatting"

patterns-established:
  - "TDD for UI components: write behavioral tests first with @testing-library/react, then implement component"
  - "Server Component pages with async searchParams (Next.js 16 pattern)"
  - "URL search params for shareable, back-button-friendly filter state"
  - "Responsive grid: 1 col mobile, 2 col md, 3 col lg"

requirements-completed: [BRWSE-01, BRWSE-02, BRWSE-03, BRWSE-04]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 2 Plan 4: Grant Browse Page Summary

**Public grant browse page at /grants/browse with server-side Supabase query, search/filter controls via URL params, responsive card grid, and TDD-verified GrantCard component**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T13:07:16Z
- **Completed:** 2026-03-21T13:12:28Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Built public /grants/browse page that queries active grants from Supabase without authentication
- GrantCard component with formatted funding (Intl.NumberFormat), deadline display, null handling, and "Expira curand" warning badge for grants expiring within 14 days
- GrantFilters client component with debounced search, provider dropdown, max funding, and deadline filters -- all persisted in URL search params for shareability
- GrantList with responsive grid layout and Romanian empty state message
- 4 behavioral tests for GrantCard using @testing-library/react with TDD approach (RED then GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 0: Create GrantCard behavioral tests (TDD RED)** - `488928e` (test)
2. **Task 1: Create GrantCard + GrantFilters (TDD GREEN)** - `8f05d0a` (feat)
3. **Task 2: Create GrantList + browse page** - `affbcfa` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits._

## Files Created/Modified
- `src/app/grants/browse/__tests__/grant-card.test.ts` - 4 behavioral tests for GrantCard rendering, null handling, and deadline badge
- `src/app/grants/browse/grant-card.tsx` - Reusable grant card component with Grant interface export
- `src/app/grants/browse/filters.tsx` - Client component with debounced search and URL param filters
- `src/app/grants/browse/grant-list.tsx` - Grant list with responsive grid and Romanian empty state
- `src/app/grants/browse/page.tsx` - Server Component browse page with Supabase query and filter application
- `src/components/ui/card.tsx` - shadcn Card component
- `src/components/ui/input.tsx` - shadcn Input component
- `src/components/ui/badge.tsx` - shadcn Badge component
- `src/components/ui/select.tsx` - shadcn Select component

## Decisions Made
- Used native HTML select for provider dropdown instead of shadcn Select (base-ui popover) -- the base-ui Select requires a complex popover setup that adds unnecessary weight for a simple filter control
- Used jsdom vitest environment via per-file annotation (`@vitest-environment jsdom`) to preserve node environment for non-UI tests elsewhere in the codebase
- Used `Intl.NumberFormat('ro-MD')` and `Intl.DateTimeFormat('ro-MD')` for Romanian locale formatting of funding amounts and dates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test text matcher for combined "Termen:" prefix**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** GrantCard renders "Termen: Fara termen limita" as adjacent text nodes in the same `<p>` element. The `getByText('Fara termen limita')` exact matcher could not find it because it matches full element text content.
- **Fix:** Changed test to use regex matcher `getByText(/Fara termen limita/)` which matches partial text within the element.
- **Files modified:** `src/app/grants/browse/__tests__/grant-card.test.ts`
- **Verification:** All 4 tests pass
- **Committed in:** `8f05d0a` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed test DOM accumulation between tests**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Testing-library render calls accumulate DOM without cleanup. Test 4 ("Expira curand" NOT present) would find text from test 3's render.
- **Fix:** Added `afterEach(() => cleanup())` in the describe block.
- **Files modified:** `src/app/grants/browse/__tests__/grant-card.test.ts`
- **Verification:** All 4 tests pass independently
- **Committed in:** `8f05d0a` (Task 1 commit)

**3. [Rule 1 - Bug] Fixed ambiguous test fixture description**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `expiringGrant` fixture had description "Expira curand" which matched both the description text and the badge text, making the badge test unreliable.
- **Fix:** Changed expiringGrant description to "Grant cu termen scurt" to avoid ambiguity.
- **Files modified:** `src/app/grants/browse/__tests__/grant-card.test.ts`
- **Verification:** Test correctly asserts badge presence via distinct text
- **Committed in:** `8f05d0a` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bug fixes in tests)
**Impact on plan:** All fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the test fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Public grant browse page ready at /grants/browse
- GrantCard and Grant interface available for reuse in matching results and other views
- Filter pattern (URL search params) established for other filterable pages
- Phase 2 data layer complete -- all 4 plans done

## Self-Check: PASSED

All 9 created files verified on disk. All 3 task commits (488928e, 8f05d0a, affbcfa) verified in git log.

---
*Phase: 02-data-layer-company-profiles*
*Completed: 2026-03-21*
