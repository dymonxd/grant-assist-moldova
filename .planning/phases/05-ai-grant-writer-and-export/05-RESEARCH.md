# Phase 5: AI Grant Writer and Export - Research

**Researched:** 2026-03-21
**Domain:** AI-assisted text generation with streaming, PDF export, email delivery, analytics
**Confidence:** HIGH

## Summary

Phase 5 is the core value delivery of GrantAssist Moldova -- transforming the matching results into a section-by-section AI writing assistant that produces rubric-optimized grant applications in Romanian. The phase covers three major technical domains: (1) AI text generation with streaming via Vercel AI SDK, (2) PDF export with Romanian diacritics via @react-pdf/renderer with custom fonts, and (3) email delivery via Resend. All three are well-supported by the existing stack.

The project already uses `generateText` + `Output` from the `ai` package (v6) with `@ai-sdk/openai` and the `gpt-5.4-nano` model. For streaming, the cleanest pattern is a Route Handler (`/api/writer/generate`) using `streamText` + `toTextStreamResponse()`, consumed client-side with either `@ai-sdk/react`'s `useCompletion` hook or a manual `fetch` + `ReadableStream` reader. The database schema is already fully designed -- `applications`, `application_sections`, and `grant_application_fields` tables exist with proper RLS policies. The Geist Sans TTF font ships with the project's `geist` npm package and supports Romanian diacritics, making it the optimal choice for `Font.register()` in @react-pdf/renderer.

**Primary recommendation:** Use Route Handler streaming (`streamText` + `toTextStreamResponse`) for the AI writer, Geist Sans TTF for PDF diacritics, and Resend with React component email templates for the export flow. Build the writer as a single `/grants/[grantId]/write` page with client-side section state management.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WRITE-01 | Grant application fields load from grant_application_fields table | DB schema exists with `grant_application_fields` table, RLS allows public SELECT. Seed data shows field_order, field_label, field_type, character_limit, helper_text columns. |
| WRITE-02 | Auto-preview of Section 1 generated on first writer visit | streamText via Route Handler generates preview; display as grayed-out italic text in section 1 |
| WRITE-03 | User writes brief answer, clicks "Genereaza cu AI", gets streaming Romanian text | streamText + toTextStreamResponse on server; fetch + ReadableStream reader or useCompletion on client |
| WRITE-04 | AI asks ONE clarifying question when input is too vague (<20 chars) | Client-side length check before API call; AI system prompt instructs single question behavior |
| WRITE-05 | AI uses company enriched_data + grant guidelines + scoring rubric in context | Reuse buildLeanProfile pattern from rank-grants.ts; include scoring_rubric and field helper_text in prompt |
| WRITE-06 | Inline scoring hints (collapsible) above each field showing rubric criteria | scoring_rubric stored as JSONB on grants table with criteria[].name, weight, description structure |
| WRITE-07 | Character count displayed with server-side truncation and user warning | character_limit column on grant_application_fields; client-side counter with threshold warning |
| WRITE-08 | Buttons per section: Editeaza, Regenereaza, Salveaza, Urmatoarea | Section state machine: preview -> editing -> generated -> saved; buttons toggle state |
| WRITE-09 | Progress bar showing "X din Y sectiuni completate" | Count application_sections where is_saved=true vs total grant_application_fields |
| WRITE-10 | Required documents checklist at bottom of page | grants.required_documents JSONB array; render as checkable list with local state |
| WRITE-11 | Grant summary with deadline countdown at top of page | Fetch grant data (name, provider, deadline, max_funding); compute days remaining |
| WRITE-12 | Deadline check on page load: block if expired, warn if <3 days | Server-side check in page.tsx; redirect or show warning banner based on deadline comparison |
| WRITE-13 | Field snapshot saved at application creation | Copy grant_application_fields to applications.field_snapshot JSONB on first visit |
| EXPRT-01 | "Copiaza tot" copies all sections to clipboard | navigator.clipboard.writeText with concatenated section text; no auth required |
| EXPRT-02 | "Descarca PDF" generates and downloads PDF | @react-pdf/renderer with Font.register(Geist Sans TTF); server-side renderToBuffer in Route Handler |
| EXPRT-03 | "Trimite pe email" sends formatted application via Resend | Resend SDK with React component email template; server action calling resend.emails.send() |
| EXPRT-04 | Unauthenticated users see account modal for PDF/email | Reuse AccountWallModal from Phase 4; copy is client-only (no auth gate) |
| EXPRT-05 | Deadline reminder opt-in | profiles.email_notifications column exists; add reminder_opt_in to notifications_log for this grant |
| EXPRT-06 | Required documents checklist with completion status | Same as WRITE-10 but in export view context; persisted in application metadata |
| GEN-05 | Analytics event tracking at each funnel stage | analytics_events table with RLS for admin insert; server action to log events with session_id, event_type |
| GEN-06 | Notification preferences page (settings) | profiles table has email_notifications column; simple form page at /settings |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | ^6.0.134 | streamText for AI generation | Already installed; provides streaming, structured output, model abstraction |
| @ai-sdk/openai | ^3.0.47 | OpenAI model provider (gpt-5.4-nano) | Already installed; project decision for AI model |
| @react-pdf/renderer | ^4.3.2 | Server-side PDF generation | Already installed; validated on Vercel in Phase 1 |
| resend | ^1.x (NEW) | Email delivery API | Project decision per memory; React component templates, simple API |
| geist | ^1.7.0 | Geist Sans TTF for PDF diacritics | Already installed; TTF files at node_modules/geist/dist/fonts/geist-sans/ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ai-sdk/react | ^1.x (NEW) | useCompletion hook for streaming UI | Optional -- can use manual fetch+ReadableStream instead to avoid new dependency |
| lucide-react | ^0.577.0 | Icons (FileText, Download, Mail, Copy, etc.) | Already installed; used throughout project |
| shadcn/ui components | ^4.1.0 | Card, Button, Badge, Dialog, Progress, Checkbox | Already installed; project UI framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ai-sdk/react useCompletion | Manual fetch + ReadableStream | Avoids new dependency; slightly more code but full control over streaming UX |
| @react-pdf/renderer | jspdf (client-side) | jspdf is already installed as fallback; client-side means no Vercel function timeout concerns but worse UX |
| Resend | Supabase Edge Functions + SMTP | More complex setup; Resend is simpler and already a project decision |
| Geist Sans TTF | Noto Sans TTF | Noto covers more scripts; Geist is already in the project and supports Romanian |

