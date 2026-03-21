import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockSave = vi.fn()
const mockSession: { companyProfileId?: string; save: typeof mockSave } = {
  companyProfileId: undefined,
  save: mockSave,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

vi.mock('@/lib/validation/idno', () => ({
  validateIdno: vi.fn(),
}))

vi.mock('@/lib/sources/aggregate', () => ({
  aggregate: vi.fn(),
}))

vi.mock('@/lib/ai/infer-profile', () => ({
  inferProfileFromIdea: vi.fn(),
}))

// Mock Supabase admin client with chainable query builder
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockUpsert = vi.fn(() => ({ select: mockSelect }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn((table: string) => ({
  upsert: mockUpsert,
  insert: mockInsert,
  update: mockUpdate,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

// --- Imports (after mocks) ---

import { validateIdno } from '@/lib/validation/idno'
import { aggregate } from '@/lib/sources/aggregate'
import { inferProfileFromIdea } from '@/lib/ai/infer-profile'
import { lookupCompany, inferFromIdea, saveManualProfile } from '../profile'
import { savePurchaseNeed } from '../purchase'

const mockValidateIdno = vi.mocked(validateIdno)
const mockAggregate = vi.mocked(aggregate)
const mockInferProfileFromIdea = vi.mocked(inferProfileFromIdea)

// --- Tests ---

describe('lookupCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error for invalid IDNO', async () => {
    mockValidateIdno.mockReturnValue({ valid: false, error: 'IDNO invalid' })

    const result = await lookupCompany('bad-idno')

    expect(result).toEqual({ error: 'IDNO invalid' })
    expect(mockAggregate).not.toHaveBeenCalled()
  })

  it('calls aggregate and stores session on valid IDNO', async () => {
    mockValidateIdno.mockReturnValue({ valid: true, idno: '1003600070656' })
    mockAggregate.mockResolvedValue({
      merged: {
        company_name: 'Test SRL',
        industry: 'IT',
        location: 'Chisinau',
        legal_form: 'SRL',
      },
      raw: {},
      sourceStatus: { 'idno.md': 'success' },
      isPartial: false,
      allFailed: false,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-1', company_name: 'Test SRL' },
      error: null,
    })

    const result = await lookupCompany('1003600070656')

    expect(mockAggregate).toHaveBeenCalledWith('1003600070656')
    expect(mockFrom).toHaveBeenCalledWith('company_profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ idno: '1003600070656' }),
      { onConflict: 'idno' }
    )
    expect(mockSession.companyProfileId).toBe('uuid-1')
    expect(mockSave).toHaveBeenCalled()
    expect(result).toHaveProperty('profile')
    expect(result).toHaveProperty('sourceStatus')
  })
})

describe('inferFromIdea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error for short text', async () => {
    const result = await inferFromIdea('abc')

    expect(result).toEqual({
      error: 'Descrierea ideii de afacere trebuie sa aiba cel putin 10 caractere',
    })
    expect(mockInferProfileFromIdea).not.toHaveBeenCalled()
  })

  it('returns error when AI returns null', async () => {
    mockInferProfileFromIdea.mockResolvedValue(null)

    const result = await inferFromIdea('Vreau sa deschid un magazin de flori')

    expect(result).toEqual({ error: 'Nu am putut analiza ideea de afacere' })
  })

  it('inserts profile and stores session on success', async () => {
    const aiOutput = {
      company_name: 'Floraria Moldovei',
      industry: 'Comert',
      location: 'Chisinau',
      legal_form: 'SRL',
      company_size: 'micro' as const,
    }
    mockInferProfileFromIdea.mockResolvedValue(aiOutput)
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-2', company_name: 'Floraria Moldovei' },
      error: null,
    })

    const result = await inferFromIdea('Vreau sa deschid un magazin de flori in Chisinau')

    expect(mockInferProfileFromIdea).toHaveBeenCalledWith(
      'Vreau sa deschid un magazin de flori in Chisinau'
    )
    expect(mockFrom).toHaveBeenCalledWith('company_profiles')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_idea: 'Vreau sa deschid un magazin de flori in Chisinau',
        company_name: 'Floraria Moldovei',
        enriched_data: expect.objectContaining({ source: 'ai_inference' }),
      })
    )
    expect(mockSession.companyProfileId).toBe('uuid-2')
    expect(mockSave).toHaveBeenCalled()
    expect(result).toHaveProperty('profile')
  })
})

describe('saveManualProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error for empty company_name', async () => {
    const result = await saveManualProfile({
      company_name: '',
      industry: 'IT',
      location: 'Chisinau',
      legal_form: 'SRL',
    })

    expect(result).toEqual({ error: 'Numele companiei este obligatoriu' })
  })

  it('inserts and stores session on valid input', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'uuid-3', company_name: 'Manual SRL' },
      error: null,
    })

    const result = await saveManualProfile({
      company_name: 'Manual SRL',
      industry: 'Agricultura',
      location: 'Balti',
      legal_form: 'II',
    })

    expect(mockFrom).toHaveBeenCalledWith('company_profiles')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: 'Manual SRL',
        industry: 'Agricultura',
        enriched_data: { source: 'manual_entry' },
      })
    )
    expect(mockSession.companyProfileId).toBe('uuid-3')
    expect(mockSave).toHaveBeenCalled()
    expect(result).toHaveProperty('profile')
  })
})

describe('savePurchaseNeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error when session has no companyProfileId', async () => {
    const result = await savePurchaseNeed('Echipament si utilaje')

    expect(result).toEqual({ error: 'Profilul companiei nu a fost creat inca' })
  })

  it('returns error for empty purchaseNeed', async () => {
    mockSession.companyProfileId = 'uuid-existing'

    const result = await savePurchaseNeed('')

    expect(result).toEqual({
      error: 'Selecteaza sau descrie ce doresti sa achizitionezi',
    })
  })

  it('updates purchase_need via admin client on valid input', async () => {
    mockSession.companyProfileId = 'uuid-existing'
    mockEq.mockResolvedValue({ error: null })

    const result = await savePurchaseNeed('Echipament si utilaje')

    expect(mockFrom).toHaveBeenCalledWith('company_profiles')
    expect(mockUpdate).toHaveBeenCalledWith({
      purchase_need: 'Echipament si utilaje',
    })
    expect(mockEq).toHaveBeenCalledWith('id', 'uuid-existing')
    expect(result).toEqual({ success: true })
  })
})
