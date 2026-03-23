---
phase: 05-ai-grant-writer-and-export
verified: 2026-03-22T00:00:00Z
status: gaps_found
score: 21/22 must-haves verified
gaps:
  - truth: "User can click Trimite pe email and receive the application via email with formatted sections"
    status: failed
    reason: "sendApplicationEmail is always called with an empty string '' as the recipient address from export-bar.tsx. The server action passes that empty string directly to resend.emails.send({ to: [''] }) with no auth-context fallback — emails will be addressed to an empty recipient and rejected by Resend."
    artifacts:
      - path: "src/app/grants/[grantId]/write/export-bar.tsx"
        issue: "Line 123: sendApplicationEmail('', grantName, sections) — hardcoded empty string for 'to' with comment saying server action will get email from auth context, which it does not"
      - path: "src/app/actions/export.ts"
        issue: "sendApplicationEmail(to, ...) uses to: [to] in resend.emails.send directly, with no auth.getUser() lookup to resolve the authenticated user's email address"
    missing:
      - "export.ts: add auth.getUser() inside sendApplicationEmail to retrieve user.email when the to parameter is empty or not supplied"
      - "OR export-bar.tsx: pass the authenticated user's email address as the 'to' argument (fetch from Supabase user object available in page.tsx)"
human_verification:
  - test: "Email sends to authenticated user's actual email address"
    expected: "Clicking 'Trimite pe email' as an authenticated user sends the formatted application to the user's registered email"
    why_human: "Cannot verify Resend API delivery programmatically without a live RESEND_API_KEY and real email address"
  - test: "PDF downloads with correct Romanian diacritics"
    expected: "Downloaded PDF displays ă, â, î, ș, ț correctly in section text rendered with Geist Sans"
    why_human: "Requires visual inspection of the generated PDF binary — cannot verify font rendering in tests"
  - test: "Section 1 auto-preview displays grayed-out AI text on first writer visit"
    expected: "Section 1 shows italic grayed-out AI-generated text before the user has typed anything"
    why_human: "Requires live browser rendering with a valid OpenAI API key and a real grant/profile to call the streaming endpoint"
---

# Phase 5: AI Grant Writer and Export — Verification Report

**Phase Goal:** Users can write complete, rubric-optimized grant applications section by section with AI assistance in Romanian, and export their finished applications as PDF, clipboard copy, or email — the core value delivery where days of grant writing become minutes.

