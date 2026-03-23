# Phase 1: Foundation and Validation - Research

**Researched:** 2026-03-21
**Domain:** Next.js 16 scaffolding, Supabase schema/auth, iron-session, PDF generation validation
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire platform infrastructure: a Next.js 16 App Router application with Tailwind CSS v4, shadcn/ui, and Geist fonts; a Supabase Postgres database with 11 tables and Row Level Security enforced from day one; authentication plumbing via proxy.ts that refreshes Supabase sessions and protects admin routes; anonymous session tracking via iron-session encrypted cookies; and a validated PDF generation strategy (react-pdf or jspdf fallback) confirmed to work on Vercel serverless before any feature code depends on it.

The technical landscape is well-understood. Next.js 16.2 replaces middleware.ts with proxy.ts (same API, Node.js runtime, renamed function export). Supabase SSR uses @supabase/ssr with getClaims() for secure server-side auth -- never getSession() which does not validate JWT signatures. iron-session v8 provides a single getIronSession() API that works with Next.js App Router cookies(). The PDF generation decision is the primary risk: @react-pdf/renderer has documented compatibility issues with Next.js App Router route handlers that may surface on Vercel, making jspdf (client-side with custom font embedding for Romanian diacritics) the likely fallback.

**Primary recommendation:** Scaffold the Next.js 16 app first, then deploy Supabase schema with RLS, wire proxy.ts + auth callback, add iron-session, and validate PDF generation last since it has the most uncertainty.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDTN-01 | Project scaffolded with Next.js 16, Tailwind CSS, shadcn/ui, Geist fonts | Next.js 16.2 + Tailwind v4 CSS-first config + shadcn/ui CLI + geist npm package |
| FNDTN-02 | Supabase schema deployed with 11 tables, RLS policies, indexes, triggers, functions | Supabase CLI migrations, RLS with getClaims()-based policies, service role for anonymous profile operations |
| FNDTN-03 | proxy.ts refreshes Supabase sessions and protects /admin routes | Next.js 16 proxy.ts API with @supabase/ssr createServerClient, getClaims() for token refresh |
| FNDTN-04 | Supabase client utilities (browser, server, admin service role) available | @supabase/ssr createBrowserClient singleton + createServerClient per-request + createClient with service role key |
| FNDTN-05 | iron-session encrypted HTTP-only cookies for anonymous profile tracking | iron-session v8.0.4 getIronSession() with cookies() from next/headers |
| FNDTN-06 | Auth callback route handles email confirmation and redirects | Route handler at app/api/auth/callback/route.ts using exchangeCodeForSession from @supabase/ssr |
| FNDTN-07 | PDF generation validated on Vercel (react-pdf or jspdf fallback determined) | @react-pdf/renderer renderToBuffer in route handler with serverComponentsExternalPackages config, jspdf + custom Geist font as fallback |
| GEN-01 | All UI and AI output in Romanian using simple everyday language | Romanian UI strings in components, no i18n library needed (Romanian-only) |
| GEN-02 | Mobile-responsive design at 375px (mobile-first) | Tailwind v4 mobile-first breakpoints, test at 375px viewport |
| GEN-03 | Loading, error, and empty states for every interactive screen | Next.js loading.tsx, error.tsx conventions + custom empty state components |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.x | App framework with App Router, proxy.ts, Turbopack | Latest stable, proxy.ts replaces middleware.ts, Node.js runtime |
| react / react-dom | 19.x | UI library | Required by Next.js 16, fixes @react-pdf/renderer compatibility |
| @supabase/supabase-js | 2.x | Database, auth, storage client | Official Supabase client |
| @supabase/ssr | 0.6.x | Server-side Supabase for Next.js | Cookie-based auth token management, required for SSR |
| tailwindcss | 4.x | Utility-first CSS | CSS-first configuration, 70% smaller output than v3 |
| iron-session | 8.0.4 | Encrypted stateless cookies | Single getIronSession() API, works with App Router cookies() |
| geist | 1.x | Geist Sans + Geist Mono fonts | Default Next.js 16 font, npm package with variable font support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/renderer | 4.x | Server-side PDF generation | Primary PDF strategy -- validate on Vercel first |
| jspdf | 2.x | Client-side PDF generation | Fallback if @react-pdf/renderer fails on Vercel serverless |
| typescript | 5.x | Type safety | Included with create-next-app |
| eslint | 9.x | Linting | Included with create-next-app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | jspdf (client-side) | jspdf needs custom font embedding for Romanian diacritics, runs client-side so no serverless issues, but less React-native API |
| iron-session | Supabase anonymous auth | Supabase anonymous auth creates actual auth users, adds complexity for simple profile tracking; iron-session is lighter |
| Tailwind CSS v4 | Tailwind v3 | v3 needs tailwind.config.js, v4 is CSS-first and auto-detects content; v4 is default with Next.js 16 |

