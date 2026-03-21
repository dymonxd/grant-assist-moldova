# Architecture Patterns

**Domain:** AI-powered grant discovery and application platform (SaaS)
**Researched:** 2026-03-21

## Recommended Architecture

GrantAssist Moldova is a server-first Next.js 16 application following a modular monolith pattern. The system divides into five primary subsystems that communicate through Supabase (Postgres + Auth + Storage) as the central data layer, with the AI Gateway handling all LLM inference.

```
                          +---------------------+
                          |    proxy.ts          |
                          | (Auth gate, session  |
                          |  refresh, redirects) |
                          +----------+----------+
                                     |
          +----------+----------+----------+----------+
          |          |          |          |          |
     (public)    (matching)  (writer)   (auth)    (admin)
     Route       Route       Route      Route     Route
     Group       Group       Group      Group     Group
          |          |          |          |          |
          +----------+----------+----------+----------+
                                     |
     +-------------------------------+-------------------------------+
     |                               |                               |
  Server Actions               Route Handlers                  Cron Handler
  (mutations, AI chat)         (webhooks, scraping,            (single route,
                                cron, external)                ?type= param)
     |                               |                               |
     +-------------------------------+-------------------------------+
                                     |
                    +----------------+----------------+
                    |                |                |
              Supabase Client   Service Role     AI Gateway
              (user-scoped,     Client           (OIDC auth,
               RLS enforced)    (admin ops,      anthropic/
                                 anon profiles)  claude-sonnet-4.6)
                    |                |                |
                    +----------------+----------------+
                                     |
                              +------+------+
                              |  Supabase   |
                              |  Postgres   |
                              |  + Auth     |
                              |  + Storage  |
                              +-------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Server/Client |
|-----------|---------------|-------------------|---------------|
| **proxy.ts** | Auth session refresh, route protection, anonymous cookie management | Supabase Auth, iron-session, all route groups | Server (Node.js runtime) |
| **Public Route Group `(public)`** | Landing page, grant catalog browse/search, results pages, shareable links | Supabase Client (read-only, no auth needed) | Server Components + Client Islands |
| **Matching Route Group `(matching)`** | IDNO/idea input, scraping orchestration, grant matching pipeline | Scraper Service, Matching Engine, Supabase (service role for anon profiles) | Server Actions + Client Components |
| **Writer Route Group `(writer)`** | Per-section AI writing, progress tracking, export (copy/PDF/email) | AI Gateway via Server Actions, Supabase Client | Client Components with streaming |
| **Auth Route Group `(auth)`** | Login, signup, callback, profile merge | Supabase Auth, iron-session (merge trigger) | Server Components + Server Actions |
| **Admin Route Group `(admin)`** | Grant CRUD, PDF onboarding wizard, analytics, notification log | Supabase Client (admin RLS), AI Gateway (PDF extraction), Supabase Storage | Server Components + Client Islands |
| **Scraper Service** | Parallel fetch from OpenMoney/idno.md/srl.md, HTML parse, confidence-based merge | External sites via fetch + Cheerio, SSRF whitelist | Server-only (lib/) |
| **Matching Engine** | SQL pre-filter + AI ranking, match score calculation | Supabase (RPC for SQL filter), AI Gateway (ranking) | Server-only (lib/) |
| **Cron Handler** | Deadline reminders, abandoned draft nudge, nightly analytics aggregation | Supabase (service role), Resend (email) | Route Handler (GET) |
| **Email Service** | Transactional emails with unsubscribe links | Resend API | Server-only (lib/) |

### Data Flow

#### Flow 1: Company Discovery (IDNO Input)

```
User enters IDNO
    |
    v
Server Action: validateAndScrape(idno)
    |
    +---> Check Supabase cache (ON CONFLICT handled)
    |     If cached & fresh (<24h) -> return cached
    |
    +---> Parallel scrape (Promise.allSettled, 8s timeout each)
    |     +--> OpenMoney.md (Cheerio)
    |     +--> idno.md (Cheerio)
    |     +--> srl.md (Cheerio)
    |
    v
Confidence-based merge (pick highest-confidence field per source)
    |
    v
Upsert to company_profiles (ON CONFLICT DO UPDATE)
    |
    v
