# Roadmap: GrantAssist Moldova

## Overview

GrantAssist Moldova delivers an AI-powered grant discovery and application platform for Moldovan entrepreneurs in six dependency-driven phases. The critical path runs Foundation (schema, auth plumbing, PDF validation) to Data Layer (scrapers, company profiles, grant catalog) to Grant Matching (SQL pre-filter + AI ranking) to AI Writer and Export (section-by-section rubric-optimized writing). Authentication can proceed in parallel with Matching after Phase 2. Admin tooling and automation can proceed in parallel with the Writer after Phase 3. Each phase delivers a coherent, verifiable capability that builds on the previous one's value.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Validation** - Supabase schema with RLS, auth plumbing, session infrastructure, PDF validation, project scaffolding (completed 2026-03-21)
- [x] **Phase 2: Data Layer and Company Profiles** - Company data scraping, profile management, purchase need selection, public grant browse catalog (completed 2026-03-21)
- [x] **Phase 3: Grant Matching** - SQL pre-filter, AI ranking with match scores, results UI, shareable links (completed 2026-03-21)
- [x] **Phase 4: Authentication and Profile Merge** - Account wall, signup flow, anonymous-to-authenticated merge, saved grants (completed 2026-03-21)
- [ ] **Phase 5: AI Grant Writer and Export** - Section-by-section AI writing, rubric optimization, progress tracking, PDF/copy/email export
- [ ] **Phase 6: Admin Tooling and Automation** - Admin dashboard, grant CRUD with PDF extraction wizard, cron jobs, email notifications

## Phase Details

### Phase 1: Foundation and Validation
**Goal**: The platform infrastructure is deployed and verified -- database schema enforces security from day one, authentication plumbing works end-to-end, anonymous sessions are tracked securely, and the PDF generation strategy is validated on Vercel before any feature code depends on it.
**Depends on**: Nothing (first phase)
**Requirements**: FNDTN-01, FNDTN-02, FNDTN-03, FNDTN-04, FNDTN-05, FNDTN-06, FNDTN-07, GEN-01, GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. Next.js 16 app with Tailwind, shadcn/ui, and Geist fonts loads in browser with Romanian UI shell and mobile-responsive layout at 375px
  2. Supabase database has all 11 tables with RLS policies active -- unauthenticated queries to protected tables return zero rows (not all rows)
  3. proxy.ts refreshes Supabase sessions on every request and redirects unauthenticated users from /admin to login
  4. Anonymous user visiting the site gets an encrypted iron-session cookie that persists across page navigations
  5. A test PDF route deployed to Vercel either generates a PDF with Romanian diacritics successfully, or the fallback strategy (jspdf) is confirmed and documented
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding with Next.js 16, Tailwind v4, shadcn/ui, Geist + Supabase schema with 10 tables and RLS
- [x] 01-02-PLAN.md -- Auth plumbing: Supabase clients, proxy.ts, iron-session, auth callback
- [x] 01-03-PLAN.md -- PDF generation validation on Vercel (react-pdf vs jspdf decision)

### Phase 2: Data Layer and Company Profiles
**Goal**: Users can enter their IDNO or describe their business idea and get a populated company profile, select what they want to purchase, and browse the full grant catalog -- the "magic moment" where company data appears automatically from public registries.
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PURCH-01, PURCH-02, PURCH-03, BRWSE-01, BRWSE-02, BRWSE-03, BRWSE-04
**Success Criteria** (what must be TRUE):
  1. User enters a valid 13-digit IDNO on the landing page and sees auto-populated company data (name, industry, location) within seconds, with a "Date partiale" indicator if some sources failed
  2. User describes a business idea in free text and gets an AI-inferred company profile with industry, size, and location fields populated
  3. User who gets zero data from all three registries sees a manual entry form and can fill in company details by hand
  4. User can select a purchase need via quick-select chips or type a custom need, with chips pre-filling the text field
  5. User can visit /grants/browse without logging in and search, filter (by provider, funding, deadline), and see grant cards with name, provider, funding, deadline, and description
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md -- Vitest setup, shared types, IDNO validation, three Cheerio scrapers, aggregate orchestrator with confidence merge
- [x] 02-02-PLAN.md -- AI inference module, Server Actions (lookupCompany, inferFromIdea, saveManualProfile, savePurchaseNeed)
- [x] 02-03-PLAN.md -- Landing page UI: IDNO form, idea form, profile result, manual fallback, purchase chips, step flow
- [x] 02-04-PLAN.md -- Public grant browse page with search, filters, and grant cards

