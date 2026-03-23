---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 06-05-PLAN.md (cron jobs for deadline reminders, abandoned drafts, analytics)
last_updated: "2026-03-23T09:15:01.327Z"
last_activity: 2026-03-22 -- Completed 06-05-PLAN.md (cron jobs for deadline reminders, abandoned drafts, analytics)
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 24
  completed_plans: 24
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** When a Moldovan entrepreneur enters their IDNO or describes their business idea, the platform matches them to eligible grants and generates polished, rubric-optimized application text in Romanian.
**Current focus:** Phase 6 in progress -- cron jobs complete. Final verification checkpoint (06-06) remaining.

## Current Position

Phase: 6 of 6 (Admin Tooling and Automation) -- IN PROGRESS
Plan: 6 of 6 in current phase (5 complete, 1 remaining)
Status: Completed 06-05 (cron jobs). Only 06-06 (verification checkpoint) remains.
Last activity: 2026-03-22 -- Completed 06-05-PLAN.md (cron jobs for deadline reminders, abandoned drafts, analytics)

Progress: [█████████░] 95% (Phase 6: 5 of 6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 17min
- Total execution time: 3.35 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 3 | 30min | 10min |
| 2 - Data Layer | 4 | 40min | 10min |
| 3 - Grant Matching | 4/4 | 131min | 33min |
| 4 - Auth & Profile | 3/3 | TBD | TBD |

**Recent Trend:**
- Last 5 plans: 02-03 (25min), 03-01 (4min), 03-02 (3min), 03-03 (4min), 03-04 (~120min)
- Trend: 03-04 was a verification checkpoint with human-in-the-loop review and AI provider fix

*Updated after each plan completion*
| Phase 02 P04 | 5min | 3 tasks | 11 files |
| Phase 02 P03 | 25min | 3 tasks | 23 files |
| Phase 03 P01 | 4min | 2 tasks | 7 files |
| Phase 03 P02 | 3min | 1 task | 10 files |
| Phase 03 P03 | 4min | 1 task | 6 files |
| Phase 03 P04 | ~120min | 2 tasks | 5 files |
| Phase 04 P03 | 2min | 1 task | 2 files |
| Phase 04 P01 | 3min | 3 tasks | 7 files |
| Phase 04 P02 | 6min | 2 tasks | 15 files |
| Phase 05 P01 | 5min | 2 tasks | 6 files |
| Phase 05 P02 | 5min | 2 tasks | 10 files |
| Phase 05 P03 | 6min | 2 tasks | 10 files |
| Phase 05 P04 | 3min | 2 tasks | 8 files |
| Phase 06 P02 | 6min | 2 tasks | 9 files |
| Phase 06 P01 | 7min | 2 tasks | 11 files |
| Phase 06 P03 | 7min | 2 tasks | 8 files |
| Phase 06 P04 | 6min | 2 tasks | 9 files |
| Phase 06 P05 | 4min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase dependency-driven structure following research recommendation
- [Roadmap]: GEN requirements distributed across phases (GEN-01/02/03 in Phase 1, GEN-04 in Phase 4, GEN-05/06 in Phase 5)
- [Roadmap]: Phase 4 (Auth) can run parallel with Phase 3 (Matching); Phase 6 (Admin) can run parallel with Phase 5 (Writer)
- [01-01]: Used geist/font/sans local imports instead of Google Fonts for self-hosted fonts
- [01-01]: Kept shadcn/ui base-nova style with neutral base, added brand warm accent color in oklch
- [01-01]: analytics_daily_summary uses composite PK with COALESCE for nullable device_type
- [01-01]: Shared company_profiles readable via share_token without auth (RLS policy with expiry check)
- [Phase 01-02]: proxy.ts uses getClaims() for JWT validation instead of getSession() for stronger server-side signature verification
- [Phase 01-02]: proxy.ts creates Supabase client inline (not importing server.ts) because proxy needs request.cookies not next/headers cookies()
- [Phase 01-02]: Auth callback preserves redirect URL via next query parameter for post-signup navigation
- [Phase 01-03]: @react-pdf/renderer confirmed working on Vercel serverless -- server-side PDF generation is the strategy
- [Phase 01-03]: Default Helvetica font lacks Romanian ă/ș/ț glyphs -- Phase 5 must use Font.register() with Noto Sans or Geist Sans
- [Phase 01-03]: jspdf retained as emergency fallback if Font.register() cannot resolve diacritics
- [02-01]: IDNO test value corrected -- plan's 1003600070650 doesn't pass 7,3,1 checksum; used 1003600070656 (algorithm matches python-stdnum)
- [02-01]: OpenMoney scraper checks Content-Type for JSON first (Angular SPA), falls back to Cheerio HTML parsing
- [02-01]: Scraper CSS selectors are placeholder best-guesses -- need live-testing refinement
- [02-02]: All server actions return {error: string} on failure (not exceptions) for safe Client Component consumption
- [02-02]: AI inference uses generateText + Output.object() with Zod schema (AI SDK v6 pattern, not deprecated generateObject)
- [02-02]: Romanian error messages in all server action validation paths
- [02-04]: Native HTML select for provider filter instead of shadcn Select (base-ui popover) -- simpler for URL-param-driven client component
- [02-04]: jsdom vitest environment per-file annotation to preserve node environment for non-UI tests
- [02-04]: Intl.NumberFormat/DateTimeFormat with 'ro-MD' locale for Romanian formatting
- [Phase 02]: Native HTML select for provider filter instead of shadcn Select (simpler for URL-param client component)
- [02-03]: Route group (home) for landing page component co-location, renders at / without URL segment
- [02-03]: useActionState (React 19) for all form submissions instead of deprecated useFormState
- [02-03]: CompanyFields expanded with status, registration_date, activities, directors, founders during verification audit
- [02-03]: Supabase upsert replaced with select-then-insert/update for safer conflict handling
- [02-03]: Profile result limits activities display to 3 items to avoid UI overflow
- [03-01]: Pre-filter treats missing profile fields as non-disqualifying (passes through for AI assessment)
- [03-01]: Sequential grant labels in AI prompts prevent UUID hallucination in structured output
- [03-01]: Lean profile builder strips raw scraper HTML to minimize AI token cost
- [03-01]: matchGrants returns grants: GrantWithRules[] alongside scores for UI card rendering
- [03-02]: FieldRow duplicated in profile-sidebar (not imported from profile-result) to avoid coupling results to home page
- [03-02]: formatFunding/formatDeadline helpers duplicated per component for self-containment (same as grant-card.tsx)
- [03-02]: Styled Link for Aplica acum, base-ui Button for disabled Salveaza -- consistent with existing GrantCard pattern
- [03-02]: Share-to-clipboard uses useState toggle for "Copiat!" toast (no external toast library)
- [03-03]: Idempotent share token: returns existing valid token before generating new (prevents link invalidation on refresh)
- [03-03]: Landing flow removes 'complete' step -- router.push('/results') replaces static success message
- [03-03]: Shared results page re-runs full matching pipeline for fresh results (not cached)
- [03-03]: SharedBanner inline in [token]/page.tsx for simplicity
- [03-04]: Switched from Vercel AI Gateway to @ai-sdk/openai with gpt-5.4-nano -- AI Gateway required credit card for billing
- [03-04]: Added empty grants notification on results page ("Nu exista granturi active momentan")
- [04-03]: Static server component for privacy page (no 'use client') -- purely content, no interactivity
- [04-03]: Tailwind prose class with max-w-3xl layout for static content pages
- [Phase 04-01]: signup uses createClient for auth.signUp and createAdminClient for privileged RPC/profile updates
- [Phase 04-01]: toggleSavedGrant uses authenticated server client (not admin) to leverage RLS on saved_grants
- [Phase 04-01]: redirect() throws NEXT_REDIRECT internally -- tests catch RedirectError to verify redirect URL
- [Phase 04-02]: Grant cards converted to 'use client' with useState for modal -- auth state passed as props from server pages
- [Phase 04-02]: Shared results page passes isAuthenticated=false since it is a public view with no auth context
- [Phase 04-02]: SaveButton handles both authenticated (toggle) and unauthenticated (modal trigger) states in a single component
- [05-01]: buildLeanProfile duplicated in generate-section.ts (not imported from rank-grants.ts) for module independence
- [05-01]: checkDeadline is a pure synchronous function for easy testing and reuse in page.tsx
- [05-01]: Streaming Route Handler pattern (streamText + toTextStreamResponse) for non-conversational AI generation
- [05-02]: Div-based progress bar instead of shadcn Progress to avoid unnecessary base-ui dependency
- [05-02]: fetch + ReadableStream reader for streaming (not @ai-sdk/react) -- no new dependency, full control over streaming UX
- [05-02]: Section auto-preview uses useEffect with AbortController and previewTriggered flag to prevent Strict Mode double-fire
- [05-02]: DocumentChecklist state managed by parent WriterClient for persistence flexibility
- [05-03]: Class-based MockResend in tests -- Vitest 4 constructor mocks require class syntax
- [05-03]: ExportBar uses fire-and-forget trackEvent calls -- analytics never blocks export UX
- [05-03]: page.tsx fetches auth via createClient + getUser for isAuthenticated prop (separate from session)
- [05-03]: Font.register with Geist Sans from node_modules for PDF Romanian diacritics
- [05-04]: Checkbox uses base-ui onCheckedChange with useTransition for non-blocking toggle
- [05-04]: Analytics fire-and-forget: trackEvent called without await in useEffect to avoid blocking UX
- [05-04]: Session ID for analytics falls back to 'anonymous' when no companyProfileId in iron-session
- [06-02]: Admin verification via profiles.is_admin check using createAdminClient (service role)
- [06-02]: Supabase join profiles returns array in untyped context -- added Array.isArray guard
- [06-02]: Record<string, unknown> typing for Supabase rows in applications page map callback
- [06-01]: verifyAdmin() helper centralizes admin check: createClient + getUser + profiles.is_admin query
- [06-01]: Div-based charts (no external library) for funnel bars and daily trends -- keeps bundle minimal
- [06-01]: profiles.email column backfilled from auth.users for admin-queryable email
- [06-01]: useTransition for non-blocking stage detail loading on funnel click
- [06-01]: proxy.ts hardened with is_admin check for /admin routes (not just authentication)
- [06-03]: pdf-parse for PDF text extraction -- lightweight, no native dependencies
- [06-03]: SSRF whitelist approach: explicit domain list plus private IP rejection for user-supplied URLs
- [06-03]: Wizard state managed by parent page component (step, basicInfo, extractedData) passed down as props
- [06-03]: Re-scrape replaces all application fields (delete + re-insert) rather than merging
- [06-04]: Shared wrapEmail base template for all 4 notification types with unsubscribe footer
- [06-04]: Array.isArray guard for Supabase join results (same pattern as 06-02)
- [06-04]: State-managed modal for bulk send dialog (div overlay, no external dialog library)
- [06-05]: Shared validateCronSecret inlined in each route for self-containment (not shared module)
- [06-05]: Analytics event_type to funnel stage mapping skips unmapped types (section_generated, section_saved)
- [06-05]: Null device_type mapped to empty string for analytics_daily_summary composite PK compatibility
- [06-05]: vi.hoisted() for mock variable declarations in Vitest 4 to avoid hoisting initialization errors

### Pending Todos

None yet.

### Blockers/Concerns

- [RESOLVED - Phase 1]: PDF generation strategy validated on Vercel. @react-pdf/renderer works, needs custom font for ă/ș/ț.
- [Phase 2]: Moldovan registry scraping reliability unknown until live testing
- [Phase 5]: Romanian AI output quality requires native speaker validation
- [RESOLVED - Phase 5 Plan 03]: PDF diacritics fixed -- Font.register with Geist Sans Regular/Bold from node_modules

## Session Continuity

Last session: 2026-03-22T16:37:53Z
Stopped at: Completed 06-05-PLAN.md (cron jobs for deadline reminders, abandoned drafts, analytics)
Resume file: None
