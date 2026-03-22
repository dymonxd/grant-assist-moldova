import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// --- Zod schema for AI extraction output ---

const ExtractionSchema = z.object({
  eligibilityRules: z.array(z.string()),
  scoringRubric: z.array(
    z.object({ criterion: z.string(), weight: z.number() })
  ),
  applicationFields: z.array(
    z.object({
      label: z.string(),
      type: z.string(),
      required: z.boolean(),
      characterLimit: z.number().nullable(),
    })
  ),
  requiredDocuments: z.array(z.string()),
})

export type ExtractedGrantData = z.infer<typeof ExtractionSchema>

const EMPTY_EXTRACTION: ExtractedGrantData = {
  eligibilityRules: [],
  scoringRubric: [],
  applicationFields: [],
  requiredDocuments: [],
}

/**
 * Extract structured grant data from PDF text using AI.
 *
 * Returns eligibility rules, scoring rubric, application fields,
 * and required documents parsed from the PDF content.
 * Returns empty arrays for empty/whitespace-only text.
 */
export async function extractGrantFromPdf(
  pdfText: string
): Promise<ExtractedGrantData> {
  if (!pdfText || pdfText.trim() === '') {
    return EMPTY_EXTRACTION
  }

  const { output } = await generateText({
    model: openai('gpt-5.4-nano'),
    output: Output.object({ schema: ExtractionSchema }),
    system: `Esti un asistent specializat in analiza documentelor de finantare din Moldova.
Extrage urmatoarele informatii din textul documentului PDF:
1. Reguli de eligibilitate - conditiile pe care trebuie sa le indeplineasca aplicantii
2. Grila de punctaj - criteriile de evaluare si ponderea fiecaruia (in procente, total = 100)
3. Campuri de aplicatie - campurile pe care trebuie sa le completeze aplicantii in formularul de cerere
4. Documente necesare - lista documentelor care trebuie atasate cererii

Raspunde doar cu datele structurate cerute. Foloseste limba romana.
Daca o categorie nu este mentionata in document, returneaza un array gol pentru acea categorie.`,
    prompt: pdfText,
  })

  return output ?? EMPTY_EXTRACTION
}

// --- SSRF-protected URL validation ---

const WHITELIST_DOMAINS = [
  'odimm.md',
  'ucipifad.md',
  'aipa.gov.md',
  'e-gov.md',
  'gov.md',
  'mec.gov.md',
  'www.odimm.md',
  'www.ucipifad.md',
]

const PRIVATE_PATTERNS = [
  'localhost',
  '127.',
  '10.',
  '192.168.',
  '0.0.0.0',
  '169.254.',
]

/**
 * Validate a URL against the domain whitelist for SSRF protection.
 *
 * Only allows scraping from known Moldovan grant agency domains.
 * Rejects private IP ranges and unknown domains.
 */
export function validateScrapeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    // Reject private/internal addresses
    for (const pattern of PRIVATE_PATTERNS) {
      if (hostname === pattern || hostname.startsWith(pattern)) {
        return false
      }
    }

    // Only allow whitelisted domains
    return WHITELIST_DOMAINS.includes(hostname)
  } catch {
    return false
  }
}
