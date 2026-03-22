import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the 'ai' module before importing the function under test
const OUTPUT_OBJECT_SENTINEL = { __type: 'output-object-mock' }
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => OUTPUT_OBJECT_SENTINEL) },
}))

import { generateText, Output } from 'ai'
import { extractGrantFromPdf, validateScrapeUrl } from '../extract-grant-pdf'

const mockGenerateText = vi.mocked(generateText)

describe('extractGrantFromPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns structured grant data from PDF text', async () => {
    const expectedData = {
      eligibilityRules: ['IMM-uri inregistrate in Moldova', 'Minim 1 an de activitate'],
      scoringRubric: [
        { criterion: 'Inovatie', weight: 30 },
        { criterion: 'Impact economic', weight: 40 },
        { criterion: 'Sustenabilitate', weight: 30 },
      ],
      applicationFields: [
        { label: 'Numele companiei', type: 'text', required: true, characterLimit: 200 },
        { label: 'Descrierea proiectului', type: 'textarea', required: true, characterLimit: 5000 },
      ],
      requiredDocuments: ['Certificat de inregistrare', 'Plan de afaceri'],
    }

    mockGenerateText.mockResolvedValueOnce({
      output: expectedData,
    } as never)

    const result = await extractGrantFromPdf('Aceasta este un ghid de grant...')

    expect(result).toEqual(expectedData)
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        output: OUTPUT_OBJECT_SENTINEL,
      })
    )
  })

  it('returns empty arrays for empty text (graceful degradation)', async () => {
    const result = await extractGrantFromPdf('')

    expect(result).toEqual({
      eligibilityRules: [],
      scoringRubric: [],
      applicationFields: [],
      requiredDocuments: [],
    })

    // Should NOT call AI for empty text
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it('returns empty arrays for whitespace-only text', async () => {
    const result = await extractGrantFromPdf('   \n\t  ')

    expect(result).toEqual({
      eligibilityRules: [],
      scoringRubric: [],
      applicationFields: [],
      requiredDocuments: [],
    })

    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it('uses Output.object with schema in generateText call', async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        eligibilityRules: [],
        scoringRubric: [],
        applicationFields: [],
        requiredDocuments: [],
      },
    } as never)

    await extractGrantFromPdf('Text de test')

    expect(Output.object).toHaveBeenCalled()
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        output: OUTPUT_OBJECT_SENTINEL,
      })
    )
  })
})

describe('validateScrapeUrl', () => {
  it('accepts whitelisted domain odimm.md', () => {
    expect(validateScrapeUrl('https://odimm.md/grants')).toBe(true)
  })

  it('accepts whitelisted domain ucipifad.md', () => {
    expect(validateScrapeUrl('https://ucipifad.md/program')).toBe(true)
  })

  it('accepts whitelisted domain with www prefix', () => {
    expect(validateScrapeUrl('https://www.odimm.md/grants')).toBe(true)
  })

  it('accepts whitelisted domain aipa.gov.md', () => {
    expect(validateScrapeUrl('https://aipa.gov.md/grants')).toBe(true)
  })

  it('accepts whitelisted domain e-gov.md', () => {
    expect(validateScrapeUrl('https://e-gov.md/programs')).toBe(true)
  })

  it('rejects 127.0.0.1 (localhost IP)', () => {
    expect(validateScrapeUrl('http://127.0.0.1/secret')).toBe(false)
  })

  it('rejects localhost hostname', () => {
    expect(validateScrapeUrl('http://localhost:3000/api')).toBe(false)
  })

  it('rejects 10.x.x.x private range', () => {
    expect(validateScrapeUrl('http://10.0.0.1/internal')).toBe(false)
  })

  it('rejects 192.168.x.x private range', () => {
    expect(validateScrapeUrl('http://192.168.1.1/admin')).toBe(false)
  })

  it('rejects 0.0.0.0', () => {
    expect(validateScrapeUrl('http://0.0.0.0/admin')).toBe(false)
  })

  it('rejects 169.254.x.x link-local range', () => {
    expect(validateScrapeUrl('http://169.254.169.254/metadata')).toBe(false)
  })

  it('rejects unknown external domain', () => {
    expect(validateScrapeUrl('https://evil.com/exploit')).toBe(false)
  })

  it('rejects non-whitelisted .md domain', () => {
    expect(validateScrapeUrl('https://malicious.md/grants')).toBe(false)
  })

  it('returns false for invalid URL', () => {
    expect(validateScrapeUrl('not-a-url')).toBe(false)
  })
})