**Installation:**
```bash
npx create-next-app@latest grants-moldova --tailwind --typescript --eslint --app --src-dir --turbopack
cd grants-moldova
npm install @supabase/supabase-js @supabase/ssr iron-session geist
npm install @react-pdf/renderer jspdf
npx shadcn@latest init
npx supabase init
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout: Geist fonts, Supabase provider, <html lang="ro">
│   ├── page.tsx                # Landing page shell (Romanian UI)
│   ├── loading.tsx             # Global loading state
│   ├── error.tsx               # Global error boundary
│   ├── not-found.tsx           # 404 page (Romanian)
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts   # Supabase email confirmation code exchange
│   │   └── pdf/
│   │       └── test/
│   │           └── route.ts   # PDF generation validation route
│   └── admin/
│       └── page.tsx           # Protected admin page (redirects if not authed)
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # createBrowserClient (singleton)
│   │   ├── server.ts          # createServerClient (per-request, uses cookies())
│   │   └── admin.ts           # Service role client (bypasses RLS)
│   └── session.ts             # iron-session configuration and helpers
├── proxy.ts                    # Supabase session refresh + /admin protection
supabase/
├── config.toml
├── migrations/
│   └── 001_initial_schema.sql  # All 11 tables + RLS + indexes + triggers + functions
└── seed.sql                    # Sample grant data
```

### Pattern 1: proxy.ts for Supabase Session Refresh
**What:** Next.js 16 proxy.ts intercepts every request, refreshes Supabase auth tokens, and redirects unauthenticated users from /admin routes.
**When to use:** Every request that needs auth awareness.
**Example:**
```typescript
// proxy.ts
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//         https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getClaims() not getSession() -- getClaims() validates JWT signature
  const { data: { claims } } = await supabase.auth.getClaims()

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !claims) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: iron-session for Anonymous Profile Tracking
**What:** Encrypted HTTP-only cookie stores anonymous user's company_profile_id.
**When to use:** When anonymous users create company profiles that need to persist across page navigations.
**Example:**
```typescript
// lib/session.ts
// Source: https://github.com/vvo/iron-session
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  companyProfileId?: string
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET!,  // min 32 chars
  cookieName: 'grantassist_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
```

### Pattern 3: Supabase Client Utilities
**What:** Three client variants for different contexts.
**When to use:** Browser client in Client Components, server client in Server Components/Actions, admin client for anonymous profile operations.
**Example:**
```typescript
// lib/supabase/client.ts -- Browser client (singleton)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts -- Server client (per-request)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can't set cookies -- handled by proxy
          }
        },
      },
    }
  )
}

