# Project Research Summary

**Project:** GrantAssist Moldova
**Domain:** AI-powered grant discovery and application platform (Moldova-specific SaaS)
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

GrantAssist Moldova is an AI-powered grant discovery and application platform targeting Moldovan SME entrepreneurs. The competitive landscape (Instrumentl, Grantable, Granted AI, Fundsprout) has established clear user expectations: searchable grant databases, AI-powered eligibility matching, section-by-section proposal writing, and PDF export. GrantAssist differentiates by operating exclusively in the Moldovan market -- auto-populating company data from IDNO business registries, writing proposals optimized against actual Moldovan grant scoring rubrics in Romanian, and offering a zero-friction anonymous start that no global competitor matches. The product is a server-first Next.js 16 modular monolith backed by Supabase and Vercel's AI Gateway, with a well-validated stack where every technology choice has high confidence and current stable versions.

The recommended approach is a dependency-driven six-phase build. The critical path runs: Foundation (Supabase schema, auth plumbing, proxy.ts) then Data Layer (scrapers, profiles, grant catalog) then Grant Matching (SQL pre-filter + AI ranking) then AI Writer (streaming section generation with rubric optimization) then Export and Notifications. This ordering is dictated by hard dependencies -- the writer needs rubric data from the matching layer, matching needs company profiles from the data layer, and everything needs the auth and session infrastructure from the foundation. Auth can be parallelized with matching, and admin tooling can be parallelized with the writer.

The key risks are concentrated in three areas. First, anonymous profile security: iron-session cookies have no `auth.uid()` in Supabase, so RLS policies written the standard way will either leak all anonymous profiles or block access entirely -- service role client is mandatory for anonymous operations. Second, PDF generation: `@react-pdf/renderer` has confirmed React 19 reconciler bugs on Vercel serverless, and `jspdf` cannot render Romanian diacritics without custom font embedding -- both paths require early validation. Third, Romanian AI output quality: LLMs produce inferior Romanian compared to English, with wrong diacritics (cedilla vs. comma-below) and institutional tone mismatches that must be caught via Romanian system prompts, post-processing, and native speaker review.

## Key Findings

### Recommended Stack

The stack is fully validated with high confidence across all components. Next.js 16.2.0 with Turbopack, `proxy.ts` (replacing `middleware.ts`), and async `params`/`cookies()` is the foundation. Supabase provides Postgres, Auth, and Storage in a single platform, eliminating the need for separate Clerk, Neon, or S3 services. AI SDK v6 with the built-in `gateway()` function handles all LLM inference via Vercel's OIDC -- no API keys needed in production.

**Core technologies:**
- **Next.js 16.2.0**: Full-stack framework -- `proxy.ts` runs on Node.js (required for Supabase cookie refresh), Turbopack default, 400% faster dev startup
- **Supabase (supabase-js 2.99.3 + ssr 0.9.0)**: All-in-one BaaS -- Postgres with RLS, Auth, Storage. Eliminates 3 separate services. Race condition fix in ssr 0.9.0
- **AI SDK v6 (6.0.134)**: LLM integration -- `gateway()` built-in, `streamText`/`generateText` core APIs, `UIMessage`/`ModelMessage` types, `toUIMessageStreamResponse()` for chat UIs
- **Tailwind CSS v4 + shadcn/ui CLI v4**: Styling -- CSS-first config, Oxide engine (5x faster builds), component ownership via CLI copy
- **Resend 6.9.4 + React Email**: Transactional email -- deadline reminders, abandoned draft nudges, export-via-email
- **Cheerio 1.2.0**: HTML scraping -- lightweight jQuery-like parsing for static government registry sites (OpenMoney.md, idno.md, srl.md)
- **iron-session 8.0.4**: Anonymous sessions -- encrypted HTTP-only cookies for pre-auth profile tracking
- **@react-pdf/renderer 4.3.2 + jspdf 4.2.1**: PDF generation -- server-side primary with client-side fallback (Vercel compatibility risk)

**Critical version requirements:**
- Node.js 20.9+ (Next.js 16 dropped Node 18)
- React 19.2.x (ships with Next.js 16, required by @react-pdf/renderer 4.1+)
- @supabase/ssr 0.9.0+ (SSR token refresh race condition fix)
- AI SDK v6+ (v5 APIs removed, not deprecated -- code will break, not warn)

