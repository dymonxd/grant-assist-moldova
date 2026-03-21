/**
 * AI prompt construction for grant section generation.
 *
 * Builds context-rich prompts combining field info, scoring rubric criteria,
 * lean company profile, and user brief. Used by the streaming Route Handler
 * at /api/writer/generate.
 *
 * - buildSectionPrompt: assembles field + rubric + company + brief context
 * - buildSystemPrompt: returns Romanian system prompt for rubric-optimized writing
 */

interface FieldInfo {
  field_label: string
  helper_text: string | null
  character_limit: number | null
}

interface RubricCriteria {
  name: string
  weight: number
  description: string
}

interface Rubric {
  criteria: RubricCriteria[]
}

/**
 * Builds the user prompt for a specific grant application section.
 *
 * Includes field context (label, helper text, character limit), relevant
 * rubric criteria, lean company data, and the user's brief input.
 * When the user brief is under 20 characters, appends an instruction
 * to ask ONE clarifying question instead of generating text (WRITE-04).
 */
export function buildSectionPrompt(
  field: FieldInfo,
  rubric: Rubric | null,
  profile: Record<string, unknown>,
  userBrief: string
): string {
  const leanProfile = buildLeanProfile(profile)

  const criteria = rubric?.criteria ?? []
  const relevantCriteria =
    criteria.length > 0
      ? criteria.map((c) => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')
      : 'Nu sunt criterii specificate'

  const parts: string[] = [
    `Sectiunea: ${field.field_label}`,
    `Indicatii: ${field.helper_text ?? 'Fara indicatii suplimentare'}`,
  ]

  if (field.character_limit != null) {
    parts.push(`Limita de caractere: ${field.character_limit}`)
  }

  parts.push('')
  parts.push('Criteriile de evaluare ale comisiei:')
  parts.push(relevantCriteria)
  parts.push('')
  parts.push('Datele companiei:')
  parts.push(JSON.stringify(leanProfile, null, 2))
  parts.push('')
  parts.push(`Raspunsul utilizatorului: ${userBrief}`)

  // WRITE-04: Clarifying question mode for vague input
  if (userBrief.length < 20) {
    parts.push('')
    parts.push(
      'Utilizatorul a oferit un raspuns prea scurt. In loc sa generezi textul, pune O SINGURA intrebare de clarificare specifica in limba romana care sa il ajute sa ofere mai multe detalii.'
    )
  }

  return parts.join('\n')
}

/**
 * Returns the Romanian system prompt instructing the AI to write
 * rubric-optimized grant application text.
 */
export function buildSystemPrompt(): string {
  return `Esti un expert in scrierea cererilor de finantare din Republica Moldova.

Reguli:
- Scrie intotdeauna in limba romana, folosind un limbaj clar si simplu
- Optimizeaza textul pentru criteriile din rubrica de evaluare a comisiei
- Concentreaza-te pe sectiunea specifica ceruta, nu divaga in alte subiecte
- Foloseste datele companiei pentru a personaliza raspunsul
- Respecta limita de caractere daca este specificata
- Nu inventa informatii despre companie pe care nu le ai in context
- Structureaza textul cu paragrafe scurte si puncte cheie acolo unde este potrivit
- Tonul trebuie sa fie profesional dar accesibil`
}

/**
 * Extracts only the fields the AI needs from the profile, stripping
 * raw scraper HTML and debug data to minimize token usage.
 *
 * Copied from rank-grants.ts buildLeanProfile to maintain module independence.
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
