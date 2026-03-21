---
phase: 02-data-layer-company-profiles
plan: 03
subsystem: ui, profile-flow
tags: [react-19, useActionState, shadcn-ui, tdd, vitest, jsdom, server-actions, landing-page, chips-ui, company-profile]

# Dependency graph
requires:
  - phase: 02-data-layer-company-profiles
    plan: 02
    provides: "lookupCompany, inferFromIdea, saveManualProfile, savePurchaseNeed Server Actions"
  - phase: 02-data-layer-company-profiles
    plan: 01
    provides: "IDNO scrapers (idno-md, srl-md, openmoney-md), aggregate orchestrator, CompanyFields type"
  - phase: 01-foundation-and-validation
    provides: "shadcn/ui, Geist fonts, layout with Romanian lang, brand theme"
provides:
  - "Landing page with multi-step company profile creation flow (input -> profile -> purchase -> complete)"
  - "IDNO lookup form with 13-digit validation and auto-populated profile display"
  - "Business idea AI inference form with Romanian textarea"
  - "Manual entry fallback form (company name, industry, location, legal form)"
  - "Partial data badge showing per-source success/error/timeout status"
  - "Purchase need chip selector (4 visible, expandable to 8) with textarea pre-fill"
  - "Expanded CompanyFields type with status, registration_date, activities, directors, founders"
  - "Enriched scraper extraction for all three Moldovan registries"
  - "5 unit tests for purchase chips behavioral requirements"
affects: [03-grant-matching, 04-auth, 05-application-writer]

# Tech tracking
tech-stack:
  added: [shadcn-input, shadcn-textarea, shadcn-card, shadcn-badge, "@testing-library/react", "@testing-library/jest-dom"]
  patterns: [useActionState-form-pattern, multi-step-flow-state-machine, chip-prefill-ui, server-action-client-integration]

key-files:
  created:
    - src/app/(home)/page.tsx
    - src/app/(home)/landing-flow.tsx
    - src/app/(home)/idno-form.tsx
    - src/app/(home)/idea-form.tsx
    - src/app/(home)/profile-result.tsx
    - src/app/(home)/manual-form.tsx
    - src/app/(home)/purchase-chips.tsx
    - src/app/(home)/partial-badge.tsx
    - src/app/(home)/__tests__/purchase-chips.test.ts
  modified:
    - src/lib/sources/types.ts
    - src/lib/sources/idno-md.ts
    - src/lib/sources/srl-md.ts
    - src/lib/sources/openmoney-md.ts
    - src/lib/sources/aggregate.ts
    - src/app/actions/profile.ts

key-decisions:
  - "Route group (home) used for landing page co-location -- renders at / without URL segment"
  - "useActionState (React 19) for all form submissions instead of deprecated useFormState"
  - "Expanded CompanyFields with status, registration_date, activities, directors, founders during verification audit"
  - "Supabase upsert replaced with select-then-insert/update for safer conflict handling"
  - "Profile result limits activities display to 3 items with expandable overflow"
  - "Legal form prefix stripping (e.g. SRL prefix removed from company name display)"

patterns-established:
  - "Multi-step flow pattern: client orchestrator component managing step state machine (input -> profile -> purchase -> complete)"
  - "useActionState form pattern: server action wrapped with React 19 useActionState for pending state and error handling"
  - "Chip pre-fill pattern: clicking chip sets textarea value, user can override with custom text"
  - "Partial data badge pattern: per-source status display with success/error/timeout indicators"

requirements-completed: [PROF-01, PROF-02, PROF-04, PROF-06, PURCH-01, PURCH-02, PURCH-03]

# Metrics
duration: 25min
completed: 2026-03-21
---

# Phase 2 Plan 3: Company Profile UI Flow Summary

**Multi-step landing page with IDNO auto-lookup, AI business idea inference, manual fallback, partial data badge, and purchase need chip selector -- all wired to Server Actions with React 19 useActionState, expanded scraper data model, and 5 TDD unit tests**

## Performance

- **Duration:** 25 min (includes verification checkpoint and audit fixes)
- **Started:** 2026-03-21T13:15:00Z
- **Completed:** 2026-03-21T15:52:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 23 (9 created, 14 modified including audit fixes)