**What NOT to use:** `middleware.ts` (deprecated), `@supabase/auth-helpers-nextjs` (deprecated), `supabase.auth.getSession()` in server code (security risk -- use `getClaims()`), `generateObject()`/`streamObject()` (removed in v6), Playwright (exceeds Vercel 250MB limit), `pdf-parse` (abandoned since 2021).

### Expected Features

**Must have (table stakes):**
- Grant database with search and filters (public catalog, no auth required)
- Eligibility matching with compatibility scores (rule-based pre-filter + AI ranking)
- Company/organization profile (auto-populated from IDNO registries)
- AI-assisted section-by-section proposal drafting with progress tracking
- Export to PDF, copy, and email (PDF is critical -- Moldovan agencies expect PDF submissions)
- Deadline tracking with email reminders (7-day and 3-day cron-based)
- User accounts with saved progress (anonymous-to-authenticated merge)
- Required documents checklist (static, checkable list per grant)
- Romanian language throughout (UI and AI output)
- Mobile-responsive design (Moldovan entrepreneurs are mobile-primary)

**Should have (differentiators):**
- Auto-populated company data from IDNO registries (no competitor scrapes Moldovan registries)
- AI strategic eligibility advice ("how to become eligible," not just binary eligible/not)
- Rubric-optimized writing using actual scoring criteria (inline rubric hints above each field)
- Zero-friction anonymous start (discover, match, and explore before signup)
- Business idea to grant match via free-text input (AI infers profile from description)
- Shareable results links (30-day expiry, no recipient auth needed)
- Admin grant onboarding via PDF extraction wizard (3-step: upload, AI extraction, human review)

**Defer to v2+:**
- Financial spreadsheet / budget assistant (different UI paradigm, different AI capabilities)
- Multi-language support (Russian/English doubles QA and AI prompt complexity)
- Real-time collaboration / multi-user editing (enormous complexity for minimal v1 value)
- Direct grant submission / portal integration (liability risk, fragile government systems)
- Full grant lifecycle management (post-award is a separate product)
- SMS notifications (Resend email is sufficient for v1)
- Document upload / storage (checklist is sufficient; storage adds cost and security concerns)

### Architecture Approach

Server-first modular monolith with five route groups (public, matching, writer, auth, admin) communicating through Supabase as the central data layer. Server Actions handle 90% of server code (mutations, AI streaming, scraping). Route Handlers are reserved for cron jobs, webhooks, and OG images. Feature colocation via underscore-prefixed private directories (`_components/`, `_lib/`) keeps each route group self-contained.

**Major components:**
1. **proxy.ts** -- Auth session refresh and route protection. Thin: cookies, redirects, and Supabase `getClaims()` only. No database queries or heavy imports.
2. **Scraper Service** -- Parallel fetch from 3 Moldovan registries with `Promise.allSettled()`, 8s timeouts, SSRF domain whitelist, and confidence-based data merge. Falls back to manual entry when all sources fail.
3. **Matching Engine** -- Two-stage: SQL pre-filter via Supabase RPC (region, sector, size, legal form) narrows 50+ grants to 5-15 candidates, then AI ranking via `generateText()` produces match scores (0-100) with eligibility notes and strategic advice.
4. **AI Writer** -- `streamText()` in Server Actions consumed by `useChat` hook. Rubric-aware Romanian system prompts. Per-section generation with character limits, deadline checks, and auto-save on debounce.
5. **Cron Handler** -- Single `/api/cron?type=` route dispatching to deadline reminders, abandoned draft nudges, and analytics aggregation. `force-dynamic` export and idempotent operations are mandatory.
6. **Email Service** -- Resend with React Email templates. Unsubscribe links in every email. Used by cron handler and export flow.

**Key patterns:** Two Supabase clients (user-scoped RLS + admin service role, never mixed). iron-session encrypted cookies for anonymous profile tracking. AI Gateway with OIDC (zero API key management). Feature colocation with private directories.

**Key anti-patterns to avoid:** SSR client with service role key (data leak). RLS on anonymous profiles via `auth.uid()` (data leak). Blocking scraper failures with `Promise.all()` (one timeout kills all). Heavy logic in `proxy.ts` (slows every request). Anonymous profile ID in localStorage (XSS risk).

