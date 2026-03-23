---
phase: 04-authentication-and-profile-merge
verified: 2026-03-21T20:30:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Open a grant card as a logged-out user and click 'Aplica acum'"
    expected: "Account wall modal appears with the signup form and 'Continua fara cont' link"
    why_human: "Client-side modal state, Dialog open/close transition, and visual rendering cannot be verified programmatically"
  - test: "Complete signup from the modal and confirm you land on the intended grant page"
    expected: "After signup, user is redirected to /grants/{id} (the redirectTo URL threaded through the form)"
    why_human: "Email-confirmation-based redirect flow requires a live Supabase instance and real email"
  - test: "Click 'Salveaza' as an authenticated user, then refresh the page"
    expected: "Grant shows 'Salvat' (filled bookmark icon) after toggle and persists across refresh"
    why_human: "Real DB write to saved_grants table and RLS enforcement require a live environment"
  - test: "Click 'Continua fara cont' in the account wall modal"
    expected: "Modal closes and user navigates directly to /grants/{id} without creating an account"
    why_human: "Navigation behaviour and modal dismissal are DOM/router interactions not testable via grep"
---

# Phase 4: Authentication and Profile Merge — Verification Report

**Phase Goal:** Lightweight auth (email + password), anonymous-to-registered profile merge, saved grants, privacy policy
**Verified:** 2026-03-21T20:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Signup server action creates a Supabase user with name, email, phone metadata and password | VERIFIED | `auth.ts` line 31-38: `supabase.auth.signUp({ email, password, options: { data: { name, phone } } })` |
| 2  | After signup, the anonymous company profile is claimed by calling claim_company_profile RPC | VERIFIED | `auth.ts` line 50-53: `admin.rpc('claim_company_profile', { p_profile_id, p_user_id })` gated on `session.companyProfileId && data.user` |
| 3  | Notification preference is stored in profiles.email_notifications after signup | VERIFIED | `auth.ts` line 57-63: `admin.from('profiles').update({ phone, email_notifications: wantsNotifications }).eq('id', data.user.id)` |
| 4  | The iron-session anonymous cookie is cleared after profile merge | VERIFIED | `auth.ts` line 66-67: `session.companyProfileId = undefined; await session.save()` |
| 5  | Redirect URL is threaded through signup and passed to emailRedirectTo for auth callback | VERIFIED | `auth.ts` line 36: `emailRedirectTo: \`..../api/auth/callback?next=${redirectTo}\`` |
| 6  | shadcn Dialog, Checkbox, and Label components are installed and available | VERIFIED | All three files exist: `src/components/ui/dialog.tsx`, `checkbox.tsx`, `label.tsx` |
| 7  | Clicking 'Aplica acum' as an unauthenticated user opens the account wall modal | VERIFIED | `hero-card.tsx` line 81-86: unauthenticated renders `<button onClick={() => setShowModal(true)}>` |
| 8  | The modal shows a signup form with name, email, phone, password fields and notification checkbox | VERIFIED | `signup-form.tsx` lines 17-65: all four input fields plus `<Checkbox name="notifications">` present |
| 9  | The modal has a 'Continua fara cont' link that closes modal and navigates to the grant writer page | VERIFIED | `account-wall-modal.tsx` line 39-46: `<Link href={grantUrl} onClick={() => onOpenChange(false)}>Continua fara cont</Link>` |
| 10 | Clicking 'Aplica acum' as an authenticated user navigates directly to the grant page | VERIFIED | `hero-card.tsx` line 73-79: `isAuthenticated ? <Link href={/grants/${grant.id}}>` |
| 11 | Authenticated users see a functional 'Salveaza' bookmark toggle button | VERIFIED | `save-button.tsx` lines 31-48: `handleToggle` calls `toggleSavedGrant(grantId)` and updates state |
| 12 | Unauthenticated users clicking 'Salveaza' see the account wall modal | VERIFIED | `save-button.tsx` lines 22-29: `if (!isAuthenticated) return <Button onClick={onAuthRequired}>` |
| 13 | The redirect URL is threaded from the grant card through the modal to the signup form as a hidden field | VERIFIED | `account-wall-modal.tsx` passes `redirectTo={grantUrl}` to `<SignupForm>`; `signup-form.tsx` renders `<input type="hidden" name="redirectTo" value={redirectTo}>` |
| 14 | User can access /privacy and see a Romanian privacy policy page | VERIFIED | `src/app/privacy/page.tsx` — 180 lines with all 7 sections (h2 headings in Romanian), `Politica de Confidentialitate` h1 |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Lines | Status | Details |
|----------|----------|-------|--------|---------|
| `src/app/actions/auth.ts` | signup, signIn, signOut server actions | 100 | VERIFIED | Exports all three; full implementations with validation, RPC, profile update, session clear |
| `src/app/actions/saved-grants.ts` | toggleSavedGrant, getSavedGrants server actions | 64 | VERIFIED | Auth check, insert/delete toggle, ID list query |
| `src/components/ui/dialog.tsx` | shadcn Dialog component | — | VERIFIED | File exists |
| `src/components/ui/checkbox.tsx` | shadcn Checkbox component | — | VERIFIED | File exists |
| `src/components/ui/label.tsx` | shadcn Label component | — | VERIFIED | File exists |
| `src/components/auth/account-wall-modal.tsx` | Controlled Dialog with signup form and skip option | 50 | VERIFIED | `min_lines: 30` met; Dialog, SignupForm, skip Link all present |
| `src/components/auth/signup-form.tsx` | Signup form using useActionState with signup action | 76 | VERIFIED | `min_lines: 40` met; `useActionState(signup, null)` on line 11 |
| `src/components/auth/__tests__/account-wall-modal.test.ts` | Tests for modal and signup form | 155 | VERIFIED | `min_lines: 20` met; 8 tests covering dialog title, skip link, form fields, closed state |
| `src/components/grants/save-button.tsx` | Bookmark toggle button calling toggleSavedGrant | 49 | VERIFIED | `min_lines: 20` met; calls `toggleSavedGrant`, dual auth/anon behavior |
| `src/components/grants/hero-card.tsx` | Auth-aware Aplica/Salveaza buttons | 102 | VERIFIED | `isAuthenticated` prop, conditional Link vs button, SaveButton, AccountWallModal |
| `src/components/grants/match-card.tsx` | Auth-aware Aplica/Salveaza buttons | 102 | VERIFIED | Same pattern as hero-card |
| `src/app/privacy/page.tsx` | Static privacy policy in Romanian with "Politica de Confidentialitate" | 180 | VERIFIED | `contains: "Politica de Confidentialitate"` confirmed; `min_lines: 30` far exceeded |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/actions/auth.ts` | claim_company_profile RPC | `admin.rpc('claim_company_profile', {p_profile_id, p_user_id})` | WIRED | Line 50: exact pattern match |
| `src/app/actions/auth.ts` | `src/lib/session.ts` | `getSession()` reads companyProfileId, clears after merge | WIRED | Lines 45-67: `session.companyProfileId` read, cleared, `session.save()` called |
| `src/app/actions/auth.ts` | profiles table | `admin.from('profiles').update(...)` | WIRED | Lines 57-63: admin client updates phone and email_notifications |
| `src/components/auth/signup-form.tsx` | `src/app/actions/auth.ts` | `useActionState(signup, ...)` | WIRED | Line 11: `useActionState(signup, null)` |
| `src/components/grants/save-button.tsx` | `src/app/actions/saved-grants.ts` | `toggleSavedGrant(grantId)` | WIRED | Line 6 import, line 34 call |
| `src/components/grants/hero-card.tsx` | `src/components/auth/account-wall-modal.tsx` | conditional render + `isAuthenticated` prop | WIRED | Lines 15, 73, 94: import, conditional, modal rendered as sibling |
| `src/app/results/page.tsx` | `src/app/actions/saved-grants.ts` + MatchList | `getSavedGrants()` passed to `<MatchList>` | WIRED | Lines 6, 25-27, 72-74: auth check, getSavedGrants, props propagated |
| `src/app/grants/browse/page.tsx` | `src/app/actions/saved-grants.ts` + GrantList | `getSavedGrants()` passed to `<GrantList>` | WIRED | Lines 3, 40-42, 121: auth check, getSavedGrants, props propagated |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 04-02 | Account wall modal appears on "Aplica acum" click for unauthenticated users | SATISFIED | `hero-card.tsx`, `match-card.tsx`, `grant-card.tsx` all render modal trigger for unauthenticated |
| AUTH-02 | 04-01 | User can sign up with name, email, phone | SATISFIED | `signup-form.tsx` renders name/email/phone inputs; `auth.ts` sends them in `options.data` |
| AUTH-03 | 04-01 | Notification checkbox on signup: "Doresc sa primesc notificari..." | SATISFIED | `signup-form.tsx` line 61-65: Checkbox with matching label text; `auth.ts` stores `email_notifications` |
| AUTH-04 | 04-02 | "Continua fara cont" skip option allows writer access without account | SATISFIED | `account-wall-modal.tsx` line 39-46: Link to `/grants/${grantId}` with `onClick` to close modal |
| AUTH-05 | 04-01 | Anonymous company profile linked to user on signup via DB merge function | SATISFIED | `auth.ts` lines 46-54: `claim_company_profile` RPC called when `session.companyProfileId` exists |
| AUTH-06 | 04-01 | Intended redirect URL preserved through signup flow | SATISFIED | `auth.ts` line 36: redirectTo in emailRedirectTo; `signup-form.tsx` hidden field; `auth.ts` line 71: `redirect(redirectTo)` |
| AUTH-07 | 04-01, 04-02 | Saved grants feature for authenticated users | SATISFIED | `saved-grants.ts` provides toggle/list; `save-button.tsx` renders bookmark toggle for authenticated users |
| GEN-04 | 04-03 | Privacy policy page in Romanian | SATISFIED | `src/app/privacy/page.tsx` — 180 lines, 7 sections, Romanian text, accessible at `/privacy` |

**Orphaned requirements check:** No requirements mapped to Phase 4 in REQUIREMENTS.md that are unclaimed by the three plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

The four `placeholder=` matches found in `signup-form.tsx` are HTML input placeholder attributes (UI hints for users), not implementation stubs.

---

### Test Suite Results

**All 125 tests pass across 18 test files.**

Phase 4 test files and counts:
- `src/app/actions/__tests__/auth.test.ts` — 15 tests (signup: 9, signIn: 3, signOut: 2, redirect: 1)
- `src/app/actions/__tests__/saved-grants.test.ts` — 7 tests (toggleSavedGrant: 5, getSavedGrants: 2)
- `src/components/auth/__tests__/account-wall-modal.test.ts` — 8 tests (modal: 4, SignupForm: 4)
- `src/app/privacy/__tests__/page.test.ts` — 8 tests (all 7 section headings + h1)

---

### Human Verification Required

#### 1. Account Wall Modal Opens on Click

**Test:** As a logged-out user, visit /results or /grants/browse, click "Aplica acum" on any grant card.
**Expected:** A dialog modal opens showing the signup form with the title "Creaza un cont pentru a aplica" and a "Continua fara cont" link.
**Why human:** Client-side modal state, Dialog animation, and visual rendering require a browser.

#### 2. Post-Signup Redirect to Intended Grant

**Test:** Use "Aplica acum" on a specific grant, complete the signup form, confirm the email link.
**Expected:** After email confirmation, user is redirected to `/grants/{the-grant-id}` (not to the homepage).
**Why human:** The email-confirmation flow requires a live Supabase project with a real email and working auth callback.

#### 3. Saved Grants Toggle Persistence

**Test:** As an authenticated user, click "Salveaza" on a grant. Reload the page.
**Expected:** The button shows "Salvat" with a filled bookmark icon after the first click, and persists as saved after reload.
**Why human:** Requires live DB write to `saved_grants` table and server-side fetch of saved state on page load.

#### 4. "Continua fara cont" Navigation

**Test:** Open the account wall modal, click "Continua fara cont".
**Expected:** Modal closes and browser navigates to `/grants/{grant-id}` without account creation.
**Why human:** Client-side navigation and modal dismiss interaction require a browser.

---

### Gaps Summary

No gaps. All 14 must-haves verified. All 8 requirement IDs (AUTH-01 through AUTH-07, GEN-04) satisfied with implementation evidence. All 125 tests pass. No orphaned requirements, no stub anti-patterns.

---

_Verified: 2026-03-21T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
