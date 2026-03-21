# Phase 3: Grant Matching - Research

**Researched:** 2026-03-21
**Domain:** AI-powered grant matching (SQL pre-filter + LLM ranking), results UI, shareable links
**Confidence:** HIGH

## Summary

Phase 3 transforms a company profile + purchase need into a ranked list of matching grants with AI-generated explanations in Romanian. The architecture is a two-stage pipeline: (1) a rule-based SQL pre-filter that eliminates clearly ineligible grants using the `eligibility_rules` JSONB column, followed by (2) an AI ranking step that scores remaining candidates 0-100 with one-paragraph Romanian explanations. The results page shows a hero card for the top match, scored list for others, and improvement suggestions for sub-50% matches.

The existing codebase provides strong foundations: the `grants` table already has `eligibility_rules` JSONB with a structured format (`{rule, field, operator, value}`), `company_profiles` has `share_token` UUID with 30-day expiry and an RLS policy for anonymous read access, and the AI inference module (`src/lib/ai/infer-profile.ts`) establishes the exact pattern for AI SDK v6 structured output (`generateText` + `Output.object()` with Zod schemas). The session system already tracks `companyProfileId` via iron-session, so the matching flow can identify which company to match without authentication.

**Primary recommendation:** Build a server action `matchGrants(profileId)` that runs SQL pre-filter then AI ranking, returning scored results. Use `Output.array()` for the AI response to get a typed array of grant scores. The results page at `/results/[token]` reads from `company_profiles.share_token` with the existing RLS policy for public access.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MATCH-01 | Rule-based SQL pre-filter eliminates clearly ineligible grants | Eligibility rules JSONB structure already defined in seed data with operators (equals, contains, gte, lte, in). Server action uses admin client to query grants and filter in application code against company profile fields. |
| MATCH-02 | AI ranking produces 0-100% match scores with one-paragraph Romanian explanations | AI SDK v6 `generateText` + `Output.array()` pattern with Zod schema for `{grant_id, score, explanation}`. Same model string `anthropic/claude-sonnet-4.6` used in existing `infer-profile.ts`. |
| MATCH-03 | Top recommendation displayed as hero card | UI component pattern follows existing `GrantCard` in browse page but expanded with score badge, AI explanation paragraph, funding amount, and deadline. First item in sorted results array. |
| MATCH-04 | Below-threshold (<50%) matches show AI suggestions for becoming eligible | AI prompt includes instruction to add `improvement_suggestions` array for grants scoring below 50. Zod schema includes optional suggestions field. |
| MATCH-05 | Each grant card has "Aplica acum" and "Salveaza" actions | Two buttons per card. "Aplica acum" links to `/grants/{id}` (writer page, Phase 5). "Salveaza" is Phase 4 (AUTH-07) -- render disabled/placeholder button until auth is implemented. |
| MATCH-06 | Profile panel (sidebar desktop, collapsible mobile) shows company data with edit link | Reuse `ProfileResult` component patterns from `(home)/profile-result.tsx`. Sidebar layout on `md:` breakpoint, collapsible `<details>` on mobile. Edit link goes to `/` (landing flow). |
| MATCH-07 | Share button generates `/results/{share_token}` link with 30-day expiry | `company_profiles.share_token` UUID already exists with `share_token_expires_at` defaulting to now()+30 days. Server action regenerates token on share click. Results page at `app/results/[token]/page.tsx` reads via admin client with token lookup. |
| MATCH-08 | Server-side ownership validation for profile access (auth check or cookie) | `getSession().companyProfileId` for anonymous users, `auth.uid() = user_id` for authenticated. Server action validates before returning match results. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (AI SDK) | ^6.0.134 | Structured output generation for grant ranking | Already in project, v6 `generateText` + `Output.array()` pattern |
| zod | (bundled with ai) | Schema definition for AI structured output | Used by AI SDK for output validation |
| @supabase/supabase-js | ^2.99.3 | Database queries for pre-filter and profile access | Already in project, admin client pattern established |
| iron-session | ^8.0.4 | Anonymous session tracking (companyProfileId) | Already in project, session pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons for match score indicators, share button, actions | Already in project |
| shadcn/ui components | ^4.1.0 | Card, Badge, Button for results UI | Already in project, established patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Application-code rule matching | PostgreSQL function for pre-filter | SQL function would be faster but harder to debug/test; application code is simpler and the grant count is small (50-100 grants max) |
| `Output.array()` for AI ranking | `Output.object()` with nested array | `Output.array()` provides typed element iteration and cleaner schema definition |
| Server Action for matching | Route Handler with streaming | Server Action is simpler since we need the full result set before rendering; streaming would add complexity without benefit for 5-20 grant scores |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    results/
      [token]/
        page.tsx            # Public shareable results page (SSR)
    (home)/
      landing-flow.tsx      # MODIFY: redirect to /results after matching
  lib/
    matching/
      pre-filter.ts         # Rule-based eligibility filter
      rank-grants.ts        # AI ranking with structured output
      types.ts              # MatchResult, GrantScore types
  app/
    actions/
      matching.ts           # Server action: matchGrants()
      share.ts              # Server action: generateShareLink()
  components/
    grants/
      hero-card.tsx          # Top match hero display
      match-card.tsx         # Scored grant card with actions
      match-list.tsx         # Ranked list of matches
      profile-sidebar.tsx    # Company profile panel
      improvement-tips.tsx   # Sub-50% improvement suggestions
