import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock AI SDK ---

const mockStreamText = vi.fn()

vi.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ modelId: model })),
}))

// Mock generate-section
const mockBuildSectionPrompt = vi.fn()
const mockBuildSystemPrompt = vi.fn()

vi.mock('@/lib/ai/generate-section', () => ({
  buildSectionPrompt: (...args: unknown[]) => mockBuildSectionPrompt(...args),
  buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
}))

// --- Import after mocks ---

import { POST } from '../generate/route'

// --- Helpers ---

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/writer/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  sectionId: 'sec-1',
  fieldLabel: 'Descrierea proiectului',
  helperText: 'Descrieti proiectul',
  characterLimit: 2000,
  scoringRubric: { criteria: [{ name: 'Inovatie', weight: 30, description: 'Test' }] },
  companyProfile: { company_name: 'Test SRL', industry: 'IT' },
  userBrief: 'Proiectul nostru vizeaza digitalizarea proceselor de productie',
}

// --- Tests ---

describe('POST /api/writer/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildSectionPrompt.mockReturnValue('assembled section prompt')
    mockBuildSystemPrompt.mockReturnValue('system prompt in Romanian')
  })

  it('returns 400 when fieldLabel is missing', async () => {
    const body = { ...validBody, fieldLabel: undefined }
    const req = makeRequest(body)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns 400 when companyProfile is missing', async () => {
    const body = { ...validBody, companyProfile: undefined }
    const req = makeRequest(body)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns 400 when userBrief is missing', async () => {
    const body = { ...validBody, userBrief: undefined }
    const req = makeRequest(body)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns streaming response on valid request', async () => {
    const mockResponse = new Response('streamed text', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => mockResponse),
    })

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockStreamText).toHaveBeenCalledTimes(1)
  })

  it('calls buildSectionPrompt with field info, rubric, profile, and brief', async () => {
    const mockResponse = new Response('streamed text')
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => mockResponse),
    })

    const req = makeRequest(validBody)
    await POST(req)

    expect(mockBuildSectionPrompt).toHaveBeenCalledWith(
      {
        field_label: validBody.fieldLabel,
        helper_text: validBody.helperText,
        character_limit: validBody.characterLimit,
      },
      validBody.scoringRubric,
      validBody.companyProfile,
      validBody.userBrief
    )
  })

  it('calls buildSystemPrompt for the system message', async () => {
    const mockResponse = new Response('streamed text')
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => mockResponse),
    })

    const req = makeRequest(validBody)
    await POST(req)

    expect(mockBuildSystemPrompt).toHaveBeenCalledTimes(1)
  })

  it('passes system and prompt to streamText with gpt-5.4-nano model', async () => {
    const mockResponse = new Response('streamed text')
    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn(() => mockResponse),
    })

    const req = makeRequest(validBody)
    await POST(req)

    const callArgs = mockStreamText.mock.calls[0][0]
    expect(callArgs).toHaveProperty('model')
    expect(callArgs).toHaveProperty('system', 'system prompt in Romanian')
    expect(callArgs).toHaveProperty('prompt', 'assembled section prompt')
    expect(callArgs).toHaveProperty('maxTokens', 2000)
  })
})
