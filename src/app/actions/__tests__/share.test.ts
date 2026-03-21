import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockSession: { companyProfileId?: string } = {
  companyProfileId: undefined,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

// Mock Supabase admin client with chainable query builder
const mockUpdateSingle = vi.fn()
const mockUpdateEq = vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpdateSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockSelectSingle = vi.fn()
const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

// --- Import after mocks ---

import { generateShareLink } from '../share'

// --- Tests ---

describe('generateShareLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('returns error when session has no companyProfileId', async () => {
    const result = await generateShareLink()

    expect(result).toEqual({
      error: 'Profilul companiei nu a fost creat inca',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns existing shareToken when valid (non-expired) token already exists', async () => {
    mockSession.companyProfileId = 'profile-1'
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    mockSelectSingle.mockResolvedValue({
      data: { share_token: 'existing-token-uuid', share_token_expires_at: futureDate },
      error: null,
    })

    const result = await generateShareLink()

    expect(result).toEqual({ shareToken: 'existing-token-uuid' })
    // Should NOT call update -- token is still valid
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('generates new shareToken when no token exists', async () => {
    mockSession.companyProfileId = 'profile-1'
    mockSelectSingle.mockResolvedValue({
      data: { share_token: null, share_token_expires_at: null },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: { share_token: 'new-generated-token' },
      error: null,
    })

    const result = await generateShareLink()

    expect(result).toEqual({ shareToken: 'new-generated-token' })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('generates new shareToken when existing token is expired', async () => {
    mockSession.companyProfileId = 'profile-1'
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    mockSelectSingle.mockResolvedValue({
      data: { share_token: 'old-expired-token', share_token_expires_at: pastDate },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: { share_token: 'new-replacement-token' },
      error: null,
    })

    const result = await generateShareLink()

    expect(result).toEqual({ shareToken: 'new-replacement-token' })
    expect(mockUpdate).toHaveBeenCalled()
  })
})
