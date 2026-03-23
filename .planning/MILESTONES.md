# Milestones

## v1.0 MVP (Shipped: 2026-03-23)

**Phases completed:** 9 phases, 27 plans
**Files modified:** 250 | **Lines of code:** 19,547 TypeScript
**Timeline:** 3 days (2026-03-21 → 2026-03-23)
**Requirements:** 86/86 satisfied
**Git range:** 692fea7..52d3f06

**Key accomplishments:**
1. Next.js 16 + Supabase foundation with 11-table RLS-enforced schema, auth plumbing, and PDF generation validated on Vercel
2. Automated company profile from Moldovan registries (OpenMoney, idno.md, srl.md) with AI fallback for business ideas
3. Two-stage SQL pre-filter + AI ranking with match scores, explanations, and shareable results links
4. Zero-friction anonymous-to-authenticated merge preserving all user work through signup
5. Section-by-section rubric-optimized AI grant writing with streaming in Romanian, plus PDF/clipboard/email export
6. Admin dashboard with analytics funnel, grant catalog CRUD with AI PDF extraction wizard, notification system with cron automation

**Tech debt carried forward:**
- `NEXT_PUBLIC_SITE_URL` env var not set (signup email confirmation broken in dev)
- `sendApplicationEmail` has dead `_to` parameter (works via auth.getUser() fallback)
- CSS scraper selectors for Moldovan registries are best-guess approximations
- Phases 7-9 (gap closure) have empty planning directories

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---

