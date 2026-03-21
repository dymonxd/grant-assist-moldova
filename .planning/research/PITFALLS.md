# Domain Pitfalls

**Domain:** AI-powered grant application platform (Supabase + Next.js 16 + AI SDK v6 + web scraping)
**Researched:** 2026-03-21

---

## Critical Pitfalls

Mistakes that cause security breaches, data loss, or architecture rewrites.

---

### Pitfall 1: Anonymous Profile Data Leak via RLS

**What goes wrong:** Supabase RLS policies using `auth.uid() = user_id` do not protect anonymous profiles. Anonymous users created via `iron-session` cookies (not Supabase Auth anonymous sign-ins) have no `auth.uid()` at all when queries run from the client. If the `anon` key is used with RLS policies that check `auth.uid()`, the check evaluates to `NULL = user_id`, which returns false for all rows -- but a poorly written permissive policy (e.g., `true` for SELECT) would expose every unclaimed profile.

**Why it happens:** The project uses iron-session for anonymous cookies, NOT Supabase's built-in anonymous auth. This means there is no JWT, no `auth.uid()`, and no `is_anonymous` claim. RLS cannot distinguish "this anonymous user" from "any anonymous user" because there is no identity to check against.

**Consequences:** All anonymous profiles visible to any unauthenticated request. Company data (IDNO, financials, employee counts) leaked. GDPR/privacy violation for Moldovan entrepreneurs.

**Prevention:**
- Use `supabaseAdmin` (service role client) for ALL anonymous profile operations. Never expose anonymous profile data through client-side Supabase queries.
- The service role client bypasses RLS entirely -- so anonymous profile CRUD happens exclusively in server-side route handlers and server actions.
- Validate the iron-session cookie server-side before every operation: no valid session = no data access.
- Enable RLS on all tables from day one, but design policies assuming only authenticated (real Supabase Auth) users will query through the client.

**Detection:** Write a test that creates an anonymous profile, then queries the profiles table using the anon key without a session. If any rows return, you have a leak.

**Confidence:** HIGH -- confirmed by Supabase docs and the project's own triple-check audit (finding #1).

**Phase relevance:** Phase 1 (Foundation). Must be correct before any data touches the database.

---

### Pitfall 2: AI SDK v6 Breaking Changes Silently Break Streaming

**What goes wrong:** AI SDK v6 renamed and restructured core APIs. Code written against v5 tutorials or AI-generated code will use deprecated/removed types and functions, causing runtime errors or silent failures in streaming.

**Why it happens:** Most online tutorials, Stack Overflow answers, and AI code assistants still reference v5 patterns. The v5-to-v6 changes are not just renames -- they are behavioral changes.

**Key breaking changes that will bite this project:**

| v5 Pattern | v6 Pattern | Impact |
|-----------|-----------|--------|
| `CoreMessage` type | `ModelMessage` type | Type errors at compile time |
| `convertToCoreMessages()` | `convertToModelMessages()` (now async) | Must await; forgetting causes runtime bug |
| `generateObject()` / `streamObject()` | `generateText()` / `streamText()` with `output` setting | Grant matching scores, AI profile inference will break if using old API |
| `system` parameter (Agent) | `instructions` parameter | Silent: system prompt ignored, AI writes without rubric context |
| `Experimental_Agent` class | `ToolLoopAgent` class | Import errors |
| Default `stopWhen: stepCountIs(1)` | Default `stopWhen: stepCountIs(20)` | Agent runs 20 tool loops instead of 1 -- cost explosion |

**Consequences:** AI grant writer produces unstructured output. Streaming breaks in `useChat`. Cost overruns from agent loop change. Type errors block builds.

**Prevention:**
- Run `npx @ai-sdk/codemod v6` on any scaffolded code immediately.
- Never copy v5 code from tutorials. Always reference the official v6 migration guide.
- For this project specifically: use `streamText` with `output` setting for structured grant matching scores, not `streamObject`.
- Explicitly set `stopWhen` on any agent to prevent the 20-loop default.

