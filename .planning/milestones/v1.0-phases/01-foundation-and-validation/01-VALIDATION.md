---
phase: 1
slug: foundation-and-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected -- greenfield project |
| **Config file** | None -- Wave 0 installs |
| **Quick run command** | `npx next build` |
| **Full suite command** | `npx next build && npx supabase db test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx next build`
- **After every plan wave:** Run `npx next build && npx supabase db test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | FNDTN-01 | smoke | `npx next build` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | FNDTN-02 | integration | `npx supabase db test` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | FNDTN-03 | integration | Manual or Playwright | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | FNDTN-04 | unit | `npx next build` | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | FNDTN-05 | integration | Manual browser test | ❌ W0 | ⬜ pending |
| TBD | 02 | 2 | FNDTN-06 | integration | Manual email flow | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | FNDTN-07 | smoke | `curl deployed-url/api/pdf/test` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | GEN-01 | manual-only | Visual inspection | N/A | ⬜ pending |
| TBD | 01 | 1 | GEN-02 | manual-only | 375px viewport check | N/A | ⬜ pending |
| TBD | 01 | 1 | GEN-03 | smoke | `npx next build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework selection (vitest recommended for unit tests)
- [ ] `vitest.config.ts` -- if vitest chosen
- [ ] Supabase local dev setup (`npx supabase start`)
- [ ] Manual verification checklist for RLS, proxy.ts, iron-session, PDF

*Most Phase 1 requirements are infrastructure and best verified via build success + manual testing rather than automated unit tests*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI renders Romanian text | GEN-01 | Language verification requires visual inspection | Open app, verify all UI text is in Romanian |
| Layout responsive at 375px | GEN-02 | Viewport testing requires browser devtools | Open devtools, set viewport to 375px, verify layout |
| Loading/error/empty states render | GEN-03 | Visual verification of boundary states | Navigate app, trigger loading/error/empty states |
| iron-session cookie persists | FNDTN-05 | Cookie persistence requires browser navigation | Create profile, navigate away, return -- verify data persists |
| Auth callback flow works | FNDTN-06 | Requires actual email sending and clicking | Trigger email, click link, verify session created |
| proxy.ts redirects /admin | FNDTN-03 | Requires unauthenticated browser session | Visit /admin without auth, verify redirect to /login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
