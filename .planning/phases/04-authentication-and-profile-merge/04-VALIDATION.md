---
phase: 4
slug: authentication-and-profile-merge
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T2 | 01 | 1 | AUTH-02, AUTH-03, AUTH-05, AUTH-06 | unit | `npx vitest run src/app/actions/__tests__/auth.test.ts -x` | -- Wave 0 | pending |
| 04-01-T3 | 01 | 1 | AUTH-07 | unit | `npx vitest run src/app/actions/__tests__/saved-grants.test.ts -x` | -- Wave 0 | pending |
| 04-02-T1 | 02 | 2 | AUTH-01, AUTH-04 | unit | `npx vitest run src/components/auth/__tests__/account-wall-modal.test.ts -x` | -- Wave 0 | pending |
| 04-03-T1 | 03 | 1 | GEN-04 | unit | `npx vitest run src/app/privacy/__tests__/page.test.ts -x` | -- Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/app/actions/__tests__/auth.test.ts` -- stubs for AUTH-02, AUTH-03, AUTH-05, AUTH-06
- [ ] `src/app/actions/__tests__/saved-grants.test.ts` -- stubs for AUTH-07
- [ ] `src/components/auth/__tests__/account-wall-modal.test.ts` -- stubs for AUTH-01, AUTH-04
- [ ] `src/app/privacy/__tests__/page.test.ts` -- stubs for GEN-04
- [ ] shadcn Dialog component install: `npx shadcn@latest add dialog checkbox label`

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Modal UX flow (focus trap, escape, overlay click) | AUTH-01 | Browser interaction required | Open grant card unauth, verify modal focus trap, press Escape to close, click overlay to close |
| Redirect after signup returns to grant writer | AUTH-06 | Full auth flow with browser redirect | Sign up from grant writer page, verify redirect back to same page after auth callback |
| Anonymous profile data visible after merge | AUTH-05 | End-to-end flow spanning multiple sessions | Create anonymous profile, sign up, verify profile data persists in authenticated view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
