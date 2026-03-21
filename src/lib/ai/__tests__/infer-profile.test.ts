import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the 'ai' module before importing the function under test
const OUTPUT_OBJECT_SENTINEL = { __type: 'output-object-mock' }
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => OUTPUT_OBJECT_SENTINEL) },
}))

import { generateText, Output } from 'ai'
import { inferProfileFromIdea } from '../infer-profile'

const mockGenerateText = vi.mocked(generateText)

describe('inferProfileFromIdea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns structured profile from AI output', async () => {
    const expectedProfile = {
      company_name: 'Cafenea Test',
      industry: 'HoReCa',
      location: 'Chisinau',
      legal_form: 'SRL',
      company_size: 'micro' as const,
    }

    mockGenerateText.mockResolvedValueOnce({
      output: expectedProfile,
    } as never)

    const result = await inferProfileFromIdea('Vreau sa deschid o cafenea in Chisinau')

    expect(result).toEqual(expectedProfile)
  })

  it('returns null on generateText failure', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('AI service unavailable'))

    const result = await inferProfileFromIdea('Vreau sa deschid o cafenea')

    expect(result).toBeNull()
  })

  it('passes business idea as prompt to generateText', async () => {
    const businessIdea = 'Vreau sa deschid un magazin de flori in Balti'

    mockGenerateText.mockResolvedValueOnce({
      output: {
        company_name: 'Floraria Test',
        industry: 'Comert',
        location: 'Balti',
        legal_form: 'II',
        company_size: 'micro',
      },
    } as never)

    await inferProfileFromIdea(businessIdea)

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: businessIdea,
      })
    )
  })

  it('uses Output.object with schema in generateText call', async () => {
    mockGenerateText.mockResolvedValueOnce({
      output: {
        company_name: 'Test SRL',
        industry: 'IT',
        location: 'Moldova',
        legal_form: 'SRL',
        company_size: 'small',
      },
    } as never)

    await inferProfileFromIdea('O companie IT din Moldova')

    // Verify Output.object was called (returns sentinel) and passed to generateText
    expect(Output.object).toHaveBeenCalled()
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        output: OUTPUT_OBJECT_SENTINEL,
      })
    )
  })
})
