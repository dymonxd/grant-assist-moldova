import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockSession: { companyProfileId?: string } = {
  companyProfileId: undefined,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

// Mock pre-filter
const mockPreFilterGrants = vi.fn()
vi.mock('@/lib/matching/pre-filter', () => ({
  preFilterGrants: (...args: unknown[]) => mockPreFilterGrants(...args),
}))

// Mock rank-grants
const mockRankGrants = vi.fn()
vi.mock('@/lib/matching/rank-grants', () => ({
  rankGrants: (...args: unknown[]) => mockRankGrants(...args),
}))

// Mock Supabase admin client with chainable query builder
const mockSingle = vi.fn()
const mockGte = vi.fn(() => ({ data: null, error: null }))
const mockEqGrants = vi.fn(() => ({ gte: mockGte }))
const mockSelectGrants = vi.fn(() => ({ eq: mockEqGrants }))
const mockEqProfile = vi.fn(() => ({ single: mockSingle }))
const mockSelectProfile = vi.fn(() => ({ eq: mockEqProfile }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'company_profiles') {
    return { select: mockSelectProfile }
  }
  if (table === 'grants') {
    return { select: mockSelectGrants }
  }
  return {}
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

// --- Import after mocks ---

import { matchGrants } from '../matching'

// --- Test data ---

const testProfile = {
  id: 'profile-1',
  company_name: 'Test SRL',
  industry: 'IT',
  location: 'Chisinau',
  legal_form: 'SRL',
  purchase_need: 'Echipament',
  enriched_data: {},
}

const testGrants = [
  {
    id: 'grant-1',
    name: 'Grant A',
    provider_agency: 'ODIMM',
    description: 'Grant pentru IT',
    max_funding: 50000,
    currency: 'MDL',
    deadline: '2026-12-31',
    eligibility_rules: [],
    scoring_rubric: { criteria: [] },
  },
  {
    id: 'grant-2',
    name: 'Grant B',
    provider_agency: 'AIPA',
    description: 'Grant pentru agricultura',
    max_funding: 100000,
    currency: 'MDL',
    deadline: '2026-12-31',
    eligibility_rules: [],
    scoring_rubric: { criteria: [] },
  },
]

const testScores = [
  { grant_id: 'grant-1', score: 85, explanation: 'Excelent' },
  {
    grant_id: 'grant-2',
    score: 40,
    explanation: 'Slab',
    improvement_suggestions: ['Schimbati domeniul'],
  },
]

// --- Tests ---

describe('matchGrants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error when session has no companyProfileId', async () => {
    const result = await matchGrants()

    expect(result).toEqual({
      error: 'Profilul companiei nu a fost creat inca',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when profile not found in database', async () => {
    mockSession.companyProfileId = 'profile-1'
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await matchGrants()

    expect(result).toEqual({
      error: 'Profilul companiei nu a fost gasit',
    })
    expect(mockFrom).toHaveBeenCalledWith('company_profiles')
  })

  it('returns error when no active grants exist', async () => {
    mockSession.companyProfileId = 'profile-1'
    mockSingle.mockResolvedValue({ data: testProfile, error: null })
    mockGte.mockReturnValue({ data: [], error: null })

    const result = await matchGrants()

    expect(result).toEqual({
      error: 'Nu exista granturi active in acest moment',
    })
  })

  it('returns profile, scores, grants, totalGrants, filteredCount on success', async () => {
    mockSession.companyProfileId = 'profile-1'
    mockSingle.mockResolvedValue({ data: testProfile, error: null })
    mockGte.mockReturnValue({ data: testGrants, error: null })
    mockPreFilterGrants.mockReturnValue(testGrants) // All pass filter
    mockRankGrants.mockResolvedValue(testScores)

    const result = await matchGrants()

    expect(result).not.toHaveProperty('error')
    expect(result).toHaveProperty('profile', testProfile)
    expect(result).toHaveProperty('scores', testScores)
    expect(result).toHaveProperty('grants', testGrants)
    expect(result).toHaveProperty('totalGrants', 2)
    expect(result).toHaveProperty('filteredCount', 2)

    // Verify pipeline was called correctly
    expect(mockPreFilterGrants).toHaveBeenCalledWith(testGrants, testProfile)
    expect(mockRankGrants).toHaveBeenCalledWith(testProfile, testGrants)
  })
})
