# GrantAssist Moldova

## What This Is

An AI-powered platform that helps Moldovan entrepreneurs discover government grants, check eligibility, and write commission-optimized grant applications. It combines company data aggregation from public Moldovan registries, intelligent rule-based + AI grant matching, and a section-by-section AI writing assistant that uses scoring rubrics to maximize approval chances. Romanian only. Includes admin tooling for grant catalog management, analytics funnel, and automated email notifications.

## Core Value

When a Moldovan entrepreneur enters their company ID (IDNO) or describes their business idea, the platform matches them to eligible grants and generates polished, rubric-optimized application text in Romanian — reducing days of research and writing to minutes.

## Requirements

### Validated

- ✓ Landing page with IDNO lookup and AI business idea inference — v1.0
- ✓ Company data aggregation from OpenMoney.md, idno.md, srl.md (parallel, confidence-based merge) — v1.0
- ✓ Manual entry fallback when all data sources fail — v1.0
- ✓ Purchase need selection (quick-select chips + free text) — v1.0
- ✓ Rule-based SQL pre-filter + AI-powered grant ranking with match scores — v1.0
- ✓ Grant match results with hero card, scored list, below-threshold suggestions — v1.0
- ✓ Shareable results links with 30-day expiry — v1.0
- ✓ Account wall modal (skippable) triggered on "Apply now" — v1.0
- ✓ Anonymous-to-authenticated profile merge on signup — v1.0
- ✓ Saved grants for authenticated users — v1.0
- ✓ AI grant writer with per-section streaming generation in Romanian — v1.0
- ✓ Scoring rubric hints inline, character limits, progress tracking — v1.0
- ✓ Export: copy all, PDF download (Geist Sans diacritics), email via Resend — v1.0
- ✓ Public grant browse/search/filter catalog (no auth) — v1.0
- ✓ Admin dashboard with analytics funnel pipeline view — v1.0
- ✓ Admin grant catalog CRUD with 3-step AI PDF extraction wizard — v1.0
- ✓ Notification log with filters and manual bulk send — v1.0
- ✓ Cron automation: deadline reminders, abandoned drafts, analytics aggregation — v1.0
- ✓ Email notifications via Resend with unsubscribe links — v1.0
- ✓ Privacy policy, notification preferences, mobile-responsive design — v1.0

### Active

(None — define for next milestone with `/gsd:new-milestone`)

### Out of Scope

- Financial spreadsheet assistant — v2, complex feature
- Browser-based form scraping (Firecrawl/Playwright) — v2, Vercel function size limits
- Landing page marketing sections (how it works, FAQ, testimonials) — v2
- Romanian + Russian language toggle — v2, based on user demand
- SMS notifications — v2
- Session replay (PostHog) — v2
- Saved grants without account (local storage sync) — v2
- Company ownership verification — v2
- Direct grant portal submission — liability risk, fragile government systems
- Full grant lifecycle management (post-award) — separate product
- Real-time collaboration / multi-user editing — minimal v1 value
- Mobile native app — web-first, mobile-responsive sufficient

## Context

Shipped v1.0 MVP with 19,547 LOC TypeScript across 250 files in 3 days.
Tech stack: Next.js 16 (App Router), Supabase (Postgres + Auth), AI SDK v6 + OpenAI gpt-5.4-nano, Tailwind v4 + shadcn/ui + Geist, Resend, Cheerio, @react-pdf/renderer.

**Known issues:**
- `NEXT_PUBLIC_SITE_URL` env var needed for email confirmation links in dev
- Moldovan registry scraper CSS selectors need live-testing refinement
- `sendApplicationEmail` has dead `_to` parameter (auth.getUser() fallback works)

## Constraints

- **Tech stack**: Next.js 16 (App Router), Supabase (Postgres + Auth + Storage), AI SDK v6, Tailwind + shadcn/ui + Geist, Resend, Cheerio
- **Language**: Romanian only — all UI and AI output
- **Auth**: Supabase Auth with anonymous-to-authenticated flow via DB merge function
- **AI**: @ai-sdk/openai with gpt-5.4-nano (switched from AI Gateway due to billing requirement)
- **Security**: RLS on all tables, SSRF domain whitelist for scraping, CRON_SECRET validation
- **Deployment**: Vercel with cron jobs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Neon + Clerk | DB + Auth + Storage in one platform, simpler integration | ✓ Good — single platform reduced integration complexity significantly |
| Cheerio over Playwright for scraping | Vercel function size limits (250MB), static HTML sufficient for gov sites | ✓ Good — lightweight, but CSS selectors need live refinement |
| iron-session for anonymous cookies | Need encrypted HTTP-only cookies, lightweight solution | ✓ Good — seamless anonymous tracking |
| Service role for anonymous profiles | RLS auth.uid() is NULL for anon → would leak all unclaimed profiles | ✓ Good — prevented critical data leak |
| LLM multimodal PDF reading over pdf-parse | pdf-parse abandoned since 2021, LLM handles extraction more accurately | ✓ Good — AI extraction works well for grant PDFs |
| proxy.ts for auth (Next.js 16) | Replaces middleware.ts, runs on Node.js, handles session refresh | ✓ Good — clean separation of auth concerns |
| @react-pdf/renderer with Geist Sans | Server-side PDF with custom font for Romanian diacritics | ✓ Good — Font.register resolved ă/ș/ț rendering |
| @ai-sdk/openai over AI Gateway | AI Gateway required credit card for billing, direct provider simpler for MVP | ⚠️ Revisit — switch to AI Gateway when billing configured |
| 6-phase dependency-driven architecture | Research-backed, each phase delivers verifiable capability | ✓ Good — clean dependencies, parallel execution possible |

---
*Last updated: 2026-03-23 after v1.0 milestone*
