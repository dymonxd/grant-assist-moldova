# GrantAssist Moldova

## What This Is

An AI-powered platform that helps Moldovan entrepreneurs discover government grants, check eligibility, and write commission-optimized grant applications. It combines company data aggregation from public Moldovan registries, intelligent rule-based + AI grant matching, and a section-by-section AI writing assistant that uses scoring rubrics to maximize approval chances. Romanian only.

## Core Value

When a Moldovan entrepreneur enters their company ID (IDNO) or describes their business idea, the platform matches them to eligible grants and generates polished, rubric-optimized application text in Romanian — reducing days of research and writing to minutes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Landing page with single unified input (IDNO or business idea)
- [ ] Company data aggregation from OpenMoney.md, idno.md, srl.md (parallel, confidence-based merge)
- [ ] Manual entry fallback when all data sources fail
- [ ] AI inference of company profile from free-text business ideas
- [ ] Purchase need selection (quick-select chips + free text)
- [ ] Rule-based SQL pre-filter + AI-powered grant ranking with match scores
- [ ] Grant match results with hero card, scored list, below-threshold suggestions
- [ ] Shareable results links with 30-day expiry
- [ ] Account wall modal (skippable) triggered on "Apply now"
- [ ] Anonymous-to-authenticated profile merge on signup
- [ ] Saved grants for authenticated users
- [ ] AI grant writer with per-section streaming generation in Romanian
- [ ] Auto-preview of Section 1 on first writer visit
- [ ] Clarifying question when user input is too vague (<20 chars)
- [ ] Character limit enforcement (client warning + server truncation)
- [ ] Scoring rubric hints inline above each field
- [ ] Required documents checklist (checkable)
- [ ] Section progress tracking (X of Y complete)
- [ ] Grant deadline check on writer page load (block expired, warn <3 days)
- [ ] Export: copy all, PDF download, email via Resend
- [ ] Public grant browse/search/filter catalog (no auth)
- [ ] Admin dashboard: analytics funnel with pipeline view
- [ ] Admin: grant catalog CRUD with inline editing, status badges
- [ ] Admin: 3-step grant onboarding wizard (info → AI extraction from PDF → review/publish)
- [ ] Admin: notification log with filters
- [ ] Cron: deadline reminders (7 and 3 days before)
- [ ] Cron: abandoned draft nudge (7 days inactivity)
- [ ] Cron: nightly analytics aggregation
- [ ] Email notifications via Resend with unsubscribe links
- [ ] Privacy policy page (Romanian)
- [ ] Notification preferences (settings page)

### Out of Scope

- Financial spreadsheet assistant — v2, complex feature
- Browser-based form scraping (Firecrawl/Playwright) — v2, Vercel function size limits
- Landing page marketing sections (how it works, FAQ, testimonials) — v2
- Romanian + Russian language toggle — v2, based on user demand
- SMS notifications — v2
- Session replay (PostHog) — v2
- Saved grants without account (local storage sync) — v2
- Company ownership verification — v2

## Context

**Target market:** Moldovan entrepreneurs — small/medium businesses seeking government and EU funding. 50+ active grant programs from agencies like ODA, AIPA, IFAD, EU4Moldova.

**Data sources:** None of the three primary sources (OpenMoney.md, idno.md, srl.md) expose public REST APIs. All require Cheerio web scraping with 8-second per-source timeouts. OpenSanctions is optional (API key, disabled by default).

**Key differentiators:**
- AI advises strategic adjustments to become eligible (not just match/no match)
- AI writes to impress the grant commission using the actual scoring rubric
- Company data aggregated automatically from multiple public sources
- Zero friction to start — no account needed until applying

**Design language:** Clean institutional with warm approachable touches. Not government-looking. Zinc/neutral base, single warm accent. Geist Sans for UI, Geist Mono for IDs/data. Mobile-first. Romanian copy uses simple everyday language, not bureaucratic.

**Triple-check audit findings (applied to plan):**
1. Anonymous profile RLS data leak — use service role client, not anon RLS
2. Cookie encryption via iron-session for anonymous profiles
3. Cron routes must export GET (Vercel sends GET)
4. Idea-based AI inference call for free-text input
5. Writer clarifying questions use same stream protocol
6. Auth redirect URL preserved through signup flow
7. Deadline check on writer page load
8. Email unsubscribe + notification preference checking
9. IDNO race condition handled with ON CONFLICT
10. @react-pdf/renderer tested early with client-side fallback

## Constraints

- **Tech stack**: Next.js 16 (App Router), Supabase (Postgres + Auth + Storage), AI SDK v6 + AI Gateway (OIDC), Tailwind + shadcn/ui + Geist, Resend, Cheerio
- **Language**: Romanian only — all UI and AI output
- **Auth**: Supabase Auth with anonymous-to-authenticated flow via DB merge function
- **AI**: AI Gateway with OIDC — no direct provider SDKs, model: 'anthropic/claude-sonnet-4.6'
- **Security**: RLS on all tables from day one, SSRF domain whitelist for scraping, CRON_SECRET validation
- **Deployment**: Vercel with cron jobs
- **No**: playwright-core (250MB limit), pdf-parse (abandoned), @upstash/ratelimit (Vercel Firewall handles it)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Neon + Clerk | DB + Auth + Storage in one platform, simpler integration | — Pending |
| AI Gateway OIDC over direct API keys | No secrets to manage, auto-provisioned via vercel env pull | — Pending |
| Cheerio over Playwright for scraping | Vercel function size limits (250MB), static HTML sufficient for gov sites | — Pending |
| iron-session for anonymous cookies | Need encrypted HTTP-only cookies, lightweight solution | — Pending |
| Service role for anonymous profiles | RLS auth.uid() is NULL for anon → would leak all unclaimed profiles | — Pending |
| LLM multimodal PDF reading over pdf-parse | pdf-parse abandoned since 2021, LLM handles extraction more accurately | — Pending |
| Single cron route with ?type= param | Simpler than 3 separate routes, same auth logic | — Pending |
| proxy.ts for auth (Next.js 16) | Replaces middleware.ts, runs on Node.js, handles session refresh | — Pending |
| @react-pdf/renderer with jspdf fallback | Server-side PDF preferred, but may fail on Vercel serverless | — Pending |

---
*Last updated: 2026-03-21 after initialization*
