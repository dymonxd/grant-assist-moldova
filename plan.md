# GrantAssist Moldova - Final Design Document

**Date:** 2026-03-21
**Status:** Ready for implementation

---

## 1. Project Summary

**GrantAssist Moldova** is an AI-powered platform that helps Moldovan entrepreneurs discover and apply for government grants. It bridges the gap between available funding opportunities and eligible applicants by combining company data aggregation, intelligent grant matching, and AI-assisted application writing.

### The Problem

1. **Information overload** - 50+ active grant programs from various agencies (ODA, AIPA, IFAD, EU4Moldova, etc.)
2. **Eligibility confusion** - Business owners don't know if they qualify without extensive research
3. **Application complexity** - Writing grant applications requires specialized knowledge and persuasive writing
4. **Awareness gap** - Many entrepreneurs don't know funding opportunities exist

### Key Differentiators

- AI doesn't just match — it advises strategic adjustments to become eligible
- AI writes to impress the grant commission using the scoring rubric, not just generic answers
- Company data aggregated from multiple public sources automatically
- Zero friction to start — no account needed until applying

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router) | Server Components, Server Actions, Route Handlers replace separate backend |
| Database | Supabase Postgres (via Supabase CLI) | DB + Auth + Storage in one platform |
| Auth | Supabase Auth (email + phone) | Integrated with DB, RLS support |
| File Storage | Supabase Storage | PDF guidelines, Excel templates |
| AI | Vercel AI SDK v6 + AI Gateway (OIDC) | Streaming, model routing, no API keys to manage |
| Styling | Tailwind CSS + shadcn/ui | Clean institutional with warm approachable touches |
| Email | Resend (custom domain with SPF/DKIM) | Transactional notifications |
| Scraping | Cheerio (v1), Firecrawl for JS-heavy forms (v2) | Form field extraction for grant onboarding |
| Rate Limiting | Vercel Firewall rules | Edge-level, no extra dependency |
| Deployment | Vercel | Zero-config, cron jobs, edge network |
| Language | Romanian only | UI and AI output |

---

## 3. User Flow

### Three Entry Points (Landing Page)

**Entry 1: Existing business**
- User enters 13-digit IDNO (company ID)
- System validates format, queries external APIs

**Entry 2: New entrepreneur**
- User describes business idea in free text
- AI infers industry, location, company type

**Entry 3: "I already know my grant"**
- User browses/searches the public grant catalog
- Selects a grant, goes directly to the writer (skipping matching)

### Screen 1: Landing Page

Minimal, centered, one screen. No scrolling needed to start.

- Header: Logo + "GrantAssist Moldova"
- Headline: "Descoperă granturile disponibile pentru afacerea ta"
- **Single input field**: accepts IDNO (auto-detected if 13 digits) or free-text business idea
  - Placeholder: "Introdu IDNO-ul companiei sau descrie ideea ta de afacere"
- CTA: "Descoperă granturile disponibile ->" (curiosity-driven, not pass/fail)
- Tertiary link: "Am deja un grant in minte ->" (goes to grant catalog browse)
- Consent micro-copy below input: "Datele companiei sunt verificate prin surse publice (OpenMoney, Registrul de Stat)"

**Below the fold (v2, not built at launch):**
- How it works (3-step visual)
- Trust logos (partners, data sources)
- Simple FAQ in plain Romanian
- Social proof / testimonials

### Screen 2: Profile Building + Purchase Need

After clicking CTA, shows real-time progress:

```
Done  Verificam compania ta...
Done  Am gasit: "SRL TechSolutions"
...   Analizam profilul tau...
```

Then asks: "Ce ai nevoie?" (What do you need?)
- Quick-select chips (top 4 visible, "+Mai multe" expandable):
  Tractor, Panouri solare, Echipament digital, Renovare, Transport...
- Free text field below for custom input
- Tapping a chip fills the text, user can type additional details

