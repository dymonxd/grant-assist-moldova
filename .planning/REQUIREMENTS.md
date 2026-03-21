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

- [ ] **PROF-01**: User can enter 13-digit IDNO and get auto-populated company data from Moldovan registries
- [ ] **PROF-02**: User can describe business idea in free text and get AI-inferred company profile
- [ ] **PROF-03**: System scrapes OpenMoney.md, idno.md, srl.md in parallel with 8s timeouts and confidence-based merge
- [ ] **PROF-04**: Manual entry form appears when all data sources fail (company name, industry, location, legal form)
- [ ] **PROF-05**: Company profile stored with enriched_data JSONB, reused across all writer sections
- [ ] **PROF-06**: "Date partiale" indicator shown when some sources fail but others succeed

### Purchase Need (PURCH)

- [ ] **PURCH-01**: User can select purchase need via quick-select chips (top 4 visible, expandable)
- [ ] **PURCH-02**: User can type custom purchase need in free text field
- [ ] **PURCH-03**: Tapping a chip pre-fills the text field, user can add details

### Grant Matching (MATCH)

- [ ] **MATCH-01**: Rule-based SQL pre-filter eliminates clearly ineligible grants
- [ ] **MATCH-02**: AI ranking produces 0-100% match scores with one-paragraph Romanian explanations
- [ ] **MATCH-03**: Top recommendation displayed as hero card (name, provider, score, funding, deadline, explanation)
- [ ] **MATCH-04**: Below-threshold (<50%) matches show AI suggestions for becoming eligible
- [ ] **MATCH-05**: Each grant card has "Aplica acum" and "Salveaza" actions
- [ ] **MATCH-06**: Profile panel (sidebar desktop, collapsible mobile) shows company data with edit link
- [ ] **MATCH-07**: Share button generates `/results/{share_token}` link with 30-day expiry
- [ ] **MATCH-08**: Server-side ownership validation for profile access (auth check or cookie)

### Authentication (AUTH)

- [ ] **AUTH-01**: Account wall modal appears on "Aplica acum" click for unauthenticated users
- [ ] **AUTH-02**: User can sign up with name, email, phone
- [ ] **AUTH-03**: Notification checkbox on signup: "Doresc sa primesc notificari..."
- [ ] **AUTH-04**: "Continua fara cont" skip option allows writer access without account
- [ ] **AUTH-05**: Anonymous company profile linked to user on signup via DB merge function
- [ ] **AUTH-06**: Intended redirect URL preserved through signup flow (returns to grant writer)
- [ ] **AUTH-07**: Saved grants feature for authenticated users (bookmark grants)

### Grant Writer (WRITE)