**Installation:**
```bash
npm install resend
# Optional (can use manual fetch streaming instead):
# npm install @ai-sdk/react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    grants/
      [grantId]/
        write/
          page.tsx            # Server Component: load grant, fields, deadline check, create application
          writer-client.tsx   # Client Component: section editor, streaming, progress
          section-editor.tsx  # Client Component: individual section with AI generate
          grant-header.tsx    # Client Component: grant summary + deadline countdown
          export-bar.tsx      # Client Component: copy/PDF/email export buttons
    api/
      writer/
        generate/
          route.ts            # POST Route Handler: streamText for section generation
        pdf/
          route.ts            # POST Route Handler: @react-pdf/renderer PDF generation
    actions/
      writer.ts               # Server Actions: createApplication, saveSection, trackAnalytics
      export.ts               # Server Actions: sendApplicationEmail, saveReminderOptIn
    settings/
      page.tsx                # Notification preferences page (GEN-06)
  lib/
    ai/
      generate-section.ts    # AI prompt construction with profile + rubric + field context
    email/
      application-email.tsx  # React Email component template for Resend
    pdf/
      application-pdf.tsx    # React-pdf Document component with Font.register
  components/
    writer/
      progress-bar.tsx        # "X din Y sectiuni completate"
      document-checklist.tsx  # Required documents checklist
      scoring-hints.tsx       # Collapsible rubric criteria display
```