**Detection:** If `streamObject` or `CoreMessage` appear anywhere in the codebase, v5 patterns have leaked in.

**Confidence:** HIGH -- verified against official AI SDK v6 migration guide at ai-sdk.dev.

**Phase relevance:** Phase 2 (AI Integration). Every AI route handler must use v6 patterns from the start.

---

### Pitfall 3: @react-pdf/renderer Breaks on Vercel Serverless with React 19

**What goes wrong:** `@react-pdf/renderer` v4.1.4 with React 19 + React Reconciler 0.31 produces `TypeError: Cannot read properties of null (reading 'props')` in production on Vercel. The library also risks exceeding Vercel's 50MB serverless function size limit.

**Why it happens:** React 19.2 (which Next.js 16 App Router uses via React Canary) changed reconciler internals. `@react-pdf/renderer` detects the React version incorrectly in some environments, using the wrong reconciler. Additionally, the library bundles font handling and layout engines that inflate function size.

**Consequences:** PDF export (a core feature for grant applications) fails in production. Users cannot download their completed grant applications. The "copy all + PDF download + email" export flow is broken.

**Prevention:**
- Test `@react-pdf/renderer` in a deployed Vercel environment in Phase 1, not just locally. Create a `/test-pdf` route that generates a simple PDF with Romanian diacritics and deploy it.
- Prepare `jspdf` as a client-side fallback from day one. Do not treat it as "we'll add it later."
- If `@react-pdf/renderer` fails on Vercel, switch to client-side PDF generation with `jspdf` -- this avoids serverless limits entirely.
- Pin React Reconciler version if `@react-pdf/renderer` works locally but breaks in production.

**Detection:** Deploy a test PDF route to Vercel preview. If it returns a 500 or the PDF is empty/corrupted, the issue is confirmed.