For idea-based entries: AI infers profile, then asks purchase need.

**Fallback:** If all external APIs fail, show manual entry form (company name, industry dropdown, location dropdown of Moldovan raions, legal form dropdown).

### Screen 3: Grant Matches

**Top recommendation — hero card:**
- Grant name, provider, match score (0-100%), max funding, deadline
- One-paragraph explanation of why this fits
- Primary CTA: "Aplica acum ->"
- Secondary: "Salveaza" (bookmark)

**Below: remaining matches sorted by score:**
- Card per grant: name, provider, score, funding, deadline, one-line explanation
- Cards with <50% match in "Posibil eligibil" section with AI suggestions:
  "Daca inregistrezi activitatea ca cooperativa agricola, devii eligibil"
- Each card: [Aplica ->] and [Salveaza]

**Profile panel (sidebar desktop, collapsible mobile):**
- Company name, IDNO, industry, location, legal form, purchase need
- "Datele nu sunt corecte? Editeaza ->" link

**Share button:** Generates link `/results/{share_token}` (30-day expiry)

**State passing:** `profile_id` in URL params (`/grants?profile=uuid`). Server-side validation: for authenticated users verify `profile.user_id = auth.uid()`. For anonymous users, validate against encrypted HTTP-only cookie set on profile creation.

### Screen 4: Account Wall (triggered on "Aplica acum")

Modal overlay (not full page redirect):

- Name, Email, Phone fields
- Checkbox: "Doresc sa primesc notificari despre termene limita si granturi noi"
- CTA: "Creeaza cont si incepe aplicarea ->"
- Privacy link
- **Skip option:** "Continua fara cont" in small text below (re-asked at export)

On account creation: anonymous company profile linked to user via DB merge function.

### Screen 5: Grant Writer

**Layout:** Single column on all devices. Inline scoring hints above each field (no sidebar).

**On first open:** Auto-generate preview of Section 1 using only profile + grant data (no user input). Displayed grayed out with message: "Iata ce putem genera automat. Adauga detaliile tale pentru un rezultat si mai bun."

**Per section flow:**
1. Section header: field label (matching original form wording exactly), character limit, required/optional
2. Inline scoring hint (collapsible): "Comisia evalueaza: claritatea obiectivelor (20 puncte)"
3. User writes brief answer in their own words
4. Clicks "Genereaza cu AI"
5. If input too vague (<20 chars or too generic): AI asks ONE clarifying question before generating
6. AI takes: brief answer + company enriched_data (cached from profile stage) + grant guidelines + scoring rubric -> generates polished Romanian text optimized for commission scoring
7. Output streams in real-time with source citations for factual claims
8. Character count displayed (server-side truncation if exceeded, with warning)
9. Buttons: [Editeaza] [Regenereaza] [Salveaza] [Urmatoarea ->]

**Context (inline, not sidebar):**
- Grant summary with deadline countdown at top of page
- Required documents checklist (checkable) at bottom
- Progress bar: "6 din 12 sectiuni completate"

**AI behavior:**
- Uses company enriched_data (researched ONCE at profile stage, not per section)
- Has full grant guidelines + scoring rubric in context
- System prompt enforces: "IMPORTANT: Respond ONLY in Romanian"
- Optimizes text to maximize rubric points
- Cites sources for factual claims
- Respects character limits (server-side enforcement as backup)
- Key phrases from grant guidelines used strategically

### Screen 6: Export & Complete

All sections saved -> completion screen:

- [Copiaza tot] [Descarca PDF] [Trimite pe email]
- If unauthenticated: show account modal again. Copy works without account, PDF/email require account.
- Required documents checklist with check status
- Deadline reminder opt-in: "Notifica-ma cu 7 zile si 3 zile inainte"
- Teaser: "Pasul urmator: Pregateste proiectiile financiare [In curand: Asistentul financiar ->]"

### Grant Browse (for "I know my grant" entry)