### Pattern 1: Streaming AI Generation via Route Handler
**What:** Use a POST Route Handler with `streamText` that returns `toTextStreamResponse()`, consumed client-side with `fetch` and a `ReadableStream` reader.
**When to use:** For the "Genereaza cu AI" button -- single-prompt, non-conversational generation.
**Why not Server Action:** Server Actions cannot stream responses. Route Handlers are the correct Next.js pattern for streaming.
**Example:**
```typescript
// src/app/api/writer/generate/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { sectionPrompt, companyContext, rubricContext, userBrief } = await req.json()

  const result = streamText({
    model: openai('gpt-5.4-nano'),
    system: `Esti un expert in scrierea cererilor de finantare din Moldova...`,
    prompt: `Sectiunea: ${sectionPrompt}\nContextul companiei: ${companyContext}\nCriterii rubrica: ${rubricContext}\nRaspunsul utilizatorului: ${userBrief}`,
    maxTokens: 2000,
  })

  return result.toTextStreamResponse()
}

// Client-side consumption (no @ai-sdk/react needed):
async function generateSection(payload: object) {
  const res = await fetch('/api/writer/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    setStreamedText(text) // React state update
  }
  return text
}
```

### Pattern 2: Application Creation with Field Snapshot (WRITE-13)
**What:** On first visit to `/grants/[grantId]/write`, create an application record with a snapshot of the current grant fields. This ensures in-progress applications are not broken if grant fields change later.
**When to use:** Always on first writer page load.
**Example:**
```typescript
// Server Action: createApplication
const { data: fields } = await admin
  .from('grant_application_fields')
  .select('*')
  .eq('grant_id', grantId)
  .order('field_order')

const { data: app } = await admin
  .from('applications')
  .insert({
    user_id: userId,          // null for anonymous
    grant_id: grantId,
    company_profile_id: session.companyProfileId,
    field_snapshot: fields,   // JSONB snapshot
    status: 'in_progress',
  })
  .select()
  .single()

// Pre-create application_sections for each field
const sections = fields.map(f => ({
  application_id: app.id,
  grant_field_id: f.id,
}))
await admin.from('application_sections').insert(sections)
```

### Pattern 3: Section State Machine
**What:** Each section transitions through states: `empty` -> `user_brief_entered` -> `ai_generating` -> `ai_drafted` -> `editing` -> `saved`. The UI buttons change based on state.
**When to use:** For all section interactions.
**State transitions:**
- `empty`: Show placeholder, "Genereaza cu AI" disabled until user types
- `user_brief_entered`: "Genereaza cu AI" enabled (if >=20 chars; else show clarifying question logic)
- `ai_generating`: Streaming text appears, buttons disabled
- `ai_drafted`: Show AI text, enable "Editeaza", "Regenereaza", "Salveaza", "Urmatoarea"
- `saved`: Section locked with "Editeaza" to re-enter editing mode

### Pattern 4: PDF Generation with Romanian Diacritics
**What:** Server-side PDF generation using @react-pdf/renderer with Geist Sans font registered for Romanian character support.
**When to use:** For EXPRT-02 "Descarca PDF" button.
**Critical detail:** The existing PDF test route uses Helvetica which lacks ă, ș, ț glyphs. Phase 5 MUST register Geist Sans.
**Example:**
```typescript
// src/lib/pdf/application-pdf.tsx
import { Font, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import path from 'path'

// Register Geist Sans with Romanian diacritics support
Font.register({
  family: 'Geist Sans',
  fonts: [
    { src: path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf') },
    { src: path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf'), fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Geist Sans', fontSize: 11, lineHeight: 1.6 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 16, marginBottom: 4 },
  text: { fontSize: 11, color: '#333' },
})
```

### Pattern 5: Deadline Gating (WRITE-12)
**What:** Server-side deadline check in page.tsx before rendering the writer.
**When to use:** On every writer page load.
**Example:**
```typescript
// In page.tsx (Server Component)
const grant = await fetchGrant(grantId)
const now = new Date()
const deadline = new Date(grant.deadline)

if (deadline < now) {
  return <ExpiredGrantBlock grantName={grant.name} />
}

const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
const isUrgent = daysLeft <= 3
// Pass isUrgent + daysLeft to client component for warning banner
```