// lib/supabase/admin.ts -- Service role client (bypasses RLS)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Pattern 4: Auth Callback Route Handler
**What:** Route handler that exchanges auth code for session after email confirmation.
**When to use:** When user clicks confirmation link in email.
**Example:**
```typescript
// app/api/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return user to error page if code exchange fails
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

### Anti-Patterns to Avoid
- **Using getSession() in server code:** getSession() does not validate JWT signatures. Always use getClaims() in proxy.ts and server-side code. getSession() is only safe on the client.
- **RLS policies using auth.uid() for anonymous profiles:** auth.uid() is NULL for unauthenticated users, which means RLS policies with `auth.uid() = user_id` would return zero rows for anonymous users -- or worse, leak all rows if the policy is permissive. Use the service role client for anonymous profile CRUD operations.
- **Storing Supabase client in module-level variables:** Server-side Supabase clients must be created per-request to access that request's cookies. Never cache or share server clients across requests.
- **Using middleware.ts instead of proxy.ts:** middleware.ts is deprecated in Next.js 16. Use proxy.ts with the exported `proxy` function name.
- **tailwind.config.js with Tailwind v4:** Tailwind v4 uses CSS-first configuration via @theme in CSS. No JavaScript config file needed. Content detection is automatic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie encryption | Custom encryption/signing | iron-session | Uses @hapi/iron encryption, audited, handles rotation |
| Auth session management | Custom JWT handling | @supabase/ssr + proxy.ts | Handles token refresh, cookie management, PKCE flow |
| RLS policies | App-level authorization checks only | Supabase RLS + service role | Defense in depth: RLS at DB level prevents data leaks even if app logic fails |
| PDF generation | Custom canvas-to-PDF | @react-pdf/renderer or jspdf | PDF spec is complex, font embedding, Unicode support |
| Component library | Custom UI components from scratch | shadcn/ui | Accessible, customizable, well-tested, Tailwind-native |
| Font loading | Manual font file management | geist npm package + next/font | Automatic optimization, zero layout shift, variable fonts |

**Key insight:** This phase is infrastructure -- every component has battle-tested libraries. The only area requiring validation is PDF generation on Vercel serverless, which is why it must be tested before Phase 5 depends on it.

## Common Pitfalls

### Pitfall 1: RLS Policy Data Leak for Anonymous Users
**What goes wrong:** company_profiles rows with user_id = NULL (anonymous) are either invisible (no rows returned) or all visible (all anonymous profiles leaked) depending on how the RLS policy is written.
**Why it happens:** RLS policies using `auth.uid() = user_id` fail when user_id IS NULL because NULL = NULL is never true in SQL. A permissive policy like `user_id IS NULL` would return ALL unclaimed profiles.
**How to avoid:** Use the Supabase service role client (bypasses RLS) for anonymous profile CRUD. Add an RLS policy that blocks anon role from reading company_profiles entirely. Validate ownership via iron-session cookie in application code.
**Warning signs:** Running `SELECT * FROM company_profiles` as anon role returns unexpected row counts.

### Pitfall 2: getSession() vs getClaims() in Server Code
**What goes wrong:** Server-side code uses getSession() which does not validate JWT signatures, potentially trusting a tampered token.
**Why it happens:** getSession() only checks JWT format and expiry. getClaims() validates the signature against published public keys.
**How to avoid:** Use getClaims() in proxy.ts and all server-side auth checks. Reserve getSession() for client-side only.
**Warning signs:** Auth checks passing with manipulated cookies.

### Pitfall 3: @react-pdf/renderer Bundle Errors on Vercel
**What goes wrong:** "PDFDocument is not a constructor" or "ba.Component is not a constructor" errors when using renderToBuffer in Next.js App Router route handlers.
**Why it happens:** Next.js App Router bundles differently than Pages Router. @react-pdf/renderer has internal React dependencies that conflict with Next.js bundling.
**How to avoid:** Add @react-pdf/renderer to serverComponentsExternalPackages in next.config.ts. Ensure React 19.x is installed. Test on Vercel deployment (not just local dev). Have jspdf fallback ready.
**Warning signs:** PDF route works locally but fails on Vercel deployment.

### Pitfall 4: Tailwind v4 Configuration Confusion
**What goes wrong:** Developer creates tailwind.config.js and wonders why custom theme values don't work.
**Why it happens:** Tailwind v4 uses CSS-first configuration with @theme blocks in CSS files. JavaScript config files are ignored by default.
**How to avoid:** Configure themes in app/globals.css using @theme blocks. Use @import "tailwindcss" instead of @tailwind directives.
**Warning signs:** Custom colors or breakpoints not available as utility classes.

### Pitfall 5: proxy.ts Matcher Missing Auth Routes
**What goes wrong:** proxy.ts excludes API routes from matching, which means the auth callback route doesn't get session cookie handling.
**Why it happens:** Common matcher patterns exclude /api routes, but /api/auth/callback needs proxy to set cookies.
**How to avoid:** Use a matcher that includes API auth routes or handle cookie setting explicitly in the callback route handler.
**Warning signs:** Auth callback succeeds but session is not persisted.

### Pitfall 6: Supabase Email Template Not Updated for PKCE
**What goes wrong:** Email confirmation links use the old {{ .ConfirmationURL }} format, which doesn't work with the PKCE code exchange flow.
**Why it happens:** Default Supabase email templates use direct confirmation URLs. PKCE flow requires token_hash-based exchange.
**How to avoid:** Update email templates to use {{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=email or use the code-based flow with ?code={{ .AuthCode }}.
**Warning signs:** Email confirmation links redirect to an error page.

## Code Examples

Verified patterns from official sources:

### Root Layout with Geist Fonts and Romanian HTML
```typescript
// app/layout.tsx
// Source: https://nextjs.org/docs/app/getting-started/fonts
//         https://www.npmjs.com/package/geist
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata = {
  title: 'GrantAssist Moldova',
  description: 'Descopera granturile disponibile pentru afacerea ta',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
```

### Tailwind v4 CSS Configuration
```css
/* app/globals.css */
/* Source: https://tailwindcss.com/docs/guides/nextjs */
@import "tailwindcss";

@theme {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* Brand colors -- zinc base with warm accent */
  --color-background: #fafafa;
  --color-foreground: #18181b;
  --color-accent: #e67e22;
  --color-accent-foreground: #ffffff;
  --color-muted: #71717a;
  --color-border: #e4e4e7;
}

@custom-variant dark (&:where(.dark, .dark *));
```

### Next.js Config for PDF Compatibility
```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
```

### PDF Validation Test Route
```typescript
// app/api/pdf/test/route.ts
// Tests both @react-pdf/renderer (server) and documents the jspdf fallback
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Attempt 1: @react-pdf/renderer (server-side)
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const React = await import('react')
    const { Document, Page, Text, StyleSheet } = await import('@react-pdf/renderer')

    const styles = StyleSheet.create({
      page: { padding: 30 },
      text: { fontSize: 14, fontFamily: 'Helvetica' },
    })

    const TestDoc = () =>
      React.createElement(Document, null,
        React.createElement(Page, { size: 'A4', style: styles.page },
          React.createElement(Text, { style: styles.text },
            'Test: Romanian diacritics - ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț'
          )
        )
      )

    const buffer = await renderToBuffer(React.createElement(TestDoc))

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="test-diacritics.pdf"',
      },
    })
  } catch (error) {
    // If @react-pdf/renderer fails, document the error
    return NextResponse.json({
      strategy: 'react-pdf-failed',
      error: String(error),
      fallback: 'jspdf-client-side',
      message: 'Use jspdf with custom Geist font on the client side',
    }, { status: 500 })
  }
}
```

### RLS Policy Pattern for This Schema
```sql
-- Key RLS pattern: company_profiles
-- Anonymous profiles (user_id IS NULL) are accessed via service role client only
-- Authenticated users see only their own profiles

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own profiles
CREATE POLICY "Users can read own company profiles"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can update their own profiles
CREATE POLICY "Users can update own company profiles"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public read for shared profiles (via share_token)
CREATE POLICY "Anyone can read shared profiles"
  ON company_profiles FOR SELECT
  TO anon, authenticated
  USING (
    share_token IS NOT NULL
    AND share_token_expires_at > now()
  );

