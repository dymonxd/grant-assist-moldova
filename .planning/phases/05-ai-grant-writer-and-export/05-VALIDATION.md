---
phase: 5
slug: ai-grant-writer-and-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

*Status: pending · green · red · flaky*

*Will be populated after plans are created by the planner.*

---

## Wave 0 Requirements

- [ ] Test stubs for AI streaming (WRITE-01 through WRITE-06)
- [ ] Test stubs for export functionality (EXPRT-01 through EXPRT-06)
- [ ] Test fixtures for grant/section mock data

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming AI text renders correctly in Romanian | WRITE-01 | Visual streaming UX | Open grant writer, type input, click "Genereaza cu AI", verify streaming text appears |
| PDF diacritics render correctly | EXPRT-01 | Visual PDF output | Download PDF, verify ș/ț/ă/â/î render correctly |
| Email delivery works | EXPRT-04 | External service | Send test email, verify receipt with correct content |
| Deadline blocking UX | WRITE-10 | Time-dependent UI | Set grant deadline to past, verify blocked state |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
