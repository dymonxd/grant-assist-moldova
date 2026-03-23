---
phase: 01-foundation-and-validation
plan: 03
subsystem: infra
tags: [react-pdf, pdf-generation, vercel-serverless, romanian-diacritics, font-register]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js 16 scaffolded project with @react-pdf/renderer and jspdf dependencies"
provides:
  - PDF test route at /api/pdf/test validating @react-pdf/renderer on Vercel serverless
  - Definitive PDF strategy decision for Phase 5 export feature
  - Documented diacritics fix path (Font.register with Romanian-supporting font)
affects: [phase-5-ai-writer-export, EXPRT-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [react-pdf-server-side-with-custom-font, dynamic-import-in-route-handler]

key-files:
  created:
    - src/app/api/pdf/test/route.ts
  modified: []

key-decisions:
  - "@react-pdf/renderer confirmed working on Vercel serverless -- renders PDF and streams to browser"
  - "Default Helvetica font lacks Romanian glyphs for ă, ș, ț, Ă, Ș, Ț -- Phase 5 must use Font.register() with Noto Sans or Geist Sans"
  - "Server-side PDF generation is the preferred strategy (over client-side jspdf) since react-pdf works on Vercel"

patterns-established:
  - "PDF route pattern: dynamic import of @react-pdf/renderer with try/catch fallback to JSON error response"
  - "React.createElement in .ts route handlers (not JSX) for @react-pdf/renderer components"

requirements-completed: [FNDTN-07]

# Metrics
duration: ~15min (spread across checkpoint pause)
completed: 2026-03-21
---

# Phase 1 Plan 3: PDF Generation Validation Summary

**@react-pdf/renderer confirmed working on Vercel serverless; default font missing Romanian ă/ș/ț glyphs -- Phase 5 must Font.register() a full-charset font like Noto Sans**

## Performance

- **Duration:** ~15 min (execution + Vercel deployment + human verification)
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files created:** 1

## Accomplishments

- Validated @react-pdf/renderer works on Vercel serverless (no bundling or runtime errors)
- Created PDF test route with dual-strategy architecture (primary: react-pdf, fallback: jspdf JSON response)
- Identified specific diacritics gap: default Helvetica font renders â and î but NOT ă, ș, ț, Ă, Ș, Ț
- Documented clear fix path for Phase 5: use Font.register() with a Romanian-supporting font (Noto Sans or Geist Sans)

## PDF Strategy Decision (Critical for Phase 5)

**Verdict: @react-pdf/renderer works on Vercel serverless but needs a custom font.**

### What works

- @react-pdf/renderer renders PDF documents on Vercel serverless functions without errors
- PDF displays inline in browser with correct layout (A4, padding, styled text)
- Dynamic import pattern (`await import('@react-pdf/renderer')`) works in App Router route handlers
- Characters â and î render correctly in the default font

### What does not work

- Default Helvetica font is missing glyphs for: ă, ș, ț, Ă, Ș, Ț
- "Dacă puteți citi" renders as "Dac pute citi" (ă and ț invisible)
- "românești" renders as "româneti" (ș invisible)
- "funcționează" renders as "funconeaz" (ț and ă invisible)

### Recommended fix for Phase 5

1. **Primary approach:** Use `Font.register()` from @react-pdf/renderer to embed a font with full Romanian character support (Noto Sans or Geist Sans TTF)
2. **Fallback approach:** If Font.register() does not resolve the issue, fall back to jspdf client-side with an embedded font
3. Server-side PDF generation remains the preferred path since react-pdf itself works on Vercel

### Impact on Phase 5

- EXPRT-02 ("Descarca PDF") must include Font.register() setup before any PDF rendering
- The test route at /api/pdf/test can be reused to validate the font fix
- No changes needed to the route handler pattern -- only font registration added at module level

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PDF generation test route with dual-strategy validation** - `8be7d09` (feat)
2. **Task 2: Deploy to Vercel and verify PDF generation** - checkpoint:human-verify (no code commit, verification only)

## Files Created/Modified

- `src/app/api/pdf/test/route.ts` - PDF generation test route with @react-pdf/renderer primary strategy and jspdf fallback JSON response. Tests Romanian diacritics rendering.

## Decisions Made

1. **@react-pdf/renderer is the PDF strategy** -- confirmed working on Vercel serverless. Server-side generation preferred over client-side jspdf.
2. **Custom font required for Romanian** -- default Helvetica lacks ă, ș, ț glyphs. Phase 5 must use Font.register() with Noto Sans or Geist Sans.
3. **jspdf remains as emergency fallback** -- if Font.register() cannot resolve diacritics, client-side jspdf with embedded font is the backup.

## Deviations from Plan

None - plan executed exactly as written. The diacritics issue was an expected possible outcome documented in the plan's verification options ("react-pdf diacritics broken" was a listed response signal).

## Issues Encountered

- Romanian diacritics partially broken in default font: â and î work but ă, ș, ț do not. This is a known limitation of Helvetica/default PDF fonts which lack these specific Romanian characters. The fix (Font.register with a Unicode-complete font) is straightforward and deferred to Phase 5 where the actual export feature is built.

## User Setup Required

None - no external service configuration required. The test route is already deployed on Vercel.

## Next Phase Readiness

- PDF generation strategy is decided: @react-pdf/renderer with custom font
- Phase 1 is now complete (all 3 plans done)
- Phase 2 (Data Layer and Company Profiles) can begin
- Phase 5 has a clear action item: Font.register() with Romanian-supporting font before PDF rendering

## Self-Check: PASSED

- FOUND: src/app/api/pdf/test/route.ts
- FOUND: commit 8be7d09
- FOUND: 01-03-SUMMARY.md

---
*Phase: 01-foundation-and-validation*
*Completed: 2026-03-21*
