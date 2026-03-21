# Technology Stack

**Project:** GrantAssist Moldova
**Researched:** 2026-03-21
**Overall Confidence:** HIGH

---

## Verdict: Stack is Validated

The chosen stack (Next.js 16 + Supabase + AI SDK v6 + Tailwind/shadcn + Resend + Cheerio) is well-aligned for this project. Every technology choice is current, actively maintained, and compatible with the others. Below are specific versions, rationale, caveats, and integration patterns.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2.0 | Full-stack React framework | Latest stable (Mar 18, 2026). Turbopack default, `proxy.ts` replaces middleware (runs on Node.js runtime, which is needed for Supabase cookie refresh). Cache Components for granular caching. ~400% faster dev startup in 16.2. | HIGH |
| React | 19.2.x | UI library | Ships with Next.js 16. Includes View Transitions, `useEffectEvent`, `<Activity>`. No separate install needed beyond `react@latest`. | HIGH |
| TypeScript | 5.x | Type safety | Required minimum 5.1.0 by Next.js 16. Use latest 5.x. | HIGH |

**Key Next.js 16 details for this project:**

- `proxy.ts` replaces `middleware.ts`. Rename the file and export function to `proxy`. This is where Supabase session refresh happens. Runs on Node.js (not Edge), which is required for `@supabase/ssr` cookie operations.
- `params`, `searchParams`, `cookies()`, `headers()` are all async now -- must `await` them.
- Turbopack is the default bundler. No config needed.
- `next lint` is removed. Use ESLint directly or Biome.
- Parallel route slots require explicit `default.js` files.
- Node.js 20.9+ minimum (18 is dropped).

### Database & Auth & Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @supabase/supabase-js | ^2.99.3 | Database client | Latest stable. Dropped Node 18 support in 2.79.0 (fine since Next.js 16 requires Node 20.9+). | HIGH |
| @supabase/ssr | ^0.9.0 | SSR cookie-based auth | Latest (published 2 days ago). Fixes SSR token refresh race condition via `skipAutoInitialize`. Provides `createBrowserClient` and `createServerClient`. | HIGH |
| Supabase (hosted) | -- | Postgres + Auth + Storage + Realtime | All-in-one BaaS. Eliminates need for separate auth (Clerk), database (Neon), and file storage services. Anonymous sign-in support built in. RLS for row-level security. | HIGH |

**Critical Supabase auth pattern for Next.js 16:**

```typescript
// proxy.ts -- Session refresh (replaces middleware.ts)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}
```

```typescript
// lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )
  // CRITICAL: Use getClaims(), NOT getSession(), in server code
  // getClaims() validates JWT signature every time
  const { data } = await supabase.auth.getClaims()
  return response
}
```

**API key naming update:** Supabase is transitioning from `ANON_KEY` / `SERVICE_ROLE_KEY` to `PUBLISHABLE_KEY` / `SECRET_KEY` format (`sb_publishable_...`, `sb_secret_...`). Both formats work interchangeably. The project can use either naming convention, but the new `PUBLISHABLE_KEY` naming is recommended for new projects. **Confidence: MEDIUM** -- transition is ongoing, both work.

### AI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ai (AI SDK) | ^6.0.134 | LLM integration framework | v6 is current stable. `gateway()` function built-in (no separate provider package). `streamText`/`generateText` are the core APIs. Agent pattern via `ToolLoopAgent` available but not needed for this project's use case. | HIGH |

**AI SDK v6 breaking changes to be aware of:**

- `system` parameter renamed to `instructions` in agent APIs, but `streamText`/`generateText` still accept `system` for non-agent usage.
- `generateObject()` / `streamObject()` removed. Use `generateText()` / `streamText()` with `Output.object()` instead.
- **Message types redesigned in v6.** Two new types are the standard:
  - `UIMessage` -- the frontend/persistence format. Used by `useChat` hook, includes `id`, `createdAt`, and rich UI parts. Store this format in the database.
  - `ModelMessage` -- the model input format. Stripped-down, contains only what the LLM needs.
  - Use `await convertToModelMessages(uiMessages)` (async) to convert from `UIMessage` to `ModelMessage` before sending to `streamText`/`generateText`.
  - Legacy v5 message utilities are removed. Only `UIMessage`, `ModelMessage`, and `convertToModelMessages()` exist in v6.
- **Streaming responses renamed:**
  - `toDataStreamResponse()` is removed.
  - Use `toUIMessageStreamResponse()` for chat UIs (works with `useChat` hook).
  - Use `toTextStreamResponse()` for plain text streaming without structured message parts.
