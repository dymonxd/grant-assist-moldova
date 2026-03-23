---
phase: 6
slug: admin-tooling-and-automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ADMIN-01 | integration | `npx vitest run src/app/actions/__tests__/admin-analytics.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ADMIN-02,03 | unit | `npx vitest run src/app/actions/__tests__/admin-analytics.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | ADMIN-04,05,06 | integration | `npx vitest run src/app/actions/__tests__/admin-analytics.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | AGRANT-01,02 | unit | `npx vitest run src/app/actions/__tests__/admin-grants.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | AGRANT-03,04,05 | integration | `npx vitest run src/app/actions/__tests__/admin-grants.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | AGRANT-06,07,08 | unit | `npx vitest run src/lib/ai/__tests__/extract-grant-pdf.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 2 | AGRANT-09 | unit | `npx vitest run src/app/actions/__tests__/admin-grants.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-05 | 02 | 2 | AGRANT-10 | integration | `npx vitest run src/app/actions/__tests__/admin-grants.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | ANOTIF-01,02 | unit | `npx vitest run src/app/actions/__tests__/admin-notifications.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | ANOTIF-03 | integration | `npx vitest run src/app/actions/__tests__/admin-notifications.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | AUTO-01,02 | unit | `npx vitest run src/app/api/cron/__tests__/cron.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-02 | 04 | 2 | AUTO-03 | unit | `npx vitest run src/app/api/cron/__tests__/cron.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-03 | 04 | 2 | AUTO-04,05,06,07 | unit | `npx vitest run src/app/api/cron/__tests__/cron.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/actions/__tests__/admin-analytics.test.ts` — stubs for ADMIN-01 through ADMIN-06
- [ ] `src/app/actions/__tests__/admin-grants.test.ts` — stubs for AGRANT-01 through AGRANT-10
- [ ] `src/app/actions/__tests__/admin-notifications.test.ts` — stubs for ANOTIF-01 through ANOTIF-03
- [ ] `src/lib/ai/__tests__/extract-grant-pdf.test.ts` — stubs for AGRANT-08
- [ ] `src/app/api/cron/__tests__/cron.test.ts` — stubs for AUTO-01 through AUTO-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Funnel visualization renders correctly | ADMIN-02 | Visual layout | Open /admin, verify 6 funnel stages display as pipeline bars |
| Grant wizard 3-step navigation | AGRANT-06 | Multi-step UI flow | Create new grant, verify step transitions and back navigation |
| PDF upload with real PDF | AGRANT-07,08 | File upload + AI extraction | Upload sample PDF, verify extracted fields appear in review step |
| Email renders in mail client | AUTO-01,02 | Email rendering | Check Resend logs, open email in Gmail/Outlook |
| Unsubscribe link works | AUTO-07 | Auth-free URL flow | Click unsubscribe in email, verify preference updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
