import { z } from 'zod'

// --- Eligibility Rule ---

export interface EligibilityRule {
  rule: string
  field: string
  operator: string
  value: unknown
}

// --- Grant with Rules ---

export interface GrantWithRules {
  id: string
  name: string
  provider_agency: string
  description: string | null
  max_funding: number | null
  currency: string
  deadline: string | null
  eligibility_rules: EligibilityRule[] | null
  scoring_rubric: unknown
}

// --- Grant Score (Zod schema + type) ---

export const grantScoreSchema = z.object({
  grant_id: z.string(),
  score: z.number().min(0).max(100),
  explanation: z.string().describe('One paragraph explanation in Romanian'),
  improvement_suggestions: z
    .array(z.string())
    .optional()
    .describe(
      'For grants below 50% -- what the company could change to qualify'
    ),
})

export type GrantScore = z.infer<typeof grantScoreSchema>

// --- Match Result ---

export interface MatchResult {
  profile: Record<string, unknown>
  scores: GrantScore[]
  /** Filtered candidate grants (post pre-filter). The results UI needs full
   *  grant objects (name, provider, funding, deadline) to render cards --
   *  GrantScore only contains grant_id references. */
  grants: GrantWithRules[]
  totalGrants: number
  filteredCount: number
}