### Anti-Patterns to Avoid
- **Streaming via Server Action:** Server Actions return serialized values, not streams. MUST use Route Handler for streaming AI text.
- **Client-side PDF with react-pdf:** The existing validation confirmed @react-pdf/renderer works server-side on Vercel. Do NOT switch to client-side jspdf unless server fails.
- **Variable TTF fonts in react-pdf:** OpenType Variable fonts (.ttf with [wght] suffix) are NOT supported by PDF spec. Use individual weight files (Geist-Regular.ttf, Geist-Bold.ttf).
- **Storing AI-generated text only in state:** Every generated/saved section MUST be persisted to application_sections table to survive page refreshes.
- **Full conversation history in AI prompt:** This is NOT a chat. Each section generation is a single-prompt call with context (company data + rubric + field info + user brief). Do NOT accumulate messages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF pipeline | @react-pdf/renderer + renderToBuffer | Already validated on Vercel; handles page breaks, fonts, styling |
| Email delivery | Direct SMTP or fetch to email API | Resend SDK with React templates | Error handling, retry logic, domain verification built in |
| Streaming text | Custom SSE or WebSocket implementation | AI SDK streamText + toTextStreamResponse | Handles backpressure, encoding, error recovery, abort signals |
| Clipboard copy | document.execCommand('copy') | navigator.clipboard.writeText | Modern API, Promise-based, works in all modern browsers |
| Character counting | Manual substring + emoji handling | String.length (sufficient for Romanian) | Romanian text has no multi-codepoint characters that break .length |
| Deadline calculation | Manual date math | Date subtraction + Math.ceil for days | Simple enough; no date library needed for day-level precision |

**Key insight:** The heaviest lifting (streaming, PDF, email) all have mature library solutions already in or compatible with the project stack. The custom work is in the UI state management (section editor states, progress tracking) and prompt engineering (rubric-optimized Romanian text).

## Common Pitfalls

### Pitfall 1: Variable Font Files in react-pdf
**What goes wrong:** Using `Geist-Italic[wght].ttf` (variable font) causes react-pdf to silently fail or render boxes instead of glyphs.
**Why it happens:** PDF 2.0 spec does not support OpenType Variable fonts.
**How to avoid:** Use only individual weight files: `Geist-Regular.ttf`, `Geist-Bold.ttf`. Never use files with `[wght]` in the name.
**Warning signs:** Boxes or missing characters in generated PDF.

### Pitfall 2: Font Path Resolution on Vercel
**What goes wrong:** `path.join(process.cwd(), 'node_modules/...')` resolves differently in local dev vs Vercel serverless.
**Why it happens:** Vercel bundles dependencies differently; `node_modules` may not exist at runtime.
**How to avoid:** Copy font files to `public/fonts/` directory during build, or use `fs.readFileSync` with `@vercel/nft`-compatible paths. Alternative: host font on CDN and use URL in Font.register.
**Warning signs:** "Font family not registered" errors only on Vercel, not locally.

### Pitfall 3: RLS Blocking Anonymous Writer Access
**What goes wrong:** The `applications` and `application_sections` tables have RLS policies requiring `auth.uid() = user_id`. Anonymous users (AUTH-04 "Continua fara cont") will get permission denied.
**Why it happens:** RLS policies were designed for authenticated users only.
**How to avoid:** Use `createAdminClient()` (service role) for application CRUD in server actions, similar to how profile.ts already works. The session's `companyProfileId` provides the authorization check.
**Warning signs:** 403/empty results when unauthenticated users try to use the writer.

### Pitfall 4: Streaming Response Blocked by Proxy
**What goes wrong:** Streaming text appears all at once instead of progressively.
**Why it happens:** Proxy/middleware buffering the response, or missing headers.
**How to avoid:** Ensure the Route Handler sets `Content-Type: text/plain; charset=utf-8` and does NOT set `Content-Length`. Verify proxy.ts does not intercept `/api/writer/*` routes.
**Warning signs:** Text appears after full generation delay instead of streaming incrementally.

