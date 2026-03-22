# Requirements: GrantAssist Moldova

**Defined:** 2026-03-21
**Core Value:** When a Moldovan entrepreneur enters their IDNO or describes their business idea, the platform matches them to eligible grants and generates polished, rubric-optimized application text in Romanian.

## v1 Requirements

### Foundation (FNDTN)

- [x] **FNDTN-01**: Project scaffolded with Next.js 16, Tailwind CSS, shadcn/ui, Geist fonts, and all dependencies
- [x] **FNDTN-02**: Supabase schema deployed with 11 tables, RLS policies on all tables, indexes, triggers, and functions
- [x] **FNDTN-03**: proxy.ts refreshes Supabase sessions and protects `/admin` routes
- [x] **FNDTN-04**: Supabase client utilities (browser, server, admin service role) available
- [x] **FNDTN-05**: iron-session encrypted HTTP-only cookies for anonymous profile tracking
- [x] **FNDTN-06**: Auth callback route handles email confirmation and redirects
- [x] **FNDTN-07**: PDF generation validated on Vercel (react-pdf or jspdf fallback determined)

### Company Profile (PROF)

- [x] **PROF-01**: User can enter 13-digit IDNO and get auto-populated company data from Moldovan registries
- [x] **PROF-02**: User can describe business idea in free text and get AI-inferred company profile
- [x] **PROF-03**: System scrapes OpenMoney.md, idno.md, srl.md in parallel with 8s timeouts and confidence-based merge
- [x] **PROF-04**: Manual entry form appears when all data sources fail (company name, industry, location, legal form)
- [x] **PROF-05**: Company profile stored with enriched_data JSONB, reused across all writer sections
- [x] **PROF-06**: "Date partiale" indicator shown when some sources fail but others succeed

### Purchase Need (PURCH)

- [x] **PURCH-01**: User can select purchase need via quick-select chips (top 4 visible, expandable)
- [x] **PURCH-02**: User can type custom purchase need in free text field
- [x] **PURCH-03**: Tapping a chip pre-fills the text field, user can add details

### Grant Matching (MATCH)

- [x] **MATCH-01**: Rule-based SQL pre-filter eliminates clearly ineligible grants
- [x] **MATCH-02**: AI ranking produces 0-100% match scores with one-paragraph Romanian explanations
- [x] **MATCH-03**: Top recommendation displayed as hero card (name, provider, score, funding, deadline, explanation)
- [x] **MATCH-04**: Below-threshold (<50%) matches show AI suggestions for becoming eligible
- [x] **MATCH-05**: Each grant card has "Aplica acum" and "Salveaza" actions
- [x] **MATCH-06**: Profile panel (sidebar desktop, collapsible mobile) shows company data with edit link
- [x] **MATCH-07**: Share button generates `/results/{share_token}` link with 30-day expiry
- [x] **MATCH-08**: Server-side ownership validation for profile access (auth check or cookie)

### Authentication (AUTH)

- [x] **AUTH-01**: Account wall modal appears on "Aplica acum" click for unauthenticated users
- [x] **AUTH-02**: User can sign up with name, email, phone
- [x] **AUTH-03**: Notification checkbox on signup: "Doresc sa primesc notificari..."
- [x] **AUTH-04**: "Continua fara cont" skip option allows writer access without account
- [x] **AUTH-05**: Anonymous company profile linked to user on signup via DB merge function
- [x] **AUTH-06**: Intended redirect URL preserved through signup flow (returns to grant writer)
- [x] **AUTH-07**: Saved grants feature for authenticated users (bookmark grants)

### Grant Writer (WRITE)

