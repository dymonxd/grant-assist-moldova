---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 04-02-PLAN.md (account wall modal, signup form, save button, auth-aware cards)
last_updated: "2026-03-21T20:01:56Z"
last_activity: 2026-03-21 -- Completed 04-02-PLAN.md (account wall modal and auth-aware grant cards)
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** When a Moldovan entrepreneur enters their IDNO or describes their business idea, the platform matches them to eligible grants and generates polished, rubric-optimized application text in Romanian.
**Current focus:** Phase 4 complete -- all 3 plans executed (auth actions, account wall UI, privacy policy). Ready for Phase 5 (Writer) or Phase 6 (Admin).

## Current Position

Phase: 4 of 6 (Authentication and Profile Merge) -- COMPLETE
Plan: 3 of 3 in current phase (all complete)
Status: Phase 4 complete; AUTH-01 through AUTH-07 and GEN-04 implemented
Last activity: 2026-03-21 -- Completed 04-02-PLAN.md (account wall modal and auth-aware grant cards)

Progress: [██████████] 100% (Phases 1-4 complete, 14/14 plans in completed phases)

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

### Pending Todos

None yet.

### Blockers/Concerns

- [RESOLVED - Phase 1]: PDF generation strategy validated on Vercel. @react-pdf/renderer works, needs custom font for ă/ș/ț.
- [Phase 2]: Moldovan registry scraping reliability unknown until live testing
- [Phase 5]: Romanian AI output quality requires native speaker validation
- [Phase 5]: PDF diacritics fix (Font.register with Romanian font) must be implemented in EXPRT-02

## Session Continuity

Last session: 2026-03-21T20:01:56Z
Stopped at: Completed 04-02-PLAN.md (account wall modal, signup form, save button, auth-aware cards)
Resume file: None
