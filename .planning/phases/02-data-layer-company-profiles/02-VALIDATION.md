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
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
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
| 02-01-01 | 01 | 1 | PROF-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROF-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PROF-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PROF-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | PROF-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | PROF-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | PURCH-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | PURCH-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | PURCH-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 3 | BRWSE-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 3 | BRWSE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-03 | 04 | 3 | BRWSE-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-04 | 04 | 3 | BRWSE-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework setup (vitest if not already installed)
- [ ] `__tests__/lib/idno.test.ts` — IDNO validation unit tests (PROF-01)
- [ ] `__tests__/lib/scrapers.test.ts` — scraper stubs for registry data (PROF-02, PROF-03)
- [ ] `__tests__/lib/ai-inference.test.ts` — AI inference mock tests (PROF-04)
- [ ] `__tests__/app/grants-browse.test.ts` — grants browse page tests (BRWSE-01..04)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scraper returns real data from idno.md | PROF-02 | External site dependency | Enter known IDNO, verify populated fields |
| Scraper returns real data from srl.md | PROF-02 | External site dependency | Enter known IDNO, verify populated fields |
| AI inference quality in Romanian | PROF-04 | LLM output quality subjective | Enter business description, verify inferred fields make sense |
| "Date partiale" indicator shows correctly | PROF-05 | Visual UI verification | Test with IDNO where one source fails |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