Create/update anonymous_profile (service role client)
    |
    v
Set iron-session cookie with profile_id
    |
    v
Return merged company data to client
```

#### Flow 2: Grant Matching Pipeline

```
Company profile + purchase needs
    |
    v
Step 1: SQL Pre-filter (Supabase RPC)
    +--> Filter by: region, sector, company_size, legal_form
    +--> Returns candidate grants (typically 5-15 from 50+)
    |
    v
Step 2: AI Ranking (Server Action -> AI Gateway)
    +--> Prompt: company profile + candidate grants + scoring criteria
    +--> Model: anthropic/claude-sonnet-4.6
    +--> Returns: match_score (0-100), eligibility_notes, strategic_advice
    |
    v
Step 3: Categorize results
    +--> Hero card: top match (score >= 80)
    +--> Scored list: remaining matches (score >= 40)
    +--> Below threshold: suggestions with improvement advice
    |
    v
Cache results with shareable link (30-day expiry UUID)
```

#### Flow 3: AI Writing with Streaming

```
User clicks section in writer
    |
    v
Client: useChat({ api: generateSection })
    |
    v
Server Action: generateSection(messages)
    +--> Load: grant rubric, company profile, section context
    +--> Check: deadline (block expired, warn <3 days)
    +--> Check: input length (<20 chars -> clarifying question)
    |
    v
streamText({
  model: 'anthropic/claude-sonnet-4.6',
  system: rubric-aware Romanian prompt,
  messages,
  maxTokens: per-section limit
})
    |
    v
return result.toDataStream()
    |
    v
Client renders streaming tokens
    +--> Character count warning (client-side)
    +--> Server truncation on save (Server Action)
    |
    v
Auto-save draft to Supabase on debounce
```

#### Flow 4: Anonymous-to-Authenticated Merge

```
Anonymous user clicks "Apply Now"
    |
    v
Account wall modal (skippable)
    |
    +-- Skip --> Continue as anonymous (limited)
    |
    +-- Sign up / Login -->
        |
        v
    Supabase Auth (email/password or OAuth)
        |
        v
    On auth callback:
        +--> Read iron-session cookie (anonymous profile_id)
        +--> Call Supabase RPC: merge_anonymous_profile(
        |       anon_profile_id,
        |       authenticated_user_id
        |    )
        |
        v
    DB Function (plpgsql):
        +--> UPDATE company_profiles SET user_id = auth_id WHERE id = anon_id
        +--> UPDATE saved_grants SET user_id = auth_id WHERE user_id = anon_id
        +--> UPDATE draft_applications SET user_id = auth_id WHERE user_id = anon_id
        +--> DELETE anonymous cookie
        |
        v
    Redirect to original destination (preserved URL)
```

#### Flow 5: Admin Grant Onboarding

```
Admin uploads grant PDF
    |
    v
Step 1: Upload to Supabase Storage (admin bucket)
    |
    v
Step 2: AI Extraction (Server Action -> AI Gateway)
    +--> Download PDF from Storage
    +--> Convert pages to images (or send as document)
    +--> streamText with multimodal prompt:
    |    "Extract: title, agency, deadline, eligibility criteria,
    |     funding range, required documents, scoring rubric"
    +--> Return structured JSON
    |
    v
Step 3: Review form (pre-filled from extraction)
    +--> Admin corrects/confirms each field
    +--> Inline editing with status badges
    |
    v
Step 4: Publish (upsert to grants table)
```

## Patterns to Follow

### Pattern 1: Two Supabase Clients

Create two distinct Supabase client factories. Never mix them.

**What:** Separate user-scoped client (respects RLS) from admin service-role client (bypasses RLS).
**When:** Always. User client for authenticated data access. Service role for anonymous profile creation, cron jobs, and admin operations.

```typescript
// lib/supabase/client.ts — Browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts — Server client (RLS-scoped to user)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}