`/grants/browse` — public, no auth needed:
- Searchable list of all active grants
- Filter by: provider agency, max funding range, deadline
- Card per grant: name, provider, funding, deadline, short description
- CTA per card: "Aplica ->" (goes to writer, may need profile creation first)

---

## 4. Admin Dashboard

**Access:** `/admin` route, protected by `profiles.is_admin = true`. Simple redirect to login if not admin.

### Tab 1: Analytics Funnel

**Pipeline view (horizontal funnel):**
```
Sessions -> IDNO/Idea Entered -> Grants Viewed -> Account Created -> Writer Started -> Exported
```

Each stage clickable -> shows:
- Daily trend chart
- Device breakdown (mobile/desktop)
- Top referrers
- Average time before moving on or dropping off

**Below:**
- Recent activity feed (last 50 events, live)
- Active applications: user name, grant, last activity, completion %
- Stale applications (7+ days inactive): "Send reminder" button

**Data source:** `analytics_daily_summary` table (populated by nightly cron). Live feed queries raw events (last 50 only).

### Tab 2: Grant Catalog

Table: Name, Provider, Deadline, Status, Applications count, Last scraped, Actions.

**Status badges:** Draft (grey), Active (green), Expiring soon (orange), Expired (red)

**Inline quick-edit:** Click deadline cell to edit directly without opening full form.

**Actions:** Edit, Duplicate, Deactivate, Re-scrape form, View applications

**Publish validation:** Grant must have at minimum: name, provider, deadline, 1+ eligibility rule, 1+ application field. Warning if scoring rubric is empty.

### Grant Onboarding (3-step flow)

**Step 1: Basic Info + Sources**
- Grant name, provider agency, max funding, currency, deadline
- Source type: online form URL / uploaded form template (Word/PDF) / manual entry
- Upload PDF guidelines (max 20MB, MIME validation: application/pdf only)
- Upload Excel template (optional)
- Source form URL (validated against domain whitelist — SSRF protection)

**Step 2: AI Extraction (parallel, streaming progress)**
PDF and form scraping kick off simultaneously:
- PDF extraction: "Reading page 12 of 47... Found 6 eligibility criteria... Extracting scoring rubric..."
- Form scraping: "Navigating to form... Found 15 fields... Extracting character limits..."
- Results displayed in editable forms: eligibility rules, scoring rubric, application fields, required documents
- Admin reviews, corrects, adds missing items

**Step 3: Review & Publish**
- Full preview of everything
- Status: Draft (save for later) or Active (visible to users)
- On publish: triggers "new grant matches" notification to existing users with matching profiles

### Tab 3: Notifications

Log view: user, grant, type, channel, sent date.
Filters by type: deadline reminder, abandoned draft, grant expiring, new grant match.

**Manual trigger:** Select stale applications -> "Send reminder" with confirmation preview: "This will send 43 emails. Preview sample -> Confirm."

**Automated rules:**
- Deadline reminder: 7 days and 3 days before deadline
- Abandoned draft: 7 days of inactivity
- New grant alert: triggered on grant publish (DB webhook on `grants` INSERT WHERE status = 'active')

---

## 5. Database Schema

### Tables