-- NO policy for anon INSERT/UPDATE/DELETE on company_profiles
-- Anonymous profile creation uses service role client (bypasses RLS)

-- Grants: public read, admin write
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active grants"
  ON grants FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage grants"
  ON grants FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts with Edge Runtime | proxy.ts with Node.js runtime | Next.js 16 (Jan 2026) | proxy.ts runs on Node.js, cannot use Edge; same API otherwise |
| @tailwind base; @tailwind components; @tailwind utilities; | @import "tailwindcss" | Tailwind v4 (early 2025) | CSS-first config, no JS config file, 70% smaller output |
| tailwind.config.js | @theme in CSS | Tailwind v4 (early 2025) | Theme defined in CSS, not JavaScript |
| supabase.auth.getSession() | supabase.auth.getClaims() | Supabase SSR 2025 | getClaims() validates JWT signature; getSession() deprecated for server |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase 2025-2026 | New key format (sb_publishable_xxx), legacy anon keys still work |
| next-iron-session (v4) | iron-session (v8) | 2024 | Single getIronSession() API, no wrappers |
| @next/font | geist npm package | 2024-2025 | Geist is default font in Next.js 15+, just npm install |

**Deprecated/outdated:**
- middleware.ts: Deprecated in Next.js 16, renamed to proxy.ts. Still works but will be removed.
- @tailwind directives: Replaced by @import "tailwindcss" in v4.
- getSession() on server: Deprecated for server-side use; use getClaims() or getUser().
- next-iron-session: Superseded by iron-session v8.

## Open Questions

1. **@react-pdf/renderer on Vercel serverless with Next.js 16**
   - What we know: React 19 fixes some issues. serverComponentsExternalPackages config helps. Known to work locally but may fail on Vercel.
   - What's unclear: Whether the bundling issues are fully resolved with Next.js 16.2 + React 19 on Vercel production.
   - Recommendation: Build the test route, deploy to Vercel, test the actual deployment. If it fails, switch to jspdf with custom font. This is the explicit purpose of FNDTN-07.

2. **Romanian diacritics in PDF output**
   - What we know: Default PDF fonts (Helvetica, Times) do not support Romanian diacritics (ă, â, î, ș, ț). Custom font embedding required for both @react-pdf/renderer and jspdf.
   - What's unclear: Whether @react-pdf/renderer's built-in font registration handles Geist correctly, or if a .ttf must be separately loaded.
   - Recommendation: Test with Geist Sans .ttf file registered as custom font. If problematic, use Noto Sans (known Unicode coverage) as PDF-only font.