// lib/supabase/admin.ts — Service role (bypasses RLS)
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // server-only
  )
}
```

**Confidence:** HIGH (Supabase official docs + multiple community sources confirm this pattern)

### Pattern 2: Server Actions for Mutations, Route Handlers for External

**What:** Use Server Actions for all user-facing mutations and AI streaming. Use Route Handlers only for cron jobs, webhooks, and external integrations.
**When:** Always in this project. No exceptions.

```
Server Actions (90% of server code):
  - Company scraping and profile creation
  - Grant matching (pre-filter + AI ranking)
  - AI writing (streamText -> toDataStream)
  - Saving grants, updating drafts
  - Profile merge on auth
  - Admin grant CRUD

Route Handlers (10% of server code):
  - GET /api/cron?type=reminders|nudges|analytics (Vercel cron)
  - POST /api/webhooks/supabase (auth events, if needed)
  - GET /api/og/[id] (Open Graph images for shareable links)
```

**Confidence:** HIGH (AI SDK v6 official docs explicitly recommend Server Actions for streaming)

### Pattern 3: Feature Colocation with Private Directories

**What:** Colocate components, actions, schemas, and services with their routes using underscore-prefixed private directories.
**When:** For every route group.

```
app/
  (public)/
    page.tsx                    # Landing page
    grants/
      page.tsx                  # Grant catalog
      [id]/
        page.tsx                # Grant detail
      _components/
        grant-card.tsx
        grant-filters.tsx
      _lib/
        grants.actions.ts       # Server Actions
        grants.schema.ts        # Zod schemas
  (matching)/
    match/
      page.tsx                  # Matching flow
      _components/
        idno-input.tsx
        company-preview.tsx
        match-results.tsx
      _lib/
        matching.actions.ts
        matching.schema.ts
  (writer)/
    write/[grantId]/
      page.tsx                  # Writer page
      _components/
        section-editor.tsx
        rubric-hint.tsx
        progress-tracker.tsx
        document-checklist.tsx
      _lib/
        writer.actions.ts
        writer.schema.ts
  (auth)/
    login/page.tsx
    signup/page.tsx
    callback/route.ts
    _lib/
      auth.actions.ts
  (admin)/
    admin/
      layout.tsx                # Admin layout with nav
      page.tsx                  # Analytics dashboard
      grants/
        page.tsx                # Grant management
        new/page.tsx            # 3-step onboarding wizard
      notifications/page.tsx
      _components/
        admin-nav.tsx
        grant-form.tsx
        pdf-uploader.tsx
      _lib/
        admin.actions.ts
        admin.schema.ts
```

**Confidence:** HIGH (Next.js 16 official docs + MakerKit guide confirm this pattern)

### Pattern 4: Parallel Scraping with Promise.allSettled

**What:** Scrape all three data sources in parallel, accept partial results, merge by confidence.
**When:** Company data lookup by IDNO.

```typescript
// lib/scrapers/orchestrator.ts
import { scrapeOpenMoney } from './openmoney'
import { scrapeIdno } from './idno'
import { scrapeSrl } from './srl'

const SCRAPE_TIMEOUT = 8_000 // 8 seconds per source

interface ScraperResult {
  source: string
  confidence: number  // 0-1
  data: Partial<CompanyProfile>
}

export async function scrapeAll(idno: string): Promise<CompanyProfile> {
  const withTimeout = (promise: Promise<ScraperResult>) =>
    Promise.race([
      promise,
      new Promise<ScraperResult>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), SCRAPE_TIMEOUT)
      ),
    ])

  const results = await Promise.allSettled([
    withTimeout(scrapeOpenMoney(idno)),
    withTimeout(scrapeIdno(idno)),
    withTimeout(scrapeSrl(idno)),
  ])

  const successful = results
    .filter((r): r is PromiseFulfilledResult<ScraperResult> =>
      r.status === 'fulfilled'
    )
    .map(r => r.value)

  if (successful.length === 0) {
    return { source: 'manual', needsManualEntry: true }
  }

  return mergeByConfidence(successful)
}

