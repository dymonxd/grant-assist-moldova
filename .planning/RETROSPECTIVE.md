# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-23
**Phases:** 9 | **Plans:** 27

### What Was Built
- Full AI-powered grant discovery and application platform for Moldovan entrepreneurs
- Company data aggregation from 3 Moldovan registries with AI inference fallback
- Two-stage grant matching (SQL pre-filter + AI ranking) with shareable results
- Section-by-section AI grant writer with streaming, rubric hints, and export (PDF/email/clipboard)
- Admin dashboard with analytics funnel, grant catalog CRUD, AI PDF extraction wizard
- Automated notification system with cron jobs (deadline reminders, abandoned drafts, analytics)

### What Worked
- **6-phase dependency-driven architecture** — each phase delivered a coherent, testable capability. Clear dependencies enabled parallel execution where possible
- **TDD with server actions** — writing tests first caught multiple bugs (IDNO checksum, RLS data leaks, empty email recipients) before they reached UI
- **Service role pattern for anonymous profiles** — prevented critical data leak that would have exposed all unclaimed profiles
- **AI SDK v6 structured output** — `generateText + Output.object()` pattern produced reliable typed results for both profile inference and grant ranking
- **Cheerio scraping** — lightweight, no native dependencies, fast execution on Vercel serverless

### What Was Inefficient
- **AI Gateway billing block** — had to switch to @ai-sdk/openai mid-milestone because AI Gateway required credit card. Should have verified billing before starting
- **Phase 3 verification checkpoint (03-04)** — took ~120 min vs ~5 min average for other plans. Human-in-the-loop review and AI provider debugging was the longest single plan
- **Gap closure phases (7-9)** — created formal phases for 3 small bug fixes that could have been inline fixes. Empty planning directories are now tech debt
- **Scraper CSS selectors** — best-guess approximations without live testing. Will need refinement on real Moldovan registry sites

### Patterns Established
- Server actions return `{error: string}` on failure (not exceptions) for safe client consumption
- `createAdminClient` for service-role operations (anonymous profiles, admin queries)
- `useActionState` (React 19) for all form submissions
- Fire-and-forget `trackEvent` calls — analytics never blocks UX
- `validateCronSecret` inlined per route for self-containment
- Div-based charts and progress bars (no external chart library) for minimal bundle

### Key Lessons
1. **Verify billing/auth for external services before coding** — the AI Gateway switch cost time and introduced a tech debt item
2. **Small bug fixes don't need formal phases** — creating phases 7-9 for 3 one-line fixes was overhead. Use inline fixes with commit messages for small corrections
3. **RLS with anonymous users is dangerous** — `auth.uid() IS NULL` matches ALL unauthenticated requests. Always use service role for anonymous data
4. **Font.register() is mandatory for non-Latin diacritics** — default PDF fonts lack Romanian ă/ș/ț. Discovered in Phase 1, fixed in Phase 5
5. **Structured AI output needs sequential labels** — using UUIDs in AI prompts causes hallucination; sequential labels (Grant A, B, C) produce reliable structured results

### Cost Observations
- Model mix: quality profile (opus for planning, sonnet for execution)
- Total execution: ~4-5 hours across all 27 plans
- Notable: most plans completed in 3-7 minutes; only verification checkpoints took significantly longer

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 9 | 27 | Initial build — established TDD, server action, and admin patterns |

### Cumulative Quality

| Milestone | LOC | Files | Requirements |
|-----------|-----|-------|-------------|
| v1.0 | 19,547 | 250 | 86/86 satisfied |
