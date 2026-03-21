# Feature Landscape

**Domain:** AI-powered grant discovery and application platform (Moldova-specific)
**Researched:** 2026-03-21
**Overall confidence:** HIGH

## Table Stakes

Features users expect from any grant discovery + AI writing platform. Missing any of these and the product feels broken or incomplete compared to Instrumentl, Grantable, Granted AI, or even Moldova's own ODA online portal.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Grant database with search and filters** | Every competitor has this (Instrumentl: 400K+ funders, Fundsprout: 275K+ opportunities). Without browsable grants, there is no product. Users expect filtering by category, deadline, funding amount, and eligibility type. | Medium | GrantAssist scopes to ~50+ Moldovan programs, so the database is small but must be well-structured. Public catalog with no auth required. |
| **Eligibility matching / scoring** | Grantx, Instrumentl, Fundsprout, Granted AI all provide AI-powered matching with compatibility scores. Binary "eligible/not eligible" is the minimum bar. Users enter their profile and get ranked results. | Medium | Rule-based SQL pre-filter + AI scoring is the right approach. Must show clear match percentage or score. |
| **Company / organization profile** | Every platform requires users to describe their organization. Instrumentl, Grantable, and Granted AI all use organization profiles as the basis for matching and writing. | Low | GrantAssist differentiates by auto-populating from IDNO registry data. But the profile concept itself is table stakes. |
| **AI-assisted proposal drafting** | Grantable, Grantboost, Grant Assistant, Instrumentl Apply, Granted AI, HyperWrite, Fundwriter all offer this. AI grant writing is no longer novel -- it is expected. Users want to upload/enter requirements and get a draft. | High | The writing assistant is the core product. Section-by-section generation (as Granted AI and the NIH-focused tools do) is the standard approach, not monolithic generation. |
| **Section-by-section writing flow** | Granted AI provides "section-by-section coaching with coverage tracking." The NIH-focused academic tool breaks proposals into specific aims, significance, innovation, approach. Per-section is the dominant pattern over whole-document generation. | Medium | Already planned. Each grant's required sections drive the writing interface. Progress tracking (X of Y sections complete) is expected. |
| **Export to PDF / copy / download** | Grants.gov, Jotform, and every serious tool let users download their completed application. Grant applications ultimately need to be submitted externally (not through the platform), so export is essential. | Medium | PDF generation, copy-all, and email are planned. PDF is the most critical -- Moldovan grant agencies expect PDF submissions. |
| **Deadline tracking and reminders** | Instrumentl, GrantWatch, Fluxx, and even Grants.gov all provide deadline calendars and notification subscriptions. Missing a deadline means losing the opportunity entirely. | Low | Cron-based email reminders at 7 and 3 days are planned. This is minimum viable. |
| **User accounts with saved progress** | Every platform requires accounts for saving work. Grantable, Instrumentl, and Grantboost all gate writing features behind signup. Users expect their drafts to persist across sessions. | Low | Planned with anonymous-to-authenticated merge. The anonymous start is a differentiator; accounts themselves are table stakes. |
| **Required documents checklist** | Grant compliance platforms (AmpliFund, Instrumentl, SmartSimple) all emphasize document tracking. Moldovan grants require specific attachments (business plans, financial statements, registration certificates). Users need to know what to prepare. | Low | Static checklist per grant with checkable items. Not document upload/storage -- just a tracking list. |
| **Romanian language throughout** | For a Moldova-specific product, Romanian UI and Romanian AI output are non-negotiable. The ODA portal and AIPA submissions are in Romanian. | Medium | Complexity is in the AI output quality in Romanian, not the UI translation. AI must produce natural, non-robotic Romanian prose. |
| **Mobile-responsive design** | Moldovan entrepreneurs access the internet primarily via mobile. Any grant platform that doesn't work on phones loses a significant portion of its audience. | Low | Mobile-first design is planned. Standard responsive implementation. |

## Differentiators