**Confidence:** HIGH -- confirmed by multiple GitHub issues (#2966, #3223) against `@react-pdf/renderer` with React 19.

**Phase relevance:** Phase 1 (Foundation). Must validate PDF generation early because the fallback path (jspdf) requires different architecture (client-side vs. server-side).

---

### Pitfall 4: jspdf Cannot Render Romanian Diacritics Without Custom Fonts

**What goes wrong:** jspdf's 14 built-in PDF fonts are limited to ASCII. Romanian characters (ă, â, î, ș, ț) render as empty boxes or question marks. Since the entire UI and all AI output is Romanian-only, this breaks every generated PDF.

**Why it happens:** The PDF specification's standard fonts do not include full Unicode coverage. jspdf requires explicit `.ttf` font embedding via its font converter tool. This is not documented prominently.

**Consequences:** Every PDF export is unreadable. Grant applications with "secțiunea" appearing as "sec?iunea" are unusable.

**Prevention:**
- Bundle a `.ttf` font that supports Romanian diacritics (Geist Sans, if it covers them, or Noto Sans).
- Convert the font using jspdf's `/fontconverter/fontconverter.html` tool and register it before any PDF generation.
- Test with a string containing ALL Romanian diacritics: `"ăâîșțĂÂÎȘȚ"` -- if any character fails, the font is wrong.
- This applies equally to `@react-pdf/renderer` -- its default fonts also may not cover Romanian. Register fonts explicitly in both solutions.

**Detection:** Generate a test PDF with the string `"Secțiunea 1: Descrierea activității"` and visually inspect it.

**Confidence:** HIGH -- confirmed by jspdf GitHub issues (#2093, #176) and the library's own documentation.

**Phase relevance:** Phase 3 (Export features). But font selection must be decided in Phase 1 when choosing between react-pdf and jspdf.

---

### Pitfall 5: Vercel Cron Routes Silently Fail Due to Static Compilation

**What goes wrong:** Vercel invokes cron jobs via GET requests. Next.js App Router may treat a GET route handler as static and pre-render it at build time, returning a cached response instead of executing the function. The cron "runs" (returns 200) but does nothing.

**Why it happens:** Next.js aggressively optimizes route handlers. If a GET handler has no dynamic dependencies (no `request` parameter usage, no `cookies()`, no `headers()`), Next.js compiles it as a static page. The cron invocation hits the cached static response.

**Consequences:** Deadline reminders never send. Abandoned draft nudges never fire. Nightly analytics never aggregate. Users miss grant deadlines because the 7-day and 3-day reminder emails are silently not sent.

**Prevention:**
- Add `export const dynamic = 'force-dynamic'` to every cron route handler.
- Always read `request.headers.get('authorization')` to validate `CRON_SECRET` -- this also forces the route dynamic.
- The project's plan for a single cron route with `?type=` param is fine, but ensure the route reads the query parameter from the request object (not from a static config).
- Verify cron execution in Vercel logs after first deployment. A 200 status alone does not confirm the function body ran.

**Additional Vercel cron pitfalls:**
- Hobby plan: cron jobs run only once per day, and execution time within the hour is non-deterministic (could be any time in the specified hour).
- Pro plan: 60-second serverless timeout applies to cron functions by default. Nightly analytics aggregation over large datasets could timeout.
- Vercel does NOT retry failed cron invocations. If a cron fails, it silently drops.
- Cron jobs can fire duplicate events. Design operations to be idempotent (e.g., "set reminder_sent = true" not "increment reminder_count").

**Detection:** After deploying crons, check Vercel runtime logs. If cron invocations show but the expected side effects (emails sent, analytics rows created) are missing, the route is being served statically.

**Confidence:** HIGH -- confirmed by Vercel official documentation and community reports.

**Phase relevance:** Phase 4 (Notifications/Cron). But `force-dynamic` pattern must be established as a convention from Phase 1.

---

### Pitfall 6: AI Gateway OIDC Token Blocked by Stale API Key

**What goes wrong:** If `AI_GATEWAY_API_KEY` is set in the environment (even as an empty string or invalid value), the AI Gateway provider will always use it instead of falling back to OIDC authentication. OIDC is never attempted, and all AI calls fail with authentication errors.

**Why it happens:** The AI Gateway provider checks for an API key first. If present, it is used unconditionally. This is by design (API key takes priority over OIDC), but it creates a trap during local development when developers might have both variables set, or during migration from API key auth to OIDC.

**Consequences:** All AI features fail -- grant matching, AI writing, profile inference. The app appears broken with no obvious cause because the error message references an API key issue even though OIDC should work.

**Prevention:**
- Never set `AI_GATEWAY_API_KEY` in any environment. Rely exclusively on OIDC via `vercel env pull`.
- In local development, run `vercel dev` (which handles OIDC token refresh automatically) or run `vercel env pull` and be aware tokens expire after 12 hours.
- Add a startup check: if `AI_GATEWAY_API_KEY` is in `process.env`, log a warning.
- Document in the project README that API key auth must not be used.

**Detection:** If AI calls fail with "Unauthorized" or "Invalid API key" errors but OIDC should be handling auth, check for a stray `AI_GATEWAY_API_KEY` env var.

**Confidence:** HIGH -- confirmed by AI SDK provider documentation and OIDC debugging reports.

**Phase relevance:** Phase 1 (Foundation). Environment setup must be correct before any AI feature works.

---

## Moderate Pitfalls

Mistakes that cause significant bugs, user confusion, or technical debt.

---

### Pitfall 7: Anonymous-to-Authenticated Merge Race Conditions

**What goes wrong:** When an anonymous user signs up, their anonymous profile data must be transferred to the new authenticated user. If two tabs are open, or if the merge function is not atomic, data can be lost or duplicated. Additionally, if an anonymous user tries to link an email that already has an account, the identity linking fails with "Identity is already linked to another user."

**Why it happens:** The project uses iron-session (not Supabase anonymous auth), so the merge is entirely custom. There is no built-in Supabase mechanism to handle this -- it requires a database function that atomically reassigns ownership.

**Prevention:**
- Implement the merge as a single Postgres function (`merge_anonymous_profile`) that runs in a transaction.
- Handle the "email already exists" case: sign the user into the existing account, then offer to merge or discard the anonymous data.
- Use `ON CONFLICT` clauses for any unique constraints (like IDNO).
- The iron-session cookie must be cleared after successful merge to prevent stale anonymous sessions from creating ghost profiles.
- Test the flow: create anonymous profile -> enter same IDNO as an existing authenticated user -> merge should not create duplicates.

**Detection:** Query for profiles where `user_id IS NULL` after users have signed up. These are orphaned anonymous profiles that were never merged.

**Confidence:** MEDIUM -- the project's audit identified this (finding #9), but the implementation details depend on the specific database schema.

**Phase relevance:** Phase 2 (Auth flow). Must be designed alongside the authentication implementation.

---

### Pitfall 8: Web Scraping Government Sites Breaks Silently

**What goes wrong:** Moldovan government data sources (OpenMoney.md, idno.md, srl.md) change their HTML structure without notice. Cheerio selectors that worked yesterday return empty results today. The system does not crash -- it returns empty company profiles, and users see "no data found" for valid companies.

**Why it happens:** Government websites are maintained by different agencies with no API contracts. HTML changes are unannounced. These sites may also: change encoding (Windows-1252 to UTF-8), add CAPTCHA/anti-bot measures, go down for maintenance, or change domains entirely.

**Specific risks for this project:**
- **Encoding issues:** Moldovan sites may serve content in Windows-1252 or ISO-8859-2 rather than UTF-8. Romanian diacritics in company names will appear garbled. Use `iconv-lite` to detect and convert encoding.
- **8-second timeout is aggressive:** Government servers in Moldova may respond slowly. During peak hours or maintenance windows, 8 seconds may not be enough. Consider 12-15 seconds with a fast-fail for connection refused.
- **HTML structure changes:** Cheerio CSS selectors are brittle. If a site wraps its data table in a new `<div>`, all selectors break.
- **IP blocking:** Even modest scraping rates (10 req/min) can trigger blocks on small government servers. There is no way to negotiate rate limits with these agencies.

**Prevention:**
- Implement a monitoring layer: after each scrape, validate that expected fields (company name, IDNO, registration date) are present. If any source returns zero valid fields for 3 consecutive requests, trigger an admin alert.
- Build the "confidence-based merge" from multiple sources so that if one source breaks, the other two can still provide data.
- Cache successful scrape results in Supabase so that company lookups do not require live scraping every time.
- Log raw HTML responses for the first week of production to build a baseline of what "normal" responses look like.
- The manual entry fallback is critical -- do not treat it as an edge case. It will be the primary path when scraping breaks.

**Detection:** Monitor the ratio of successful scrapes (returned data) vs. empty scrapes per source. A sudden drop to 0% for any source indicates a breaking change.

**Confidence:** MEDIUM -- general web scraping pitfalls are well-documented, but specific Moldovan site behavior is based on domain knowledge, not verified sources.

**Phase relevance:** Phase 2 (Data aggregation). But the monitoring and alerting should be designed in Phase 1.

---

### Pitfall 9: LLM Romanian Output Quality Degrades Under Constraints

**What goes wrong:** Claude produces Romanian text that is grammatically correct but stylistically wrong for grant applications. Common issues: using formal/literary Romanian instead of institutional language, mixing Romanian and English terminology, inconsistent diacritics (using "s-cedilla" `ş` instead of "s-comma-below" `ș`), and translating idioms literally from English.

**Why it happens:** LLMs are trained predominantly on English data. Romanian coverage is lower, especially for domain-specific content like grant applications. The model may "think" in English and translate to Romanian, producing unnatural phrasing. Additionally, the Unicode distinction between `ș` (U+0219, correct Romanian) and `ş` (U+015F, Turkish/legacy) is subtle but matters to Romanian speakers.

**Specific risks:**
- **Rubric-optimized writing:** The AI must write to maximize scoring rubric points. If the system prompt describing the rubric is in English but the output must be in Romanian, the model may prioritize English-style structure over Romanian institutional conventions.
- **Character limits:** Romanian text is typically 10-15% longer than equivalent English text. Character limits designed for English content may truncate Romanian text mid-word.
- **Tone consistency:** Grant commissions expect formal-institutional Romanian, not conversational or literary. The system prompt must include explicit tone examples.

**Prevention:**
- System prompts must be in Romanian, not English. The rubric descriptions, tone guidelines, and example outputs should all be Romanian.
- Include 2-3 few-shot examples of well-written grant text in Romanian in the system prompt.
- Enforce the correct diacritics (`ș` and `ț` with comma below, not cedilla) via post-processing: replace `ş` with `ș` and `ţ` with `ț` in all AI output.
- Set character limits 15% higher than the English equivalent, then truncate on the server with awareness of word boundaries.
- Test AI output with a native Romanian speaker before launch. Automated grammar checks will not catch institutional tone issues.

**Detection:** Search AI output for `ş` (cedilla) -- its presence indicates the model is using legacy/Turkish characters instead of correct Romanian.

**Confidence:** MEDIUM -- LLM multilingual behavior is well-studied, but specific Romanian grant application quality requires domain expert validation.

**Phase relevance:** Phase 3 (AI Writer). But system prompt design in Romanian should begin in Phase 2 during AI integration.

---

### Pitfall 10: proxy.ts Auth Logic Cannot Access Database or Shared State

**What goes wrong:** Developers put Supabase session validation, database lookups, or complex auth logic in `proxy.ts`, expecting it to work like Express middleware. In Next.js 16, proxy runs on Node.js runtime but is designed for lightweight routing -- it cannot reliably access shared modules, database connections, or global state.

**Why it happens:** The mental model from Express.js ("middleware runs before every request and can do anything") does not apply. Next.js proxy is meant for rewrites, redirects, and header manipulation. Complex auth should happen in server components, route handlers, or server actions.

**Consequences:** Auth checks that depend on database lookups (e.g., "is this user an admin?") fail intermittently. Session refresh logic that requires Supabase client initialization may not work reliably in proxy context.

**Prevention:**
- Use `proxy.ts` ONLY for: reading/setting cookies, redirecting unauthenticated users to login, and refreshing Supabase auth tokens via `supabase.auth.getUser()`.
- Move all authorization logic (role checks, admin verification) into server components or server actions that have full Node.js runtime access.
- Do NOT import heavy modules (Supabase admin client, AI SDK, Cheerio) in proxy.ts -- it inflates the proxy bundle and slows every request.
- For the iron-session anonymous cookie: read it in proxy.ts to check existence, but decrypt/validate it in the route handler.

**Detection:** If proxy.ts imports grow beyond `next/server` and a lightweight session/cookie utility, it is doing too much.

**Confidence:** HIGH -- confirmed by Next.js 16 official proxy.ts documentation, which explicitly states "you should not attempt relying on shared modules or globals."

**Phase relevance:** Phase 1 (Foundation). Proxy architecture must be minimal from the start.

---

### Pitfall 11: Supabase Anonymous Auth Abuse Inflates Database

**What goes wrong:** If using Supabase's built-in anonymous sign-ins (or even the custom iron-session approach), bad actors can create thousands of anonymous profiles by scripting requests, inflating the database and potentially hitting Supabase free tier limits.

**Why it happens:** Anonymous profile creation has no identity verification. Without CAPTCHA or aggressive rate limiting, automated scripts can flood the endpoint.

**Consequences:** Database bloat. Supabase row limits on free/lower tiers. Noise in analytics (thousands of bot "users"). Increased Supabase costs.

**Prevention:**
- Enable Cloudflare Turnstile on the landing page form (before any profile creation). This is the official Supabase recommendation for anonymous sign-in abuse prevention.
- Rate limit anonymous profile creation: max 30/hour per IP (Supabase's default for anonymous auth).
- Since the project uses Vercel Firewall (mentioned in constraints as replacing @upstash/ratelimit), configure rate limiting rules there for the profile creation endpoint.
- Implement a cleanup job: delete anonymous profiles older than 30 days that were never converted to authenticated users.
- Do NOT expose the anonymous profile count in any public API or analytics endpoint.

**Detection:** Monitor the `profiles` table growth rate. If anonymous profile creation exceeds 100/day without corresponding authenticated conversions, bot abuse is likely.

**Confidence:** HIGH -- confirmed by Supabase official documentation on anonymous sign-in security.

**Phase relevance:** Phase 2 (Auth flow). CAPTCHA must be implemented alongside the landing page form.

---

## Minor Pitfalls

Mistakes that cause developer friction, minor bugs, or wasted time.

---

### Pitfall 12: iron-session Cookie Not Set in Safari/WebKit

**What goes wrong:** Safari's Intelligent Tracking Prevention (ITP) can block or clear third-party cookies. If iron-session cookies are not configured with proper `SameSite`, `Secure`, and `Path` attributes, Safari users lose their anonymous session on navigation.

**Prevention:**
- Set `SameSite: 'lax'`, `Secure: true` (production only), `Path: '/'`, `httpOnly: true` on all iron-session cookies.
- Test the anonymous flow specifically in Safari and iOS WebKit browsers.
- Ensure the cookie domain matches the deployment domain exactly.

**Confidence:** MEDIUM -- reported in iron-session GitHub issues (#870), but may be fixed in recent versions.

**Phase relevance:** Phase 1 (Foundation).

---

### Pitfall 13: Vercel Cron CRON_SECRET Validation Missing Bearer Prefix

**What goes wrong:** Developers compare `request.headers.get('authorization')` directly against `process.env.CRON_SECRET`, forgetting that Vercel sends the value with a `Bearer ` prefix. Every cron invocation returns 401 Unauthorized.

**Prevention:**
- The correct comparison is: `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``
- Copy the exact pattern from Vercel's official docs, not from memory.

**Confidence:** HIGH -- confirmed by Vercel official documentation.

**Phase relevance:** Phase 4 (Notifications/Cron).

---

### Pitfall 14: Vercel Cron Duplicate Events Cause Double Emails

**What goes wrong:** Vercel's event system can deliver the same cron event twice. A deadline reminder cron that sends emails will send duplicate reminder emails to users.

**Prevention:**
- Design all cron operations to be idempotent. For reminders: check `reminder_7d_sent_at IS NULL` before sending, then set the timestamp in the same transaction.
- Use a unique constraint or deduplication key for each notification type + grant + user combination.
- Never use "increment" operations in cron jobs. Use "set" operations.

**Confidence:** HIGH -- confirmed by Vercel official documentation on cron job idempotency.

**Phase relevance:** Phase 4 (Notifications/Cron).

---

### Pitfall 15: `convertToModelMessages()` Is Now Async

**What goes wrong:** In AI SDK v5, `convertToCoreMessages()` was synchronous. In v6, `convertToModelMessages()` is async. Forgetting to `await` it returns a Promise object instead of message array, causing the AI to receive `[object Promise]` as the conversation history.

**Prevention:**
- Always `await convertToModelMessages(messages)`.
- The `npx @ai-sdk/codemod v6` codemod handles the rename but may not add `await`. Manually verify.

**Confidence:** HIGH -- confirmed by AI SDK v6 migration guide.

**Phase relevance:** Phase 2 (AI Integration).

---

### Pitfall 16: SSRF via Scraping Endpoint

**What goes wrong:** If the scraping endpoint accepts arbitrary URLs (e.g., a user passes a URL instead of an IDNO), attackers can use the server as a proxy to access internal services (SSRF).

**Prevention:**
- The scraping functions must ONLY accept IDNO strings, never URLs.
- Hardcode the target domains (openmoney.md, idno.md, srl.md) in the scraping functions. Construct URLs server-side from the IDNO.
- The project already plans a domain whitelist for SSRF prevention -- implement it as a strict allowlist, not a blocklist.
- Validate IDNO format (numeric, fixed length) before constructing any URL.

**Confidence:** HIGH -- SSRF is a well-documented attack vector for applications with server-side HTTP requests.

**Phase relevance:** Phase 2 (Data aggregation).

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| 1 - Foundation | Database setup | RLS policies written for auth.uid() break anonymous flow (Pitfall 1) | Use service role for anonymous, RLS for authenticated only |
| 1 - Foundation | PDF validation | @react-pdf/renderer fails on Vercel (Pitfall 3) | Deploy test PDF route immediately, prepare jspdf fallback |
| 1 - Foundation | Environment setup | Stale AI_GATEWAY_API_KEY blocks OIDC (Pitfall 6) | Never set API key, use vercel env pull exclusively |
| 1 - Foundation | proxy.ts | Overloading proxy with auth logic (Pitfall 10) | Keep proxy minimal: cookies + redirects only |
| 2 - Auth + Data | Anonymous merge | Race conditions during profile transfer (Pitfall 7) | Atomic Postgres merge function with ON CONFLICT |
| 2 - Auth + Data | Scraping | Silent failures from HTML changes (Pitfall 8) | Validation layer, multi-source confidence merge, admin alerts |
| 2 - Auth + Data | AI integration | v5 patterns in codebase (Pitfall 2) | Run codemod, grep for CoreMessage/streamObject/Experimental_Agent |
| 2 - Auth + Data | Abuse prevention | Anonymous profile flooding (Pitfall 11) | Cloudflare Turnstile on form, Vercel Firewall rate limits |
| 3 - AI Writer | Romanian output | Wrong diacritics, wrong tone (Pitfall 9) | Romanian system prompts, post-processing cedilla fix, native speaker review |
| 3 - AI Writer | PDF export | Romanian diacritics broken in PDF (Pitfall 4) | Custom .ttf font with full Romanian coverage |
| 4 - Notifications | Cron jobs | Static compilation, duplicate events (Pitfalls 5, 14) | force-dynamic, idempotent operations, CRON_SECRET with Bearer prefix |
| 4 - Notifications | Email delivery | Double emails from cron duplicates (Pitfall 14) | Deduplication keys, sent-at timestamps |

---

## Sources

### Supabase
- [Row Level Security - Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Anonymous Sign-Ins - Supabase Docs](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)
- [Security of Anonymous Sign-ins Discussion](https://github.com/orgs/supabase/discussions/22855)
- [CAPTCHA Protection - Supabase Docs](https://supabase.com/docs/guides/auth/auth-captcha)

### AI SDK v6
- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [AI Gateway Provider Docs](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)
- [AI Gateway OIDC Debug Report](https://gist.github.com/johnlindquist/0547341e60fb2088599104bab2726838)

### Next.js 16
- [proxy.ts File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Middleware to Proxy Migration](https://nextjs.org/docs/messages/middleware-to-proxy)

### PDF Generation
- [react-pdf React 19 Reconciler Issue #2966](https://github.com/diegomura/react-pdf/issues/2966)
- [react-pdf React 19.2 TypeError Issue #3223](https://github.com/diegomura/react-pdf/issues/3223)
- [react-pdf 50MB Size Limit Issue #1504](https://github.com/wojtekmaj/react-pdf/issues/1504)
- [jspdf Unicode Support Issue #2093](https://github.com/parallax/jsPDF/issues/2093)

### Vercel Platform
- [Managing Cron Jobs - Vercel Docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Function Duration Limits](https://vercel.com/docs/functions/configuring-functions/duration)
- [Cron Jobs Troubleshooting](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)

### Web Scraping
- [Cheerio Character Encoding FAQ](https://webscraping.ai/faq/cheerio/how-do-you-handle-character-encoding-issues-when-using-cheerio)

### LLM Multilingual
- [Romanian LLM Performance Study (arXiv:2501.05601)](https://arxiv.org/abs/2501.05601)
- [EuroLLM Technical Report](https://arxiv.org/pdf/2506.04079)

### iron-session
- [iron-session GitHub](https://github.com/vvo/iron-session)
- [Safari Cookie Issue #870](https://github.com/vvo/iron-session/issues/870)
