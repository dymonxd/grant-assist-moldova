# Phase 2: Data Layer and Company Profiles - Research

**Researched:** 2026-03-21
**Domain:** Web scraping (Cheerio), AI structured output (AI SDK v6), Next.js Server Actions, Supabase CRUD, UI components (shadcn/ui)
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 delivers the "magic moment" where a Moldovan entrepreneur enters their 13-digit IDNO and sees their company data auto-populated from three public registries (idno.md, srl.md, openmoney.md), or describes a business idea and gets an AI-inferred profile. It also delivers purchase need selection and a public grant browse catalog.

The core technical challenges are: (1) scraping three Moldovan government-adjacent sites that lack public APIs, using Cheerio with 8-second per-source timeouts via AbortController, merged in a confidence-weighted strategy; (2) AI inference of company profiles from free text using AI SDK v6's `generateText` + `Output.object()` with Zod schemas (note: `generateObject` is deprecated in v6); (3) anonymous profile creation via Supabase service-role client (since RLS `auth.uid()` is NULL for unauthenticated users); and (4) building the grant browse page with server-side filtering against the existing Supabase `grants` table.

**Primary recommendation:** Build scraping as three independent `lib/sources/{source}.ts` modules behind a unified `lib/sources/aggregate.ts` orchestrator that runs all three via `Promise.allSettled` with per-source AbortController timeouts. All scraping and AI inference runs within a single Next.js Server Action to avoid the sequential-execution limitation of multiple concurrent server action calls.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROF-01 | User enters 13-digit IDNO, gets auto-populated company data from Moldovan registries | IDNO validation algorithm (weights 7,3,1 repeating, mod 10 check digit), Cheerio scraping patterns for idno.md/srl.md/openmoney.md, aggregate orchestrator with Promise.allSettled |
| PROF-02 | User describes business idea in free text, gets AI-inferred company profile | AI SDK v6 `generateText` + `Output.object()` with Zod schema, AI Gateway OIDC auth, Romanian-language system prompt |
| PROF-03 | System scrapes OpenMoney.md, idno.md, srl.md in parallel with 8s timeouts and confidence-based merge | Promise.allSettled with AbortController per-source, confidence weights (idno.md: 0.9, srl.md: 0.8, openmoney.md: 0.7), field-level merge strategy |
| PROF-04 | Manual entry form when all data sources fail | Fallback UI with company_name, industry, location, legal_form fields, shadcn/ui form components |
| PROF-05 | Company profile stored with enriched_data JSONB, reused across writer | Supabase service-role insert for anonymous users, enriched_data stores raw source responses + merge metadata, IDNO upsert with ON CONFLICT |
| PROF-06 | "Date partiale" indicator when some sources fail but others succeed | Source result tracking per-source (success/fail/timeout), UI badge component |
| PURCH-01 | Quick-select chips for purchase need (top 4 visible, expandable) | Custom chip component using shadcn/ui Button variants, expandable "Mai multe" toggle |
| PURCH-02 | Free text field for custom purchase need | shadcn/ui Textarea component with Romanian placeholder |
| PURCH-03 | Tapping chip pre-fills text field, user can add details | Controlled component pattern: chip onClick sets textarea value, user can append |
| BRWSE-01 | Public /grants/browse page shows all active grants without auth | Next.js page with Supabase anon client (grants RLS allows anon SELECT on active grants) |
| BRWSE-02 | Search grants by name | Supabase `.ilike('name', '%query%')` or full-text search on grants table |
| BRWSE-03 | Filter by provider agency, max funding range, deadline | Supabase chained `.eq()`, `.lte()`, `.gte()` filters, URL search params for state |
| BRWSE-04 | Grant card with name, provider, funding, deadline, description, CTA | Reusable GrantCard component, formatted currency (MDL), deadline relative display |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | ^1.2.0 | HTML parsing for scraping Moldovan registries | Industry standard for server-side HTML parsing, lightweight (~2MB), jQuery-like API, full TypeScript support, works in Vercel serverless |
| ai | ^6.0.0 | AI SDK for structured output (business idea inference) | Vercel's official AI toolkit, built-in AI Gateway support, OIDC auth, `Output.object()` for typed inference |
| zod | 4.3.6 | Schema validation for AI output and form data | Already installed, required by AI SDK for structured output schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.99.3 (installed) | Database operations | All Supabase queries (grants browse, profile CRUD) |
| @supabase/ssr | 0.9.0 (installed) | Server-side Supabase client | Server Components and Server Actions |
| iron-session | 8.0.4 (installed) | Anonymous session tracking | Storing companyProfileId for unauthenticated users |
| lucide-react | 0.577.0 (installed) | Icons | UI icons for cards, indicators, chips |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cheerio | Playwright/Puppeteer | Overkill for static HTML, 250MB+ bundle kills Vercel function limits, project explicitly excludes playwright-core |
| Cheerio | Firecrawl | Listed as v2 feature (ADV-01), unnecessary for these static-HTML sources |
| Custom IDNO validation | stdnum npm package | Extra dependency for one 10-line function; hand-roll is cleaner here |
| Custom chip component | Emblor tag input | Overkill for 4-8 static chips; simple Button variant approach is sufficient |