Features that set GrantAssist apart from global competitors and Moldova's existing paper/PDF-based grant processes. These create competitive advantage and cannot be easily replicated.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-populated company data from IDNO registries** | No competitor scrapes Moldovan business registries (OpenMoney.md, idno.md, srl.md) to pre-fill company profiles. Users enter their IDNO and get instant company data. This eliminates the most tedious part of grant applications -- entering company details manually. Global platforms like Instrumentl require manual profile creation. | High | Requires Cheerio scraping with 8-second timeouts, parallel fetching from 3 sources, confidence-based data merging. Fragile (gov sites change), but uniquely valuable in the Moldovan market. |
| **AI strategic eligibility advice ("how to become eligible")** | Most platforms show binary eligible/not-eligible. GrantAssist advises what a company could change or do to become eligible for grants they currently don't qualify for. This transforms the platform from a filter into an advisor. No major competitor does this systematically. | High | Requires the AI to understand grant requirements deeply enough to suggest actionable modifications (e.g., "partner with an agricultural cooperative to qualify for AIPA funding"). |
| **Rubric-optimized writing using actual scoring criteria** | Grant Assistant trains on 7,000+ successful proposals. Grantable and Grantboost generate generic proposals. GrantAssist uses the actual scoring rubric of each specific grant to optimize text. Inline rubric hints above each field tell users exactly what evaluators are scoring. This is closer to how Sopact's AI-powered rubric scoring works, but applied to the writing side rather than the review side. | High | Requires grants to be onboarded with their scoring rubrics extracted (via the admin's PDF extraction wizard). The AI prompt must incorporate rubric criteria for each section. |
| **Zero-friction anonymous start** | Most platforms (Instrumentl, Grantable, Grantboost) require signup before doing anything useful. GrantAssist lets users discover grants, see matches, and even start exploring the writer without an account. The account wall only appears at "Apply now." This follows the proven pattern described in anonymous user research: gradual gating builds credibility and clarifies why you need user data. | Medium | Already planned. iron-session for anonymous cookie, Supabase anonymous auth, DB merge on signup. The UX pattern is the differentiator, not the tech. |
| **Business idea to grant match (free-text input)** | Users who don't have a registered company yet can describe their business idea in free text and get matched to relevant grants. The AI infers a company profile from the description. No Moldovan competitor offers this -- the ODA portal requires registration numbers. | Medium | Requires a separate AI inference call for free-text input vs. IDNO lookup. Must handle vague inputs gracefully (clarifying question for <20 chars). |
| **Shareable results links** | Users can share their grant match results with partners, advisors, or co-founders via a URL without requiring the recipient to have an account. 30-day expiry keeps data fresh. | Low | Simple but valuable for the Moldovan context where entrepreneurs often consult with family, partners, or business advisors before applying. |
| **Admin grant onboarding via PDF extraction** | Admin uploads a grant announcement PDF, AI extracts eligibility criteria, sections, scoring rubrics, and deadlines. 3-step wizard: upload info, AI extraction, human review/publish. This dramatically reduces the time to add new grants to the database. | High | LLM multimodal PDF reading. Critical for maintaining the grant catalog as new programs launch (Moldova has 50+ active programs). |

## Anti-Features