- Run `npx @ai-sdk/codemod v6` to auto-migrate if starting from v5 examples.

**AI Gateway integration pattern:**

```typescript
import { streamText, gateway } from 'ai'

// gateway() is built into the 'ai' package -- no separate install
const result = streamText({
  model: gateway('anthropic/claude-sonnet-4.6'),
  system: 'You are a grant writing assistant. Respond in Romanian.',
  prompt: userInput,
})
```

**OIDC authentication:** Zero-config on Vercel. For local dev, run `vercel env pull` every 12 hours OR use `vercel dev` for auto-refresh. No API keys to manage.

### Styling & UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first CSS | v4.0 released Jan 2025. New Oxide engine (Rust-based), 5x faster builds. CSS-first config via `@theme` directives. One-line setup: `@import "tailwindcss"`. | HIGH |
| shadcn/ui | CLI v4 | Component library | Not a package -- CLI copies components into your project. Full ownership, full customization. Compatible with Tailwind v4 and Next.js 16. Use `npx shadcn@latest init` to scaffold. | HIGH |
| Geist Sans/Mono | built-in | Typography | Default font in Next.js 16 via `next/font/google`. Geist Sans for UI, Geist Mono for IDs/data. No extra config needed. | HIGH |

**Tailwind v4 migration note:** Config is now CSS-based, not `tailwind.config.js`. shadcn CLI v4 handles this automatically on init.

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | ^6.9.4 | Transactional email API | Developer-first, excellent TypeScript SDK, clean API. Used for deadline reminders, abandoned draft nudges, export-via-email. | HIGH |
| @react-email/components | ^1.0.8 | Email templates | Build email templates as React components. Renders to cross-client-compatible HTML. Same mental model as the rest of the app. | HIGH |
| @react-email/render | ^2.0.4 | Email HTML rendering | Renders React Email components to HTML strings for Resend. | HIGH |

### Web Scraping

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| cheerio | ^1.2.0 | HTML parsing/scraping | jQuery-like API for server-side HTML parsing. Lightweight (no browser engine). Correct choice for static gov site HTML. 19,873 dependent projects on npm. | HIGH |

### Session (Anonymous Users)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| iron-session | ^8.0.4 | Encrypted cookie sessions | Stateless encrypted HTTP-only cookies for anonymous user profiles. Single API: `getIronSession()`. Compatible with Next.js 16 App Router, Route Handlers, Server Actions. | HIGH |

**Note:** iron-session 8.0.4 was published over a year ago but remains the latest release. The library is stable and feature-complete for its use case. No compatibility issues with Next.js 16.

### PDF Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @react-pdf/renderer | ^4.3.2 | Server-side PDF generation (primary) | React components to PDF. Compatible with React 19 since v4.1.0. May have issues on Vercel serverless (see pitfalls). | MEDIUM |
| jspdf | ^4.2.1 | Client-side PDF fallback | Lightweight client-side PDF generation. Use as fallback if `@react-pdf/renderer` fails on Vercel serverless. v4.0 (Jan 2026) added security improvements. | HIGH |

**PDF strategy:** Test `@react-pdf/renderer` on Vercel serverless early. If it works, use it as the primary path. If bundle size or native dependencies cause issues, fall back to `jspdf` on the client side. The PROJECT.md already flags this as a known risk.

**Vercel serverless caveat:** Add `@react-pdf/renderer` to `serverExternalPackages` in `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
}
```

