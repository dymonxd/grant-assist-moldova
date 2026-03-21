---
phase: 3
slug: grant-matching
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
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
| 03-01-01 | 01 | 1 | MATCH-01 | unit | `npx vitest run src/lib/matching/__tests__/pre-filter.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | MATCH-02 | unit (mocked AI) | `npx vitest run src/lib/matching/__tests__/rank-grants.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | MATCH-04 | unit | `npx vitest run src/lib/matching/__tests__/rank-grants.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | MATCH-03 | unit (jsdom) | `npx vitest run src/components/grants/__tests__/hero-card.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | MATCH-05 | unit (jsdom) | `npx vitest run src/components/grants/__tests__/match-card.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | MATCH-06 | unit (jsdom) | `npx vitest run src/components/grants/__tests__/profile-sidebar.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | MATCH-07 | unit | `npx vitest run src/app/actions/__tests__/share.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | MATCH-08 | unit | `npx vitest run src/app/actions/__tests__/matching.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/matching/__tests__/pre-filter.test.ts` — stubs for MATCH-01 (rule evaluation with all 5 operators)
- [ ] `src/lib/matching/__tests__/rank-grants.test.ts` — stubs for MATCH-02, MATCH-04 (mocked AI, score sorting, sub-50% suggestions)
- [ ] `src/app/actions/__tests__/matching.test.ts` — stubs for MATCH-08 (session validation, error paths)
- [ ] `src/app/actions/__tests__/share.test.ts` — stubs for MATCH-07 (token generation)
- [ ] `src/components/grants/__tests__/hero-card.test.ts` — stubs for MATCH-03 (hero card fields)
- [ ] `src/components/grants/__tests__/match-card.test.ts` — stubs for MATCH-05 (action buttons)
- [ ] `src/components/grants/__tests__/profile-sidebar.test.ts` — stubs for MATCH-06 (profile data)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero card visual layout (desktop/mobile) | MATCH-03 | Layout/design quality requires visual check | Open /results page on desktop (1280px) and mobile (375px), verify hero card renders grant name, provider, score, amount, deadline, AI explanation |
| Share link accessible without auth | MATCH-07 | Requires real browser session isolation | Generate share link, open in incognito/private window, verify results page loads |
| Profile sidebar responsive behavior | MATCH-06 | Sidebar→collapsible transition is CSS-driven | Desktop: verify sidebar visible; Mobile: verify collapsible panel with tap-to-expand |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