**Installation:**
```bash
npm install cheerio ai@^6.0.0
```

Note: `zod` 4.3.6 is already installed. `@supabase/supabase-js`, `@supabase/ssr`, `iron-session`, `lucide-react` are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    sources/
      idno-md.ts          # Scraper for idno.md
      srl-md.ts           # Scraper for srl.md
      openmoney-md.ts      # Scraper for openmoney.md
      aggregate.ts         # Orchestrator: parallel fetch + confidence merge
      types.ts             # Shared types for source results
    validation/
      idno.ts             # IDNO format + check digit validation
    ai/
      infer-profile.ts    # AI business idea -> company profile inference
  app/
    actions/
      profile.ts          # Server Actions: lookupCompany, inferFromIdea, saveProfile
      purchase.ts         # Server Actions: savePurchaseNeed
    (home)/
      page.tsx            # Landing page (updated from Phase 1 placeholder)
      idno-form.tsx       # Client component: IDNO input + submit
      idea-form.tsx       # Client component: business idea textarea + submit
      profile-result.tsx  # Client component: displays populated profile
      manual-form.tsx     # Client component: manual entry fallback
      purchase-chips.tsx  # Client component: chip selection + text field
      partial-badge.tsx   # "Date partiale" indicator component
    grants/
      browse/
        page.tsx          # Server Component: grant catalog
        grant-card.tsx    # Reusable grant card component
        filters.tsx       # Client component: search + filter controls
        grant-list.tsx    # Client component: filtered list with loading states
  components/
    ui/
      badge.tsx           # shadcn/ui badge (for status/partial indicators)
      input.tsx           # shadcn/ui input
      textarea.tsx        # shadcn/ui textarea
      card.tsx            # shadcn/ui card (for grant cards)
      select.tsx          # shadcn/ui select (for filter dropdowns)
```

### Pattern 1: Single Server Action with Parallel Internal Fetches
**What:** All three scraping sources run inside ONE server action using `Promise.allSettled`, NOT three separate server action calls from the client.
**When to use:** Whenever multiple external fetches need to run in parallel. Next.js Server Actions execute sequentially when called concurrently from the client.
**Example:**
```typescript
// src/app/actions/profile.ts
'use server'

import { aggregate } from '@/lib/sources/aggregate'
import { validateIdno } from '@/lib/validation/idno'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

