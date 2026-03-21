import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockDeleteEq2 = vi.fn()
const mockDeleteEq1 = vi.fn(() => ({ eq: mockDeleteEq2 }))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq1 }))
const mockInsert = vi.fn()
const mockSelectEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelectEq1 = vi.fn(() => ({ eq: mockSelectEq2 }))
const mockSelectChain = vi.fn(() => ({ eq: mockSelectEq1 }))

// For getSavedGrants - select with eq returns data array
const mockSelectGetEq = vi.fn()
const mockSelectGet = vi.fn(() => ({ eq: mockSelectGetEq }))

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// --- Imports (after mocks) ---

import { toggleSavedGrant, getSavedGrants } from '../saved-grants'

// --- Tests ---

describe('toggleSavedGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: setup from() to return toggle-specific chain
    mockFrom.mockImplementation(() => ({
      select: mockSelectChain,
      insert: mockInsert,
      delete: mockDelete,
    }))
  })

  it('returns {error} when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await toggleSavedGrant('grant-1')

    expect(result).toEqual({ error: 'Trebuie sa fii autentificat' })
  })

  it('inserts into saved_grants when grant not yet saved', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    // Not yet saved
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    // Insert succeeds
    mockInsert.mockResolvedValue({ error: null })

    const result = await toggleSavedGrant('grant-1')

    expect(mockFrom).toHaveBeenCalledWith('saved_grants')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      grant_id: 'grant-1',
    })
    expect(result).toEqual({ saved: true })
  })

  it('deletes from saved_grants when grant already saved', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    // Already saved
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'saved-1' },
      error: null,
    })
    // Delete succeeds
    mockDeleteEq2.mockResolvedValue({ error: null })

    const result = await toggleSavedGrant('grant-1')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEq1).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockDeleteEq2).toHaveBeenCalledWith('grant_id', 'grant-1')
    expect(result).toEqual({ saved: false })
  })

  it('returns {saved: true} after insert', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const result = await toggleSavedGrant('grant-1')

    expect(result).toEqual({ saved: true })
  })

  it('returns {saved: false} after delete', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'saved-1' },
      error: null,
    })
    mockDeleteEq2.mockResolvedValue({ error: null })

    const result = await toggleSavedGrant('grant-1')

    expect(result).toEqual({ saved: false })
  })
})

describe('getSavedGrants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup from() to return getSavedGrants-specific chain
    mockFrom.mockImplementation(() => ({
      select: mockSelectGet,
    }))
  })

  it('returns empty array when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await getSavedGrants()

    expect(result).toEqual({ grants: [] })
  })

  it('returns list of saved grant IDs for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSelectGetEq.mockResolvedValue({
      data: [
        { grant_id: 'grant-1' },
        { grant_id: 'grant-2' },
        { grant_id: 'grant-3' },
      ],
      error: null,
    })

    const result = await getSavedGrants()

    expect(mockFrom).toHaveBeenCalledWith('saved_grants')
    expect(mockSelectGet).toHaveBeenCalledWith('grant_id')
    expect(mockSelectGetEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(result).toEqual({ grants: ['grant-1', 'grant-2', 'grant-3'] })
  })
})