```

### Pattern 1: Two-Stage Matching Pipeline
**What:** SQL pre-filter eliminates clearly ineligible grants, then AI ranks the survivors.
**When to use:** Always -- the pre-filter reduces AI token cost and latency.
**Example:**
```typescript
// Source: Project-specific pattern based on existing eligibility_rules JSONB
// src/lib/matching/pre-filter.ts

import type { CompanyFields } from '@/lib/sources/types'

interface EligibilityRule {
  rule: string        // Human-readable description
  field: string       // Profile field to check
  operator: string    // equals, contains, gte, lte, in
  value: unknown      // Expected value
}

interface GrantWithRules {
  id: string
  name: string
  provider_agency: string
  description: string | null
  max_funding: number | null
  currency: string
  deadline: string | null
  eligibility_rules: EligibilityRule[] | null
  scoring_rubric: unknown
}

export function preFilterGrants(
  grants: GrantWithRules[],
  profile: CompanyFields & { purchase_need?: string | null }
): GrantWithRules[] {
  return grants.filter((grant) => {
    if (!grant.eligibility_rules || grant.eligibility_rules.length === 0) {
      return true // No rules = potentially eligible
    }
    // Check each rule -- grant passes if no rule explicitly disqualifies
    return grant.eligibility_rules.every((rule) => {
      const profileValue = getProfileField(profile, rule.field)
      if (profileValue === null || profileValue === undefined) {
        return true // Unknown data = don't disqualify (AI will assess)
      }
      return evaluateRule(rule.operator, profileValue, rule.value)
    })
  })
}

function getProfileField(profile: Record<string, unknown>, field: string): unknown {
  // Map eligibility rule fields to company profile fields
  const fieldMap: Record<string, string> = {
    location: 'location',
    industry: 'industry',
    legal_form: 'legal_form',
    company_size: 'company_size',
  }
  return profile[fieldMap[field] ?? field] ?? null
}

function evaluateRule(operator: string, profileValue: unknown, ruleValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return String(profileValue).toLowerCase() === String(ruleValue).toLowerCase()
    case 'contains':
      return String(profileValue).toLowerCase().includes(String(ruleValue).toLowerCase())
    case 'gte':
      return Number(profileValue) >= Number(ruleValue)
    case 'lte':
      return Number(profileValue) <= Number(ruleValue)
    case 'in':
      return Array.isArray(ruleValue) && ruleValue.includes(String(profileValue))
    default:
      return true // Unknown operator = don't disqualify
  }
}
```

### Pattern 2: AI Ranking with Structured Output
**What:** AI SDK v6 `generateText` + `Output.array()` to produce typed grant scores.
**When to use:** After pre-filter reduces the candidate set.
**Example:**
```typescript
// Source: AI SDK v6 docs (https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
// + existing project pattern from src/lib/ai/infer-profile.ts
// src/lib/matching/rank-grants.ts