export async function lookupCompany(idno: string) {
  // Validate IDNO format + check digit
  const validated = validateIdno(idno)
  if (!validated.valid) {
    return { error: validated.error }
  }

  // All three sources scraped in parallel WITHIN this single action
  const result = await aggregate(idno)

  // Use service-role client (anonymous user has no auth.uid())
  const admin = createAdminClient()
  const session = await getSession()

  const { data, error } = await admin
    .from('company_profiles')
    .upsert({
      idno,
      company_name: result.merged.company_name,
      industry: result.merged.industry,
      location: result.merged.location,
      legal_form: result.merged.legal_form,
      enriched_data: result.raw,
    }, { onConflict: 'idno' })
    .select()
    .single()

  if (data) {
    session.companyProfileId = data.id
    await session.save()
  }

  return {
    profile: data,
    sourceStatus: result.sourceStatus, // per-source success/fail/timeout
    isPartial: result.isPartial,       // true if some but not all failed
    allFailed: result.allFailed,       // true if all sources failed
  }
}
```

### Pattern 2: Scraper Module with AbortController Timeout
**What:** Each scraper module uses AbortController with 8-second timeout for resilience.
**When to use:** Every external HTTP fetch in the scraper modules.
**Example:**
```typescript
// src/lib/sources/idno-md.ts
import * as cheerio from 'cheerio'
import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeIdnoMd(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`https://idno.md/${idno}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantAssist/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // Extract fields from HTML (selectors TBD - need live testing)
    const company_name = $('h1.company-name').text().trim() || null
    const industry = $('.industry-field').text().trim() || null
    const location = $('.location-field').text().trim() || null
    const legal_form = $('.legal-form-field').text().trim() || null

    return {
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: { company_name, industry, location, legal_form },
    }
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    return {
      source: 'idno.md',
      status: isTimeout ? 'timeout' : 'error',
      confidence: 0,
      data: null,
      error: String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}
```

### Pattern 3: Confidence-Based Field Merge
**What:** When multiple sources return data for the same field, pick the value from the highest-confidence source.
**When to use:** In the aggregate module after all sources resolve.
**Example:**
```typescript
// src/lib/sources/aggregate.ts
import type { SourceResult, MergedProfile } from './types'

// Confidence weights per source
const CONFIDENCE: Record<string, number> = {
  'idno.md': 0.9,    // Primary government registry
  'srl.md': 0.8,     // Secondary registry
  'openmoney.md': 0.7 // Procurement-focused, less registration data
}

function mergeFields(results: SourceResult[]): MergedProfile {
  const successful = results
    .filter(r => r.status === 'success' && r.data)
    .sort((a, b) => (CONFIDENCE[b.source] ?? 0) - (CONFIDENCE[a.source] ?? 0))

  const merged: MergedProfile = {
    company_name: null,
    industry: null,
    location: null,
    legal_form: null,
  }

  // For each field, use the first non-null value (highest confidence first)
  for (const result of successful) {
    if (!result.data) continue
    for (const key of Object.keys(merged) as (keyof MergedProfile)[]) {
      if (merged[key] === null && result.data[key]) {
        merged[key] = result.data[key]
      }
    }
  }

  return merged
}
```

### Pattern 4: AI Business Idea Inference (AI SDK v6)
**What:** Use `generateText` with `Output.object()` and a Zod schema to infer a company profile from free-text input.
**When to use:** When user provides a business idea instead of an IDNO (PROF-02).
**Example:**
```typescript
// src/lib/ai/infer-profile.ts
import { generateText, Output } from 'ai'
import { z } from 'zod'

const companyProfileSchema = z.object({
  company_name: z.string().nullable()
    .describe('Suggested company name based on the business idea, or null'),
  industry: z.string()
    .describe('Industry sector in Romanian (e.g., "Agricultura", "IT", "Comert")'),
  location: z.string().nullable()
    .describe('Location if mentioned, default "Moldova"'),
  legal_form: z.string().nullable()
    .describe('Suggested legal form: SRL, II, SA, or null'),
  company_size: z.enum(['micro', 'small', 'medium'])
    .describe('Estimated company size based on description'),
})

export async function inferProfileFromIdea(businessIdea: string) {
  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    output: Output.object({ schema: companyProfileSchema }),
    system: `Esti un asistent care analizeaza idei de afaceri din Moldova.
Extrage informatii despre companie din descrierea furnizata.
Raspunde doar cu datele structurate cerute. Foloseste limba romana pentru valorile campurilor.
Daca informatia nu este mentionata, pune null.
Presupune ca locatia este "Moldova" daca nu este specificata altfel.`,
    prompt: businessIdea,
  })

  return output
}
```

### Pattern 5: Anonymous Profile with Service-Role Client
**What:** Use the Supabase admin/service-role client for creating company profiles for anonymous users, since RLS `auth.uid()` is NULL and would either fail or leak data.
**When to use:** All profile write operations for unauthenticated users.
**Why:** The `company_profiles` table has RLS policies that check `auth.uid() = user_id`. For anonymous users, `user_id` is NULL and `auth.uid()` is NULL, so standard client inserts would fail or (worse) match all NULL rows. The service-role client bypasses RLS entirely.

### Anti-Patterns to Avoid
- **Calling multiple server actions in parallel from the client:** Next.js executes concurrent server action calls sequentially. Use ONE server action with internal `Promise.allSettled` instead.
- **Using anon Supabase client for anonymous profile writes:** RLS `auth.uid()` is NULL for unauthenticated users. The anonymous insert policy checks `auth.uid() = user_id`, which would be `NULL = NULL` (always false in SQL). Use the service-role admin client.
- **Scraping without AbortController timeout:** Moldovan government sites have unpredictable response times. Without timeouts, a hanging request blocks the entire user flow.
- **Hardcoding CSS selectors without fallback:** Moldovan sites may change their HTML structure. Each scraper should gracefully return null fields rather than crashing.
- **Using `generateObject` (deprecated in AI SDK v6):** Use `generateText` with `Output.object()` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Custom regex-based HTML extraction | Cheerio | HTML is messy, regex fails on edge cases, Cheerio handles malformed HTML gracefully |
| IDNO check digit | External npm package (stdnum) | Custom 10-line function | The algorithm is trivial (weighted sum mod 10), adding a dependency is overkill |
| AI structured output | Custom JSON parsing of LLM text | AI SDK v6 `Output.object()` | Handles schema validation, retries, type safety automatically |
| Grant search/filter | Client-side filtering of all grants | Supabase server-side queries | Database handles filtering efficiently, pagination-ready, RLS-compliant |
| Form validation | Custom validation logic | Zod schemas + Server Action validation | Type-safe, composable, reusable between client hints and server validation |

**Key insight:** The scrapers are the only truly custom code in this phase. Everything else has a well-established pattern from the existing stack.

## Common Pitfalls

### Pitfall 1: Sequential Server Action Execution
**What goes wrong:** Developer calls three server actions from the client to scrape three sources, expecting parallel execution. They run sequentially, tripling response time.
**Why it happens:** Next.js serializes concurrent server action calls from the same client. This is a known limitation (GitHub issues #69265, #84893).
**How to avoid:** Use a SINGLE server action (`lookupCompany`) that internally calls `Promise.allSettled` on all three scraper functions.
**Warning signs:** Total scrape time equals sum of individual scrape times instead of max.

### Pitfall 2: RLS Policy Bypass for Anonymous Users
**What goes wrong:** Using the standard Supabase server client (with anon key) to insert a company profile for an anonymous user. The insert fails silently or returns no data.
**Why it happens:** RLS policy `company_profiles_insert_own` requires `auth.uid() = user_id`. For anonymous users, both are NULL, and `NULL = NULL` is false in SQL.
**How to avoid:** Use `createAdminClient()` (service-role) for all anonymous profile writes. The admin client already exists in `src/lib/supabase/admin.ts`.
**Warning signs:** Profile creation works when logged in but silently fails when anonymous.

### Pitfall 3: IDNO Upsert Race Condition
**What goes wrong:** Two rapid submissions of the same IDNO create duplicate company_profiles rows.
**Why it happens:** Without proper conflict handling, concurrent inserts can both succeed before the unique index catches the duplicate.
**How to avoid:** Use Supabase `.upsert()` with `{ onConflict: 'idno' }`. The schema already has `CREATE UNIQUE INDEX idx_company_profiles_idno ON company_profiles (idno) WHERE idno IS NOT NULL`.
**Warning signs:** Multiple rows for the same IDNO in the database, session pointing to wrong profile.

### Pitfall 4: Scraper Selector Fragility
**What goes wrong:** Scrapers work in development but break in production because the target site changed its HTML structure.
**Why it happens:** Web scraping relies on CSS selectors that can change without notice. Moldovan government sites are not maintained by teams that think about API stability.
**How to avoid:** (1) Each scraper returns null for fields it cannot find, never throws. (2) The aggregate layer handles partial data gracefully. (3) Log scraper failures for monitoring. (4) The "Date partiale" UI indicator tells users when data is incomplete.
**Warning signs:** All fields suddenly null from one source, error logs showing parsing failures.

### Pitfall 5: AI Inference Without Guardrails
**What goes wrong:** The AI returns nonsensical or non-Romanian industry values, or hallucinates company data.
**Why it happens:** LLMs can be creative when given vague prompts.
**How to avoid:** (1) Use `Output.object()` with strict Zod schema validation. (2) System prompt explicitly says Romanian language. (3) Use `.describe()` on schema fields to guide the model. (4) Mark AI-inferred profiles distinctly from registry-sourced profiles in `enriched_data`.
**Warning signs:** Industry values in English, made-up company names, inconsistent legal forms.

### Pitfall 6: Missing Loading States During Scraping
**What goes wrong:** User submits IDNO and sees nothing for 3-8 seconds while scrapers run.
**Why it happens:** Scraping takes real time (up to 8 seconds per source). Without loading feedback, users assume the app is broken.
**How to avoid:** Use React 19's `useActionState` (or `useTransition`) to show a loading indicator during the server action. Show a skeleton UI or progress message in Romanian ("Se cauta datele companiei...").
**Warning signs:** User abandonment after IDNO submission, repeated form submissions.

## Code Examples

### IDNO Validation (Verified Algorithm)
```typescript
// src/lib/validation/idno.ts
// Source: python-stdnum md.idno module (arthurdejong/python-stdnum)
// Weights: 7, 3, 1 repeating pattern for 12 digits, check = sum mod 10

const WEIGHTS = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1] as const

function calcCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += WEIGHTS[i] * parseInt(digits[i], 10)
  }
  return sum % 10
}

export function validateIdno(input: string): { valid: true; idno: string } | { valid: false; error: string } {
  const cleaned = input.replace(/\s/g, '').trim()

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'IDNO trebuie sa contina doar cifre' }
  }
  if (cleaned.length !== 13) {
    return { valid: false, error: 'IDNO trebuie sa aiba exact 13 cifre' }
  }
  if (parseInt(cleaned[12], 10) !== calcCheckDigit(cleaned)) {
    return { valid: false, error: 'IDNO invalid (cifra de control incorecta)' }
  }

  return { valid: true, idno: cleaned }
}
```

### Source Result Types
```typescript
// src/lib/sources/types.ts

export interface CompanyFields {
  company_name: string | null
  industry: string | null
  location: string | null
  legal_form: string | null
}

export interface SourceResult {
  source: 'idno.md' | 'srl.md' | 'openmoney.md'
  status: 'success' | 'error' | 'timeout'
  confidence: number
  data: CompanyFields | null
  error?: string
}

export interface AggregateResult {
  merged: CompanyFields
  raw: Record<string, SourceResult>  // Stored in enriched_data JSONB
  sourceStatus: Record<string, 'success' | 'error' | 'timeout'>
  isPartial: boolean    // Some succeeded, some failed
  allFailed: boolean    // All three failed
}

export type MergedProfile = CompanyFields
```

### Grants Browse with Server-Side Filtering
```typescript
// src/app/grants/browse/page.tsx (Server Component)
// Source: Supabase docs, RLS policy grants_select_active allows anon SELECT

import { createClient } from '@/lib/supabase/server'

interface SearchParams {
  q?: string
  provider?: string
  maxFunding?: string
  deadline?: string
}

export default async function GrantsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('grants')
    .select('id, name, provider_agency, description, max_funding, currency, deadline')
    .eq('status', 'active')
    .order('deadline', { ascending: true })

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`)
  }
  if (params.provider) {
    query = query.eq('provider_agency', params.provider)
  }
  if (params.maxFunding) {
    query = query.lte('max_funding', parseInt(params.maxFunding))
  }
  if (params.deadline) {
    query = query.lte('deadline', params.deadline)
  }

  const { data: grants, error } = await query

  // Render grant cards...
}
```

### Purchase Need Chips Pattern
```typescript
// Chip selection with pre-fill behavior (PURCH-01, PURCH-02, PURCH-03)
'use client'