**Verified:** 2026-03-22
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First visit to /grants/[grantId]/write loads all section editors without error | VERIFIED | page.tsx calls getOrCreateApplication; writer.ts creates app+sections with field_snapshot; page renders WriterClient with full data |
| 2 | Expired grant shows block state with error message | VERIFIED | page.tsx has dedicated expired-grant card block with "Termenul limita pentru acest grant a expirat" |
| 3 | Section text exceeding character_limit is truncated server-side before persisting | VERIFIED | writer.ts saveSection fetches character_limit from field_snapshot and slices finalText; returns wasTruncated flag |
| 4 | AI streaming route returns progressive Romanian text with company data and rubric context | VERIFIED | /api/writer/generate/route.ts uses streamText + toTextStreamResponse; buildSectionPrompt assembles field+rubric+profile+brief |
| 5 | Input under 20 chars triggers clarifying question mode | VERIFIED | generate-section.ts line 69: userBrief.length < 20 appends Romanian clarification instruction; UI shows hint at line 218 of section-editor.tsx |
| 6 | Revisiting same grant reuses existing in-progress application | VERIFIED | writer.ts getOrCreateApplication checks for existing in_progress application before creating new one |
| 7 | Deadline check returns expired/urgent/ok status | VERIFIED | writer.ts checkDeadline is a pure exported function; blocked at getOrCreateApplication level; isUrgent flag propagates to UI |
| 8 | User visits /grants/[grantId]/write and sees all sections with grant summary and deadline countdown | VERIFIED | page.tsx + writer-client.tsx + grant-header.tsx all verified and wired |
| 9 | Streaming Romanian text appears progressively in section editor | VERIFIED | section-editor.tsx uses fetch + ReadableStream reader with chunk-by-chunk setAiText state updates |
| 10 | Character count with warning near limit; wasTruncated warning surfaced from server | VERIFIED | section-editor.tsx lines 317-338: char count displayed, amber at >=90%, red at >=100%, truncation warning rendered from server response |
| 11 | Section buttons (Editeaza, Regenereaza, Salveaza, Urmatoarea) change based on state | VERIFIED | section-editor.tsx implements 5-state machine: idle/generating/drafted/editing/saved with distinct button sets per state |
| 12 | Progress bar shows X din Y sectiuni completate updating as sections are saved | VERIFIED | progress-bar.tsx renders "X din Y sectiuni completate"; writer-client.tsx updates sections state on save via setSections |
| 13 | Scoring rubric hints in collapsible panel above each section field | VERIFIED | scoring-hints.tsx with useState toggle; SectionEditor renders ScoringHints with scoringRubric?.criteria |
| 14 | Required documents checklist at bottom of page | VERIFIED | document-checklist.tsx renders checkable items; writer-client.tsx passes grant.required_documents |
| 15 | User can click Copiaza tot and have all section text copied to clipboard | VERIFIED | export-bar.tsx handleCopy uses navigator.clipboard.writeText with concatenated sections; no auth required |
| 16 | User can click Descarca PDF and download a PDF with Romanian diacritics | VERIFIED | /api/writer/pdf route uses renderToBuffer + ApplicationPdfDocument with Geist Sans Font.register; Content-Disposition attachment header set |
| 17 | User can click Trimite pe email and receive the application via email | FAILED | export-bar.tsx passes empty string '' as recipient; export.ts uses that empty string as the Resend to: address — emails will fail delivery |
| 18 | Unauthenticated users see AccountWallModal for PDF/email; copy works without auth | VERIFIED | export-bar.tsx: copy has no auth check; PDF/email both call setShowModal(true) if !isAuthenticated; AccountWallModal imported and rendered |
| 19 | User can opt in to deadline reminders via checkbox on export bar | VERIFIED | export-bar.tsx renders reminder checkbox for authenticated users; saveReminderOptIn server action inserts to notifications_log |
| 20 | Required documents checklist completion status visible in export context | VERIFIED | export-bar.tsx shows "X din Y documente pregatite" using checkedDocuments.size |
| 21 | Analytics event application_exported fires on successful export | VERIFIED | export-bar.tsx calls trackEvent({ eventType: 'application_exported', eventData: { method: ... } }) for copy, PDF, and email paths |
| 22 | User can visit /settings and toggle email notification preferences | VERIFIED | settings/page.tsx with auth gate + redirect; NotificationToggle client component wired to updateNotificationPreferences action |