### Critical Pitfalls

1. **Anonymous profile data leak via RLS** -- `auth.uid()` is NULL for iron-session users, so standard RLS policies either expose all anonymous profiles or block all access. Prevention: use service role client exclusively for anonymous operations; design RLS assuming only authenticated users query through the client. **Phase 1 -- must be correct before any data enters the database.**

2. **AI SDK v6 breaking changes silently break streaming** -- `CoreMessage` renamed to `ModelMessage`, `convertToModelMessages()` is now async, `generateObject()`/`streamObject()` removed, default agent loop changed from 1 to 20 iterations. Prevention: run the v6 codemod, never copy v5 code from tutorials, grep codebase for v5 patterns. **Phase 2 -- every AI route must use v6 from the start.**

3. **@react-pdf/renderer fails on Vercel serverless with React 19** -- Reconciler bug produces `TypeError: Cannot read properties of null` in production. Prevention: deploy a test PDF route to Vercel in Phase 1; prepare jspdf client-side fallback from day one. **Phase 1 -- the fallback path requires different architecture.**

4. **jspdf cannot render Romanian diacritics without custom fonts** -- Built-in PDF fonts are ASCII-only; Romanian characters render as boxes. Prevention: bundle a .ttf font with full Romanian coverage and register it before any PDF generation; test with `"ăâîșțĂÂÎȘȚ"`. **Phase 1 decision, Phase 3 implementation.**

5. **Vercel cron routes silently fail from static compilation** -- Next.js may pre-render GET route handlers as static pages, returning cached 200 responses while executing nothing. Prevention: `export const dynamic = 'force-dynamic'`; always read `request.headers` for CRON_SECRET validation; verify side effects in Vercel logs. **Phase 4 implementation, Phase 1 convention.**

6. **LLM Romanian output quality degrades** -- Wrong diacritics (cedilla vs. comma-below), English-style structure, and non-institutional tone. Prevention: Romanian system prompts, few-shot examples of grant text, post-processing cedilla-to-comma replacement, native speaker review. **Phase 3 -- but prompt design starts in Phase 2.**

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the hard dependency chain identified in the architecture analysis. The critical path is Foundation then Data Layer then Matching then Writer. Auth can run in parallel with Matching after Data Layer completes. Admin/Automation can run in parallel with Writer after Matching completes.

### Phase 1: Foundation and Validation
**Rationale:** Every other phase depends on the Supabase schema, auth plumbing, session infrastructure, and validated PDF strategy. Three critical pitfalls (RLS data leak, PDF on Vercel, proxy.ts design) must be resolved here before any feature code is written.
**Delivers:** Supabase schema with RLS policies, two Supabase client factories (user + admin), iron-session setup, proxy.ts with session refresh, project file structure (route groups, private directories), and a deployed PDF validation test.
**Addresses:** User accounts infrastructure, mobile-responsive layout shell, Romanian UI foundation
**Avoids:** Pitfall 1 (anonymous RLS leak), Pitfall 3 (@react-pdf Vercel failure), Pitfall 6 (OIDC token blocked by stale API key), Pitfall 10 (overloaded proxy.ts)

### Phase 2: Data Layer and Scraping
**Rationale:** The matching engine and writer both need company profiles and grant data to function. Scrapers are the most fragile component and need early validation against live government sites. SSRF protection must be in place before any outbound requests.
**Delivers:** Scraper service with parallel fetching and confidence-based merge, company profile CRUD, grant catalog schema with seed data, admin grant CRUD (manual entry), SSRF domain whitelist.
**Addresses:** Company profile (table stake), grant database (table stake), auto-populated IDNO data (differentiator)
**Avoids:** Pitfall 8 (silent scraper failures), Pitfall 16 (SSRF via scraping endpoint), Pitfall 11 (anonymous profile abuse -- CAPTCHA here)

### Phase 3: Grant Matching
**Rationale:** Matching connects the data layer to user value. It is the prerequisite for the writer (needs rubric data) and the primary conversion point (match results drive signup). AI Gateway integration happens here.
**Delivers:** SQL pre-filter via Supabase RPC, AI ranking with match scores, match results UI with hero card and scored list, strategic eligibility advice, shareable results links, business idea free-text input.
**Addresses:** Eligibility matching (table stake), strategic advice (differentiator), shareable links (differentiator), free-text matching (differentiator)
**Avoids:** Pitfall 2 (AI SDK v6 breaking changes -- first AI integration point), Pitfall 15 (async convertToModelMessages)

