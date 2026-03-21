---
phase: 02-data-layer-company-profiles
plan: 01
subsystem: scraping, validation
tags: [cheerio, vitest, idno, scraping, promise-allsettled, abort-controller, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-and-validation
    provides: "Project scaffolding, tsconfig path aliases, package.json base"
provides:
  - "CompanyFields, SourceResult, AggregateResult, MergedProfile types"
  - "IDNO 7,3,1 weighted checksum validation"
  - "Three scraper modules (idno-md, srl-md, openmoney-md) with 8s timeouts"
  - "Aggregate orchestrator with confidence-weighted field merge"
  - "Vitest test infrastructure with path aliases"
affects: [02-02-server-actions, 02-03-ui-components, 02-04-grants-browse]

# Tech tracking
tech-stack:
  added: [cheerio, ai@^6, vitest, @vitejs/plugin-react]
  patterns: [tdd-red-green, abort-controller-timeout, promise-allsettled-orchestrator, confidence-weighted-merge]

key-files:
  created:
    - vitest.config.ts
    - src/lib/sources/types.ts
    - src/lib/validation/idno.ts
    - src/lib/validation/__tests__/idno.test.ts
    - src/lib/sources/idno-md.ts
    - src/lib/sources/srl-md.ts
    - src/lib/sources/openmoney-md.ts
    - src/lib/sources/aggregate.ts
    - src/lib/sources/__tests__/scrapers.test.ts
    - src/lib/sources/__tests__/aggregate.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Fixed test IDNO: plan specified 1003600070650 as valid but 7,3,1 algorithm computes check digit 6 for that prefix -- used 1003600070656 instead"
  - "OpenMoney scraper tries JSON API first (Angular SPA backend), falls back to Cheerio HTML parsing"
  - "Scraper CSS selectors are placeholder best-guesses -- need live-testing refinement against real Moldovan sites"

patterns-established:
  - "Scraper module pattern: AbortController 8s timeout, try/catch with DOMException AbortError detection, clearTimeout in finally"
  - "Aggregate orchestrator pattern: Promise.allSettled + confidence-sorted merge with per-field first-non-null strategy"
  - "TDD workflow: write tests first (RED/fail), implement code (GREEN/pass), verify"

requirements-completed: [PROF-01, PROF-03, PROF-06]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 2 Plan 1: Scraping Foundation Summary

**Vitest test infrastructure, IDNO 7,3,1 checksum validation, three Cheerio scraper modules with 8s AbortController timeouts, and confidence-weighted aggregate orchestrator via Promise.allSettled**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T12:57:52Z
- **Completed:** 2026-03-21T13:03:41Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Vitest configured with @/ path alias matching tsconfig, running 21 tests across 3 test files
- IDNO validation implements 7,3,1 weighted checksum algorithm with Romanian error messages and 6 passing test cases
- Three independent scraper modules (idno.md, srl.md, openmoney.md) each with 8-second AbortController timeout and graceful error/timeout handling
- Aggregate orchestrator merges fields from highest-confidence source first, correctly detects partial and all-failed states
- Full TDD cycle executed: tests written first (RED), then implementation (GREEN), all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, Vitest, shared types, IDNO validation (TDD)** - `90c21e9` (feat)
2. **Task 2: Three scraper modules and aggregate orchestrator (TDD)** - `c8cde11` (feat)

_Both tasks followed TDD: tests written first (RED/fail), then implementation (GREEN/pass)_

## Files Created/Modified
- `vitest.config.ts` - Vitest config with @/ path alias and @vitejs/plugin-react
- `src/lib/sources/types.ts` - CompanyFields, SourceResult, AggregateResult, MergedProfile types
- `src/lib/validation/idno.ts` - IDNO format + 7,3,1 weighted check digit validation
- `src/lib/validation/__tests__/idno.test.ts` - 6 test cases for IDNO validation
- `src/lib/sources/idno-md.ts` - idno.md scraper (Cheerio, confidence 0.9)
- `src/lib/sources/srl-md.ts` - srl.md scraper (Cheerio, confidence 0.8)
- `src/lib/sources/openmoney-md.ts` - openmoney.md scraper (JSON-first/Cheerio-fallback, confidence 0.7)
- `src/lib/sources/aggregate.ts` - Parallel orchestrator with confidence-weighted merge
- `src/lib/sources/__tests__/scrapers.test.ts` - 10 tests for scraper success/timeout/error
- `src/lib/sources/__tests__/aggregate.test.ts` - 5 tests for merge/partial/all-fail logic

## Decisions Made
- **Test IDNO correction:** Plan specified 1003600070650 as valid, but the 7,3,1 algorithm produces check digit 6 for prefix 100360007065. Used 1003600070656 as the correct valid test IDNO. The algorithm implementation matches python-stdnum reference.
- **OpenMoney JSON-first:** Since OpenMoney is an Angular SPA, the scraper checks Content-Type header and parses JSON when available, falling back to Cheerio for HTML.
- **Placeholder selectors:** CSS selectors for all three scrapers are best-guesses per research notes. They will need live-testing refinement against real Moldovan sites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed inconsistent test IDNO**
- **Found during:** Task 1 (IDNO validation TDD GREEN)
- **Issue:** Plan specified `1003600070650` as a valid IDNO, but the 7,3,1 weighted checksum algorithm computes check digit 6 for prefix `100360007065`, making the correct valid IDNO `1003600070656`
- **Fix:** Updated test data to use `1003600070656` as valid IDNO and `1003600070650` as the invalid check digit test case
- **Files modified:** src/lib/validation/__tests__/idno.test.ts
- **Verification:** All 6 IDNO validation tests pass
- **Committed in:** 90c21e9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - inconsistent test data)
**Impact on plan:** Minimal. The algorithm is correct per the python-stdnum reference. Only the test data was adjusted.

## Issues Encountered
None beyond the test IDNO correction documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All scraper types and modules ready for server action integration in Plan 02-02
- `aggregate(idno)` function ready to be called from `lookupCompany` server action
- `validateIdno` ready for IDNO input validation in server actions
- CSS selectors need refinement during live testing (documented in research as open question)

## Self-Check: PASSED

- All 11 files verified on disk
- Both task commits (90c21e9, c8cde11) verified in git log
- 21/21 tests passing
- TypeScript: zero errors
- Next.js build: success

---
*Phase: 02-data-layer-company-profiles*
*Completed: 2026-03-21*