### Pitfall 5: AI Prompt Token Explosion
**What goes wrong:** Including full enriched_data (raw scraper HTML), all scoring rubric criteria, and grant description in every section prompt exceeds token limits or costs too much.
**Why it happens:** enriched_data contains raw HTML from 3 scrapers; scoring_rubric can be large.
**How to avoid:** Reuse `buildLeanProfile` pattern from rank-grants.ts. Extract only relevant rubric criteria for the specific section. Keep total prompt under ~2000 tokens.
**Warning signs:** Slow generation times, high API costs, or truncated output.

### Pitfall 6: Race Condition on Auto-Preview (WRITE-02)
**What goes wrong:** Multiple auto-preview generations fire if the user navigates quickly or the component re-mounts.
**Why it happens:** React Strict Mode double-renders, or user clicking between sections.
**How to avoid:** Use AbortController to cancel in-flight requests on cleanup. Track generation state per-section with a ref to prevent double-fires.
**Warning signs:** Duplicate AI responses, flickering text, or API rate limiting.

### Pitfall 7: Export Button State for Anonymous Users (EXPRT-04)
**What goes wrong:** Copy works, but PDF/email silently fail for unauthenticated users.
**Why it happens:** PDF Route Handler and email Server Action may require auth.
**How to avoid:** Copy uses client-side clipboard API (no auth needed). PDF and email check auth state BEFORE calling -- show AccountWallModal if not authenticated. Use the existing AccountWallModal pattern from Phase 4.
**Warning signs:** Network errors in console when unauthenticated users click PDF/email.

## Code Examples

### AI Section Generation Prompt Construction
```typescript
// Source: Adapted from existing rank-grants.ts buildLeanProfile pattern
function buildSectionPrompt(
  field: { field_label: string; helper_text: string; character_limit: number | null },
  rubric: { criteria: Array<{ name: string; weight: number; description: string }> },
  profile: Record<string, unknown>,
  userBrief: string
): string {
  const leanProfile = buildLeanProfile(profile)
  const relevantCriteria = rubric.criteria
    .map(c => `- ${c.name} (${c.weight}%): ${c.description}`)
    .join('\n')

  return `Sectiunea: ${field.field_label}
Indicatii: ${field.helper_text}
${field.character_limit ? `Limita de caractere: ${field.character_limit}` : ''}

Criteriile de evaluare ale comisiei:
${relevantCriteria}

Datele companiei:
${JSON.stringify(leanProfile, null, 2)}

Raspunsul utilizatorului: ${userBrief}`
}
```

### Manual Stream Consumer (No @ai-sdk/react dependency)
```typescript
// Source: Standard Web Streams API pattern
async function streamGeneration(
  payload: GeneratePayload,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('/api/writer/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) throw new Error('Eroare la generare')

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    onChunk(fullText)
  }

  return fullText
}
```

### Clipboard Copy All Sections
```typescript
// Source: Standard Clipboard API
async function copyAllSections(
  sections: Array<{ label: string; text: string }>
): Promise<boolean> {
  const fullText = sections
    .map(s => `${s.label}\n${'='.repeat(s.label.length)}\n${s.text}`)
    .join('\n\n---\n\n')

  try {
    await navigator.clipboard.writeText(fullText)
    return true
  } catch {
    return false
  }
}
```