import { generateText, Output } from 'ai'
import { z } from 'zod'

const grantScoreSchema = z.object({
  grant_id: z.string(),
  score: z.number().min(0).max(100),
  explanation: z.string().describe('One paragraph explanation in Romanian'),
  improvement_suggestions: z
    .array(z.string())
    .optional()
    .describe('For grants below 50% -- what the company could change to qualify'),
})

export type GrantScore = z.infer<typeof grantScoreSchema>

export async function rankGrants(
  profile: { company_name: string | null; industry: string | null; location: string | null; legal_form: string | null; purchase_need: string | null; enriched_data: unknown },
  candidates: Array<{ id: string; name: string; provider_agency: string; description: string | null; max_funding: number | null; eligibility_rules: unknown; scoring_rubric: unknown }>
): Promise<GrantScore[]> {
  if (candidates.length === 0) return []

  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    output: Output.array({
      element: grantScoreSchema,
    }),
    system: `Esti un expert in granturi si finantari din Republica Moldova.
Analizeaza profilul companiei si evalueaza potrivirea cu fiecare grant.

Reguli:
- Scorul trebuie sa fie intre 0 si 100
- Explicatia trebuie sa fie un paragraf scurt in limba romana, in limbaj simplu
- Pentru granturile cu scor sub 50, adauga sugestii concrete de imbunatatire (ce ar putea schimba compania ca sa devina eligibila)
- Tine cont de: eligibilitate, domeniu de activitate, forma juridica, locatie, nevoia de achizitie
- Scorul reflecta cat de bine se potriveste profilul cu criteriile grantului`,
    prompt: `Profilul companiei:
${JSON.stringify(profile, null, 2)}

Granturile candidate:
${JSON.stringify(candidates, null, 2)}

Evalueaza fiecare grant si returneaza scorul de potrivire.`,
  })

  if (!output) return []

  // Sort by score descending
  return output.sort((a, b) => b.score - a.score)
}
```

### Pattern 3: Server Action for Matching (with ownership validation)
**What:** Server action that validates session ownership, runs the pipeline, and returns results.
**When to use:** Called from landing flow after purchase need step.
**Example:**
```typescript
// src/app/actions/matching.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'
import { preFilterGrants } from '@/lib/matching/pre-filter'
import { rankGrants } from '@/lib/matching/rank-grants'

export async function matchGrants() {
  const session = await getSession()
  if (!session.companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  const admin = createAdminClient()

  // 1. Fetch company profile (MATCH-08: ownership validation via session)
  const { data: profile, error: profileErr } = await admin
    .from('company_profiles')
    .select('*')
    .eq('id', session.companyProfileId)
    .single()

  if (profileErr || !profile) {
    return { error: 'Profilul companiei nu a fost gasit' }
  }

  // 2. Fetch active grants with eligibility rules
  const { data: grants } = await admin
    .from('grants')
    .select('id, name, provider_agency, description, max_funding, currency, deadline, eligibility_rules, scoring_rubric')
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString())

  if (!grants || grants.length === 0) {
    return { error: 'Nu exista granturi active in acest moment' }
  }

  // 3. Pre-filter (MATCH-01)
  const candidates = preFilterGrants(grants, profile)

  // 4. AI ranking (MATCH-02)
  const scores = await rankGrants(profile, candidates)

  return {
    profile,
    scores,
    totalGrants: grants.length,
    filteredCount: candidates.length,
  }
}
```

### Pattern 4: Shareable Results Page (Next.js 16 dynamic route)
**What:** Public `/results/[token]` page using the existing `share_token` column and RLS policy.
**When to use:** When user clicks "Share" and when anyone visits the shared link.
**Example:**
```typescript
// src/app/results/[token]/page.tsx
// Next.js 16: params is Promise

import { createAdminClient } from '@/lib/supabase/admin'

interface ResultsPageProps {
  params: Promise<{ token: string }>
}