- [x] **WRITE-01**: Grant application fields load from grant_application_fields table
- [x] **WRITE-02**: Auto-preview of Section 1 generated on first writer visit (grayed out, AI-only)
- [x] **WRITE-03**: User writes brief answer, clicks "Genereaza cu AI", gets streaming Romanian text
- [x] **WRITE-04**: AI asks ONE clarifying question when input is too vague (<20 chars)
- [x] **WRITE-05**: AI uses company enriched_data + grant guidelines + scoring rubric in context
- [x] **WRITE-06**: Inline scoring hints (collapsible) above each field showing rubric criteria
- [x] **WRITE-07**: Character count displayed with server-side truncation and user warning
- [x] **WRITE-08**: Buttons per section: Editeaza, Regenereaza, Salveaza, Urmatoarea
- [x] **WRITE-09**: Progress bar showing "X din Y sectiuni completate"
- [x] **WRITE-10**: Required documents checklist (checkable) at bottom of page
- [x] **WRITE-11**: Grant summary with deadline countdown at top of page
- [x] **WRITE-12**: Deadline check on page load: block if expired, warn if <3 days
- [x] **WRITE-13**: Field snapshot saved at application creation (grant changes don't break in-progress apps)

### Export (EXPRT)

- [x] **EXPRT-01**: "Copiaza tot" copies all sections to clipboard
- [x] **EXPRT-02**: "Descarca PDF" generates and downloads PDF with all sections
- [x] **EXPRT-03**: "Trimite pe email" sends formatted application via Resend
- [x] **EXPRT-04**: Unauthenticated users see account modal for PDF/email (copy works without account)
- [x] **EXPRT-05**: Deadline reminder opt-in: "Notifica-ma cu 7 zile si 3 zile inainte"
- [x] **EXPRT-06**: Required documents checklist with completion status shown

### Grant Browse (BRWSE)

- [x] **BRWSE-01**: Public `/grants/browse` page shows all active grants without auth
- [x] **BRWSE-02**: Search grants by name
- [x] **BRWSE-03**: Filter by provider agency, max funding range, deadline
- [x] **BRWSE-04**: Grant card: name, provider, funding, deadline, short description, "Aplica" CTA

### Admin Analytics (ADMIN)

- [x] **ADMIN-01**: `/admin` restricted to users with `profiles.is_admin = true`
- [x] **ADMIN-02**: Analytics funnel pipeline view (Sessions → IDNO Entered → Grants Viewed → Account Created → Writer Started → Exported)
- [x] **ADMIN-03**: Each funnel stage clickable with daily trend, device breakdown, top referrers
- [x] **ADMIN-04**: Recent activity feed (last 50 events)
- [x] **ADMIN-05**: Active applications list (user, grant, last activity, completion %)
- [x] **ADMIN-06**: Stale applications (7+ days) with "Send reminder" button

### Admin Grants (AGRANT)

- [x] **AGRANT-01**: Grant catalog table (name, provider, deadline, status, app count, last scraped, actions)
- [x] **AGRANT-02**: Status badges: Draft (grey), Active (green), Expiring soon (orange), Expired (red)
- [x] **AGRANT-03**: Inline deadline quick-edit
- [x] **AGRANT-04**: Actions: Edit, Duplicate, Deactivate, Re-scrape, View applications
- [x] **AGRANT-05**: Publish validation: minimum name, provider, deadline, 1 eligibility rule, 1 field
- [ ] **AGRANT-06**: 3-step grant onboarding wizard (basic info → AI extraction → review/publish)
- [ ] **AGRANT-07**: PDF upload with MIME validation (application/pdf, max 20MB)
- [ ] **AGRANT-08**: AI extraction: eligibility rules, scoring rubric, application fields, required documents
- [ ] **AGRANT-09**: Form URL scraping with SSRF domain whitelist protection
- [ ] **AGRANT-10**: On publish: trigger new grant match notification to existing profiles

### Admin Notifications (ANOTIF)

- [ ] **ANOTIF-01**: Notification log view (user, grant, type, channel, sent date)
- [ ] **ANOTIF-02**: Filters by type: deadline reminder, abandoned draft, grant expiring, new grant match
- [ ] **ANOTIF-03**: Manual bulk send with confirmation preview ("This will send X emails. Preview → Confirm")

### Automation (AUTO)

- [ ] **AUTO-01**: Cron: deadline reminders at 7 and 3 days before deadline (daily 9:00 UTC)
- [ ] **AUTO-02**: Cron: abandoned draft nudge after 7 days inactivity (daily 10:00 UTC)
- [ ] **AUTO-03**: Cron: nightly analytics aggregation (2:00 UTC)
- [ ] **AUTO-04**: CRON_SECRET Bearer token validation on all cron routes
- [ ] **AUTO-05**: Duplicate notification prevention via notifications_log
- [ ] **AUTO-06**: Respect `profiles.email_notifications` before sending
- [ ] **AUTO-07**: Every email includes one-click unsubscribe link

### General (GEN)

- [x] **GEN-01**: All UI and AI output in Romanian using simple everyday language
- [x] **GEN-02**: Mobile-responsive design at 375px (mobile-first)
- [x] **GEN-03**: Loading, error, and empty states for every interactive screen
- [x] **GEN-04**: Privacy policy page in Romanian
- [x] **GEN-05**: Analytics event tracking at each funnel stage
- [x] **GEN-06**: Notification preferences page (settings)

## v2 Requirements

### Financial Tools
- **FIN-01**: Financial spreadsheet assistant for budget projections
- **FIN-02**: Excel template auto-fill from accountant data

### Language
- **LANG-01**: Romanian + Russian language toggle
- **LANG-02**: English interface option

### Advanced Features
- **ADV-01**: Browser-based form scraping via Firecrawl for JS-heavy forms
- **ADV-02**: Landing page marketing sections (how it works, FAQ, testimonials)
- **ADV-03**: SMS notifications via Twilio/Supabase
- **ADV-04**: Session replay (PostHog)
- **ADV-05**: Saved grants without account (localStorage sync)
- **ADV-06**: Company ownership verification

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct grant portal submission | Liability risk, fragile government systems, each agency has own portal |
| Full grant lifecycle management (post-award) | Separate product for separate market (grantmakers, not entrepreneurs) |
| Real-time collaboration / multi-user editing | Enormous complexity for minimal v1 value (individual entrepreneurs, not teams) |
| Funder CRM / relationship tracking | Serves professional grant writers, not Moldovan SME owners applying to 1-3 grants |
| Document upload / storage | Checklist sufficient; storage adds cost and security concerns |
| AI-generated entire proposal in one click | Produces generic low-quality output; section-by-section is better quality |
| OAuth login (Google, GitHub) | Email/password sufficient for Moldovan market |
| Mobile native app | Web-first, mobile-responsive is sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDTN-01 | Phase 1 | Complete |
| FNDTN-02 | Phase 1 | Complete |
| FNDTN-03 | Phase 1 | Complete |
| FNDTN-04 | Phase 1 | Complete |
| FNDTN-05 | Phase 1 | Complete |
| FNDTN-06 | Phase 1 | Complete |
| FNDTN-07 | Phase 1 | Complete |
| GEN-01 | Phase 1 | Complete |
| GEN-02 | Phase 1 | Complete |
| GEN-03 | Phase 1 | Complete |
| PROF-01 | Phase 2 | Complete |
| PROF-02 | Phase 2 | Complete |
| PROF-03 | Phase 2 | Complete |
| PROF-04 | Phase 2 | Complete |
| PROF-05 | Phase 2 | Complete |
| PROF-06 | Phase 2 | Complete |
| PURCH-01 | Phase 2 | Complete |
| PURCH-02 | Phase 2 | Complete |
| PURCH-03 | Phase 2 | Complete |
| BRWSE-01 | Phase 2 | Complete |
| BRWSE-02 | Phase 2 | Complete |
| BRWSE-03 | Phase 2 | Complete |
| BRWSE-04 | Phase 2 | Complete |
| MATCH-01 | Phase 3 | Complete |
| MATCH-02 | Phase 3 | Complete |
| MATCH-03 | Phase 3 | Complete |
| MATCH-04 | Phase 3 | Complete |
| MATCH-05 | Phase 3 | Complete |
| MATCH-06 | Phase 3 | Complete |
| MATCH-07 | Phase 3 | Complete |
| MATCH-08 | Phase 3 | Complete |
| AUTH-01 | Phase 4 | Complete |
| AUTH-02 | Phase 4 | Complete |
| AUTH-03 | Phase 4 | Complete |
| AUTH-04 | Phase 4 | Complete |
| AUTH-05 | Phase 4 | Complete |
| AUTH-06 | Phase 4 | Complete |
| AUTH-07 | Phase 4 | Complete |
| GEN-04 | Phase 4 | Complete |
| WRITE-01 | Phase 5 | Complete |
| WRITE-02 | Phase 5 | Complete |
| WRITE-03 | Phase 5 | Complete |
| WRITE-04 | Phase 5 | Complete |
| WRITE-05 | Phase 5 | Complete |
| WRITE-06 | Phase 5 | Complete |
| WRITE-07 | Phase 5 | Complete |
| WRITE-08 | Phase 5 | Complete |
| WRITE-09 | Phase 5 | Complete |
| WRITE-10 | Phase 5 | Complete |
| WRITE-11 | Phase 5 | Complete |
| WRITE-12 | Phase 5 | Complete |
| WRITE-13 | Phase 5 | Complete |
| EXPRT-01 | Phase 5 | Complete |
| EXPRT-02 | Phase 5 | Complete |
| EXPRT-03 | Phase 5 | Complete |
| EXPRT-04 | Phase 5 | Complete |
| EXPRT-05 | Phase 5 | Complete |
| EXPRT-06 | Phase 5 | Complete |
| GEN-05 | Phase 5 | Complete |
| GEN-06 | Phase 5 | Complete |
| ADMIN-01 | Phase 6 | Complete |
| ADMIN-02 | Phase 6 | Complete |
| ADMIN-03 | Phase 6 | Complete |
| ADMIN-04 | Phase 6 | Complete |
| ADMIN-05 | Phase 6 | Complete |
| ADMIN-06 | Phase 6 | Complete |
| AGRANT-01 | Phase 6 | Complete |
| AGRANT-02 | Phase 6 | Complete |
| AGRANT-03 | Phase 6 | Complete |
| AGRANT-04 | Phase 6 | Complete |
| AGRANT-05 | Phase 6 | Complete |
| AGRANT-06 | Phase 6 | Pending |
| AGRANT-07 | Phase 6 | Pending |
| AGRANT-08 | Phase 6 | Pending |
| AGRANT-09 | Phase 6 | Pending |
| AGRANT-10 | Phase 6 | Pending |
| ANOTIF-01 | Phase 6 | Pending |
| ANOTIF-02 | Phase 6 | Pending |
| ANOTIF-03 | Phase 6 | Pending |
| AUTO-01 | Phase 6 | Pending |
| AUTO-02 | Phase 6 | Pending |
| AUTO-03 | Phase 6 | Pending |
| AUTO-04 | Phase 6 | Pending |
| AUTO-05 | Phase 6 | Pending |
| AUTO-06 | Phase 6 | Pending |
| AUTO-07 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 86 total
- Mapped to phases: 86
- Unmapped: 0

| Phase | Requirement Count |
|-------|-------------------|
| Phase 1: Foundation and Validation | 10 |
| Phase 2: Data Layer and Company Profiles | 13 |
| Phase 3: Grant Matching | 8 |
| Phase 4: Authentication and Profile Merge | 8 |
| Phase 5: AI Grant Writer and Export | 21 |
| Phase 6: Admin Tooling and Automation | 26 |
| **Total** | **86** |

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