```sql
-- Supabase Auth handles email, password
-- Trigger auto-creates profile on signup

profiles
  id UUID PRIMARY KEY (= auth.users.id)
  name TEXT
  phone TEXT
  is_admin BOOLEAN DEFAULT false
  email_notifications BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ DEFAULT now()

company_profiles
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES profiles(id) (nullable — linked on account creation)
  idno TEXT (nullable, unique partial index where not null)
  business_idea TEXT (nullable)
  company_name TEXT
  industry TEXT
  location TEXT
  legal_form TEXT
  purchase_need TEXT
  enriched_data JSONB (aggregated + researched company context, cached once)
  share_token UUID UNIQUE DEFAULT gen_random_uuid()
  share_token_expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days'
  created_at TIMESTAMPTZ DEFAULT now()

grants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name TEXT NOT NULL
  provider_agency TEXT NOT NULL
  description TEXT
  max_funding NUMERIC
  currency TEXT DEFAULT 'MDL'
  deadline TIMESTAMPTZ
  status TEXT CHECK (status IN ('draft', 'active', 'expired')) DEFAULT 'draft'
  source_type TEXT CHECK (source_type IN ('online_form', 'uploaded_template', 'manual'))
  eligibility_rules JSONB (structured criteria for rule-based filter)
  scoring_rubric JSONB (point allocation per section)
  required_documents JSONB (checklist items)
  source_form_url TEXT
  guidelines_pdf_path TEXT (Supabase Storage)
  form_template_path TEXT (Supabase Storage, uploaded Word/PDF forms)
  excel_template_path TEXT (Supabase Storage, nullable)
  version INTEGER DEFAULT 1
  last_scraped_at TIMESTAMPTZ
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()

grant_application_fields
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE
  field_order INTEGER NOT NULL
  field_label TEXT NOT NULL
  field_type TEXT DEFAULT 'textarea'
  is_required BOOLEAN DEFAULT true
  character_limit INTEGER
  helper_text TEXT

saved_grants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
  grant_id UUID REFERENCES grants(id) ON DELETE CASCADE
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE (user_id, grant_id)

applications
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES profiles(id) (nullable — for skip-account flow)
  grant_id UUID REFERENCES grants(id)
  company_profile_id UUID REFERENCES company_profiles(id) (nullable — for "I know my grant" entry)
  status TEXT CHECK (status IN ('in_progress', 'completed', 'exported')) DEFAULT 'in_progress'
  field_snapshot JSONB (snapshot of grant_application_fields at application start)
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()

application_sections
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE
  grant_field_id UUID REFERENCES grant_application_fields(id)
  user_brief TEXT (what user typed)
  ai_draft TEXT (what AI generated)
  final_text TEXT (what user approved)
  is_saved BOOLEAN DEFAULT false
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()

notifications_log
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES profiles(id)
  application_id UUID REFERENCES applications(id) (nullable)
  grant_id UUID REFERENCES grants(id) (nullable)
  type TEXT CHECK (type IN ('deadline_reminder', 'abandoned_draft', 'grant_expiring', 'new_grant_match'))
  channel TEXT CHECK (channel IN ('email', 'sms'))
  sent_at TIMESTAMPTZ DEFAULT now()

analytics_events
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  session_id TEXT NOT NULL
  user_id UUID REFERENCES profiles(id) (nullable)
  event_type TEXT NOT NULL
  event_data JSONB
  referrer_url TEXT
  device_type TEXT
  created_at TIMESTAMPTZ DEFAULT now()

analytics_daily_summary
  date DATE NOT NULL
  stage TEXT NOT NULL
  count INTEGER DEFAULT 0
  device_type TEXT
  top_referrers JSONB
  PRIMARY KEY (date, stage, device_type)
```

### Event Types (analytics_events.event_type)

```
session_start, idno_entered, idea_entered, purchase_selected,
grants_viewed, grant_saved, grant_selected, account_created,
account_skipped, writer_opened, section_generated, section_saved,
application_completed, application_exported, session_ended
```

Drop-off is inferred from the absence of the next expected event, not tracked as its own event.

### Indexes

```sql
CREATE UNIQUE INDEX idx_company_profiles_idno
  ON company_profiles (idno)
  WHERE idno IS NOT NULL;

CREATE INDEX idx_analytics_events_created
  ON analytics_events (created_at);

CREATE INDEX idx_applications_user
  ON applications (user_id);

CREATE INDEX idx_applications_status
  ON applications (status);

CREATE INDEX idx_grants_status_deadline
  ON grants (status, deadline);
```

### RLS Policies