3. **Supabase NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY vs NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - What we know: Supabase is transitioning to new key names. Legacy anon keys still work.
   - What's unclear: Whether the transition is complete or if using the old env var name causes issues.
   - Recommendation: Use NEXT_PUBLIC_SUPABASE_ANON_KEY (the old name) for now since the project docs and most guides still reference it. Add a comment noting the future migration.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- greenfield project |
| Config file | None -- see Wave 0 |
| Quick run command | `npx next build` (build validation) |
| Full suite command | TBD after test framework selection |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDTN-01 | App loads with correct fonts, Tailwind, Romanian lang | smoke | `npx next build && curl localhost:3000` | No -- Wave 0 |
| FNDTN-02 | RLS blocks unauthenticated access to protected tables | integration | `npx supabase db test` or manual SQL verification | No -- Wave 0 |
| FNDTN-03 | proxy.ts redirects unauthenticated /admin requests | integration | Manual or Playwright test | No -- Wave 0 |
| FNDTN-04 | Three Supabase clients instantiate without errors | unit | `npx vitest run lib/supabase/` | No -- Wave 0 |
| FNDTN-05 | iron-session cookie persists across navigations | integration | Manual browser test | No -- Wave 0 |
| FNDTN-06 | Auth callback exchanges code for session | integration | Manual email flow test | No -- Wave 0 |
| FNDTN-07 | PDF generates with Romanian diacritics on Vercel | smoke | `curl https://deployed-url/api/pdf/test` | No -- Wave 0 |
| GEN-01 | UI renders Romanian text | manual-only | Visual inspection | N/A |
| GEN-02 | Layout is responsive at 375px | manual-only | Browser devtools 375px viewport | N/A |
| GEN-03 | Loading/error/empty states render | smoke | `npx next build` (catches missing files) | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx next build` (catches TypeScript and build errors)
- **Per wave merge:** Full build + manual verification of success criteria
- **Phase gate:** All 5 success criteria verified before phase completion

### Wave 0 Gaps
- [ ] Test framework selection (recommend vitest for unit tests)
- [ ] `vitest.config.ts` -- if vitest chosen
- [ ] Supabase local dev setup (`npx supabase start`)
- [ ] Manual verification checklist for RLS, proxy.ts, iron-session, PDF

*(Most Phase 1 requirements are infrastructure and best verified via build success + manual testing rather than automated unit tests)*

## Sources

### Primary (HIGH confidence)
- [Next.js 16 proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- Complete proxy.ts API, matcher config, cookie handling, runtime details
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Proxy renaming, Turbopack default, React 19 integration
- [Supabase SSR Client Creation Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- Browser client, server client, proxy setup with cookie handling
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- getClaims() security, proxy setup, auth callback pattern
- [iron-session GitHub](https://github.com/vvo/iron-session) -- v8 API: getIronSession(), session options, sealData/unsealData
- [Tailwind CSS v4 Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) -- CSS-first config, @import "tailwindcss", @theme blocks
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy patterns, service role bypass

### Secondary (MEDIUM confidence)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- Production patterns verified against official docs
- [@react-pdf/renderer GitHub Issue #3074](https://github.com/diegomura/react-pdf/issues/3074) -- renderToBuffer fix with React 19, confirmed by multiple users
- [@react-pdf/renderer GitHub Issue #2460](https://github.com/diegomura/react-pdf/issues/2460) -- App Router compatibility workarounds
- [jsPDF Custom Fonts Guide](https://www.devlinpeck.com/content/jspdf-custom-font) -- TTF font embedding for Unicode/diacritics support

### Tertiary (LOW confidence)
- [shadcn/ui Next.js 16 Setup](https://ui.shadcn.com/docs/installation/next) -- Standard setup, but specifics of v4 Tailwind interaction may vary
- [Geist npm Package](https://www.npmjs.com/package/geist) -- Basic import pattern, but detailed variable font setup with Tailwind v4 needs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries are well-documented with official guides
- Architecture: HIGH -- proxy.ts, Supabase SSR, iron-session patterns are well-established
- Pitfalls: HIGH -- RLS data leak and getClaims() issues are documented in official Supabase security guides
- PDF generation: MEDIUM -- @react-pdf/renderer compatibility with Next.js App Router is an active area of issues; validation is explicitly planned

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days -- stable technologies, unlikely to change)