## Accomplishments
- Complete company profile creation flow on landing page: IDNO lookup with three-registry auto-population, AI business idea inference, manual entry fallback, and purchase need selection
- Multi-step state machine orchestrating four flow stages (input, profile, purchase, complete) with toggle between IDNO and idea input modes
- Purchase chips component with TDD: 4 chips visible initially, expandable to 8, chip click pre-fills textarea, all 5 behavioral tests passing
- Expanded scraper data model with status, registration_date, activities, directors, and founders fields extracted from all three Moldovan registries
- Verification audit caught and fixed 8 issues: SOURCE_LABELS key mismatch, infinite re-render loop, SQL LIKE injection, missing aria-label, unsafe Supabase upsert, and scraper selector/URL corrections

## Task Commits

Each task was committed atomically:

1. **Task 1: Build IDNO form, idea form, profile result, manual form, and partial badge** - `3c457d5` (feat)
2. **Task 2: Build purchase chips with TDD and assemble landing page flow** - `4e96260` (feat)
   - TDD RED commit: `e76b275` (test)
   - TDD GREEN+page assembly commit: `4e96260` (feat)
3. **Task 3: Verify complete landing page profile creation flow** - human-verify checkpoint (approved)
4. **Audit fixes from verification:** - `b352b1a` (fix) -- 02-03 scope fixes
5. **Audit fixes from verification:** - `800d7f2` (fix) -- 02-04 browse page fixes discovered during audit

## Files Created/Modified

**Created:**
- `src/app/(home)/page.tsx` - Server Component wrapper rendering landing flow at /
- `src/app/(home)/landing-flow.tsx` - Client orchestrator managing multi-step flow state machine
- `src/app/(home)/idno-form.tsx` - IDNO input with 13-digit validation, useActionState, loading spinner
- `src/app/(home)/idea-form.tsx` - Business idea textarea with AI inference, useActionState
- `src/app/(home)/profile-result.tsx` - Company profile card display with enriched data (activities, directors, founders)
- `src/app/(home)/manual-form.tsx` - Manual entry fallback form (name, industry, location, legal form)
- `src/app/(home)/purchase-chips.tsx` - Chip selector (4+4 expandable) with textarea pre-fill
- `src/app/(home)/partial-badge.tsx` - "Date partiale" badge with per-source status tooltip
- `src/app/(home)/__tests__/purchase-chips.test.ts` - 5 behavioral tests (chip count, expand, pre-fill, replace, custom text)

**Modified (audit fixes):**
- `src/lib/sources/types.ts` - Expanded CompanyFields with status, registration_date, activities, directors, founders
- `src/lib/sources/idno-md.ts` - Fixed URL construction, added extraction for new fields
- `src/lib/sources/srl-md.ts` - Fixed selectors, expanded data extraction for activities/directors/founders
- `src/lib/sources/openmoney-md.ts` - Fixed JSON parsing path, added new field extraction
- `src/lib/sources/aggregate.ts` - Updated merge logic for array fields (activities, directors, founders)
- `src/app/actions/profile.ts` - Replaced unsafe upsert with select-then-insert/update
- `src/lib/sources/__tests__/scrapers.test.ts` - Updated mock responses for expanded data model
- `src/lib/sources/__tests__/aggregate.test.ts` - Added tests for new field merging
- `src/app/actions/__tests__/profile.test.ts` - Updated to match new insert/update pattern
- `src/app/grants/browse/filters.tsx` - Fixed infinite re-render loop in useEffect
- `src/app/grants/browse/page.tsx` - Fixed SQL LIKE injection by escaping special characters

## Decisions Made
- **Route group (home):** Used Next.js route group for landing page component co-location. Renders at `/` without adding a URL segment.
- **useActionState (React 19):** All forms use React 19 useActionState for server action integration with automatic pending state, replacing deprecated useFormState.
- **Expanded data model:** During verification audit, CompanyFields type was expanded with status, registration_date, activities (string[]), directors (string[]), and founders (string[]) to capture the full data available from Moldovan registries.
- **Supabase upsert safety:** Replaced single upsert call with explicit select-then-insert/update to avoid silent data overwrites when IDNO conflicts occur.
- **Activities display limit:** Profile result shows maximum 3 activities by default to avoid overwhelming the UI, with indication of additional items.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SOURCE_LABELS keys in partial-badge.tsx**
- **Found during:** Task 3 (verification audit)
- **Issue:** SOURCE_LABELS used display names as keys but sourceStatus record used module identifiers (idno-md, srl-md, openmoney-md)
- **Fix:** Changed keys to match the actual source identifiers returned by the aggregate orchestrator
- **Files modified:** src/app/(home)/partial-badge.tsx
- **Committed in:** b352b1a