**Score:** 21/22 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/actions/writer.ts` | getOrCreateApplication, saveSection, checkDeadline | VERIFIED | All three exports present and substantive — 241 lines |
| `src/app/api/writer/generate/route.ts` | POST streaming handler | VERIFIED | streamText + toTextStreamResponse wired to generate-section.ts |
| `src/lib/ai/generate-section.ts` | buildSectionPrompt, buildSystemPrompt | VERIFIED | Both exports present; clarifying question mode at line 69 |
| `src/app/grants/[grantId]/write/page.tsx` | Server component with deadline check and application loading | VERIFIED | Calls getOrCreateApplication, handles expired error, passes all data to WriterClient |
| `src/app/grants/[grantId]/write/writer-client.tsx` | Client orchestrator | VERIFIED | Imports and uses all sub-components; sections state, progress count, save handler wired |
| `src/app/grants/[grantId]/write/section-editor.tsx` | Section state machine with AI streaming | VERIFIED | 5-state machine; fetch + ReadableStream; char count; truncation warning |
| `src/app/grants/[grantId]/write/grant-header.tsx` | Grant summary with deadline countdown | VERIFIED | Intl.NumberFormat ro-MD, Intl.DateTimeFormat ro-MD, AlertTriangle for urgent |
| `src/components/writer/progress-bar.tsx` | X din Y sectiuni completate | VERIFIED | div-based bar with aria-progressbar attributes |
| `src/components/writer/document-checklist.tsx` | Checkable required documents | VERIFIED | Checkbox from shadcn/ui, parent-managed state via onToggle |
| `src/components/writer/scoring-hints.tsx` | Collapsible rubric criteria | VERIFIED | useState toggle, renders nothing when criteria null/empty |
| `src/lib/pdf/application-pdf.tsx` | ApplicationPdfDocument with Geist Sans Font.register | VERIFIED | Font.register with Geist-Regular.ttf and Geist-Bold.ttf; styles with fontFamily: 'Geist Sans' |
| `src/app/api/writer/pdf/route.ts` | PDF generation route handler | VERIFIED | renderToBuffer + ApplicationPdfDocument; Content-Type application/pdf |
| `src/app/actions/export.ts` | sendApplicationEmail, saveReminderOptIn | PARTIAL | sendApplicationEmail is wired but has the empty-to-address bug; saveReminderOptIn is fully correct |
| `src/lib/email/application-email.tsx` | buildApplicationEmailHtml | VERIFIED | Template literal HTML with inline styles, escapeHtml, footer timestamp |
| `src/app/grants/[grantId]/write/export-bar.tsx` | Export bar with auth gating and analytics | PARTIAL | Copy, PDF, auth gating, analytics all correct; email button calls sendApplicationEmail with '' |
| `src/app/actions/analytics.ts` | trackEvent server action | VERIFIED | createAdminClient insert to analytics_events; session_id fallback to 'anonymous' |
| `src/app/actions/settings.ts` | updateNotificationPreferences | VERIFIED | auth check + profiles.update email_notifications |
| `src/app/settings/page.tsx` | Settings page with auth gate and notification toggle | VERIFIED | redirect('/') for unauthenticated; NotificationToggle wired to action |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/writer/generate/route.ts` | `src/lib/ai/generate-section.ts` | imports buildSectionPrompt and buildSystemPrompt | WIRED | Line 4-7: import { buildSectionPrompt, buildSystemPrompt } from '@/lib/ai/generate-section'; both called at lines 43 and 57 |
| `src/app/actions/writer.ts` | `src/lib/supabase/admin.ts` | createAdminClient for RLS bypass | WIRED | Line 3: import { createAdminClient }; called in getOrCreateApplication and saveSection |
| `src/app/api/writer/generate/route.ts` | `ai` | streamText + toTextStreamResponse | WIRED | Line 1: import { streamText } from 'ai'; line 54: streamText({...}); line 61: return result.toTextStreamResponse() |
| `src/app/grants/[grantId]/write/page.tsx` | `src/app/actions/writer.ts` | calls getOrCreateApplication | WIRED | Line 3: import; line 33: await getOrCreateApplication(grantId) |
| `src/app/grants/[grantId]/write/section-editor.tsx` | `/api/writer/generate` | fetch + ReadableStream | WIRED | Lines 103-115: fetch('/api/writer/generate', { method: 'POST', ...}) with ReadableStream reader |
| `src/app/grants/[grantId]/write/section-editor.tsx` | `src/app/actions/writer.ts` | calls saveSection | WIRED | saveSection imported in writer-client.tsx; passed as onSave prop to SectionEditor which calls it via handleSave |
| `src/app/api/writer/pdf/route.ts` | `src/lib/pdf/application-pdf.tsx` | imports ApplicationPdfDocument and renders with renderToBuffer | WIRED | Line 3: import; line 26-30: React.createElement(ApplicationPdfDocument, ...); line 33: await renderToBuffer(element) |
| `src/app/actions/export.ts` | `resend` | Resend SDK emails.send() | WIRED (but broken) | resend.emails.send called correctly; however to: [to] receives empty string from caller |
| `src/app/grants/[grantId]/write/export-bar.tsx` | `src/components/auth/account-wall-modal.tsx` | AccountWallModal for unauthenticated PDF/email gating | WIRED | Line 7: import AccountWallModal; lines 73-77 and 112-115: setShowModal(true) when !isAuthenticated; modal rendered at line 250 |
| `src/app/grants/[grantId]/write/export-bar.tsx` | `src/app/actions/analytics.ts` | trackEvent({ eventType: 'application_exported' }) | WIRED | Line 9: import trackEvent; called at lines 63, 101, 134 for clipboard/pdf/email paths |
| `src/app/actions/analytics.ts` | `analytics_events table` | createAdminClient insert | WIRED | Line 35-44: admin.from('analytics_events').insert({...}) |
| `src/app/actions/settings.ts` | `profiles table` | update email_notifications column | WIRED | Line 18-21: supabase.from('profiles').update({ email_notifications: emailNotifications }).eq('id', user.id) |
| `src/app/grants/[grantId]/write/writer-client.tsx` | `src/app/actions/analytics.ts` | trackEvent({ eventType: 'writer_started' }) on mount | WIRED | Line 9: import trackEvent; lines 152-154: useEffect(() => { trackEvent({ eventType: 'writer_started' }) }, []) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WRITE-01 | 05-01 | Grant application fields load from grant_application_fields table | SATISFIED | getOrCreateApplication fetches grant_application_fields and stores in field_snapshot; fields returned to UI |
| WRITE-02 | 05-01 | Auto-preview of Section 1 generated on first writer visit | SATISFIED | writer-client.tsx useEffect calls /api/writer/generate for first section when no ai_draft; displays as isPreview=true |
| WRITE-03 | 05-02 | User writes brief, clicks Genereaza cu AI, gets streaming Romanian text | SATISFIED | section-editor.tsx fetch + ReadableStream in generateText(); setState('generating') then ('drafted') |
| WRITE-04 | 05-01 | AI asks ONE clarifying question when input under 20 chars | SATISFIED | generate-section.ts line 69 appends clarification instruction; section-editor.tsx shows UI hint at length < 20 |
| WRITE-05 | 05-01 | AI uses company enriched_data + grant guidelines + scoring rubric in context | SATISFIED | buildSectionPrompt assembles rubric criteria + buildLeanProfile(company) + field info |
| WRITE-06 | 05-02 | Inline scoring hints (collapsible) above each field | SATISFIED | scoring-hints.tsx rendered above textarea in section-editor.tsx; default collapsed |
| WRITE-07 | 05-01, 05-02 | Character count displayed with server-side truncation and user warning | SATISFIED | saveSection truncates + returns wasTruncated; section-editor.tsx displays count and warning |
| WRITE-08 | 05-02 | Buttons per section: Editeaza, Regenereaza, Salveaza, Urmatoarea | SATISFIED | section-editor.tsx has all four buttons in drafted state; state-machine controls visibility |
| WRITE-09 | 05-02 | Progress bar showing X din Y sectiuni completate | SATISFIED | progress-bar.tsx renders text and visual bar; writer-client.tsx recalculates completedCount on save |
| WRITE-10 | 05-02 | Required documents checklist (checkable) at bottom of page | SATISFIED | document-checklist.tsx with Checkbox components; rendered in writer-client.tsx with grant.required_documents |
| WRITE-11 | 05-02 | Grant summary with deadline countdown at top of page | SATISFIED | grant-header.tsx with Intl formatters, daysLeft, urgent warning |
| WRITE-12 | 05-01 | Deadline check on page load: block if expired, warn if <3 days | SATISFIED | checkDeadline in writer.ts; expired returns error; isUrgent propagated to GrantHeader |
| WRITE-13 | 05-01 | Field snapshot saved at application creation | SATISFIED | writer.ts inserts field_snapshot: fields at application creation (line 152) |
| EXPRT-01 | 05-03 | Copiaza tot copies all sections to clipboard | SATISFIED | export-bar.tsx navigator.clipboard.writeText with formatted concatenation |
| EXPRT-02 | 05-03 | Descarca PDF generates and downloads PDF with all sections | SATISFIED | POST /api/writer/pdf renders ApplicationPdfDocument + renderToBuffer; Content-Disposition attachment |
| EXPRT-03 | 05-03 | Trimite pe email sends formatted application via Resend | BLOCKED | sendApplicationEmail called with empty string '' as recipient; emails will fail at Resend delivery |
| EXPRT-04 | 05-03 | Unauthenticated users see account modal for PDF/email; copy works without account | SATISFIED | AccountWallModal shown for !isAuthenticated on PDF/email clicks; copy has no auth check |
| EXPRT-05 | 05-03 | Deadline reminder opt-in | SATISFIED | export-bar.tsx checkbox + saveReminderOptIn inserts to notifications_log |
| EXPRT-06 | 05-03 | Required documents checklist with completion status shown | SATISFIED | export-bar.tsx shows "X din Y documente pregatite" using checkedDocuments.size |
| GEN-05 | 05-04 | Analytics event tracking at each funnel stage | SATISFIED | trackEvent action inserts to analytics_events; writer_started on mount; application_exported on each export method |
| GEN-06 | 05-04 | Notification preferences page (settings) | SATISFIED | /settings page with auth gate, profile fetch, NotificationToggle wired to updateNotificationPreferences |