import { useState } from 'react'

const QUICK_NEEDS = [
  'Echipament si utilaje',
  'Software si digitalizare',
  'Instruirea personalului',
  'Materii prime',
  'Renovare spatii',
  'Transport si logistica',
  'Marketing si promovare',
  'Consultanta',
] as const

export function PurchaseChips({
  onSelect,
}: {
  onSelect: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [customText, setCustomText] = useState('')
  const visible = expanded ? QUICK_NEEDS : QUICK_NEEDS.slice(0, 4)

  function handleChipClick(need: string) {
    setCustomText(need)
    onSelect(need)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {visible.map((need) => (
          <button
            key={need}
            type="button"
            onClick={() => handleChipClick(need)}
            className="rounded-full border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {need}
          </button>
        ))}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-dashed border-input px-3 py-1.5 text-sm text-muted-foreground"
          >
            Mai multe...
          </button>
        )}
      </div>
      <textarea
        value={customText}
        onChange={(e) => {
          setCustomText(e.target.value)
          onSelect(e.target.value)
        }}
        placeholder="Descrie ce doresti sa achizitionezi..."
        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm min-h-[80px]"
      />
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` | `generateText()` + `Output.object()` | AI SDK v6 (2025) | Must use new API; old function deprecated |
| Multiple server action calls for parallelism | Single server action with internal `Promise.allSettled` | Known since Next.js 14+ | Avoids sequential execution bug |
| Cheerio CommonJS `require('cheerio')` | ESM `import * as cheerio from 'cheerio'` | Cheerio 1.0+ | Deep imports no longer work; use ESM |
| Direct API keys for AI providers | AI Gateway + OIDC (no keys needed on Vercel) | AI SDK v5.0.36+ | Just use model string like `'anthropic/claude-sonnet-4.6'` |

**Deprecated/outdated:**
- `generateObject` from AI SDK: Replaced by `generateText` + `Output.object()` in v6
- Cheerio `require()` imports: Use ESM `import * as cheerio from 'cheerio'`
- `useFormState` from React DOM: Replaced by `useActionState` from React 19

## Open Questions

1. **Exact CSS selectors for Moldovan registry sites**
   - What we know: The three sites (idno.md, srl.md, openmoney.md) exist and contain company data. URL patterns and exact HTML selectors could not be fully determined via WebFetch (sites use JS rendering or have non-standard structures).
   - What's unclear: The exact URL patterns for individual company pages and the CSS selectors for data extraction. Live testing with real IDNOs is required.
   - Recommendation: Build scraper modules with placeholder selectors, test against real IDNOs during implementation. Log raw HTML responses during development for selector discovery. Each scraper should fail gracefully (return null fields) when selectors don't match.

2. **OpenMoney.md data relevance**
   - What we know: OpenMoney focuses on public procurement transparency (who gets government contracts), not company registration data. It is an Angular SPA.
   - What's unclear: Whether it returns useful company profile fields (name, industry, location) or only procurement data. Being an Angular SPA, it may require API-level scraping rather than HTML parsing.
   - Recommendation: Investigate if OpenMoney has a backend API that returns JSON (Angular apps often do). If it only provides procurement data, its confidence weight for profile fields should be very low or it should contribute supplementary data to `enriched_data` rather than core fields.

3. **IDNO URL patterns**
   - What we know: idno.md shows a search interface with advanced filters. srl.md uses `/en/search` endpoint.
   - What's unclear: Whether `idno.md/{idno_number}` works as a direct company page URL, or if search is required first.
   - Recommendation: During implementation, test both direct URL access (`https://idno.md/1003600070650`) and search-based approaches. The scraper should try direct URL first, fall back to search.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended -- fast, ESM-native, works with Next.js) |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | IDNO validation (format + check digit) | unit | `npx vitest run src/lib/validation/__tests__/idno.test.ts -t "validates"` | -- Wave 0 |
| PROF-03 | Aggregate orchestrator merges results correctly | unit | `npx vitest run src/lib/sources/__tests__/aggregate.test.ts` | -- Wave 0 |
| PROF-03 | Individual scrapers handle timeout/error | unit | `npx vitest run src/lib/sources/__tests__/scrapers.test.ts` | -- Wave 0 |
| PROF-02 | AI inference returns valid schema | unit | `npx vitest run src/lib/ai/__tests__/infer-profile.test.ts` | -- Wave 0 |
| PROF-04 | Manual form fallback when all sources fail | manual-only | Manual: submit invalid IDNO, verify form appears | N/A |
| PROF-05 | Profile stored in DB with enriched_data | integration | `npx vitest run src/app/actions/__tests__/profile.test.ts` | -- Wave 0 |
| PROF-06 | Partial indicator shown correctly | unit | `npx vitest run src/app/(home)/__tests__/partial-badge.test.ts` | -- Wave 0 |
| PURCH-01 | Chip selection pre-fills text field | unit | `npx vitest run src/app/(home)/__tests__/purchase-chips.test.ts` | -- Wave 0 |
| BRWSE-01 | Grants browse page loads active grants | integration | `npx vitest run src/app/grants/browse/__tests__/page.test.ts` | -- Wave 0 |
| BRWSE-02 | Search filters grants by name | unit | Manual or integration test against Supabase | -- Wave 0 |
| BRWSE-03 | Filters by provider/funding/deadline | unit | Manual or integration test against Supabase | -- Wave 0 |
| BRWSE-04 | Grant card renders all fields | unit | `npx vitest run src/app/grants/browse/__tests__/grant-card.test.ts` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@vitejs/plugin-react` -- install and configure
- [ ] `vitest.config.ts` -- project config with path aliases
- [ ] `src/lib/validation/__tests__/idno.test.ts` -- IDNO validation tests
- [ ] `src/lib/sources/__tests__/aggregate.test.ts` -- merge logic tests
- [ ] `src/lib/sources/__tests__/scrapers.test.ts` -- scraper timeout/error tests (mocked fetch)
- [ ] `src/lib/ai/__tests__/infer-profile.test.ts` -- AI inference schema tests (mocked AI)

## Sources

### Primary (HIGH confidence)
- [AI SDK v6 docs: Output.object()](https://ai-sdk.dev/docs/reference/ai-sdk-core/output) -- structured output API reference
- [AI SDK v6 docs: generateText](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) -- generating structured data guide
- [AI SDK docs: AI Gateway provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway) -- AI Gateway setup, OIDC, model strings
- [python-stdnum md.idno](https://github.com/arthurdejong/python-stdnum) -- IDNO check digit algorithm (weights 7,3,1; mod 10)
- [Supabase docs: upsert](https://supabase.com/docs/reference/javascript/upsert) -- ON CONFLICT handling

### Secondary (MEDIUM confidence)
- [Next.js GitHub #69265](https://github.com/vercel/next.js/issues/69265) -- Server Actions sequential execution limitation
- [Next.js docs: Server Actions](https://nextjs.org/docs/app/getting-started/updating-data) -- form handling, revalidation
- [Cheerio npm](https://www.npmjs.com/package/cheerio) -- v1.2.0, TypeScript, ESM support
- [LookupTax Moldova](https://lookuptax.com/docs/tax-identification-number/moldova-tax-id-guide) -- IDNO format: 13 digits, structure breakdown
- [UNDP Moldova OpenMoney](https://www.undp.org/moldova/blog/how-public-money-spent-moldova-through-public-procurement-openmoneymd-knows-everything) -- OpenMoney is procurement transparency, not registration
- [org-id.guide MD-IDNO](https://org-id.guide/list/MD-IDNO) -- IDNO as legal entity identifier, monthly data updates

### Tertiary (LOW confidence)
- Moldovan registry site structures (idno.md, srl.md, openmoney.md) -- Could not fully determine URL patterns or CSS selectors via automated fetch. Sites need live browser testing for selector discovery. **Flag: scraper selectors require manual discovery during implementation.**

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- AI SDK v6, Cheerio, Supabase are well-documented; API patterns verified from official docs
- Architecture: HIGH -- Server Action + Promise.allSettled pattern verified against known Next.js limitation; service-role client pattern established in Phase 1
- Pitfalls: HIGH -- Sequential server action execution, RLS anonymous bypass, and IDNO race condition are documented issues with verified solutions
- Scraper selectors: LOW -- Cannot determine exact CSS selectors without live testing against Moldovan sites; placeholder selectors used in examples
- AI inference quality: MEDIUM -- AI SDK v6 Output.object() is documented and stable, but Romanian output quality needs testing

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days -- stable stack, scraper selectors may need updates sooner)