**2. [Rule 1 - Bug] Fixed infinite re-render loop in filters.tsx**
- **Found during:** Task 3 (verification audit)
- **Issue:** useEffect in grant browse filters had unstable dependency array causing continuous re-renders
- **Fix:** Stabilized useEffect dependencies to prevent infinite loop
- **Files modified:** src/app/grants/browse/filters.tsx
- **Committed in:** 800d7f2

**3. [Rule 2 - Security] Fixed SQL LIKE injection in browse/page.tsx**
- **Found during:** Task 3 (verification audit)
- **Issue:** User search input passed directly to LIKE query without escaping %, _, and \ characters
- **Fix:** Added escapeForLike helper to escape special LIKE characters before query construction
- **Files modified:** src/app/grants/browse/page.tsx
- **Committed in:** 800d7f2

**4. [Rule 2 - Accessibility] Added aria-label to purchase-chips.tsx textarea**
- **Found during:** Task 3 (verification audit)
- **Issue:** Textarea lacked aria-label for screen reader accessibility
- **Fix:** Added aria-label="Descrie ce doresti sa achizitionezi" to textarea element
- **Files modified:** src/app/(home)/purchase-chips.tsx
- **Committed in:** b352b1a

**5. [Rule 1 - Bug] Fixed Supabase upsert race condition in profile.ts**
- **Found during:** Task 3 (verification audit)
- **Issue:** Supabase upsert could silently overwrite existing profile data on IDNO conflict
- **Fix:** Replaced with explicit select-then-insert/update pattern for controlled conflict handling
- **Files modified:** src/app/actions/profile.ts
- **Committed in:** b352b1a

**6. [Rule 1 - Bug] Fixed scraper URLs, selectors, and data model**
- **Found during:** Task 3 (verification audit)
- **Issue:** Scraper CSS selectors were placeholder best-guesses that did not match actual registry page structures; CompanyFields type too narrow for available data
- **Fix:** Corrected URLs and selectors for idno-md, srl-md, openmoney-md; expanded CompanyFields type with 5 new fields; updated aggregate merge logic and all tests
- **Files modified:** src/lib/sources/types.ts, src/lib/sources/idno-md.ts, src/lib/sources/srl-md.ts, src/lib/sources/openmoney-md.ts, src/lib/sources/aggregate.ts, tests
- **Committed in:** b352b1a

---

**Total deviations:** 6 auto-fixed (3 bugs, 1 security, 1 accessibility, 1 data model expansion)
**Impact on plan:** All fixes necessary for correctness, security, and data completeness. Scraper data model expansion enables richer profile display. No scope creep beyond what the verification audit required.

## Issues Encountered
- Scraper CSS selectors from plan 02-01 were acknowledged as "placeholder best-guesses" -- the verification audit was the intended point to refine them against live registry responses. This is expected, not a plan failure.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landing page fully functional at / with complete profile creation flow
- Phase 2 is now complete (all 4 plans: scrapers, server actions, profile UI, grant browse)
- Ready for Phase 3 (Grant Matching): company profiles are stored with expanded fields, purchase needs captured
- Ready for Phase 4 (Auth): anonymous session flow via iron-session is in place, auth can be layered on top
- Expanded data model (activities, directors, founders) provides richer matching signals for Phase 3

## Self-Check: PASSED

- All 9 created files verified on disk
- All 5 task commits (3c457d5, e76b275, 4e96260, b352b1a, 800d7f2) verified in git log
- SUMMARY.md created at .planning/phases/02-data-layer-company-profiles/02-03-SUMMARY.md

---
*Phase: 02-data-layer-company-profiles*
*Completed: 2026-03-21*
