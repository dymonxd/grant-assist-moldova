# Phase 4: Authentication and Profile Merge - Research

**Researched:** 2026-03-21
**Domain:** Supabase Auth + anonymous-to-authenticated profile merge + modal UX + saved grants
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing anonymous-session-based flow into a full authentication system where users can sign up, have their anonymous company profiles seamlessly linked to their new accounts, save/bookmark grants, and access a privacy policy page. The core complexity lies in the anonymous-to-authenticated profile merge -- the database already has the `claim_company_profile` SQL function and the iron-session cookie tracks `companyProfileId`, so the merge is a matter of calling the RPC function after signup and clearing the anonymous session.

The existing codebase already has: Supabase client utilities (browser, server, admin), proxy.ts for session refresh and admin route protection, an auth callback route at `/api/auth/callback` that handles the `next` redirect parameter, iron-session for anonymous profile tracking, and RLS policies for `saved_grants` (authenticated users only). The `handle_new_user` trigger automatically creates a `profiles` row on signup using `raw_user_meta_data.name`. The "Aplica acum" buttons currently link directly to `/grants/{id}` -- they need to be intercepted with an account wall modal for unauthenticated users.

**Primary recommendation:** Use Supabase Auth `signUp` with `options.data` for metadata (name, phone, notifications preference), call `claim_company_profile` RPC after signup to merge the anonymous profile, use shadcn Dialog for the account wall modal, and implement saved grants as a toggle server action on the existing `saved_grants` table.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Account wall modal appears on "Aplica acum" click for unauthenticated users | shadcn Dialog with controlled state, auth check via `supabase.auth.getUser()` in server component or server action |
| AUTH-02 | User can sign up with name, email, phone | Supabase `auth.signUp()` with `options.data: { name, phone }` -- metadata stored in `raw_user_meta_data`, trigger uses `name` for profiles table |
| AUTH-03 | Notification checkbox on signup: "Doresc sa primesc notificari..." | Store in `profiles.email_notifications` column (already exists, defaults to `true`) -- update after signup via admin client |
| AUTH-04 | "Continua fara cont" skip option allows writer access without account | Modal close action, proceed to grant writer URL without auth |
| AUTH-05 | Anonymous company profile linked to user on signup via DB merge function | `claim_company_profile(p_profile_id, p_user_id)` RPC already exists in schema -- call from signup server action |
| AUTH-06 | Intended redirect URL preserved through signup flow | Auth callback already handles `?next=` param; pass `/grants/{grantId}` through signup flow |
| AUTH-07 | Saved grants feature for authenticated users (bookmark grants) | `saved_grants` table with RLS already exists; server action for toggle + query for list |
| GEN-04 | Privacy policy page in Romanian | Static page at `/privacy` -- no external dependencies |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.3 | Auth API (signUp, signInWithPassword, getUser) | Already installed, Supabase Auth is the project's auth solution |
| @supabase/ssr | ^0.9.0 | Server-side cookie-based session management | Already installed, handles PKCE flow and cookie storage |
| iron-session | ^8.0.4 | Anonymous profile tracking via encrypted cookies | Already installed, tracks companyProfileId before auth |
| shadcn/ui (Dialog) | ^4.1.0 | Account wall modal component | Already using shadcn for all UI; Dialog is the standard modal component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons for bookmarks, close buttons | Already installed |
| @base-ui/react | ^1.3.0 | Underlying primitive for shadcn components | Already installed, used by shadcn v4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Dialog | Custom modal | Dialog handles focus trapping, escape key, overlay click, accessibility -- never hand-roll |
| Server action signup | Client-side signUp | Server actions are the project pattern (see profile.ts); auth state sync issue with onAuthStateChange (see pitfalls) |
| iron-session clear | No clear | Must clear anonymous session cookie after merge to prevent stale companyProfileId |

**Installation:**
```bash
npx shadcn@latest add dialog checkbox label
```
Note: `dialog` is not yet installed. `checkbox` and `label` are needed for the notification opt-in. All other dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    actions/
      auth.ts              # signup, login, signOut, claimProfile server actions
      saved-grants.ts      # toggleSavedGrant, getSavedGrants server actions
    (auth)/
      login/
        page.tsx           # Login page (optional -- modal may suffice for v1)
    privacy/
      page.tsx             # Static privacy policy page (GEN-04)
  components/
    auth/
      account-wall-modal.tsx  # The modal triggered by "Aplica acum"
      signup-form.tsx         # Signup form (name, email, phone, password, notifications)
    grants/
      save-button.tsx         # Bookmark toggle button for authenticated users
      saved-grants-list.tsx   # List of saved grants
  lib/
    supabase/
      client.ts            # Already exists -- browser client
      server.ts            # Already exists -- server client
      admin.ts             # Already exists -- service role client
    session.ts             # Already exists -- iron-session