```sql
-- company_profiles: users see own rows or unclaimed (user_id IS NULL)
-- applications: users see only their own
-- application_sections: via application ownership
-- grants: public read, admin write
-- grant_application_fields: public read, admin write
-- analytics_events: admin only
-- analytics_daily_summary: admin only
-- notifications_log: admin only
-- saved_grants: users see only their own
-- profiles: users see only their own, admin sees all
```

### Database Functions

```sql
-- on_auth_user_created: auto-create profiles row
-- claim_company_profile(profile_id, user_id): merge anonymous profile on signup
  -- finds unclaimed profile by ID, assigns user_id
  -- if duplicates exist for same IDNO, keeps most recent, deletes others
```

### Storage Buckets

- `grant-guidelines` — PDFs, admin-write, public-read
- `grant-templates` — Excel files and form templates, admin-write, public-read

---

## 6. Data Sources (Company Verification)

### Sources (queried in parallel)

| Source | Type | Confidence | Timeout | Auth Required |
|--------|------|-----------|---------|---------------|
| OpenMoney.md | REST API | 85% | 8s | No |
| idno.md | Web scraping (Cheerio) | 75% | 8s | No |
| srl.md | Web scraping (Cheerio) | 75% | 8s | No |
| OpenSanctions | REST API | 90% | 15s | Yes (API key, disabled by default) |

### Aggregation Logic

1. Query all active sources in parallel with individual timeouts
2. Validate each response against TypeScript type before merging
3. Log warnings when any source returns unexpected shape
4. Merge results: higher confidence score wins on field conflicts
5. Cache merged result in `company_profiles.enriched_data`
6. Reuse cached data across all grant writer sections (no per-section re-research)

### Degradation

- If some sources fail: show results from responding sources, display "date partiale" indicator
- If ALL sources fail: show manual entry form (company name, industry, location, legal form)

---

## 7. AI Integration

### Model Routing

All AI calls go through Vercel AI Gateway using OIDC authentication. Model specified as `'provider/model'` strings (e.g., `'anthropic/claude-sonnet-4.6'`). No direct provider SDKs.

### System Prompt Rules

Every AI system prompt includes:
- `IMPORTANT: Raspunde DOAR in limba romana.`
- Context: company profile, grant guidelines, scoring rubric (where applicable)
- Role: expert grant consultant who optimizes for commission approval

### AI Call Budget Per User Session

| Action | Calls | Notes |
|--------|-------|-------|
| Grant matching (rule filter + LLM rank) | 1 | Compressed grant summaries, not full descriptions |
| Auto-preview Section 1 | 1 | Profile-only, no user input |
| Section generation | 12 (avg) | Per section, uses cached enriched_data |
| Clarifying questions | ~3 (est) | Only when input too vague |
| **Total per completed application** | **~17** | Reduced from 26 by caching research |

### Character Limit Enforcement

- AI prompt includes character limit
- Server-side truncation as backup if LLM exceeds limit
- User shown warning: "Textul a fost scurtat la limita de X caractere. Editeaza pentru a ajusta."

### PDF Extraction (Admin)

- Upload PDF to Supabase Storage
- Pass PDF to LLM via AI SDK multimodal capabilities (LLM reads PDF directly)
- No `pdf-parse` dependency — LLM handles extraction more accurately
- Streaming progress updates to admin UI

---

## 8. Notifications

### Channels

- **Email:** Resend with custom domain + SPF/DKIM records (prevents spam folder)
- **SMS:** Future consideration, not v1

### Automated Triggers

| Trigger | Timing | Mechanism |
|---------|--------|-----------|
| Deadline reminder | 7 days and 3 days before | Cron job, daily 9:00 UTC (11:00 Moldova) |
| Abandoned draft | After 7 days inactivity | Cron job, daily 10:00 UTC |
| New grant matches profile | On grant publish | DB webhook on `grants` INSERT WHERE status = 'active' |
| Daily analytics aggregation | Nightly | Cron job, 2:00 UTC |

