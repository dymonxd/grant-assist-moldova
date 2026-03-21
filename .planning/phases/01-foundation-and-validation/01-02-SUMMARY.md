---
phase: 01-foundation-and-validation
plan: 02
subsystem: auth, infra
tags: [supabase-ssr, proxy, iron-session, getClaims, jwt, cookies, session]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 scaffolded project with Supabase dependencies installed
provides:
  - Three Supabase client variants (browser, server, admin) for all auth operations
  - proxy.ts request interceptor with JWT validation and /admin route protection
  - iron-session config with typed SessionData for anonymous profile tracking
  - Auth callback route handler for email signup code exchange
affects: [01-03-pdf-validation, phase-2-data-layer, phase-3-matching, phase-4-auth]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-ssr-three-client-pattern, proxy-getClaims-jwt-validation, iron-session-typed-cookie]

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/session.ts
    - src/proxy.ts
    - src/app/api/auth/callback/route.ts
    - src/app/admin/page.tsx
  modified: []

key-decisions:
  - "proxy.ts uses getClaims() for JWT validation instead of getSession() -- getClaims validates the JWT signature server-side while getSession trusts the token"
  - "proxy.ts creates Supabase client inline rather than importing server.ts -- proxy needs request.cookies not next/headers cookies()"
  - "Auth callback preserves redirect URL via next query parameter for post-signup navigation back to intended page"

patterns-established:
  - "Three Supabase clients: browser singleton (client.ts), server per-request (server.ts), admin service-role (admin.ts)"
  - "proxy.ts pattern: inline createServerClient with request/response cookie handlers, getClaims() refresh, route protection"
  - "iron-session: getIronSession<SessionData> with typed interface, 30-day httpOnly encrypted cookie"
  - "Auth callback: exchangeCodeForSession with next parameter redirect preservation"

requirements-completed: [FNDTN-03, FNDTN-04, FNDTN-05, FNDTN-06]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 1 Plan 02: Auth Plumbing Summary

**Three Supabase SSR client variants, proxy.ts with getClaims() JWT validation and /admin protection, iron-session typed cookie for anonymous profile tracking, and auth callback route with redirect preservation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T11:09:34Z
- **Completed:** 2026-03-21T11:13:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Three Supabase client utilities: browser singleton for Client Components, server per-request with cookies() for Server Components/Actions, admin service-role client that bypasses RLS for anonymous profile operations
- proxy.ts request interceptor using getClaims() for JWT signature validation (not getSession), inline Supabase client for direct cookie access, and /admin route protection with redirect to /login
- iron-session configuration with typed SessionData interface (companyProfileId), 30-day encrypted httpOnly cookie named grantassist_session
- Auth callback route handler that exchanges authorization code for Supabase session and preserves the user's intended destination via next query parameter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase client utilities and proxy.ts with admin protection** - `36b28f0` (feat)
2. **Task 2: Create iron-session configuration and auth callback route** - `4016b27` (feat)

## Files Created/Modified
- `src/lib/supabase/client.ts` - Browser Supabase client singleton using createBrowserClient
- `src/lib/supabase/server.ts` - Server Supabase client per-request using createServerClient with cookies()
- `src/lib/supabase/admin.ts` - Service role Supabase client using createClient with SUPABASE_SERVICE_ROLE_KEY
- `src/lib/session.ts` - iron-session config with SessionData type, getSession() helper, 30-day cookie
- `src/proxy.ts` - Request interceptor with getClaims() JWT validation, cookie refresh, /admin protection
- `src/app/api/auth/callback/route.ts` - Auth code exchange route handler with redirect preservation
- `src/app/admin/page.tsx` - Protected admin placeholder page with Romanian text

## Decisions Made
- Used `getClaims()` in proxy.ts for JWT validation instead of `getSession()` -- getClaims validates the JWT signature server-side providing stronger security guarantees
- proxy.ts creates its own Supabase client inline rather than importing from server.ts because proxy needs direct access to request.cookies (not the next/headers cookies() helper)
- Auth callback preserves redirect URL via `next` query parameter so users return to their intended destination after signup (supports Phase 4 AUTH-06)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getClaims() destructuring for nullable data**
- **Found during:** Task 1 (proxy.ts and admin page)
- **Issue:** TypeScript error: getClaims() returns a discriminated union where data can be null, so `{ data: { claims } }` destructuring fails type checking
- **Fix:** Changed to `{ data }` destructuring with optional chaining `data?.claims` for null safety
- **Files modified:** src/proxy.ts, src/app/admin/page.tsx
- **Verification:** Build passes with zero TypeScript errors
- **Committed in:** 36b28f0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** TypeScript type safety fix required for correct null handling. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required for this plan. Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET) are referenced but were already templated in .env.local.example during Plan 01-01.

## Next Phase Readiness
- Auth plumbing complete, ready for PDF validation (01-03)
- All three Supabase client variants importable for any future server/client code
- proxy.ts active on all routes, refreshing tokens and protecting /admin
- iron-session ready for anonymous-to-authenticated profile tracking in Phase 4
- Auth callback route ready for email signup flow integration in Phase 4

## Self-Check: PASSED

All 7 created files verified on disk. All 2 task commits (36b28f0, 4016b27) verified in git history.

---
*Phase: 01-foundation-and-validation*
*Completed: 2026-03-21*