function mergeByConfidence(results: ScraperResult[]): CompanyProfile {
  // Sort by confidence descending
  const sorted = results.sort((a, b) => b.confidence - a.confidence)

  // For each field, pick the highest-confidence non-null value
  const merged: CompanyProfile = {}
  const fields = ['name', 'address', 'sector', 'employees', 'revenue', ...]

  for (const field of fields) {
    for (const result of sorted) {
      if (result.data[field] != null) {
        merged[field] = result.data[field]
        break
      }
    }
  }

  return merged
}
```

**Confidence:** HIGH (well-established pattern, PROJECT.md explicitly specifies this approach)

### Pattern 5: SSRF Domain Whitelist for Scrapers

**What:** Restrict server-side fetch to a known list of Moldovan government data sites.
**When:** Every outbound request from scraper functions.

```typescript
// lib/scrapers/ssrf-guard.ts
const ALLOWED_DOMAINS = new Set([
  'openmoney.md',
  'www.openmoney.md',
  'idno.md',
  'www.idno.md',
  'srl.md',
  'www.srl.md',
])

export function validateUrl(url: string): URL {
  const parsed = new URL(url)

  if (!ALLOWED_DOMAINS.has(parsed.hostname)) {
    throw new Error(`SSRF blocked: ${parsed.hostname} not in whitelist`)
  }

  // Block internal/private IPs
  if (parsed.hostname === 'localhost' ||
      parsed.hostname.startsWith('127.') ||
      parsed.hostname.startsWith('10.') ||
      parsed.hostname.startsWith('192.168.')) {
    throw new Error(`SSRF blocked: private IP`)
  }

  // Force HTTPS
  parsed.protocol = 'https:'

  return parsed
}
```

**Confidence:** HIGH (OWASP SSRF cheat sheet + PROJECT.md explicitly requires this)

### Pattern 6: iron-session for Anonymous Profile Tracking

**What:** Encrypted HTTP-only cookie that stores the anonymous profile ID. No server-side session storage needed.
**When:** Before the user authenticates. Bridges the anonymous-to-auth gap.

```typescript
// lib/session.ts
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

interface SessionData {
  profileId?: string    // UUID of anonymous profile
  returnUrl?: string    // URL to redirect after auth
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, {
    password: process.env.SESSION_SECRET!,  // 32+ chars
    cookieName: 'ga_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
  })
}
```

**Confidence:** HIGH (iron-session official docs, PROJECT.md audit finding #2 specifies this)

### Pattern 7: AI Gateway with OIDC (Zero-Config)

**What:** Use AI Gateway model strings directly. OIDC handles auth automatically on Vercel.
**When:** All AI inference calls.

```typescript
// lib/ai/config.ts
// No provider import needed -- AI SDK v6 resolves 'provider/model' strings
// via the built-in AI Gateway provider automatically

export const MODELS = {
  matching: 'anthropic/claude-sonnet-4.6' as const,
  writing: 'anthropic/claude-sonnet-4.6' as const,
  extraction: 'anthropic/claude-sonnet-4.6' as const,
} as const

// Usage in Server Action:
// streamText({ model: MODELS.writing, ... })
// generateText({ model: MODELS.extraction, ... })
// generateObject({ model: MODELS.matching, ... })
```

Local dev requires `vercel env pull` every 12 hours (or use `vercel dev` for auto-refresh). Production OIDC is fully automatic.

**Confidence:** HIGH (Vercel official docs + AI SDK provider docs confirm this pattern)

### Pattern 8: Cron Route with Type Parameter

**What:** Single Route Handler at `/api/cron` that dispatches to different jobs based on a `?type=` query parameter.
**When:** All scheduled jobs (deadline reminders, abandoned drafts, analytics).

```typescript
// app/api/cron/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type')

  switch (type) {
    case 'reminders':
      return await handleDeadlineReminders()
    case 'nudges':
      return await handleAbandonedDrafts()
    case 'analytics':
      return await handleAnalyticsAggregation()
    default:
      return Response.json({ error: 'Unknown type' }, { status: 400 })
  }
}