Features to deliberately NOT build. Each one is tempting but either adds unjustified complexity, misaligns with the product's core value, or creates maintenance burden that outweighs benefits.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Direct grant submission / portal integration** | Moldovan grant agencies (ODA, AIPA, IFAD) each have their own submission portals and processes. Building submission integrations would require maintaining connections to dozens of fragile government systems. No global competitor fully solves this either -- even Grants.gov is just a portal, not an integration layer. The liability risk of a failed submission is also severe. | Generate polished export documents (PDF, copy) that users submit through official channels. Link to the official submission portal for each grant. |
| **Financial spreadsheet / budget assistant** | Already scoped to v2 in PROJECT.md. Budget tables and financial projections require a completely different UI paradigm (spreadsheet-like), different AI capabilities (numerical reasoning), and domain expertise in Moldovan accounting standards. Building this alongside the writing assistant would double the scope. | Focus v1 on narrative sections only. Provide a checklist item reminding users to prepare their budget separately. Consider v2 after validating that users actually need this vs. using their accountant. |
| **Browser-based form scraping (Playwright)** | Already excluded due to Vercel's 250MB function size limit. Even if technically possible, scraping live government forms is fragile, ethically questionable, and creates a maintenance nightmare as forms change. | Cheerio for static HTML scraping of business registry data (which is public information). Manual/PDF-based grant onboarding for grant program data. |
| **Multi-language support (Russian/English)** | Already scoped to v2. Adding Russian multiplies AI prompt complexity, requires bilingual rubric extraction, doubles QA effort, and splits the user base before product-market fit is established. Moldova's grant applications are submitted in Romanian. | Romanian only for v1. Monitor user demand for Russian. English is not needed -- the target market is Moldovan entrepreneurs applying to Moldovan/EU grants. |
| **Real-time collaboration / multi-user editing** | Grantable emphasizes collaboration features. But for a v1 targeting individual Moldovan entrepreneurs (not large nonprofit teams), real-time collaboration adds enormous technical complexity (operational transforms, presence indicators, conflict resolution) for minimal value. | Single-user editing with shareable results links. Users can share their completed application via PDF/email for review by others. |
| **Full grant lifecycle management (post-award)** | Platforms like Fluxx, SmartSimple, and AmpliFund manage the entire grant lifecycle including post-award compliance, financial tracking, reporting, and auditing. This is a fundamentally different product targeting grantmakers and large organizations, not individual entrepreneurs. | Stop at application generation. The product's value ends when the user submits their application. Post-award tracking is a separate product for a separate market. |
| **Funder relationship / CRM features** | Instrumentl and Candid offer funder intelligence, giving history, and relationship tracking. This serves professional grant writers managing dozens of funders, not Moldovan SME owners applying to 1-3 grants. | Show basic funder information (agency name, contact) on the grant detail page. No relationship tracking, giving history, or funder profiles. |
| **AI-generated entire proposal in one click** | Some tools (Grant Orb, Venngage) promise "full proposals in minutes." This produces generic, low-quality output that experienced evaluators immediately recognize as AI-generated. It also removes user control and understanding of their own application. | Section-by-section generation with user input at each step. Auto-preview Section 1 to demonstrate value, then require user engagement for subsequent sections. Quality over speed. |
| **Document upload / storage** | Building a document management system for supporting materials (business plans, financial statements, certificates) adds storage costs, security concerns, and a completely different UI. Moldovan entrepreneurs often don't have digital copies of their documents. | Checklist of required documents that users can check off. No upload, no storage. Users manage their own documents. |
| **SMS notifications** | Already scoped to v2. Email is sufficient for v1 and dramatically simpler to implement (Resend is already in the stack). SMS requires a telecom provider integration, costs per message, and phone number collection/verification. | Email via Resend for all notifications: deadline reminders, abandoned draft nudges, account notifications. Include unsubscribe links. |

## Feature Dependencies

```
Company Profile (IDNO lookup OR free-text AI inference)
  |
  +-- Grant Matching (requires company profile data)
  |     |
  |     +-- Match Results Display (requires matching output)
  |     |     |
  |     |     +-- Shareable Results Links (requires match results)
  |     |     |
  |     |     +-- Account Wall / Signup (triggered from results)
  |     |           |
  |     |           +-- Saved Grants (requires auth)
  |     |           |
  |     |           +-- AI Grant Writer (requires auth + selected grant)
  |     |                 |
  |     |                 +-- Section Progress Tracking
  |     |                 |
  |     |                 +-- Rubric Hints Display
  |     |                 |
  |     |                 +-- Export (PDF / Copy / Email)
  |     |                 |
  |     |                 +-- Required Documents Checklist
  |     |
  |     +-- Strategic Eligibility Advice (enhances matching)
  |
  +-- Grant Catalog (public browse, independent of profile)

Admin Grant Onboarding (PDF extraction wizard)
  |
  +-- Grant Catalog CRUD
  |
  +-- Rubric Data (feeds into AI Writer prompts)

Notification System (Resend)
  |
  +-- Deadline Reminders (cron)
  |
  +-- Abandoned Draft Nudges (cron)
  |
  +-- Email Preferences (settings page)
```

