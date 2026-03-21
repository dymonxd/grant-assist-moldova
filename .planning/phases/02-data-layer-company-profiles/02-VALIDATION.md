---
phase: 2
slug: data-layer-company-profiles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (created in Plan 02-01 Task 1) |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 02-01-T1 | 01 | 1 | PROF-01 | unit (TDD) | `npx vitest run src/lib/validation/__tests__/idno.test.ts` | Created in task | ⬜ pending |
| 02-01-T2 | 01 | 1 | PROF-03 | unit (TDD) | `npx vitest run src/lib/sources/__tests__/` | Created in task | ⬜ pending |
| 02-02-T1 | 02 | 2 | PROF-02 | unit (TDD) | `npx vitest run src/lib/ai/__tests__/infer-profile.test.ts` | Created in task | ⬜ pending |
| 02-02-T2 | 02 | 2 | PROF-05 | type-check | `npx tsc --noEmit` | N/A | ⬜ pending |
| 02-02-T3 | 02 | 2 | PROF-04, PROF-05 | unit (TDD) | `npx vitest run src/app/actions/__tests__/profile.test.ts` | Created in task | ⬜ pending |
| 02-03-T1 | 03 | 3 | PROF-01, PROF-06 | type-check | `npx tsc --noEmit` | N/A | ⬜ pending |
| 02-03-T2 | 03 | 3 | PURCH-01, PURCH-03 | unit (TDD) | `npx vitest run src/app/(home)/__tests__/purchase-chips.test.ts` | Created in task | ⬜ pending |
| 02-03-T3 | 03 | 3 | All PROF, PURCH | manual | Human verification | N/A | ⬜ pending |
| 02-04-T0 | 04 | 2 | BRWSE-04 | unit (TDD) | `npx vitest run src/app/grants/browse/__tests__/grant-card.test.ts` | Created in task | ⬜ pending |
| 02-04-T1 | 04 | 2 | BRWSE-01..04 | unit | `npx vitest run src/app/grants/browse/__tests__/` | From Task 0 | ⬜ pending |
| 02-04-T2 | 04 | 2 | BRWSE-01..04 | unit + type | `npx vitest run src/app/grants/browse/__tests__/ && npx tsc --noEmit` | From Task 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave 0 test files are created inline within TDD tasks (no separate Wave 0 plan needed):

- [x] Test framework setup — vitest installed and configured in Plan 02-01 Task 1
- [x] `src/lib/validation/__tests__/idno.test.ts` — IDNO validation (Plan 02-01 Task 1, TDD)
- [x] `src/lib/sources/__tests__/scrapers.test.ts` — scraper mocks (Plan 02-01 Task 2, TDD)
- [x] `src/lib/sources/__tests__/aggregate.test.ts` — aggregate merge (Plan 02-01 Task 2, TDD)
- [x] `src/lib/ai/__tests__/infer-profile.test.ts` — AI inference mocks (Plan 02-02 Task 1, TDD)
- [x] `src/app/actions/__tests__/profile.test.ts` — profile action tests (Plan 02-02 Task 3, TDD)
- [x] `src/app/(home)/__tests__/purchase-chips.test.ts` — chip pre-fill tests (Plan 02-03 Task 2, TDD)
- [x] `src/app/grants/browse/__tests__/grant-card.test.ts` — grant card tests (Plan 02-04 Task 0, TDD)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scraper returns real data from idno.md | PROF-02 | External site, CSS selectors need live testing | Enter known IDNO, verify populated fields |
| Scraper returns real data from srl.md | PROF-02 | External site, CSS selectors need live testing | Enter known IDNO, verify populated fields |
| AI inference quality in Romanian | PROF-04 | LLM output quality subjective | Enter business description, verify inferred fields make sense |
| "Date partiale" indicator shows correctly | PROF-06 | Visual UI verification | Test with IDNO where one source fails |
| Complete landing page flow | All PROF, PURCH | E2E user flow | Plan 02-03 Task 3 human-verify checkpoint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