export default async function SharedResultsPage({ params }: ResultsPageProps) {
  const { token } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return notFound()
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('company_profiles')
    .select('*')
    .eq('share_token', token)
    .gt('share_token_expires_at', new Date().toISOString())
    .single()

  if (!profile) {
    return notFound()
  }

  // Run matching for this profile (read-only, no session needed)
  // ... render results
}
```

### Anti-Patterns to Avoid
- **Running AI on all grants without pre-filter:** Wastes tokens and adds 5-10 seconds latency. Always pre-filter first.
- **Storing match scores in the database:** Match scores are ephemeral and depend on current grant state. Compute them on each request. Only exception: if caching becomes necessary for performance.
- **Using the anon Supabase client for profile lookup:** Anonymous users have no auth.uid(), so RLS policies based on `user_id = auth.uid()` return nothing. Use the admin (service role) client with session-based ownership validation instead.
- **Streaming the AI ranking response:** Unlike the writer (Phase 5), the matching result needs the full ranked list before rendering. Streaming individual scores would create a janky UX. Use non-streaming `generateText`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation for share tokens | Custom random string generator | Database `gen_random_uuid()` (already in schema) | Cryptographically secure, no collision risk, already set as column default |
| Rule evaluation engine | Complex expression parser | Simple switch/case on 5 known operators | Only 5 operators exist in seed data (equals, contains, gte, lte, in). YAGNI. |
| Score visualization (0-100%) | Custom progress bar from scratch | Tailwind `w-[${score}%]` with color steps | Three color tiers (red <50, yellow 50-75, green >75) with simple width utility |
| Token expiry enforcement | Application-level date checks | SQL `WHERE share_token_expires_at > now()` | Database handles timezone correctly, single source of truth |
| AI output validation | Manual JSON parsing + type checking | AI SDK `Output.array()` with Zod schema | Automatic validation, typed output, error handling built in |

**Key insight:** The database schema was designed for this phase -- `share_token`, `share_token_expires_at`, `eligibility_rules` JSONB, and `scoring_rubric` JSONB are all pre-built. The work is connecting them through application code, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: AI Returning Invalid Grant IDs
**What goes wrong:** The AI generates `grant_id` values that don't match any actual grant UUID, making it impossible to correlate scores with grants.
**Why it happens:** LLMs can hallucinate UUIDs or truncate them.
**How to avoid:** Pass grant IDs as simple sequential labels (`grant_1`, `grant_2`) in the prompt, then map back to real UUIDs in application code. Alternatively, validate returned IDs against the input set and discard unmatched entries.
**Warning signs:** Missing grants in the results list, or `undefined` entries when looking up grant details by ID.

### Pitfall 2: Pre-Filter Over-Aggressiveness
**What goes wrong:** The rule-based pre-filter eliminates grants that a human would consider "maybe eligible," resulting in too few results.
**Why it happens:** Strict equality checks on incomplete profile data. For example, `location = "Moldova"` fails if the profile has `location = "Chisinau"`.
**How to avoid:** When profile data is null/undefined for a checked field, pass the grant through (don't disqualify). Use `contains` instead of `equals` for location matching. Let the AI handle nuanced eligibility.
**Warning signs:** User with a valid profile gets zero matches when grants clearly exist.

### Pitfall 3: AI Token Cost Explosion
**What goes wrong:** Sending full `enriched_data` JSONB (which includes raw scraper HTML and debug info) to the AI inflates token count significantly.
**Why it happens:** Using `JSON.stringify(profile)` without filtering fields.
**How to avoid:** Build a lean profile summary with only the fields the AI needs: `company_name`, `industry`, `location`, `legal_form`, `purchase_need`, and key enriched fields (activities, company_size). Strip raw scraper data.
**Warning signs:** AI calls taking >10 seconds, unexpectedly high API costs.

### Pitfall 4: Share Token Timing Attack
**What goes wrong:** Iterating through UUIDs to find valid share tokens.
**Why it happens:** UUID v4 is unguessable (122 bits of entropy), but the concern is real if tokens are sequential or predictable.
**How to avoid:** Use `gen_random_uuid()` (already in schema). Add rate limiting at the Vercel Firewall level (project already notes Vercel Firewall handles rate limiting). The UUID v4 space is 2^122, making brute force infeasible.
**Warning signs:** High volume of 404s on `/results/` paths.

### Pitfall 5: Stale Grant Deadlines in Results
**What goes wrong:** User sees a matched grant with an expired deadline because the matching was done hours/days ago.
**Why it happens:** Results page renders cached or stored match data without checking current deadline.
**How to avoid:** Always filter `deadline >= now()` at query time in both the pre-filter and the results page. The shared results page should re-run the deadline check even if displaying cached scores.
**Warning signs:** User clicks "Aplica acum" on an expired grant.

## Code Examples

### Server Action Pattern (consistent with Phase 2)
```typescript
// Source: Existing pattern from src/app/actions/profile.ts
// All server actions in this project follow this pattern:
// 1. Validate session/input
// 2. Use admin client (service role) for DB operations
// 3. Return { error: string } on failure (not exceptions)
// 4. Romanian error messages

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