### Safety

- `notifications_log` prevents duplicate sends
- Every email includes one-click unsubscribe link
- `profiles.email_notifications` respected before sending
- Bulk admin sends require confirmation with preview and count

---

## 9. Security

| Concern | Mitigation |
|---------|-----------|
| SSRF on form scraping | URL whitelist validation (`url-whitelist.ts`) — only known government domains |
| Profile URL tampering | Server-side ownership check + encrypted HTTP-only cookie for anonymous users |
| RLS enforcement | All tables have Row Level Security policies from day one |
| Cron job auth | CRON_SECRET Bearer token check on every cron Route Handler |
| Rate limiting | Vercel Firewall edge-level rate limiting on public routes |
| PDF upload validation | MIME type check (application/pdf only), 20MB max size |
| Admin access | `profiles.is_admin` boolean, no exposed admin registration |
| IDNO data | Public data from public sources, consent micro-copy displayed |
| Share links | 30-day expiry, read-only, no edit capability |
| LLM output | User must review before saving, never auto-submitted |
| External API data | TypeScript validation before storing, warning logs on unexpected shapes |

---

## 10. Project Structure

```
grants-moldova/
├── app/
│   ├── layout.tsx                    # Root layout (Geist fonts, Supabase provider)
│   ├── page.tsx                      # Landing page (Screen 1 — single input)
│   ├── results/
│   │   ├── page.tsx                  # Purchase need + profile building (Screen 2)
│   │   ├── loading.tsx               # Progress animation
│   │   ├── error.tsx                 # Graceful error + manual entry fallback
│   │   └── [share_token]/
│   │       └── page.tsx              # Public shareable results (30-day expiry check)
│   ├── grants/
│   │   ├── page.tsx                  # Grant matches (Screen 3, ?profile=uuid)
│   │   ├── loading.tsx               # Streaming matches animation
│   │   ├── error.tsx
│   │   └── browse/
│   │       └── page.tsx              # Public grant catalog ("I know my grant")
│   ├── apply/
│   │   ├── [grant_id]/
│   │   │   ├── page.tsx              # Grant writer (Screen 5, ?profile=uuid)
│   │   │   ├── error.tsx
│   │   │   └── export/
│   │   │       └── page.tsx          # Export & complete (Screen 6)
│   │   └── layout.tsx                # Shared writer layout
│   ├── admin/
│   │   ├── layout.tsx                # Admin auth guard (is_admin check)
│   │   ├── page.tsx                  # Analytics funnel (Tab 1)
│   │   ├── grants/
│   │   │   ├── page.tsx              # Grant catalog (Tab 2)
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # 3-step grant onboarding
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx      # Edit grant
│   │   └── notifications/
│   │       └── page.tsx              # Notification log (Tab 3)
│   ├── api/
│   │   ├── writer/
│   │   │   └── route.ts              # AI generation + clarifying (streaming)
│   │   ├── admin/
│   │   │   ├── onboard-grant/
│   │   │   │   └── route.ts          # PDF extract + form scrape (streaming)
│   │   │   └── analytics/
│   │   │       └── route.ts          # Dashboard data queries
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # Supabase auth callback
│   │   ├── notifications/
│   │   │   └── send/
│   │   │       └── route.ts          # Send reminders (manual + bulk)
│   │   └── cron/
│   │       └── route.ts              # All cron jobs (type param: deadlines, abandoned, analytics)
│   ├── privacy/
│   │   └── page.tsx                  # Static privacy policy (Romanian)
│   └── settings/
│       └── page.tsx                  # Email notification preferences
├── actions/
│   ├── company.ts                    # Server Action: lookup + aggregate company data
│   ├── grants.ts                     # Server Action: rule filter + LLM matching
│   ├── applications.ts               # Server Action: save sections, update status, export via email
│   └── profile.ts                    # Server Action: create, merge anonymous -> authenticated
├── components/
│   ├── landing/
│   │   └── hero-input.tsx            # IDNO / idea single input
│   ├── grants/
│   │   ├── top-recommendation.tsx    # Hero grant card with primary CTA
│   │   ├── grant-card.tsx            # Match result card (mobile: stacked buttons)
│   │   ├── purchase-chips.tsx        # Quick-select chips + free text (Screen 2)
│   │   ├── profile-panel.tsx         # Editable company profile display
│   │   └── manual-profile-form.tsx   # Fallback manual entry form
│   ├── writer/
│   │   ├── section-editor.tsx        # Per-section: brief + generate + regenerate + edit + save
│   │   ├── scoring-hint.tsx          # Inline collapsible rubric hint
│   │   ├── documents-checklist.tsx   # Required docs tracker (checkable)
│   │   └── progress-bar.tsx          # X of Y sections complete
│   ├── admin/
│   │   ├── funnel-chart.tsx          # Analytics pipeline view
│   │   ├── grants-table.tsx          # Catalog with inline deadline quick-edit
│   │   ├── onboarding-wizard.tsx     # 3-step grant onboarding with streaming progress
│   │   └── activity-feed.tsx         # Recent events stream
│   ├── auth/
│   │   └── account-modal.tsx         # Sign-up modal (skippable, includes notification checkbox)
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient (Client Components only)
│   │   ├── server.ts                 # createServerClient (Server Components/Actions)
│   │   └── admin.ts                  # Service role client (admin operations only)
│   ├── sources/
│   │   ├── openmoney.ts              # OpenMoney REST API client
│   │   ├── idno-md.ts                # idno.md Cheerio scraper
│   │   ├── srl-md.ts                 # srl.md Cheerio scraper
│   │   ├── opensanctions.ts          # OpenSanctions API client (optional, needs key)
│   │   └── aggregator.ts             # Parallel query, merge by confidence, TypeScript validation
│   ├── ai/
│   │   ├── grant-matcher.ts          # Rule pre-filter SQL + LLM ranking with compressed summaries
│   │   ├── section-writer.ts         # Per-section AI generation (uses cached enriched_data)
│   │   └── pdf-extractor.ts          # LLM multimodal PDF reading (no pdf-parse dependency)
│   ├── scraping/
│   │   └── form-scraper.ts           # Cheerio-based form field extraction (v1)
│   ├── analytics/
│   │   └── track.ts                  # Event tracking helper (session_id, event_type, metadata)
│   └── utils/
│       ├── idno-validator.ts         # 13-digit format validation
│       └── url-whitelist.ts          # Allowed domains for form scraping (SSRF protection)
├── supabase/
│   ├── config.toml                   # Supabase CLI configuration
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Full schema + RLS policies + indexes + functions + triggers
│   └── seed.sql                      # 3-5 real Moldovan grants (AIPA, ODA, EU4Moldova)
├── public/
│   └── og-image.png                  # Social sharing image
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── vercel.json                       # Cron config
└── .env.local                        # Supabase keys, AI Gateway OIDC
```