**Requirements breakdown:** 20 SATISFIED, 1 BLOCKED (EXPRT-03)

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/grants/[grantId]/write/export-bar.tsx` | 123 | `sendApplicationEmail('', ...)` — empty string recipient passed as `to` argument | Blocker | Emails sent to empty address; Resend will reject — EXPRT-03 functionally broken |
| `src/app/actions/export.ts` | 29 | `to: [to]` — no guard for empty/blank `to` parameter | Blocker | No validation or auth-context fallback to get user's real email address |

No other anti-patterns found. No TODOs, FIXMEs, placeholder returns, or stub implementations detected across any of the 18 implementation files.

---

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/lib/ai/__tests__/generate-section.test.ts` | 15 | All pass |
| `src/app/actions/__tests__/writer.test.ts` | 14 | All pass |
| `src/app/api/writer/__tests__/generate.test.ts` | 7 | All pass |
| `src/components/writer/__tests__/progress-bar.test.ts` | 6 | All pass |
| `src/components/writer/__tests__/scoring-hints.test.ts` | 7 | All pass |
| `src/components/writer/__tests__/section-editor.test.ts` | 11 | All pass |
| `src/components/writer/__tests__/export-bar.test.ts` | 7 | All pass |
| `src/lib/pdf/__tests__/application-pdf.test.ts` | 4 | All pass |
| `src/app/actions/__tests__/export.test.ts` | 5 | All pass |
| `src/app/actions/__tests__/analytics.test.ts` | 4 | All pass |
| `src/app/actions/__tests__/settings.test.ts` | 4 | All pass |
| `src/app/settings/__tests__/page.test.ts` | 3 | All pass |
| **Full suite** | **216** | **All pass** |