### Dev Dependencies

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| eslint | 9.x | Linting | Next.js 16 removed `next lint`. Use ESLint directly with flat config (default). | HIGH |
| @next/eslint-plugin-next | latest | Next.js-specific lint rules | Now defaults to ESLint flat config format. | HIGH |
| prettier | latest | Code formatting | Standard. Or use Biome as an alternative. | HIGH |
| supabase (CLI) | latest | Local Supabase dev | Run Supabase locally for development. `npx supabase init`, `npx supabase start`. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database + Auth | Supabase | Neon + Clerk | Two services to manage instead of one. Supabase gives Postgres + Auth + Storage + Realtime in a single platform. Clerk adds monthly cost for auth that Supabase includes free. |
| Auth | Supabase Auth | NextAuth/Auth.js | Supabase Auth is tightly integrated with RLS policies. NextAuth adds a middleware layer that duplicates what Supabase already handles. |
| Scraping | Cheerio | Playwright | Vercel serverless has a 250MB function size limit. Playwright's browser binary exceeds this. Cheerio is sufficient for static gov HTML pages. |
| PDF parsing | LLM multimodal reading | pdf-parse | pdf-parse has been abandoned since 2021. LLM can extract structured data from PDFs more accurately via multimodal input. |
| Rate limiting | Vercel Firewall | @upstash/ratelimit | Vercel Firewall handles rate limiting at the edge without code. No need for a separate package and Redis dependency. |
| Email | Resend | Nodemailer / Postmark | Resend has the best DX with React Email integration. Nodemailer requires SMTP config. Postmark lacks React component templating. |
| CSS | Tailwind v4 | CSS Modules / Styled Components | Tailwind v4 is the standard for Next.js projects. shadcn/ui is built on it. CSS Modules lack utility-class ergonomics. |
| State mgmt | React Server Components + URL state | Redux / Zustand | Server Components eliminate most client state needs. URL searchParams handle filter/sort state. No global store needed for this app. |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| `@supabase/auth-helpers-nextjs` | Deprecated. Replaced by `@supabase/ssr`. Will not receive updates. |
| `middleware.ts` | Deprecated in Next.js 16. Use `proxy.ts` instead. Still works but will be removed in a future version. |
| `supabase.auth.getSession()` in server code | Security risk. Does NOT validate JWT signature. Use `getClaims()` which validates against Supabase's public keys every time. |
| `generateObject()` / `streamObject()` | Removed in AI SDK v6. Use `streamText()` with `Output.object()` instead. |
| Legacy v5 message types | Removed in AI SDK v6. Use `UIMessage` (frontend/persistence) and `ModelMessage` (model input) instead. |
| Legacy v5 message converters | Removed in AI SDK v6. Use `await convertToModelMessages()` (async). |
| `toDataStreamResponse()` | Removed in AI SDK v6. Use `toUIMessageStreamResponse()` for chat UIs or `toTextStreamResponse()` for plain text. |
| `pdf-parse` | Abandoned since 2021. No security patches. Use LLM multimodal PDF reading instead. |
| Playwright / Puppeteer | Exceeds Vercel's 250MB function size limit. Use Cheerio for HTML scraping. |
| `@upstash/ratelimit` | Unnecessary complexity. Vercel Firewall handles rate limiting without code or Redis dependency. |
| `next lint` CLI | Removed in Next.js 16. Run ESLint directly. |
| `experimental.dynamicIO` | Renamed to `cacheComponents` in Next.js 16. |
| `experimental.ppr` | Removed. Evolved into Cache Components model. |
| Direct provider SDKs (e.g., `@anthropic-ai/sdk`) | AI Gateway handles routing. Using the `gateway()` function from the `ai` package with OIDC eliminates the need for provider-specific SDKs and API key management. |

---

## Integration Patterns

### Next.js 16 + Supabase SSR + AI SDK v6

The three core technologies connect as follows:

1. **proxy.ts** intercepts every request, creates a Supabase server client, calls `getClaims()` to refresh/validate the JWT, and forwards updated cookies.

2. **Server Components** read data via Supabase server client (created per-request with cookie access from `next/headers`). They can call the database directly using RLS-protected queries.

3. **Route Handlers / Server Actions** handle mutations. Grant matching uses `streamText()` from AI SDK with the `gateway()` provider. Scraping uses Cheerio in Server Actions with SSRF domain whitelisting.

4. **Client Components** use `createBrowserClient` from `@supabase/ssr` for real-time subscriptions and client-side auth state. AI streaming is consumed via the AI SDK's `useChat` hook which works with `UIMessage` format.

### Supabase Client Setup Pattern

Three client factories needed:

```
lib/supabase/
  browser.ts    -- createBrowserClient (singleton, client components)
  server.ts     -- createServerClient (per-request, Server Components/Actions/Route Handlers)
  proxy.ts      -- createServerClient (per-request, proxy.ts for token refresh)
  admin.ts      -- createClient with SERVICE_ROLE key (for anonymous profile operations, bypasses RLS)
```

The `admin.ts` client is essential because RLS `auth.uid()` returns NULL for anonymous users -- without the service role client, all unclaimed anonymous profiles would be visible to everyone.

### AI Streaming Pattern

```typescript
// app/api/grant-writer/route.ts
import { streamText, gateway, type UIMessage } from 'ai'
import { convertToModelMessages } from 'ai'

export async function POST(request: Request) {
  const { messages, section, rubric } = await request.json()

  // Convert UIMessage[] (from useChat) to ModelMessage[] for the LLM
  const modelMessages = await convertToModelMessages(messages as UIMessage[])

  const result = streamText({
    model: gateway('anthropic/claude-sonnet-4.6'),
    system: `You are a Romanian grant writing assistant.
      Write to maximize the scoring rubric: ${rubric}
      Character limit: ${section.maxChars}`,
    messages: modelMessages,
  })

  // Use toUIMessageStreamResponse() for chat UIs (works with useChat hook)
  return result.toUIMessageStreamResponse()
}
```