---

## 11. Dependencies

| Package | Purpose |
|---------|---------|
| `next` | App framework (v16, App Router) |
| `react` / `react-dom` | UI library |
| `@supabase/supabase-js` | Database, auth, storage client |
| `@supabase/ssr` | Server-side Supabase for Next.js |
| `ai` | AI SDK v6 core (streamText, generateText) |
| `@ai-sdk/react` | React hooks (useChat, useCompletion) |
| `@ai-sdk/gateway` | AI Gateway OIDC model routing |
| `tailwindcss` | Utility-first CSS |
| `resend` | Transactional email |
| `cheerio` | HTML parsing for form scraping |
| `geist` | Font family (Geist Sans + Geist Mono) |

**Not included (intentionally):**
- ~~`playwright-core`~~ — exceeds Vercel Function size limit (250MB)
- ~~`pdf-parse`~~ — abandoned since 2021, vulnerabilities. LLM multimodal replaces it.
- ~~`@upstash/ratelimit`~~ — Vercel Firewall handles rate limiting at edge level

---

## 12. Cron Jobs (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron?type=deadline-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron?type=abandoned-drafts", "schedule": "0 10 * * *" },
    { "path": "/api/cron?type=daily-analytics", "schedule": "0 2 * * *" }
  ]
}
```

All times UTC. Moldova is UTC+2 (EET), so:
- Deadline reminders: 11:00 AM Moldova time
- Abandoned drafts: 12:00 PM Moldova time
- Analytics aggregation: 4:00 AM Moldova time

All cron routes verify `Authorization: Bearer ${CRON_SECRET}`.

---

## 13. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Gateway (via vercel env pull)
VERCEL_OIDC_TOKEN=

# Email
RESEND_API_KEY=

# Cron
CRON_SECRET=

# Optional
OPENSANCTIONS_API_KEY=          # Disabled by default
NEXT_PUBLIC_APP_URL=            # For share links, email links
```