### Phase 4: Authentication and Profile Merge
**Rationale:** Can proceed in parallel with Phase 3 after Phase 2 completes. The account wall appears at "Apply Now" in the matching results, so auth must be ready by the time the writer launches. The anonymous-to-authenticated merge is architecturally complex and benefits from standalone focus.
**Delivers:** Supabase Auth (email/password), anonymous-to-authenticated profile merge (atomic Postgres function), account wall modal, saved grants, return URL preservation.
**Addresses:** User accounts with saved progress (table stake), zero-friction anonymous start (differentiator)
**Avoids:** Pitfall 7 (merge race conditions), Pitfall 12 (iron-session Safari cookie issues)

### Phase 5: AI Grant Writer and Export
**Rationale:** Depends on Phases 3 and 4 (needs rubric data from matching, authenticated user from auth). This is the core value proposition -- section-by-section AI writing optimized against actual scoring rubrics. Export (PDF, copy, email) completes the user journey.
**Delivers:** Per-section streaming AI writer with rubric prompts, progress tracking and deadline checks, inline rubric hints, export to PDF (using validated strategy from Phase 1), copy-all, email via Resend, required documents checklist.
**Addresses:** AI-assisted proposal drafting (table stake), section-by-section writing (table stake), rubric-optimized writing (differentiator), export to PDF (table stake), documents checklist (table stake)
**Avoids:** Pitfall 9 (Romanian output quality -- Romanian system prompts, diacritics post-processing), Pitfall 4 (Romanian diacritics in PDF -- custom font embedding)

### Phase 6: Admin Tooling and Automation
**Rationale:** Can proceed in parallel with Phase 5 after Phase 3 completes. Admin PDF extraction accelerates grant catalog population but is not blocking -- manual entry from Phase 2 is sufficient initially. Cron-based notifications require a live user base to be meaningful.
**Delivers:** Admin PDF extraction wizard (3-step: upload, AI extraction, human review), admin analytics dashboard, cron jobs (deadline reminders, abandoned draft nudges, analytics aggregation), email notification preferences.
**Addresses:** Admin grant onboarding (differentiator), deadline tracking and reminders (table stake), notification preferences
**Avoids:** Pitfall 5 (static cron compilation), Pitfall 13 (CRON_SECRET Bearer prefix), Pitfall 14 (duplicate cron events causing double emails)

### Phase Ordering Rationale

- **Dependency-driven:** The writer cannot exist without matching (needs rubric data), matching cannot exist without the data layer (needs company profiles and grant catalog), and everything needs the foundation (schema, auth, sessions). This chain is not negotiable.
- **Risk-front-loaded:** PDF validation and scraper testing happen in Phases 1-2. If `@react-pdf/renderer` fails on Vercel, the fallback path (client-side jspdf) is established before the writer is built. If government sites block scraping, the manual entry fallback is the primary path, not an afterthought.
- **Parallelizable after Phase 2:** Auth (Phase 4) and Matching (Phase 3) can proceed simultaneously once the data layer is in place. Admin (Phase 6) and Writer (Phase 5) can proceed simultaneously once matching is done. This creates two parallelization windows that compress the timeline.
- **User value escalation:** Phase 2 delivers the "magic moment" (IDNO lookup). Phase 3 delivers the first AI-powered feature (matching). Phase 5 delivers the core product (writer). Each phase builds on the previous one's value proposition.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Scraping):** Moldovan government site HTML structures are undocumented. Live testing against OpenMoney.md, idno.md, and srl.md is required to write Cheerio selectors. Character encoding (UTF-8 vs. Windows-1252) must be detected empirically.
- **Phase 3 (AI Matching):** Prompt engineering for Romanian grant matching is novel -- no existing examples. The scoring rubric format varies per grant agency and must be extracted and normalized. The boundary between SQL pre-filter and AI ranking needs tuning.
- **Phase 5 (AI Writer):** Romanian institutional grant writing tone is domain-specific. System prompts need native speaker input. Character limits for Romanian text (10-15% longer than English) need per-section calibration.