**Streaming response method selection:**
- `toUIMessageStreamResponse()` -- for chat-style UIs that use `useChat`. Handles tool calls, streaming data, and structured message parts.
- `toTextStreamResponse()` -- for simple text streaming without structured message format. Use for one-off text generation endpoints (e.g., single-field grant section generation that does not use `useChat`).

---

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# AI
npm install ai

# Styling (shadcn init handles Tailwind setup)
npx shadcn@latest init

# Email
npm install resend @react-email/components @react-email/render

# Scraping
npm install cheerio

# Anonymous sessions
npm install iron-session

# PDF (primary + fallback)
npm install @react-pdf/renderer jspdf

# Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D eslint @next/eslint-plugin-next
npm install -D supabase
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...  # or legacy anon key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...            # server-only, never expose

# AI Gateway (auto-provisioned via vercel env pull when OIDC is enabled)
# No manual API keys needed on Vercel
# For local dev without vercel dev:
VERCEL_OIDC_TOKEN=...  # expires every 12h, run `vercel env pull` to refresh

# Email
RESEND_API_KEY=re_...

# Session encryption
SESSION_SECRET=...  # 32+ character random string for iron-session

# Cron security
CRON_SECRET=...     # validated in cron route handlers

# Optional
OPENSANCTIONS_API_KEY=...  # disabled by default
```

---

## Version Compatibility Matrix

| Package | Min Version | Tested With | Node.js | Notes |
|---------|-------------|-------------|---------|-------|
| next | 16.0.0 | 16.2.0 | 20.9+ | Use 16.2.0 for latest fixes |
| react | 19.2.0 | 19.2.x | -- | Ships with Next.js 16 |
| @supabase/supabase-js | 2.79.0 | 2.99.3 | 20+ | Dropped Node 18 in 2.79.0 |
| @supabase/ssr | 0.9.0 | 0.9.0 | -- | Race condition fix in 0.9.0 |
| ai | 6.0.0 | 6.0.134 | -- | v6 breaking changes from v5 |
| tailwindcss | 4.0.0 | 4.1.x | -- | CSS-first config, Oxide engine |
| cheerio | 1.0.0 | 1.2.0 | -- | Stable, well-maintained |
| iron-session | 8.0.0 | 8.0.4 | -- | Stable, feature-complete |
| resend | 6.0.0 | 6.9.4 | -- | Active development |
| @react-pdf/renderer | 4.1.0 | 4.3.2 | -- | React 19 support since 4.1.0 |
| jspdf | 4.0.0 | 4.2.1 | -- | Security improvements in 4.0 |

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16)
- [Next.js 16.2 Release Blog](https://nextjs.org/blog/next-16-2)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js proxy.ts Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK AI Gateway Provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)
- [AI SDK Storing Messages](https://ai-sdk.dev/docs/ai-sdk-ui/storing-messages)
- [AI SDK Chatbot with Tool Calling](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling)
- [Vercel AI SDK v6 Blog](https://vercel.com/blog/ai-sdk-6)
- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [Vercel AI Gateway Authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok/authentication)
- [Supabase SSR Client Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase getClaims API](https://supabase.com/docs/reference/javascript/auth-getclaims)
- [Supabase API Keys Migration](https://github.com/orgs/supabase/discussions/29260)
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui CLI v4 Changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [Resend Next.js Guide](https://resend.com/docs/send-with-nextjs)
- [React Email Components](https://react.email)
- [Cheerio Documentation](https://cheerio.js.org/)
- [iron-session GitHub](https://github.com/vvo/iron-session)
- [@react-pdf/renderer Compatibility](https://react-pdf.org/compatibility)

### npm Package Pages (HIGH confidence for versions)
- [@supabase/supabase-js v2.99.3](https://www.npmjs.com/package/@supabase/supabase-js)
- [@supabase/ssr v0.9.0](https://www.npmjs.com/package/@supabase/ssr)
- [ai v6.0.134](https://www.npmjs.com/package/ai)
- [resend v6.9.4](https://www.npmjs.com/package/resend)
- [cheerio v1.2.0](https://www.npmjs.com/package/cheerio)
- [iron-session v8.0.4](https://www.npmjs.com/package/iron-session)
- [jspdf v4.2.1](https://www.npmjs.com/package/jspdf)
- [@react-pdf/renderer v4.3.2](https://www.npmjs.com/package/@react-pdf/renderer)