// vercel.json
// {
//   "crons": [
//     { "path": "/api/cron?type=reminders", "schedule": "0 9 * * *" },
//     { "path": "/api/cron?type=nudges",    "schedule": "0 10 * * *" },
//     { "path": "/api/cron?type=analytics", "schedule": "0 2 * * *" }
//   ]
// }
```

**Confidence:** HIGH (Vercel cron docs, PROJECT.md decision explicitly specifies this)

### Pattern 9: proxy.ts for Auth Session Management

**What:** Use Next.js 16 proxy.ts (replaces middleware.ts) for session refresh and route protection. Runs on Node.js runtime.
**When:** Every request except static assets.

```typescript
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        }),
      },
    }
  )

  // Refresh session (critical for Supabase Auth)
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Check admin role (from user metadata or profiles table)
  }

  // Protect writer routes (user must have a profile)
  if (request.nextUrl.pathname.startsWith('/write')) {
    // Allow anonymous users with iron-session cookie
    // Block users with no profile at all
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
```

**Important:** proxy.ts runs on Node.js runtime (not Edge). The `runtime` config option is not available and will throw an error.

**Confidence:** HIGH (Next.js 16 official docs confirm proxy.ts replaces middleware.ts with Node.js runtime)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using SSR Client with Service Role Key

**What:** Creating a Supabase SSR client (`@supabase/ssr`) with the service role key.
**Why bad:** SSR clients inject user session cookies into the Authorization header, overriding the service role. You get RLS enforcement when you expected admin access, or worse, data leaks if the session belongs to a different user.
**Instead:** Use `@supabase/supabase-js` `createClient()` directly for service role. Never pass service role key to SSR client factories.

### Anti-Pattern 2: RLS on Anonymous Profiles Using auth.uid()

**What:** Writing RLS policies that use `auth.uid()` to gate access to anonymous profiles.
**Why bad:** `auth.uid()` returns NULL for truly anonymous (not signed-in-anonymously) users. With permissive RLS, a `WHERE user_id = auth.uid()` check where `user_id` is also NULL matches ALL unclaimed profiles -- data leak.
**Instead:** Use service role client (bypasses RLS) for all anonymous profile operations. Only switch to user-scoped client after authentication.

### Anti-Pattern 3: Streaming AI in Route Handlers

**What:** Creating `/api/chat` Route Handlers for AI streaming when Server Actions work.
**Why bad:** Loses type safety, requires manual request/response handling, more boilerplate, and AI SDK v6 is designed for Server Actions as the primary streaming pattern.
**Instead:** Use Server Actions with `streamText().toDataStream()` and `useChat({ api: serverAction })`.

### Anti-Pattern 4: Blocking Scraper Failures

**What:** Using `Promise.all()` for parallel scraping, which fails if any single source fails.
**Why bad:** Government data sites are unreliable. One timeout kills the entire lookup.
**Instead:** `Promise.allSettled()` with per-source timeouts. Accept partial results. Fall back to manual entry if all sources fail.

### Anti-Pattern 5: Putting Business Logic in proxy.ts

**What:** Performing database queries, complex auth checks, or data transformations in proxy.ts.
**Why bad:** proxy.ts runs on every request. Heavy logic increases TTFB. Next.js 16 docs explicitly warn against this: "Proxy is meant to be invoked separately of your render code."
**Instead:** Keep proxy.ts thin (session refresh, simple redirects). Do auth/authz checks inside Server Actions and Server Components using `server-only` imports.

### Anti-Pattern 6: Storing Anonymous Profile ID in localStorage

**What:** Using client-side storage for the anonymous profile reference.
**Why bad:** Accessible to XSS attacks. Not available on first server render. Lost when user switches devices/browsers. PROJECT.md audit explicitly chose iron-session cookies instead.
**Instead:** Encrypted HTTP-only cookie via iron-session.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Scraping load** | Direct scraping per request | Cache company profiles (24h TTL), deduplicate by IDNO | Queue-based scraping with rate limiting per source domain |
| **AI inference cost** | Pay-per-call via Gateway | Add response caching for common grant+profile combos | Tiered model selection (smaller model for pre-screen, larger for final ranking) |
| **Supabase connections** | Direct connections fine | Connection pooling via Supavisor (built into Supabase) | Read replicas for catalog browsing |
| **Anonymous profiles** | Manual cleanup (30-day cron) | Automated cleanup, shorter TTL | Separate partition for anonymous data |
| **Grant catalog** | 50 grants, simple queries | 500 grants, add full-text search indexes | pgvector for semantic search, materialized views for filters |
| **PDF generation** | @react-pdf/renderer server-side | Same, with caching | Pre-generate common templates, CDN caching |

## Build Order (Dependency Chain)

The following order respects component dependencies -- each phase can only be built after its prerequisites exist.

```
Phase 1: Foundation (no dependencies)
  +--> Supabase schema + RLS policies
  +--> Two Supabase clients (user + admin)
  +--> iron-session setup
  +--> proxy.ts with session refresh
  +--> Project structure (route groups, private dirs)

Phase 2: Data Layer (depends on Phase 1)
  +--> Scraper service (3 sources + SSRF guard)
  +--> Company profile CRUD (service role for anon)
  +--> Grant catalog schema + seed data
  +--> Admin grant CRUD (basic, no AI yet)

Phase 3: Matching (depends on Phase 2)
  +--> AI Gateway integration
  +--> SQL pre-filter (Supabase RPC)
  +--> AI ranking (generateObject via Gateway)
  +--> Match results UI with shareable links

Phase 4: Auth + Merge (depends on Phase 1, 2)
  +--> Supabase Auth (email/password)
  +--> Anonymous-to-auth merge (DB function + iron-session)
  +--> Account wall modal
  +--> Saved grants

Phase 5: AI Writer (depends on Phase 3, 4)
  +--> Streaming setup (Server Action + useChat)
  +--> Per-section generation with rubric prompts
  +--> Progress tracking + deadline checks
  +--> Export (copy, PDF, email)

Phase 6: Admin + Automation (depends on Phase 2, 3)
  +--> Admin PDF extraction (multimodal LLM)
  +--> 3-step grant onboarding wizard
  +--> Analytics dashboard
  +--> Cron jobs (reminders, nudges, aggregation)
  +--> Email notifications via Resend
```

**Critical path:** Phase 1 -> Phase 2 -> Phase 3 -> Phase 5. The AI writer cannot exist without grant matching (needs rubric data), which cannot exist without the data layer (needs company profiles and grant catalog).

**Parallelizable:** Phase 4 (Auth) can proceed in parallel with Phase 3 (Matching) after Phase 2 is complete. Phase 6 (Admin) can proceed in parallel with Phase 5 (Writer) after Phase 3 is complete.

## Key Architectural Decisions

| Decision | Pattern | Rationale |
|----------|---------|-----------|
| Server Actions over Route Handlers for AI | `streamText().toDataStream()` in Server Actions | AI SDK v6 is built for this; eliminates serialization bugs, provides type safety |
| Two Supabase clients, never one | Separate user-scoped + admin factories | SSR client with service role is a known anti-pattern that causes data leaks |
| iron-session over Supabase anonymous auth | Encrypted cookie with profile ID | Simpler than full Supabase anonymous sign-in; no JWT management for pre-auth users; PROJECT.md audit finding #2 |
| proxy.ts over in-component auth checks | Thin proxy for session refresh only | Next.js 16 official pattern; auth checks still needed in Server Actions (defense in depth) |
| Single cron route with ?type= | Switch dispatch in one Route Handler | Shared CRON_SECRET validation; PROJECT.md decision |
| Multimodal LLM over pdf-parse for PDFs | Send PDF pages as images to Claude | pdf-parse abandoned since 2021; LLM extraction is more accurate for structured grant documents |
| Feature colocation over flat directories | `_components/` and `_lib/` inside route dirs | Scales better as features grow; prevents import spaghetti |

## Sources

- [Next.js 16 proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- HIGH confidence
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) -- HIGH confidence
- [AI SDK AI Gateway Provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway) -- HIGH confidence
- [Vercel AI Gateway Authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok/authentication) -- HIGH confidence
- [Vercel AI SDK v6 Announcement](https://vercel.com/blog/ai-sdk-6) -- HIGH confidence
- [AI SDK v6 Streaming Chat Guide](https://www.digitalapplied.com/blog/vercel-ai-sdk-6-streaming-chat-nextjs-guide) -- MEDIUM confidence
- [Next.js 16 App Router Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure) -- MEDIUM confidence
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- MEDIUM confidence
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) -- MEDIUM confidence
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) -- HIGH confidence
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) -- HIGH confidence
- [iron-session GitHub](https://github.com/vvo/iron-session) -- HIGH confidence
- [Supabase Service Role Discussion](https://github.com/orgs/supabase/discussions/30739) -- MEDIUM confidence
