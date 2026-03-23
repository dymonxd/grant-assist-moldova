import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { grantScoreSchema, type GrantScore, type GrantWithRules } from './types'

/**
 * AI-powered grant ranking with structured output.
 *
 * Scores each candidate grant 0-100 with a Romanian explanation.
 * Grants below 50 get improvement suggestions. Uses sequential grant labels
 * instead of UUIDs in the prompt to prevent AI hallucinating IDs (Pitfall 1).
 * Sends a lean profile to avoid token cost explosion (Pitfall 3).
 */
export async function rankGrants(
  profile: Record<string, unknown>,
  candidates: GrantWithRules[]
): Promise<GrantScore[]> {
  if (candidates.length === 0) return []

  // Build lean profile -- strip raw scraper HTML/debug data (Pitfall 3)
  const leanProfile = buildLeanProfile(profile)

  // Map grants to sequential labels to prevent AI hallucinating UUIDs (Pitfall 1)
  const labelMap = new Map<string, string>()
  const labeledCandidates = candidates.map((c, i) => {
    const label = `grant_${i + 1}`
    labelMap.set(label, c.id)
    return {
      label,
      name: c.name,
      provider_agency: c.provider_agency,
      description: c.description,
      max_funding: c.max_funding,
      currency: c.currency,
      deadline: c.deadline,
      eligibility_rules: c.eligibility_rules,
      scoring_rubric: c.scoring_rubric,
    }
  })

  let output: GrantScore[] | undefined
  try {
    const result = await generateText({
      model: openai('gpt-5.4-nano'),
      output: Output.array({
        element: grantScoreSchema,
      }),
      system: `Esti un expert in granturi si finantari din Republica Moldova.
Analizeaza profilul companiei si evalueaza potrivirea cu fiecare grant.

Reguli:
- Scorul trebuie sa fie intre 0 si 100
- Explicatia trebuie sa fie un paragraf scurt in limba romana, in limbaj simplu
- Pentru granturile cu scor sub 50, adauga sugestii concrete de imbunatatire (ce ar putea schimba compania ca sa devina eligibila)
- Tine cont de: eligibilitate, domeniu de activitate, forma juridica, locatie, nevoia de achizitie
- Scorul reflecta cat de bine se potriveste profilul cu criteriile grantului
- Foloseste eticheta grantului (grant_1, grant_2, etc.) ca grant_id in raspuns`,
      prompt: `Profilul companiei:
${JSON.stringify(leanProfile, null, 2)}

Granturile candidate:
${JSON.stringify(labeledCandidates, null, 2)}

Evalueaza fiecare grant si returneaza scorul de potrivire.`,
    })
    output = result.output
  } catch (error) {
    console.error('AI ranking failed:', error)
    // Return fallback scores (50 for all grants) when AI is unavailable
    return candidates.map((c, i) => ({
      grant_id: labelMap.get(`grant_${i + 1}`) ?? c.id,
      score: 50,
      explanation: 'Scorul nu a putut fi calculat automat. Verificati manual eligibilitatea.',
      suggestions: [],
    }))
  }

  if (!output) return []

  // Map labels back to real UUIDs
  const scores: GrantScore[] = output.map((s) => ({
    ...s,
    grant_id: labelMap.get(s.grant_id) ?? s.grant_id,
  }))

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score)
}

/**
 * Extracts only the fields the AI needs from the profile, stripping
 * raw scraper HTML and debug data to minimize token usage.
 */
function buildLeanProfile(
  profile: Record<string, unknown>
): Record<string, unknown> {
  const lean: Record<string, unknown> = {
    company_name: profile.company_name ?? null,
    industry: profile.industry ?? null,
    location: profile.location ?? null,
    legal_form: profile.legal_form ?? null,
    purchase_need: profile.purchase_need ?? null,
  }

  // Extract key enriched fields if available (activities, company_size)
  const enriched = profile.enriched_data as Record<string, unknown> | null
  if (enriched && typeof enriched === 'object') {
    const merged = enriched.merged as Record<string, unknown> | undefined
    if (merged && typeof merged === 'object') {
      if (merged.activities) lean.activities = merged.activities
      if (merged.company_size) lean.company_size = merged.company_size
    }
    // Also check top-level ai_output (from inferFromIdea)
    const aiOutput = enriched.ai_output as Record<string, unknown> | undefined
    if (aiOutput && typeof aiOutput === 'object') {
      if (aiOutput.company_size) lean.company_size = aiOutput.company_size
    }
  }

  return lean
}