### Phase 3: Grant Matching
**Goal**: Users receive personalized grant recommendations ranked by AI with match scores, explanations, and strategic advice -- the primary conversion point where users see the value of the platform and decide to apply.
**Depends on**: Phase 2
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05, MATCH-06, MATCH-07, MATCH-08
**Success Criteria** (what must be TRUE):
  1. After profile completion, user sees a ranked list of matching grants with 0-100% match scores and one-paragraph Romanian explanations for each
  2. The top recommendation appears as a hero card showing grant name, provider, score, funding amount, deadline, and AI explanation
  3. Grants below 50% match threshold show AI suggestions for what the user could change to become eligible
  4. User can click "Share" and get a /results/{token} link that anyone can view for 30 days without authentication
  5. User sees their company profile in a sidebar (desktop) or collapsible panel (mobile) with an edit link, and each grant card has "Aplica acum" and "Salveaza" action buttons
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md -- Matching types, rule-based pre-filter, AI ranking with structured output, matchGrants server action
- [x] 03-02-PLAN.md -- Results UI components with TDD (hero card, match card, profile sidebar, score badge, match list, results layout)
- [x] 03-03-PLAN.md -- Results pages, share action, landing flow redirect
- [x] 03-04-PLAN.md -- End-to-end verification checkpoint: full flow test and human visual review

### Phase 4: Authentication and Profile Merge
**Goal**: Users can create accounts and have their anonymous work preserved seamlessly -- the zero-friction-to-commitment transition where signing up feels like gaining features, not losing progress.
**Depends on**: Phase 2 (can proceed in parallel with Phase 3)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, GEN-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Aplica acum" on a grant card as an unauthenticated user shows an account wall modal with signup (name, email, phone), notification opt-in checkbox, and a "Continua fara cont" skip option
  2. After signing up, the user's previously created anonymous company profile and matched grants are linked to their new account -- no data is lost
  3. User who signs up from the grant writer is redirected back to the exact grant writer page they came from (not the homepage)
  4. Authenticated user can save/bookmark grants and see them in a saved grants list
  5. Privacy policy page is accessible in Romanian at /privacy
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md -- shadcn component install + auth server actions (signup with profile merge, signIn, signOut) + saved grants server actions
- [x] 04-02-PLAN.md -- Account wall modal, signup form, save button, auth-aware grant card wiring
- [x] 04-03-PLAN.md -- Privacy policy page in Romanian at /privacy