## MVP Recommendation

**Prioritize (Phase 1 -- core loop):**

1. **Grant catalog with search/filter** -- Foundation of the product. Without grants to browse, nothing else matters. Admin CRUD to populate it.
2. **Company profile via IDNO lookup** -- The "magic moment." User enters their IDNO and sees their company data instantly. This is the hook.
3. **Grant matching with scores** -- Connects profile to grants. Rule-based pre-filter + AI ranking. Show match percentages.
4. **Match results display** -- Hero card for best match, scored list, below-threshold suggestions with strategic advice.
5. **Account wall + auth flow** -- Gate the writer behind signup. Anonymous-to-authenticated merge.

**Prioritize (Phase 2 -- writing assistant):**

6. **Section-by-section AI writer** -- The core value proposition. Streaming generation in Romanian. Auto-preview Section 1.
7. **Rubric hints inline** -- Differentiator that makes the writer more than just "ChatGPT for grants."
8. **Export (PDF, copy, email)** -- Users need to get their application out of the platform.
9. **Required documents checklist** -- Low effort, high value. Helps users prepare complete submissions.
10. **Deadline tracking + reminders** -- Prevents users from missing their window.

**Defer to Phase 3+:**

- **Admin analytics dashboard** -- Useful for the business but not for users. Build after there are users to analyze.
- **Admin PDF extraction wizard** -- Initially, grants can be manually entered. AI extraction speeds up onboarding but is not blocking.
- **Abandoned draft nudges** -- Requires enough users with drafts to matter. Build after the writer is live.
- **Notification preferences** -- Simple on/off is fine initially. Granular preferences can wait.
- **Shareable results links** -- Nice to have, not blocking core flow.

## Sources

- [DevOps School: Top 10 Grant Management Software 2026](https://www.devopsschool.com/blog/top-10-grant-management-software-tools-in-2025-features-pros-cons-comparison/) -- Platform feature comparison
- [Grant Assistant: Best AI Grant Writing Tools 2025](https://www.grantassistant.ai/resources/articles/the-best-ai-grant-writing-tools-for-nonprofits-in-2025) -- AI writing tool features
- [Fundsprout: 12 Best Grant Discovery Platforms 2026](https://www.fundsprout.ai/resources/grant-discovery-platforms) -- Discovery platform features and pricing
- [Instrumentl: Best AI for Grant Writing 2025](https://www.instrumentl.com/blog/best-ai-for-grant-writing) -- Feature comparison
- [Granted AI: AI Grant Writing Tools 2026](https://grantedai.com/blog/best-ai-grant-writing-tools-2026) -- Section-by-section writing
- [Sopact: Grant Review Rubric Builder](https://www.sopact.com/use-case/grant-review-rubric) -- AI rubric scoring
- [Grants.com: AI-Powered Grant Eligibility](https://grants.com/ai-powered-grant-eligibility-how-artificial-intelligence-streamlines-grant-management/) -- Eligibility automation
- [ODA Moldova: Active Grant Applications](https://www.oda.md/en/media-page-en/press/announcements/active-grant-applications) -- Moldovan grant landscape
- [Instrumentl Pricing](https://www.instrumentl.com/pricing) -- Competitor pricing reference
- [Grantboost: Best AI Tools](https://www.grantboost.io/blog/Best-AI-Tools/) -- Feature comparison
- [Stanford: 10 Rules for AI in Grant Writing](https://med.stanford.edu/medicine/news/current-news/standard-news/10-rules-for-ai-in-grant-writing.html) -- Best practices
- [FusionAuth: Anonymous User Accounts](https://fusionauth.io/blog/anonymous-user) -- Anonymous-to-authenticated patterns