Note: The export tests pass because the test mocks `sendApplicationEmail` — the empty-string bug is not caught by the existing test suite.

---

## Human Verification Required

### 1. Email delivery to authenticated user

**Test:** Log in with a real account, write at least one section and save it, click "Trimite pe email" in the export bar.
**Expected:** The formatted application email arrives in the logged-in user's inbox.
**Why human:** This requires a live RESEND_API_KEY and real authentication. The empty-to-address bug (noted in Gaps) must first be fixed before this test can pass.

### 2. PDF Romanian diacritics rendering

**Test:** Download a PDF containing section text with Romanian characters (ă, â, î, ș, ț). Open it in a PDF viewer.
**Expected:** All diacritics display correctly — no replacement characters or missing glyphs.
**Why human:** Font rendering requires visual inspection of the PDF binary; Geist Sans font path from node_modules works locally but the Vercel deployment outcome requires a live test.

### 3. Section 1 auto-preview on first visit

**Test:** Navigate to /grants/{grantId}/write for a grant the user has not started. Observe section 1 before typing anything.
**Expected:** Section 1 shows grayed-out italic AI-generated preview text within a few seconds.
**Why human:** Requires a live OpenAI API key, a real grant with application fields, and a real company profile in the database.

---

## Gaps Summary

One gap blocks EXPRT-03 (Trimite pe email). The wiring between `export-bar.tsx` and `export.ts` has a recipient mismatch: the client always passes an empty string `''` as the `to` argument to `sendApplicationEmail`, and the server action uses that value directly as the Resend recipient with no fallback to the authenticated user's email. The comment in export-bar.tsx claims "Server action will get email from auth context" — but the server action does not contain any `auth.getUser()` call to resolve the user's address.

The fix is straightforward: add `supabase.auth.getUser()` inside `sendApplicationEmail` to retrieve `user.email` when `to` is empty (matching the pattern used in `saveReminderOptIn`), or pass the user's email from `page.tsx` down through `WriterClient` → `ExportBar` → `sendApplicationEmail`.

All other 21 truths are verified. The backend (Plan 01), writer UI (Plan 02), and analytics/settings (Plan 04) are fully implemented. The export functionality (Plan 03) is 5/6 correct — only the email delivery path is broken.

---

_Verified: 2026-03-22_
_Verifier: Claude (gsd-verifier)_