### Phase 5: AI Grant Writer and Export
**Goal**: Users can write complete, rubric-optimized grant applications section by section with AI assistance in Romanian, and export their finished applications as PDF, clipboard copy, or email -- the core value delivery where days of grant writing become minutes.
**Depends on**: Phase 3, Phase 4
**Requirements**: WRITE-01, WRITE-02, WRITE-03, WRITE-04, WRITE-05, WRITE-06, WRITE-07, WRITE-08, WRITE-09, WRITE-10, WRITE-11, WRITE-12, WRITE-13, EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04, EXPRT-05, EXPRT-06, GEN-05, GEN-06
**Success Criteria** (what must be TRUE):
  1. On first visit to the grant writer, Section 1 auto-previews with AI-generated grayed-out text; user can write a brief answer in any section, click "Genereaza cu AI", and see streaming Romanian text that incorporates company data and scoring rubric criteria
  2. When user input is too vague (under 20 characters), the AI asks ONE clarifying question before generating; scoring rubric hints are visible (collapsible) above each field showing what the commission evaluates
  3. Each section shows character count with warning near limits, and has Editeaza/Regenereaza/Salveaza/Urmatoarea buttons; progress bar shows "X din Y sectiuni completate" with a required documents checklist at the bottom
  4. Grant writer page checks deadline on load -- blocks access if the grant is expired, warns if deadline is less than 3 days away; grant summary with deadline countdown is visible at the top
  5. User can copy all sections to clipboard, download a PDF with Romanian diacritics rendered correctly, or send the application via email; unauthenticated users see the account modal for PDF/email (copy works without account); user can opt in to deadline reminders
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md -- Writer server actions (application CRUD, section save, deadline check) and AI streaming Route Handler with rubric-optimized prompts
- [ ] 05-02-PLAN.md -- Writer page UI: section editor with streaming, progress bar, scoring hints, document checklist, grant header
- [ ] 05-03-PLAN.md -- Export: PDF with Geist Sans diacritics, clipboard copy, email via Resend, auth gating, deadline reminder opt-in
- [ ] 05-04-PLAN.md -- Settings page for notification preferences and analytics event tracking at funnel stages

### Phase 6: Admin Tooling and Automation
**Goal**: Administrators can manage the grant catalog efficiently with AI-assisted PDF extraction, monitor platform usage through an analytics funnel, and the system automatically sends deadline reminders and re-engagement emails -- the operational backbone that keeps the platform running.
**Depends on**: Phase 3 (can proceed in parallel with Phase 5)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, AGRANT-01, AGRANT-02, AGRANT-03, AGRANT-04, AGRANT-05, AGRANT-06, AGRANT-07, AGRANT-08, AGRANT-09, AGRANT-10, ANOTIF-01, ANOTIF-02, ANOTIF-03, AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07
**Success Criteria** (what must be TRUE):
  1. Admin user at /admin sees an analytics funnel (Sessions to IDNO Entered to Grants Viewed to Account Created to Writer Started to Exported) with clickable stages showing daily trends, device breakdown, and top referrers; recent activity feed and active/stale application lists are visible
  2. Admin can manage grants via a catalog table with status badges (Draft/Active/Expiring/Expired), inline deadline editing, and actions (Edit, Duplicate, Deactivate, Re-scrape, View applications); publish validation prevents incomplete grants from going live
  3. Admin can onboard a new grant via a 3-step wizard: enter basic info, upload PDF (max 20MB) for AI extraction of eligibility rules, scoring rubric, application fields, and required documents, then review and publish; publishing triggers notification to matching existing profiles
  4. Admin can view notification logs filtered by type (deadline, abandoned draft, grant expiring, new match) and manually bulk-send notifications with confirmation preview
  5. Cron jobs run daily: deadline reminders at 7 and 3 days, abandoned draft nudges at 7 days inactivity, nightly analytics aggregation; all cron routes validate CRON_SECRET, prevent duplicate sends, respect user notification preferences, and include one-click unsubscribe links in every email
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD
- [ ] 06-04: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6
Note: Phase 4 can proceed in parallel with Phase 3 (both depend on Phase 2). Phase 6 can proceed in parallel with Phase 5 (both depend on Phase 3).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Validation | 3/3 | Complete   | 2026-03-21 |
| 2. Data Layer and Company Profiles | 4/4 | Complete | 2026-03-21 |
| 3. Grant Matching | 4/4 | Complete | 2026-03-21 |
| 4. Authentication and Profile Merge | 3/3 | Complete | 2026-03-21 |
| 5. AI Grant Writer and Export | 0/4 | Planned | - |
| 6. Admin Tooling and Automation | 0/4 | Not started | - |
