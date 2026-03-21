import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock AI SDK ---

const mockGenerateText = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  Output: {
    array: vi.fn((opts: unknown) => opts),
  },
}))

// --- Import after mocks ---

import { rankGrants } from '../rank-grants'

// --- Helpers ---

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    company_name: 'Test SRL',
    industry: 'IT',
    location: 'Chisinau',
    legal_form: 'SRL',
    purchase_need: 'Echipament',
    enriched_data: {
      sources: { raw: 'some-html-data' },
      merged: { company_name: 'Test SRL' },
    },
    ...overrides,
  }
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-1',
    name: 'Test Grant',
    provider_agency: 'Agency',
    description: 'A test grant',
    max_funding: 50000,
    currency: 'MDL',
    deadline: '2026-12-31',
    eligibility_rules: [],
    scoring_rubric: { criteria: [] },
    ...overrides,
  }
}

// --- Tests ---

describe('rankGrants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array for empty candidates', async () => {
    const result = await rankGrants(makeProfile(), [])

    expect(result).toEqual([])
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it('returns scores sorted by score descending', async () => {
    mockGenerateText.mockResolvedValue({
      output: [
        { grant_id: 'grant-1', score: 60, explanation: 'Bun' },
        { grant_id: 'grant-2', score: 85, explanation: 'Excelent' },
        { grant_id: 'grant-3', score: 40, explanation: 'Slab' },
      ],
    })

    const candidates = [
      makeCandidate({ id: 'grant-1', name: 'Grant A' }),
      makeCandidate({ id: 'grant-2', name: 'Grant B' }),
      makeCandidate({ id: 'grant-3', name: 'Grant C' }),
    ]

    const result = await rankGrants(makeProfile(), candidates)

    expect(result[0].score).toBe(85)
    expect(result[1].score).toBe(60)
    expect(result[2].score).toBe(40)
  })

  it('each score has grant_id, score (0-100), explanation (string)', async () => {
    mockGenerateText.mockResolvedValue({
      output: [
        {
          grant_id: 'grant-1',
          score: 72,
          explanation: 'Compania se potriveste bine cu criteriile grantului',
        },
      ],
    })

    const result = await rankGrants(makeProfile(), [makeCandidate()])

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('grant_id', 'grant-1')
    expect(result[0]).toHaveProperty('score', 72)
    expect(typeof result[0].explanation).toBe('string')
    expect(result[0].explanation.length).toBeGreaterThan(0)
  })

  it('grants below 50 include improvement_suggestions array', async () => {
    mockGenerateText.mockResolvedValue({
      output: [
        {
          grant_id: 'grant-1',
          score: 35,
          explanation: 'Scor slab din cauza domeniului',
          improvement_suggestions: [
            'Schimbati domeniul de activitate',
            'Adaugati experienta in agricultura',
          ],
        },
      ],
    })

    const result = await rankGrants(makeProfile(), [makeCandidate()])

    expect(result[0].score).toBeLessThan(50)
    expect(result[0].improvement_suggestions).toBeDefined()
    expect(result[0].improvement_suggestions).toHaveLength(2)
    expect(result[0].improvement_suggestions![0]).toContain('domeniul')
  })

  it('AI receives lean profile without raw scraper data', async () => {
    mockGenerateText.mockResolvedValue({
      output: [{ grant_id: 'grant-1', score: 70, explanation: 'OK' }],
    })

    const profile = makeProfile({
      enriched_data: {
        sources: { raw: '<html>big scraper output</html>' },
        merged: { activities: ['IT'], company_size: 'micro' },
      },
    })

    await rankGrants(profile, [makeCandidate()])

    expect(mockGenerateText).toHaveBeenCalledTimes(1)
    const callArgs = mockGenerateText.mock.calls[0][0]
    const prompt = callArgs.prompt as string

    // Prompt should NOT contain raw HTML scraper data
    expect(prompt).not.toContain('<html>')
    expect(prompt).not.toContain('big scraper output')

    // Prompt should contain key profile fields
    expect(prompt).toContain('Test SRL')
    expect(prompt).toContain('IT')
    expect(prompt).toContain('Chisinau')
  })
})