```

### Pattern 1: Account Wall Modal with Auth Gate
**What:** When unauthenticated user clicks "Aplica acum", show modal instead of navigating. Modal offers signup, login, or skip ("Continua fara cont").
**When to use:** AUTH-01, AUTH-04, AUTH-06
**Example:**
```typescript
// Source: Project pattern (hero-card.tsx current structure + shadcn Dialog)
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function ApplyButton({ grantId, isAuthenticated }: {
  grantId: string
  isAuthenticated: boolean
}) {
  const [showModal, setShowModal] = useState(false)

  if (isAuthenticated) {
    // Authenticated: navigate directly
    return <a href={`/grants/${grantId}`}>Aplica acum</a>
  }

  return (
    <>
      <button onClick={() => setShowModal(true)}>Aplica acum</button>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creaza un cont</DialogTitle>
          </DialogHeader>
          {/* SignupForm with grantId for redirect */}
          {/* "Continua fara cont" link */}
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Pattern 2: Signup Server Action with Profile Merge
**What:** Server action that signs up user, creates profile, merges anonymous company profile, updates notification preference, and redirects.
**When to use:** AUTH-02, AUTH-03, AUTH-05, AUTH-06
**Example:**
```typescript
// Source: Supabase docs (signUp with options.data) + existing claim_company_profile RPC
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  const wantsNotifications = formData.get('notifications') === 'on'
  const redirectTo = formData.get('redirectTo') as string | null

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=${redirectTo || '/'}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Merge anonymous profile if exists
  const session = await getSession()
  if (session.companyProfileId && data.user) {
    const admin = createAdminClient()
    await admin.rpc('claim_company_profile', {
      p_profile_id: session.companyProfileId,
      p_user_id: data.user.id,
    })

    // Update notification preference
    if (!wantsNotifications) {
      await admin
        .from('profiles')
        .update({ email_notifications: false, phone })
        .eq('id', data.user.id)
    } else {
      await admin
        .from('profiles')
        .update({ phone })
        .eq('id', data.user.id)
    }

    // Clear anonymous session
    session.companyProfileId = undefined
    await session.save()
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo || '/')
}
```

### Pattern 3: Saved Grant Toggle
**What:** Server action to toggle bookmark state on `saved_grants` table, usable from both results and browse pages.
**When to use:** AUTH-07
**Example:**
```typescript
// Source: Existing saved_grants table schema + RLS policies
'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleSavedGrant(grantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Trebuie sa fii autentificat' }

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_grants')
    .select('id')
    .eq('user_id', user.id)
    .eq('grant_id', grantId)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_grants').delete().eq('id', existing.id)
    return { saved: false }
  } else {
    await supabase.from('saved_grants').insert({
      user_id: user.id,
      grant_id: grantId,
    })
    return { saved: true }
  }
}
```

### Pattern 4: Auth State Check in Server Components
**What:** Check authentication state in server components to pass `isAuthenticated` prop to client components.
**When to use:** All pages that conditionally show auth UI
**Example:**
```typescript
// Source: Supabase SSR docs -- always use getUser() not getSession() server-side
import { createClient } from '@/lib/supabase/server'

export default async function ResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return <MatchList isAuthenticated={isAuthenticated} />
}
```

### Anti-Patterns to Avoid
- **Using getSession() for auth checks in server components:** `getSession()` trusts the JWT without server verification. Always use `getUser()` which validates with the Supabase auth server.
- **Relying on onAuthStateChange for server-action-based auth:** When signup/login happens via server actions, `onAuthStateChange` on the browser client does NOT fire. Use `revalidatePath` + redirect instead.
- **Inserting into saved_grants with anon client:** The `saved_grants` table has RLS requiring `auth.uid() = user_id`. Use the authenticated server client (not admin), so RLS validates ownership automatically.
- **Calling claim_company_profile with anon key:** The function is `SECURITY DEFINER` but still needs the correct user_id. Use admin client for the RPC call to bypass RLS.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/dialog | Custom overlay + portal + focus trap | shadcn Dialog (Radix-based) | Focus trapping, escape key, overlay click, aria attributes, scroll lock |
| Password hashing | bcrypt in server action | Supabase Auth signUp | Supabase handles hashing, salting, session tokens, PKCE flow |
| Email confirmation | Custom token + mailer | Supabase Auth email confirmation | Built-in template, token verification, rate limiting |
| Session management | Custom JWT + cookies | @supabase/ssr + proxy.ts | Already configured, handles refresh, PKCE, cookie chunking |
| Checkbox component | Custom styled input | shadcn Checkbox | Accessible, matches design system, indeterminate state support |

**Key insight:** Supabase Auth handles the entire authentication lifecycle (signup, login, session refresh, email confirmation, password reset). The project already has `proxy.ts` for session refresh and `handle_new_user` trigger for profile creation. The only custom logic needed is the profile merge (which already has a DB function) and the modal UX flow.

## Common Pitfalls

### Pitfall 1: onAuthStateChange Does Not Fire After Server Action Signup
**What goes wrong:** After signing up via a server action, the browser-side Supabase client still thinks the user is unauthenticated. UI doesn't update.
**Why it happens:** Server-side and browser-side Supabase clients don't share state. `onAuthStateChange()` was designed for cross-tab browser sync, not server-to-browser communication.
**How to avoid:** After successful signup in server action, use `revalidatePath('/', 'layout')` + `redirect()`. The redirect causes a full server render where `getUser()` will see the authenticated session from cookies.
**Warning signs:** UI shows logged-out state after successful signup; toggling components don't reflect auth state.

### Pitfall 2: Email Confirmation Race Condition with Profile Merge
**What goes wrong:** If email confirmation is enabled, `data.user` may exist after signUp but the user is not yet confirmed. The `handle_new_user` trigger fires on `auth.users INSERT`, but the user can't actually authenticate until confirming email.
**Why it happens:** Supabase creates the user row immediately but marks them as unconfirmed.
**How to avoid:** Two options: (a) Disable email confirmation in Supabase dashboard for v1 (simpler, acceptable for MVP), or (b) Move the profile merge to the auth callback route (`/api/auth/callback`) where the user is confirmed. Option (a) is recommended for v1.
**Warning signs:** User signs up, profile merge runs, but user can't log in because they haven't confirmed email.

### Pitfall 3: claim_company_profile Silently Fails If Profile Already Claimed
**What goes wrong:** If `user_id IS NOT NULL` on the company profile (already claimed), the UPDATE WHERE clause `user_id IS NULL` matches zero rows. No error is raised.
**Why it happens:** The function uses a WHERE clause that silently skips already-claimed profiles.
**How to avoid:** This is actually the desired behavior -- it prevents double-claiming. But if debugging, check the function return or add a RETURNING clause. The iron-session `companyProfileId` should be cleared after merge regardless.
**Warning signs:** None (this is safe by design).

### Pitfall 4: Redirect URL Lost During Signup Flow
**What goes wrong:** User clicks "Aplica acum" on grant card, modal opens, user signs up, but they land on homepage instead of the grant writer page.
**Why it happens:** The `redirectTo` URL is not propagated from the modal through the signup form to the server action to the auth callback.
**How to avoid:** Thread the redirect URL as a hidden form field: Modal receives `grantId` -> form has `<input type="hidden" name="redirectTo" value="/grants/{grantId}" />` -> server action passes it to `emailRedirectTo` and/or `redirect()`.
**Warning signs:** User always lands on homepage after signup; `next` param missing from auth callback URL.

### Pitfall 5: Saved Grants RLS Blocks Unauthenticated Insert
**What goes wrong:** Attempting to save a grant without authentication fails silently or throws RLS error.
**Why it happens:** `saved_grants` has RLS requiring `auth.uid() = user_id`. Anonymous users have no `auth.uid()`.
**How to avoid:** Only show the functional "Salveaza" button to authenticated users. For unauthenticated users, the button should open the account wall modal (same as "Aplica acum").
**Warning signs:** Error in Supabase logs: "new row violates row-level security policy".

### Pitfall 6: profiles.phone Not Updated During Signup
**What goes wrong:** The `handle_new_user` trigger only extracts `name` from `raw_user_meta_data`. Phone number is lost.
**Why it happens:** The trigger does `COALESCE(new.raw_user_meta_data->>'name', '')` but doesn't extract phone.
**How to avoid:** After signup, update the profiles row with phone via admin client. The signup server action should do: `admin.from('profiles').update({ phone }).eq('id', user.id)`.
**Warning signs:** Phone column in profiles table is always NULL despite users entering phone during signup.

## Code Examples

### Supabase Auth signUp with Metadata
```typescript
// Source: Supabase Auth docs (supabase.com/docs/reference/javascript/auth-signup)
// Verified pattern for passing user metadata during signup

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      name: 'Ion Popescu',
      phone: '+37360123456',
    },
    emailRedirectTo: `${origin}/api/auth/callback?next=/grants/${grantId}`,
  },
})
// data.user.user_metadata will contain { name, phone }
// handle_new_user trigger reads raw_user_meta_data->>'name' for profiles.name
```

### shadcn Dialog Controlled State
```typescript
// Source: shadcn/ui docs (ui.shadcn.com/docs/components/radix/dialog)
// Pattern for controlled modal with open/onOpenChange

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function AccountWallModal({
  open,
  onOpenChange,
  grantId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grantId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creaza un cont pentru a aplica</DialogTitle>
          <DialogDescription>
            Contul tau va salva progresul si vei primi notificari despre termene.
          </DialogDescription>
        </DialogHeader>
        {/* Signup form with hidden redirectTo field */}
        {/* "Continua fara cont" button that calls onOpenChange(false) and navigates */}
      </DialogContent>
    </Dialog>
  )
}
```

### claim_company_profile RPC Call
```typescript
// Source: Existing schema (001_initial_schema.sql lines 425-432)
// SECURITY DEFINER function -- use admin client

const admin = createAdminClient()
const { error } = await admin.rpc('claim_company_profile', {
  p_profile_id: session.companyProfileId,  // from iron-session
  p_user_id: user.id,                      // from signUp response
})
// Updates company_profiles SET user_id = p_user_id WHERE id = p_profile_id AND user_id IS NULL
```

### Auth Check Server-Side (getUser vs getSession)
```typescript
// Source: Supabase SSR docs
// ALWAYS use getUser() in server components -- it validates with auth server
// NEVER trust getSession() -- it only checks local JWT

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// user is null if not authenticated, or User object if authenticated
```

### Existing Auth Callback (already handles redirects)
```typescript
// Source: src/app/api/auth/callback/route.ts (already implemented)
// Handles ?next= parameter for post-auth redirect
// Validates against open redirect (must start with /, not //)
// This callback route ALREADY EXISTS -- no changes needed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers | @supabase/ssr | 2024 | Project already uses @supabase/ssr -- correct |
| getSession() for auth checks | getUser() for auth checks | 2024 | getUser() validates JWT with auth server; getSession() is untrustworthy server-side |
| middleware.ts (Next.js < 16) | proxy.ts (Next.js 16) | 2025 | Project already uses proxy.ts -- correct |
| useFormState (React 18) | useActionState (React 19) | 2024 | Project already uses useActionState in forms |

**Deprecated/outdated:**
- `@supabase/auth-helpers`: Deprecated in favor of `@supabase/ssr`. Project is already on `@supabase/ssr`.
- `middleware.ts`: Next.js 16 introduced proxy.ts pattern. Project already migrated.
- `supabase.auth.getSession()` for server-side auth checks: Use `getUser()` instead.

## Open Questions

1. **Email confirmation: enabled or disabled for v1?**
   - What we know: Supabase supports both. If enabled, user gets email with confirmation link before they can log in. The `handle_new_user` trigger fires on INSERT regardless.
   - What's unclear: Whether the project wants email confirmation for v1 or prefers instant access.
   - Recommendation: Disable email confirmation for v1 (set in Supabase dashboard under Authentication > Providers > Email). Simpler UX, fewer edge cases. Enable later for v2.

2. **Login page vs modal-only auth?**
   - What we know: AUTH-01 specifies a modal. No requirement for a standalone login page.
   - What's unclear: Whether returning users need a /login page for direct access.
   - Recommendation: Start with modal only. Add /login page if users request it. The proxy.ts already redirects unauthenticated /admin users to /login, so a minimal login page may be needed for admin access.

3. **"Continua fara cont" behavior on results page vs grant writer**
   - What we know: AUTH-04 says skip allows writer access without account. AUTH-01 says modal appears on "Aplica acum" click.
   - What's unclear: Does "Continua fara cont" navigate to the grant writer page or just close the modal?
   - Recommendation: "Continua fara cont" should navigate to the grant writer page (same as if they signed up, minus account features). This is the zero-friction intent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Account wall modal appears for unauth users on "Aplica acum" | unit | `npx vitest run src/components/auth/__tests__/account-wall-modal.test.ts -x` | -- Wave 0 |
| AUTH-02 | Signup with name, email, phone creates account | unit | `npx vitest run src/app/actions/__tests__/auth.test.ts -x` | -- Wave 0 |
| AUTH-03 | Notification checkbox updates email_notifications | unit | `npx vitest run src/app/actions/__tests__/auth.test.ts -x` | -- Wave 0 |
| AUTH-04 | "Continua fara cont" skip option works | unit | `npx vitest run src/components/auth/__tests__/account-wall-modal.test.ts -x` | -- Wave 0 |
| AUTH-05 | Anonymous profile merged to user on signup | unit | `npx vitest run src/app/actions/__tests__/auth.test.ts -x` | -- Wave 0 |
| AUTH-06 | Redirect URL preserved through signup flow | unit | `npx vitest run src/app/actions/__tests__/auth.test.ts -x` | -- Wave 0 |
| AUTH-07 | Saved grants toggle and list | unit | `npx vitest run src/app/actions/__tests__/saved-grants.test.ts -x` | -- Wave 0 |
| GEN-04 | Privacy policy page renders in Romanian | unit | `npx vitest run src/app/privacy/__tests__/page.test.ts -x` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/actions/__tests__/auth.test.ts` -- covers AUTH-02, AUTH-03, AUTH-05, AUTH-06 (signup, merge, notifications, redirect)
- [ ] `src/app/actions/__tests__/saved-grants.test.ts` -- covers AUTH-07 (toggle, list)
- [ ] `src/components/auth/__tests__/account-wall-modal.test.ts` -- covers AUTH-01, AUTH-04 (modal render, skip option)
- [ ] `src/app/privacy/__tests__/page.test.ts` -- covers GEN-04 (page renders)
- [ ] shadcn Dialog component install: `npx shadcn@latest add dialog checkbox label`

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/001_initial_schema.sql` -- `claim_company_profile` function, `saved_grants` table, `handle_new_user` trigger, RLS policies
- Existing codebase: `src/proxy.ts` -- proxy.ts pattern already handling session refresh and admin route protection
- Existing codebase: `src/lib/session.ts` -- iron-session with `companyProfileId` tracking
- Existing codebase: `src/app/api/auth/callback/route.ts` -- auth callback with `?next=` redirect parameter
- Existing codebase: `src/app/actions/profile.ts` -- server action patterns with admin client and session management
- [Supabase Auth docs - signUp](https://supabase.com/docs/reference/javascript/auth-signup) -- signUp API with `options.data` metadata
- [Supabase Auth docs - passwords](https://supabase.com/docs/guides/auth/passwords) -- password-based auth flow
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/radix/dialog) -- Dialog component with controlled state

### Secondary (MEDIUM confidence)
- [Supabase SSR migration guide](https://github.com/orgs/supabase/discussions/27849) -- server action patterns for login/signup
- [onAuthStateChange issue #1618](https://github.com/supabase/supabase-js/issues/1618) -- confirmed: server-action auth doesn't fire onAuthStateChange; use redirect + revalidatePath instead
- [Supabase SSR Next.js setup](https://supabase.com/docs/guides/auth/server-side/nextjs) -- server client configuration (already implemented)

### Tertiary (LOW confidence)
- None -- all critical findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in codebase; only Dialog/Checkbox need adding via shadcn CLI
- Architecture: HIGH -- patterns follow existing codebase conventions (server actions, admin client, iron-session); claim_company_profile RPC already exists
- Pitfalls: HIGH -- onAuthStateChange issue verified via GitHub issue; phone/notification gotcha verified by reading handle_new_user trigger source; redirect flow verified by reading auth callback route

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- Supabase Auth API is mature, no breaking changes expected)
