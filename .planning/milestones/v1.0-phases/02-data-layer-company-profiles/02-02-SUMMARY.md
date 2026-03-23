---
phase: 02-data-layer-company-profiles
plan: 02
subsystem: server-actions, ai-inference
tags: [ai-sdk-v6, generateText, Output.object, zod, server-actions, iron-session, supabase-admin, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-data-layer-company-profiles
    plan: 01
    provides: "IDNO validation, three scrapers, aggregate orchestrator, CompanyFields/AggregateResult types"
  - phase: 01-foundation-and-validation
    provides: "Supabase admin client (createAdminClient), iron-session (getSession), RLS policies"
provides:
  - "inferProfileFromIdea: AI business idea to company profile inference using AI SDK v6 generateText + Output.object()"
  - "lookupCompany: Server Action for IDNO-based company profile creation via scraping"
  - "inferFromIdea: Server Action for AI-inferred company profile from free text"
  - "saveManualProfile: Server Action for manual company profile entry"
  - "savePurchaseNeed: Server Action for purchase need update"
  - "14 unit tests covering AI inference and all server action validation/persistence patterns"
affects: [02-03-ui-components, 02-04-grants-browse, 03-grant-matching]

# Tech tracking
tech-stack:
  added: []
  patterns: [ai-sdk-v6-output-object, admin-client-anonymous-writes, session-cookie-profile-tracking, server-action-validation-pattern]

key-files:
  created:
    - src/lib/ai/infer-profile.ts
    - src/lib/ai/__tests__/infer-profile.test.ts
    - src/app/actions/profile.ts
    - src/app/actions/purchase.ts
    - src/app/actions/__tests__/profile.test.ts
  modified: []

key-decisions:
  - "Output.object mock returns sentinel value to verify it is passed through to generateText (not just checking existence)"
  - "All server actions return {error: string} on failure rather than throwing, for safe consumption by Client Components"
  - "Romanian error messages throughout all validation and error paths"

patterns-established:
  - "Server Action validation pattern: validate input first, return {error} early, then proceed with admin client operations and session storage"
  - "Admin client pattern for anonymous writes: createAdminClient() bypasses RLS for users without auth.uid()"
  - "Session storage pattern: after every profile creation, store companyProfileId in iron-session and call session.save()"
  - "AI inference pattern: generateText + Output.object + Zod schema with .describe() field guidance, try/catch returning null on failure"

requirements-completed: [PROF-02, PROF-04, PROF-05, PURCH-01, PURCH-02, PURCH-03]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 2 Plan 2: Server Actions and AI Inference Summary

**AI inference module using generateText + Output.object() with Zod schema, four Server Actions (lookupCompany, inferFromIdea, saveManualProfile, savePurchaseNeed) all using admin client for anonymous writes with iron-session profile tracking, and 14 unit tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T13:07:03Z
- **Completed:** 2026-03-21T13:12:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- AI inference module converts Romanian business ideas to structured company profiles using AI SDK v6 generateText + Output.object() with Zod schema and Romanian system prompt
- Four Server Actions handle the complete profile lifecycle: IDNO lookup with scraping, AI inference, manual entry, and purchase need selection
- All actions use createAdminClient() for anonymous user writes (bypassing RLS) and store companyProfileId in iron-session cookie
- 14 unit tests (4 AI inference + 10 server action) verify all validation gates, error handling, admin client usage, and session storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AI inference module with Wave 0 tests (TDD)** - `30cbe20` (feat)
2. **Task 2: Create all profile and purchase Server Actions** - `0fbcbba` (feat)
3. **Task 3: Create profile actions unit tests** - `657cc8e` (test)

_Task 1 followed TDD: tests written first (RED/fail), then implementation (GREEN/pass)_

## Files Created/Modified
- `src/lib/ai/infer-profile.ts` - AI inference using generateText + Output.object() with Zod schema, Romanian system prompt, graceful error handling
- `src/lib/ai/__tests__/infer-profile.test.ts` - 4 tests: output return, error handling (null), prompt passing, Output.object usage
- `src/app/actions/profile.ts` - Three Server Actions: lookupCompany (IDNO + scrape + upsert), inferFromIdea (AI + insert), saveManualProfile (manual + insert)
- `src/app/actions/purchase.ts` - savePurchaseNeed Server Action: session check + update purchase_need
- `src/app/actions/__tests__/profile.test.ts` - 10 tests covering all four actions: validation gates, admin client usage, session storage

## Decisions Made
- **Output.object mock strategy:** Used sentinel value returned by mocked Output.object to verify it flows through to generateText, rather than just checking for property existence
- **Error return pattern:** All server actions return `{ error: string }` on failure rather than throwing exceptions, making them safe for Client Component consumption via useActionState
- **Romanian error messages:** All user-facing error messages are in Romanian (e.g., "Numele companiei este obligatoriu", "Nu am putut analiza ideea de afacere")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Output.object mock returning undefined**
- **Found during:** Task 1 (AI inference TDD GREEN phase)
- **Issue:** Initial mock `Output: { object: vi.fn() }` returned undefined, causing `output: undefined` in the generateText call -- the test for Output.object usage failed because the property was undefined rather than truthy
- **Fix:** Made Output.object mock return a sentinel value `{ __type: 'output-object-mock' }` and updated the assertion to verify the sentinel was passed through
- **Files modified:** src/lib/ai/__tests__/infer-profile.test.ts
- **Verification:** All 4 AI inference tests pass
- **Committed in:** 30cbe20 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - mock setup)
**Impact on plan:** Minimal. Standard mock setup adjustment. No scope creep.

## Issues Encountered
None beyond the mock fix documented above.

## User Setup Required
None - no external service configuration required. AI model string `anthropic/claude-sonnet-4.6` uses AI Gateway (no API key needed on Vercel).

## Next Phase Readiness
- All four Server Actions ready for UI integration in Plan 02-03
- `lookupCompany(idno)` ready for IDNO form submission
- `inferFromIdea(text)` ready for business idea form submission
- `saveManualProfile(fields)` ready for manual entry fallback form
- `savePurchaseNeed(need)` ready for purchase chip/textarea submission
- Session cookie stores `companyProfileId` for purchase need and grant matching flow
- 39 total tests passing across the project (21 from Plan 01, 4 AI inference, 10 server actions, 4 from Plan 01 misc)

## Self-Check: PASSED

- All 5 files verified on disk
- All 3 task commits (30cbe20, 0fbcbba, 657cc8e) verified in git log
- 39/39 tests passing (full suite)
- TypeScript: zero errors
- Next.js build: success

---
*Phase: 02-data-layer-company-profiles*
*Completed: 2026-03-21*