**Phases with standard patterns (skip deep research):**
- **Phase 1 (Foundation):** Supabase schema, RLS, proxy.ts, iron-session -- all have official documentation and established patterns. The only novel element is the PDF validation test.
- **Phase 4 (Auth):** Supabase Auth email/password flow is extensively documented. The merge function is custom but straightforward database logic (UPDATE ... SET user_id = ...).
- **Phase 6 (Cron/Email):** Vercel cron and Resend are well-documented with clear patterns. The PDF extraction wizard uses standard multimodal LLM prompting.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every technology validated against official docs and npm. Versions are current stable releases. All compatibility confirmed (React 19, Node 20.9+, AI SDK v6). |
| Features | HIGH | Feature landscape based on 12+ competitor analyses. Table stakes are clear. Differentiators are specific to the Moldovan market and not trivially replicable. |
| Architecture | HIGH | Server-first Next.js 16 with Supabase is a well-established pattern. Route groups, Server Actions, and AI SDK streaming have official documentation. |
| Pitfalls | HIGH | Critical pitfalls (RLS leak, AI SDK v6 breaks, PDF on Vercel) are confirmed by official docs, GitHub issues, and the project's own audit. |

**Overall confidence:** HIGH

### Gaps to Address

- **Romanian AI output quality:** No benchmark exists for Romanian grant writing AI quality. Must be validated empirically with native speakers during Phase 5. Cannot be fully assessed through research alone.
- **Moldovan registry site reliability:** scraping success rates for OpenMoney.md, idno.md, and srl.md are unknown until live testing. The 8-second timeout may be too aggressive. Character encoding is unverified.
- **@react-pdf/renderer on Vercel:** The React 19 reconciler bug may be fixed by the time development reaches Phase 5, or it may not. The Phase 1 validation test determines which PDF strategy to use. This is a binary decision that cannot be made in advance.
- **AI Gateway OIDC local development:** The 12-hour token expiry for `vercel env pull` creates developer friction. Using `vercel dev` is the workaround but adds a dependency on the Vercel CLI during development.
- **Supabase API key naming transition:** The `ANON_KEY`/`SERVICE_ROLE_KEY` to `PUBLISHABLE_KEY`/`SECRET_KEY` migration is ongoing. Both work, but documentation may be inconsistent. Use the new naming for a new project.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- framework version, proxy.ts, Turbopack
- [Next.js 16.2 Release Blog](https://nextjs.org/blog/next-16-2) -- latest stable, Cache Components
- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) -- all v5-to-v6 breaking changes
- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway) -- OIDC auth, gateway() function
- [Supabase SSR Client Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- two-client pattern, getClaims()
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- anonymous profile security
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs) -- static compilation, duplicate events, CRON_SECRET
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) -- domain whitelist pattern
- npm package pages for all version confirmations (supabase-js 2.99.3, ssr 0.9.0, ai 6.0.134, etc.)

### Secondary (MEDIUM confidence)
- [DevOps School: Top 10 Grant Management Software 2026](https://www.devopsschool.com/blog/top-10-grant-management-software-tools-in-2025-features-pros-cons-comparison/) -- competitor feature comparison
- [Grant Assistant: Best AI Grant Writing Tools](https://www.grantassistant.ai/resources/articles/the-best-ai-grant-writing-tools-for-nonprofits-in-2025) -- feature landscape
- [Fundsprout: Grant Discovery Platforms](https://www.fundsprout.ai/resources/grant-discovery-platforms) -- discovery platform patterns
- [MakerKit: Next.js App Router Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure) -- colocation pattern
- [react-pdf React 19 issues (#2966, #3223)](https://github.com/diegomura/react-pdf/issues/2966) -- PDF on Vercel failures
- [jspdf Unicode issues (#2093)](https://github.com/parallax/jsPDF/issues/2093) -- Romanian diacritics
- [Romanian LLM Performance Study (arXiv:2501.05601)](https://arxiv.org/abs/2501.05601) -- multilingual quality

### Tertiary (LOW confidence)
- Moldovan government site scraping behavior (OpenMoney.md, idno.md, srl.md) -- based on domain knowledge, not verified testing
- AI grant writing quality in Romanian -- no published benchmarks exist; requires empirical validation

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
