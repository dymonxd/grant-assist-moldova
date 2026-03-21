import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockGetUser = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  select: mockSelect,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

// --- Imports (after mocks) ---

import { updateNotificationPreferences } from '../settings'

// --- Tests ---

describe('updateNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates email_notifications for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateNotificationPreferences(true)

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpdate).toHaveBeenCalledWith({ email_notifications: true })
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
    expect(result).toEqual({ success: true, emailNotifications: true })
  })

  it('returns error for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await updateNotificationPreferences(false)

    expect(result).toEqual({ error: 'Trebuie sa fiti autentificat' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns new preference value (false)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateNotificationPreferences(false)

    expect(mockUpdate).toHaveBeenCalledWith({ email_notifications: false })
    expect(result).toEqual({ success: true, emailNotifications: false })
  })

  it('returns error when update fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-3' } },
      error: null,
    })
    mockEq.mockResolvedValue({ error: { message: 'Update failed' } })

    const result = await updateNotificationPreferences(true)

    expect(result).toEqual({ error: 'Nu am putut actualiza preferintele' })
  })
})