- [ ] **WRITE-01**: Grant application fields load from grant_application_fields table
- [ ] **WRITE-02**: Auto-preview of Section 1 generated on first writer visit (grayed out, AI-only)
- [ ] **WRITE-03**: User writes brief answer, clicks "Genereaza cu AI", gets streaming Romanian text
- [ ] **WRITE-04**: AI asks ONE clarifying question when input is too vague (<20 chars)
- [ ] **WRITE-05**: AI uses company enriched_data + grant guidelines + scoring rubric in context
- [ ] **WRITE-06**: Inline scoring hints (collapsible) above each field showing rubric criteria
- [ ] **WRITE-07**: Character count displayed with server-side truncation and user warning
- [ ] **WRITE-08**: Buttons per section: Editeaza, Regenereaza, Salveaza, Urmatoarea
- [ ] **WRITE-09**: Progress bar showing "X din Y sectiuni completate"
- [ ] **WRITE-10**: Required documents checklist (checkable) at bottom of page
- [ ] **WRITE-11**: Grant summary with deadline countdown at top of page
- [ ] **WRITE-12**: Deadline check on page load: block if expired, warn if <3 days
- [ ] **WRITE-13**: Field snapshot saved at application creation (grant changes don't break in-progress apps)

### Export (EXPRT)

- [ ] **EXPRT-01**: "Copiaza tot" copies all sections to clipboard
- [ ] **EXPRT-02**: "Descarca PDF" generates and downloads PDF with all sections
- [ ] **EXPRT-03**: "Trimite pe email" sends formatted application via Resend
- [ ] **EXPRT-04**: Unauthenticated users see account modal for PDF/email (copy works without account)
- [ ] **EXPRT-05**: Deadline reminder opt-in: "Notifica-ma cu 7 zile si 3 zile inainte"
- [ ] **EXPRT-06**: Required documents checklist with completion status shown

### Grant Browse (BRWSE)

- [ ] **BRWSE-01**: Public `/grants/browse` page shows all active grants without auth
- [ ] **BRWSE-02**: Search grants by name
- [ ] **BRWSE-03**: Filter by provider agency, max funding range, deadline
- [ ] **BRWSE-04**: Grant card: name, provider, funding, deadline, short description, "Aplica" CTA

### Admin Analytics (ADMIN)

- [ ] **ADMIN-01**: `/admin` restricted to users with `profiles.is_admin = true`
- [ ] **ADMIN-02**: Analytics funnel pipeline view (Sessions → IDNO Entered → Grants Viewed → Account Created → Writer Started → Exported)
- [ ] **ADMIN-03**: Each funnel stage clickable with daily trend, device breakdown, top referrers
- [ ] **ADMIN-04**: Recent activity feed (last 50 events)
- [ ] **ADMIN-05**: Active applications list (user, grant, last activity, completion %)
- [ ] **ADMIN-06**: Stale applications (7+ days) with "Send reminder" button

### Admin Grants (AGRANT)

- [ ] **AGRANT-01**: Grant catalog table (name, provider, deadline, status, app count, last scraped, actions)
- [ ] **AGRANT-02**: Status badges: Draft (grey), Active (green), Expiring soon (orange), Expired (red)
- [ ] **AGRANT-03**: Inline deadline quick-edit
- [ ] **AGRANT-04**: Actions: Edit, Duplicate, Deactivate, Re-scrape, View applications
- [ ] **AGRANT-05**: Publish validation: minimum name, provider, deadline, 1 eligibility rule, 1 field
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
- [ ] **GEN-04**: Privacy policy page in Romanian
- [ ] **GEN-05**: Analytics event tracking at each funnel stage
- [ ] **GEN-06**: Notification preferences page (settings)

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
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| PROF-05 | Phase 2 | Pending |
| PROF-06 | Phase 2 | Pending |
| PURCH-01 | Phase 2 | Pending |
| PURCH-02 | Phase 2 | Pending |
| PURCH-03 | Phase 2 | Pending |
| BRWSE-01 | Phase 2 | Pending |
| BRWSE-02 | Phase 2 | Pending |
| BRWSE-03 | Phase 2 | Pending |
| BRWSE-04 | Phase 2 | Pending |
| MATCH-01 | Phase 3 | Pending |
| MATCH-02 | Phase 3 | Pending |
| MATCH-03 | Phase 3 | Pending |
| MATCH-04 | Phase 3 | Pending |
| MATCH-05 | Phase 3 | Pending |
| MATCH-06 | Phase 3 | Pending |
| MATCH-07 | Phase 3 | Pending |
| MATCH-08 | Phase 3 | Pending |
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 4 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| AUTH-05 | Phase 4 | Pending |
| AUTH-06 | Phase 4 | Pending |
| AUTH-07 | Phase 4 | Pending |
| GEN-04 | Phase 4 | Pending |
| WRITE-01 | Phase 5 | Pending |
| WRITE-02 | Phase 5 | Pending |
| WRITE-03 | Phase 5 | Pending |
| WRITE-04 | Phase 5 | Pending |
| WRITE-05 | Phase 5 | Pending |
| WRITE-06 | Phase 5 | Pending |
| WRITE-07 | Phase 5 | Pending |
| WRITE-08 | Phase 5 | Pending |
| WRITE-09 | Phase 5 | Pending |
| WRITE-10 | Phase 5 | Pending |
| WRITE-11 | Phase 5 | Pending |
| WRITE-12 | Phase 5 | Pending |
| WRITE-13 | Phase 5 | Pending |
| EXPRT-01 | Phase 5 | Pending |
| EXPRT-02 | Phase 5 | Pending |
| EXPRT-03 | Phase 5 | Pending |
| EXPRT-04 | Phase 5 | Pending |
| EXPRT-05 | Phase 5 | Pending |
| EXPRT-06 | Phase 5 | Pending |
| GEN-05 | Phase 5 | Pending |
| GEN-06 | Phase 5 | Pending |
| ADMIN-01 | Phase 6 | Pending |
| ADMIN-02 | Phase 6 | Pending |
| ADMIN-03 | Phase 6 | Pending |
| ADMIN-04 | Phase 6 | Pending |
| ADMIN-05 | Phase 6 | Pending |
| ADMIN-06 | Phase 6 | Pending |
| AGRANT-01 | Phase 6 | Pending |
| AGRANT-02 | Phase 6 | Pending |
| AGRANT-03 | Phase 6 | Pending |
| AGRANT-04 | Phase 6 | Pending |
| AGRANT-05 | Phase 6 | Pending |
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