### Resend Email Server Action
```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendApplicationEmail(
  to: string,
  grantName: string,
  sections: Array<{ label: string; text: string }>
) {
  const html = sections
    .map(s => `<h3>${s.label}</h3><p>${s.text}</p>`)
    .join('<hr/>')

  const { error } = await resend.emails.send({
    from: 'GrantAssist <noreply@grantassist.md>',
    to: [to],
    subject: `Cererea ta de finantare: ${grantName}`,
    html: `<h2>${grantName}</h2>${html}`,
  })

  if (error) return { error: 'Eroare la trimiterea emailului' }
  return { success: true }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| generateObject() | generateText({ output: Output.object() }) | AI SDK v6 (2025) | Already adopted in codebase (infer-profile.ts, rank-grants.ts) |
| @ai-sdk/rsc createStreamableValue | Route Handler + streamText + toTextStreamResponse | AI SDK v6 (2025) | @ai-sdk/rsc is experimental; Route Handler is production recommended |
| document.execCommand('copy') | navigator.clipboard.writeText | 2020+ | Async, Promise-based, modern API with broad support |
| jspdf client-side PDF | @react-pdf/renderer server-side | Phase 1 validation | Server-side confirmed working on Vercel; better UX (no client JS bundle) |

**Deprecated/outdated:**
- `generateObject()` / `streamObject()`: Deprecated in AI SDK v6 in favor of `generateText({ output })` / `streamText({ output })`
- `@ai-sdk/rsc`: Experimental status; the AI SDK team recommends `@ai-sdk/react` + Route Handlers for production
- `useFormState`: Renamed to `useActionState` in React 19 (already adopted in this project)

## Open Questions

1. **Geist Sans Romanian diacritics coverage verification**
   - What we know: Geist Sans is a Unicode font designed by Vercel; TTF files exist in the package. Phase 1 noted default Helvetica lacks ă/ș/ț but Geist/Noto should work.
   - What's unclear: Whether Geist Sans specifically includes the cedilla-form ș/ț (U+0219, U+021B) used in Romanian vs the deprecated comma-below forms.
   - Recommendation: Test with a simple PDF generation using Font.register + Geist-Regular.ttf BEFORE building the full export flow. Fall back to Noto Sans if Geist lacks specific glyphs.

2. **Font file path on Vercel serverless**
   - What we know: `node_modules` paths may not resolve on Vercel serverless functions.
   - What's unclear: Whether `@vercel/nft` bundles font files referenced via `path.join(process.cwd(), 'node_modules/...')`.
   - Recommendation: Copy Geist-Regular.ttf and Geist-Bold.ttf to `public/fonts/` or use `fs.readFileSync` in the PDF route and test on Vercel deployment. Alternative: host on project CDN.

3. **Anonymous user application ownership (RLS)**
   - What we know: applications table RLS requires `auth.uid() = user_id`. AUTH-04 allows "Continua fara cont" (anonymous writer access).
   - What's unclear: Whether to use admin client for all writer operations or add RLS policies for anonymous access.
   - Recommendation: Use `createAdminClient()` for all writer server actions (consistent with existing profile.ts and matching.ts patterns). Session's companyProfileId provides authorization.

4. **Resend domain verification**
   - What we know: Resend requires domain verification for production sending.
   - What's unclear: Whether grantassist.md domain is set up with Resend.
   - Recommendation: Use `onboarding@resend.dev` for development; document domain setup as a deployment task.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRITE-01 | Fields load from grant_application_fields | unit | `npx vitest run src/app/actions/__tests__/writer.test.ts -t "loads fields"` | Wave 0 |
| WRITE-02 | Auto-preview generation on first visit | unit | `npx vitest run src/app/actions/__tests__/writer.test.ts -t "auto-preview"` | Wave 0 |
| WRITE-03 | Streaming AI text generation | unit | `npx vitest run src/app/api/writer/__tests__/generate.test.ts -t "streams"` | Wave 0 |
| WRITE-04 | Clarifying question for vague input | unit | `npx vitest run src/app/api/writer/__tests__/generate.test.ts -t "clarify"` | Wave 0 |
| WRITE-05 | AI uses company + rubric context | unit | `npx vitest run src/lib/ai/__tests__/generate-section.test.ts -t "context"` | Wave 0 |
| WRITE-07 | Character count and truncation | unit | `npx vitest run src/components/writer/__tests__/section-editor.test.ts -t "char"` | Wave 0 |
| WRITE-08 | Section buttons state transitions | unit | `npx vitest run src/components/writer/__tests__/section-editor.test.ts -t "buttons"` | Wave 0 |
| WRITE-09 | Progress bar calculation | unit | `npx vitest run src/components/writer/__tests__/progress-bar.test.ts` | Wave 0 |
| WRITE-12 | Deadline blocking/warning | unit | `npx vitest run src/app/grants/__tests__/deadline-check.test.ts` | Wave 0 |
| WRITE-13 | Field snapshot on creation | unit | `npx vitest run src/app/actions/__tests__/writer.test.ts -t "snapshot"` | Wave 0 |
| EXPRT-01 | Clipboard copy all sections | unit | `npx vitest run src/components/writer/__tests__/export-bar.test.ts -t "copy"` | Wave 0 |
| EXPRT-02 | PDF generation with diacritics | unit | `npx vitest run src/lib/pdf/__tests__/application-pdf.test.ts` | Wave 0 |
| EXPRT-03 | Email sending via Resend | unit | `npx vitest run src/app/actions/__tests__/export.test.ts -t "email"` | Wave 0 |
| EXPRT-04 | Auth gate for PDF/email | unit | `npx vitest run src/components/writer/__tests__/export-bar.test.ts -t "auth"` | Wave 0 |
| GEN-05 | Analytics event tracking | unit | `npx vitest run src/app/actions/__tests__/analytics.test.ts` | Wave 0 |
| GEN-06 | Notification preferences page | unit | `npx vitest run src/app/settings/__tests__/page.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/actions/__tests__/writer.test.ts` -- covers WRITE-01, WRITE-02, WRITE-13
- [ ] `src/app/api/writer/__tests__/generate.test.ts` -- covers WRITE-03, WRITE-04
- [ ] `src/lib/ai/__tests__/generate-section.test.ts` -- covers WRITE-05
- [ ] `src/components/writer/__tests__/section-editor.test.ts` -- covers WRITE-07, WRITE-08
- [ ] `src/components/writer/__tests__/progress-bar.test.ts` -- covers WRITE-09
- [ ] `src/components/writer/__tests__/export-bar.test.ts` -- covers EXPRT-01, EXPRT-04
- [ ] `src/app/grants/__tests__/deadline-check.test.ts` -- covers WRITE-12
- [ ] `src/lib/pdf/__tests__/application-pdf.test.ts` -- covers EXPRT-02
- [ ] `src/app/actions/__tests__/export.test.ts` -- covers EXPRT-03
- [ ] `src/app/actions/__tests__/analytics.test.ts` -- covers GEN-05
- [ ] `src/app/settings/__tests__/page.test.ts` -- covers GEN-06

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/001_initial_schema.sql` -- full DB schema with applications, application_sections, grant_application_fields tables
- Codebase analysis: `supabase/seed.sql` -- grant_application_fields seed data with field_order, character_limit, helper_text
- Codebase analysis: `src/lib/matching/rank-grants.ts` -- existing AI SDK pattern with generateText + Output
- Codebase analysis: `src/app/api/pdf/test/route.ts` -- validated @react-pdf/renderer on Vercel
- Codebase analysis: `node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf` -- TTF font files available
- [AI SDK streamText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) -- streamText API, toTextStreamResponse
- [AI SDK Next.js streaming cookbook](https://ai-sdk.dev/cookbook/next/stream-text) -- Route Handler + useCompletion pattern
- [react-pdf Font.register docs](https://react-pdf.org/fonts) -- Font registration API, TTF/WOFF only
- [Resend Next.js docs](https://resend.com/docs/send-with-nextjs) -- emails.send() API, React templates

### Secondary (MEDIUM confidence)
- [AI SDK RSC streaming values](https://ai-sdk.dev/docs/ai-sdk-rsc/streaming-values) -- createStreamableValue (experimental, not recommended for production)
- [AI SDK v6 blog post](https://vercel.com/blog/ai-sdk-6) -- architecture changes, deprecations

### Tertiary (LOW confidence)
- Font path resolution on Vercel serverless -- needs verification via deployment test
- Geist Sans Romanian diacritics completeness -- needs verification via PDF generation test

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed and validated; only Resend is new
- Architecture: HIGH -- patterns follow established codebase conventions (server actions, admin client, session-based auth)
- Pitfalls: HIGH -- identified from direct codebase analysis (RLS policies, font files, existing PDF test)
- AI streaming: HIGH -- streamText API verified from official docs; Route Handler pattern is documented standard
- PDF diacritics: MEDIUM -- Geist Sans TTF exists but Romanian glyph coverage needs runtime verification
- Email delivery: MEDIUM -- Resend API is straightforward but domain setup is deployment-dependent

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack, no fast-moving dependencies)