---

## 14. Design Guidelines

**Tone:** Clean institutional foundation with warm, approachable touches. Professional but not cold. Not government-looking (avoids "more paperwork" feeling).

**Typography:** Geist Sans for UI, Geist Mono for IDs and data.

**Color:** Neutral base (zinc/slate), single warm accent color. No scattered rainbow accents.

**Romanian copy rules:**
- Use simple, everyday language (not formal/bureaucratic)
- "Ce ai nevoie?" not "Ce doriti sa achizitionati?"
- "Despre afacerea ta" not "Cine esti?"
- Grant section labels in the writer match original form wording exactly

**Mobile-first:**
- Quick-select chips: top 4 visible, "+Mai multe" expandable
- Grant match cards: full-width CTA button, save as text link below (no side-by-side tap targets)
- Writer: single column, inline scoring hints (not sidebar)

**States:** Every interactive screen has loading, error, and empty states defined.

---

## 15. Future Features (v2, out of scope)

| Feature | Notes |
|---------|-------|
| Financial spreadsheet assistant | Upload accountant data, AI generates projections matching grant Excel template |
| Browser-based form scraping (Firecrawl/Playwright) | For JS-heavy government forms |
| Landing page marketing sections | How it works, trust logos, FAQ, testimonials |
| Romanian + Russian language toggle | Based on user demand |
| SMS notifications | Via Supabase or Twilio |
| Session replay (PostHog) | One-line script addition, no architecture change |
| Saved grants local storage sync | Currently saved_grants requires account |
| Company ownership verification | For sensitive actions beyond public data |

---

## 16. Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| External APIs go down (OpenMoney, idno.md, srl.md) | High | Parallel queries, individual timeouts, graceful degradation, manual entry fallback |
| LLM generates English instead of Romanian | High | Enforced in every system prompt, tested before launch |
| LLM exceeds character limits | High | Server-side truncation with user warning |
| AI generates hallucinated company data | High | Source citations required, user must review before saving |
| Supabase free tier limits | Medium | Monitor at 80%, upgrade to Pro ($25/mo) before hitting |
| Government form changes after scraping | Medium | `last_scraped_at` tracking, staleness warning at 30 days, manual re-scrape |
| Grant deadline passes mid-application | Medium | Check on page load, warning banner at <3 days, block after expiry |
| Email lands in spam | Medium | Custom Resend domain with SPF/DKIM records |
| Admin publishes incomplete grant | Medium | Validation: min name, provider, deadline, 1 rule, 1 field |
| IDNO typo gives empty results | Medium | Format validation (13 digits), clear error with "describe idea" fallback |
| Anonymous profile duplicates for same IDNO | Medium | Partial unique index + DB merge function on signup |
| Cron timezone confusion | Low | Documented: all UTC, with Moldova offsets noted |
