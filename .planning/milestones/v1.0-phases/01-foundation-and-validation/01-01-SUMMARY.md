---
phase: 01-foundation-and-validation
plan: 01
subsystem: infra, database, ui
tags: [nextjs, tailwind-v4, shadcn-ui, geist, supabase, rls, postgres, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16 scaffolded project with Tailwind v4, shadcn/ui, Geist fonts
  - Supabase schema with 10 tables, RLS, indexes, triggers, functions
  - Romanian UI shell with responsive layout and boundary states
  - Brand theme with warm accent color
  - Seed data with 3 Moldovan grants and 11 application fields
affects: [01-02-auth-plumbing, 01-03-pdf-validation, phase-2-data-layer, phase-3-matching]

# Tech tracking
tech-stack:
  added: [next@16.2.1, tailwindcss@v4, shadcn/ui, geist@1.7.0, @supabase/supabase-js, @supabase/ssr, iron-session, @react-pdf/renderer, jspdf]
  patterns: [tailwind-v4-css-first, shadcn-base-nova-style, geist-local-font-import]

key-files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/loading.tsx
    - src/app/error.tsx
    - src/app/not-found.tsx
    - supabase/migrations/001_initial_schema.sql
    - supabase/seed.sql
    - .env.local.example
    - src/components/ui/button.tsx
    - src/lib/utils.ts
  modified:
    - next.config.ts
    - src/app/globals.css
    - .gitignore

key-decisions:
  - "Used geist/font/sans and geist/font/mono local imports instead of Google Fonts for self-hosted fonts"
  - "Kept shadcn/ui base-nova style with neutral base and added brand warm accent color (oklch)"
  - "analytics_daily_summary uses composite PK with COALESCE for nullable device_type"
  - "Shared company_profiles readable via share_token without auth (RLS policy with expiry check)"

patterns-established:
  - "Tailwind v4 CSS-first: @import 'tailwindcss' with @theme inline block, no tailwind.config file"
  - "shadcn/ui components: New York style, zinc base, CSS variables, @/components/ui path alias"
  - "Romanian UI: all user-facing text in Romanian, html lang='ro', simple everyday language"
  - "Mobile-first layout: px-4 base padding, max-w-5xl container, responsive flex layouts"
  - "RLS patterns: is_admin() helper function, auth.uid() ownership checks, admin-only for analytics/notifications"

requirements-completed: [FNDTN-01, FNDTN-02, GEN-01, GEN-02, GEN-03]

# Metrics
duration: 11min
completed: 2026-03-21
---

# Phase 1 Plan 01: Project Scaffolding and Database Schema Summary

**Next.js 16 with Tailwind v4 CSS-first config, Romanian UI shell with Geist fonts, and Supabase Postgres schema with 10 RLS-protected tables, 33 policies, 5 indexes, and seed data for 3 Moldovan grants**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-21T10:54:55Z
- **Completed:** 2026-03-21T11:05:36Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Next.js 16 project scaffolded with all Phase 1 dependencies (Supabase, iron-session, Geist, react-pdf, jspdf, shadcn/ui) -- builds with zero TypeScript errors
- Romanian UI shell with html lang="ro", Geist Sans/Mono fonts, mobile-first responsive layout, and boundary states (loading spinner, error boundary with reset, 404 page) all in Romanian
- Complete Supabase database schema: 10 application tables with RLS on all tables (33 policies), 5 performance indexes, auto-profile-creation trigger, anonymous-to-auth merge function, updated_at triggers
- Seed data with 3 realistic Moldovan grants (AIPA agriculture, ODA digital, EU4Moldova green energy) with 11 application fields in Romanian

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 project with all Phase 1 dependencies** - `0ac9b3e` (feat)
2. **Task 2: Create Romanian UI shell with Geist fonts and boundary states** - `51ec2a6` (feat)
3. **Task 3: Deploy Supabase schema with 10 tables, RLS, indexes, triggers, and functions** - `8cca415` (feat)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout with html lang="ro", Geist font variables, header/main/footer semantic structure
- `src/app/page.tsx` - Landing page shell with Romanian placeholder content and disabled input/button
- `src/app/globals.css` - Tailwind v4 CSS-first config with shadcn theme, brand accent color, font definitions
- `src/app/loading.tsx` - Global loading spinner with "Se incarca..." text
- `src/app/error.tsx` - Error boundary with "Ceva nu a mers bine" message and reset button
- `src/app/not-found.tsx` - 404 page with "Pagina nu a fost gasita" and home link
- `next.config.ts` - serverExternalPackages for @react-pdf/renderer
- `.env.local.example` - Template with Supabase URL, keys, session secret placeholders
- `supabase/migrations/001_initial_schema.sql` - Complete schema: 10 tables, RLS, indexes, triggers, functions
- `supabase/seed.sql` - 3 Moldovan grants with eligibility rules, scoring rubrics, and application fields
- `src/components/ui/button.tsx` - shadcn/ui Button component (auto-generated)
- `src/lib/utils.ts` - cn() utility for Tailwind class merging (auto-generated)
- `.gitignore` - Added exception for .env.local.example
- `components.json` - shadcn/ui configuration

## Decisions Made
- Used `geist/font/sans` and `geist/font/mono` local imports (self-hosted) instead of Google Fonts -- matches the installed geist package's export structure
- Kept shadcn/ui's base-nova style with neutral base colors and added a brand warm accent color using oklch color space for consistency
- `analytics_daily_summary` uses composite PK with COALESCE for nullable device_type to avoid NULL in primary key
- Company profiles with share_token are readable without auth via RLS policy with 30-day expiry check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Directory name incompatible with create-next-app**
- **Found during:** Task 1 (Project scaffolding)
- **Issue:** Project directory "Grands (new)" contains special characters incompatible with npm naming
- **Fix:** Created project in grants-moldova subdirectory, then moved files to project root
- **Files modified:** All scaffolded files
- **Verification:** Build passes, all files in correct location
- **Committed in:** 0ac9b3e (Task 1 commit)

**2. [Rule 3 - Blocking] npm cache permissions error during shadcn init**
- **Found during:** Task 1 (shadcn initialization)
- **Issue:** npm cache had root-owned files preventing shadcn installation
- **Fix:** Used `npx --yes` flag to bypass the cache issue
- **Files modified:** None (runtime fix)
- **Verification:** shadcn init completed successfully
- **Committed in:** 0ac9b3e (Task 1 commit)

**3. [Rule 1 - Bug] .gitignore excluded .env.local.example**
- **Found during:** Task 1 (Commit attempt)
- **Issue:** Default .gitignore pattern `.env*` excluded the example env file which contains no secrets
- **Fix:** Added `!.env.local.example` exception to .gitignore
- **Files modified:** .gitignore
- **Verification:** git add succeeds for .env.local.example
- **Committed in:** 0ac9b3e (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes were necessary for build and commit success. No scope creep.

## Issues Encountered
- Turbopack warning about multiple lockfiles detected (parent directory has a package-lock.json) -- non-blocking, can be resolved later with turbopack.root config if needed

## User Setup Required

None - no external service configuration required for this plan. Supabase project setup and database migration will be needed when connecting to a live Supabase instance.

## Next Phase Readiness
- Project builds cleanly with all dependencies, ready for auth plumbing (01-02)
- Supabase schema is complete and ready for migration to a Supabase project
- Romanian UI shell provides the layout foundation for all future pages
- shadcn/ui initialized with button component, ready for additional component installation

## Self-Check: PASSED

All 12 created/modified files verified on disk. All 3 task commits (0ac9b3e, 51ec2a6, 8cca415) verified in git history.

---
*Phase: 01-foundation-and-validation*
*Completed: 2026-03-21*
