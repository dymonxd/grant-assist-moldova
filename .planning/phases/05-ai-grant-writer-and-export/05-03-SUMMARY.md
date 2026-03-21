---
phase: 05-ai-grant-writer-and-export
plan: 03
subsystem: ui
tags: [react-pdf, resend, email, pdf, clipboard, auth-gating, analytics, export, romanian-diacritics]

# Dependency graph
requires:
  - phase: 05-ai-grant-writer-and-export
    provides: WriterClient orchestrator, SectionEditor, DocumentChecklist, saveSection action
  - phase: 04-auth-and-profile
    provides: AccountWallModal for auth gating, Supabase auth state detection
  - phase: 01-foundation
    provides: "@react-pdf/renderer setup, Geist Sans font files, supabase admin/server clients"
provides:
  - ApplicationPdfDocument component with Geist Sans Font.register for Romanian diacritics
  - POST /api/writer/pdf route handler for server-side PDF generation
  - sendApplicationEmail server action via Resend SDK
  - saveReminderOptIn server action for deadline notifications
  - buildApplicationEmailHtml email template builder
  - ExportBar component with copy/PDF/email buttons, auth gating, analytics tracking
affects: [05-04-analytics]

# Tech tracking
tech-stack:
  added: [resend]
  patterns: [server-side-pdf-with-custom-font, class-based-resend-mock, auth-gated-export-buttons, fire-and-forget-analytics]

key-files:
  created:
    - src/lib/pdf/application-pdf.tsx
    - src/lib/pdf/__tests__/application-pdf.test.ts
    - src/app/api/writer/pdf/route.ts
    - src/lib/email/application-email.tsx
    - src/app/actions/export.ts
    - src/app/actions/__tests__/export.test.ts
    - src/app/grants/[grantId]/write/export-bar.tsx
    - src/components/writer/__tests__/export-bar.test.ts
  modified:
    - src/app/grants/[grantId]/write/writer-client.tsx
    - src/app/grants/[grantId]/write/page.tsx

key-decisions:
  - "Class-based MockResend in tests instead of vi.fn().mockImplementation() -- Vitest 4 constructor mocks require class syntax"
  - "sendApplicationEmail accepts to parameter but server action creates Resend client per-call (no singleton) for env var flexibility"
  - "ExportBar uses fire-and-forget trackEvent calls (non-blocking, non-awaited) so analytics never blocks export UX"
  - "page.tsx fetches auth via createClient + getUser for isAuthenticated prop (separate from session check for company profile)"

patterns-established:
  - "Server-side PDF: Font.register with Geist Sans from node_modules, renderToBuffer in Route Handler, Content-Disposition attachment"
  - "Auth-gated client actions: isAuthenticated prop from server component, AccountWallModal on unauthenticated click"
  - "Fire-and-forget analytics: trackEvent called without await, wrapped in non-blocking pattern"

requirements-completed: [EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04, EXPRT-05, EXPRT-06]

# Metrics
duration: 6min
completed: 2026-03-21
---

# Phase 5 Plan 3: Export Functionality Summary

**PDF download with Geist Sans Romanian diacritics, clipboard copy, Resend email, AccountWallModal auth gating, deadline reminder opt-in, and application_exported analytics tracking**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T22:37:59Z
- **Completed:** 2026-03-21T22:44:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- ApplicationPdfDocument with Geist Sans Font.register rendering Romanian diacritics correctly in server-generated PDFs
- ExportBar with three export methods: clipboard copy (all users), PDF download (auth required), email send (auth required)
- AccountWallModal gates PDF and email for unauthenticated users while copy remains available
- Deadline reminder opt-in checkbox persists preference to notifications_log via saveReminderOptIn
- Document checklist completion summary shows "X din Y documente pregatite"
- Analytics event (application_exported) fires on each successful export with method metadata
- 16 new tests (9 for PDF/email/reminder, 7 for ExportBar), full suite of 216 tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: PDF document, email server action, and export server actions (TDD)** - `c89362e` (feat)
2. **Task 2: Export bar with copy/PDF/email, auth gating, and analytics** - `baeec2e` (feat)

_Note: Task 1 files were committed as part of Wave 3 parallel execution alongside Plan 04._

## Files Created/Modified
- `src/lib/pdf/application-pdf.tsx` - React-pdf Document component with Geist Sans Font.register for Romanian diacritics
- `src/lib/pdf/__tests__/application-pdf.test.ts` - 4 tests for PDF component construction and props
- `src/app/api/writer/pdf/route.ts` - POST Route Handler for server-side PDF generation and download
- `src/lib/email/application-email.tsx` - HTML email template builder with inline styles
- `src/app/actions/export.ts` - sendApplicationEmail and saveReminderOptIn server actions
- `src/app/actions/__tests__/export.test.ts` - 5 tests for email sending, env gating, and reminder opt-in
- `src/app/grants/[grantId]/write/export-bar.tsx` - Export bar with copy/PDF/email buttons, auth gating, analytics
- `src/components/writer/__tests__/export-bar.test.ts` - 7 tests for buttons, auth gating, analytics, reminder visibility
- `src/app/grants/[grantId]/write/writer-client.tsx` - Added ExportBar integration with section data wiring
- `src/app/grants/[grantId]/write/page.tsx` - Added auth state fetch and isAuthenticated prop

## Decisions Made
- Class-based MockResend in tests: Vitest 4 warns about vi.fn() constructor mocks not using function/class syntax, resolved by using actual class declaration
- sendApplicationEmail creates Resend client per-call rather than module-level singleton -- allows env var changes without module restart
- ExportBar analytics calls are fire-and-forget (not awaited) -- analytics should never block or delay export actions
- page.tsx fetches auth state via Supabase createClient + getUser separately from iron-session company profile lookup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Resend mock constructor pattern for Vitest 4**
- **Found during:** Task 1 (export.test.ts RED-to-GREEN)
- **Issue:** vi.fn().mockImplementation(() => ({...})) triggered Vitest warning and mock.send was not being called
- **Fix:** Changed to class MockResend { emails = { send: mockSend } } pattern
- **Files modified:** src/app/actions/__tests__/export.test.ts
- **Verification:** All 5 export tests pass
- **Committed in:** c89362e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test mock)
**Impact on plan:** Minor test mock adjustment. No scope creep.

## Issues Encountered
- Task 1 files were committed as part of parallel wave execution (Plan 04 ran alongside Plan 03 in Wave 3) -- no data loss, all files verified on disk with correct content

## User Setup Required

**External service requires manual configuration for email:**
- **Resend:** Create free account at resend.com, get API key from Dashboard -> API Keys
- **Environment variable:** `RESEND_API_KEY` (starts with `re_`)
- **Development:** Uses `onboarding@resend.dev` sender (no domain verification needed)
- **Production:** Configure verified domain in Resend dashboard

## Next Phase Readiness
- Export flow fully operational: copy for all users, PDF/email for authenticated
- Analytics tracking wired for application_exported events across all export methods
- Phase 5 plans 01-03 complete; Plan 04 (analytics/settings) also complete from parallel wave
- Ready for Phase 6 (Admin) if applicable

## Self-Check: PASSED

All 10 files verified on disk. Both task commits (c89362e, baeec2e) verified in git log. Full test suite (216 tests, 30 files) green.

---
*Phase: 05-ai-grant-writer-and-export*
*Completed: 2026-03-21*