export async function generateShareLink() {
  const session = await getSession()
  if (!session.companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  const admin = createAdminClient()

  // Regenerate share token with fresh 30-day expiry
  const { data, error } = await admin
    .from('company_profiles')
    .update({
      share_token: admin.rpc('gen_random_uuid'), // or use crypto.randomUUID()
      share_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', session.companyProfileId)
    .select('share_token')
    .single()

  if (error || !data) {
    return { error: 'Nu am putut genera linkul de partajare' }
  }

  return { shareToken: data.share_token }
}
```

### Results Page Layout (responsive sidebar/collapsible)
```typescript
// Pattern for MATCH-06: Profile sidebar (desktop) / collapsible (mobile)
// Uses existing shadcn Card components + Tailwind responsive utilities

// Desktop: two-column layout with sticky sidebar
// Mobile: collapsible details element above results

function ResultsLayout({
  profile,
  children,
}: {
  profile: ProfileData
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Mobile: collapsible profile */}
      <details className="mb-6 md:hidden">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          Profilul companiei tale
        </summary>
        <div className="mt-2">
          <ProfileSidebar profile={profile} />
        </div>
      </details>

      <div className="flex gap-8">
        {/* Desktop: sticky sidebar */}
        <aside className="hidden md:block md:w-80 md:shrink-0">
          <div className="sticky top-8">
            <ProfileSidebar profile={profile} />
          </div>
        </aside>

        {/* Results */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Score Badge Component
```typescript
// Visual indicator for match score (0-100)
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'bg-green-100 text-green-800 border-green-200'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${color}`}>
      {score}%
    </span>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` | `generateText()` + `Output.object()/array()` | AI SDK v6 (2025) | Unified API, supports tool calling + structured output together |
| `useFormState` (React) | `useActionState` (React 19) | React 19 | Project already uses `useActionState` in Phase 2 components |
| `params: { token: string }` | `params: Promise<{ token: string }>` | Next.js 15+ | Dynamic route params are async in Server Components |
| middleware.ts | proxy.ts | Next.js 16 | Project uses proxy.ts for auth, established in Phase 1 |

**Deprecated/outdated:**
- `generateObject()` from AI SDK v5 -- replaced by `Output.object()` on `generateText`
- `useFormState` from React 18 -- replaced by `useActionState` in React 19
- Synchronous `params` in Next.js pages -- now `Promise<>` in v15+

## Open Questions

1. **Caching matched results for shared links**
   - What we know: The shared results page re-runs matching each time it loads, which triggers an AI call. This is correct for freshness but expensive.
   - What's unclear: Whether to cache AI results for shared links (e.g., in a `match_results` JSONB column on `company_profiles`).
   - Recommendation: For v1, re-run matching each time. The grant count is small (< 50) and latency is acceptable (2-5 seconds). If cost becomes an issue, add caching later.

2. **Profile fields not covered by eligibility rules**
   - What we know: Seed data rules check `location`, `industry`, `company_size`, `legal_form`, `company_age`, `revenue`. Company profiles from Phase 2 have `location`, `industry`, `legal_form` but not `company_age`, `revenue`, or `company_size` (except for AI-inferred profiles which have `company_size`).
   - What's unclear: How to handle rules referencing fields that don't exist on the profile.
   - Recommendation: Treat missing fields as "not disqualifying" in the pre-filter (pass through). The AI ranking step can reason about missing data and penalize the score appropriately.

3. **Redirect flow after matching**
   - What we know: The landing flow currently ends at a "complete" step with a link to `/grants/browse`. Phase 3 should redirect to a results page instead.
   - What's unclear: Whether to redirect to `/results/{token}` (shareable) or a session-based `/results` page.
   - Recommendation: Use a session-based `/results` page for the primary flow (no token needed, session owns the profile). The share flow generates a token for the public `/results/[token]` route. This avoids exposing tokens in the primary user journey.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MATCH-01 | Pre-filter eliminates ineligible grants by rule evaluation | unit | `npx vitest run src/lib/matching/__tests__/pre-filter.test.ts -x` | No -- Wave 0 |
| MATCH-02 | AI ranking returns valid scored array with explanations | unit (mocked AI) | `npx vitest run src/lib/matching/__tests__/rank-grants.test.ts -x` | No -- Wave 0 |
| MATCH-03 | Hero card renders top match with all required fields | unit (jsdom) | `npx vitest run src/components/grants/__tests__/hero-card.test.ts -x` | No -- Wave 0 |
| MATCH-04 | Sub-50% matches include improvement suggestions | unit | `npx vitest run src/lib/matching/__tests__/rank-grants.test.ts -x` | No -- Wave 0 |
| MATCH-05 | Grant cards render with Aplica acum and Salveaza buttons | unit (jsdom) | `npx vitest run src/components/grants/__tests__/match-card.test.ts -x` | No -- Wave 0 |
| MATCH-06 | Profile sidebar renders company data | unit (jsdom) | `npx vitest run src/components/grants/__tests__/profile-sidebar.test.ts -x` | No -- Wave 0 |
| MATCH-07 | Share link generates valid token URL | unit | `npx vitest run src/app/actions/__tests__/share.test.ts -x` | No -- Wave 0 |
| MATCH-08 | Ownership validation rejects unauthorized access | unit | `npx vitest run src/app/actions/__tests__/matching.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/matching/__tests__/pre-filter.test.ts` -- covers MATCH-01 (rule evaluation logic with all 5 operators)
- [ ] `src/lib/matching/__tests__/rank-grants.test.ts` -- covers MATCH-02, MATCH-04 (mocked AI responses, score sorting, suggestions for sub-50%)
- [ ] `src/app/actions/__tests__/matching.test.ts` -- covers MATCH-08 (session validation, error paths)
- [ ] `src/app/actions/__tests__/share.test.ts` -- covers MATCH-07 (token generation)

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- `supabase/migrations/001_initial_schema.sql` (grants table, eligibility_rules JSONB, share_token, RLS policies)
- **Project codebase** -- `supabase/seed.sql` (eligibility_rules structure: `{rule, field, operator, value}`)
- **Project codebase** -- `src/lib/ai/infer-profile.ts` (established AI SDK v6 pattern with `generateText` + `Output.object()`)
- **Project codebase** -- `src/app/actions/profile.ts` (server action pattern: admin client, session validation, Romanian errors)
- [AI SDK v6 Structured Data docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) -- `Output.array()` pattern for typed arrays
- [AI SDK Output API reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/output) -- `Output.object()`, `Output.array()`, `Output.choice()` signatures

### Secondary (MEDIUM confidence)
- [Next.js 16 Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) -- `params: Promise<>` pattern for server components
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Policy structure for anon access with token

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all patterns established in Phase 1-2
- Architecture: HIGH -- database schema pre-built for this phase, two-stage pipeline is standard
- Pitfalls: HIGH -- identified from direct codebase analysis (admin client requirement, token security, AI hallucination)
- AI integration: HIGH -- exact same `generateText` + `Output` pattern already working in `infer-profile.ts`

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- all dependencies pinned, no fast-moving external APIs)
