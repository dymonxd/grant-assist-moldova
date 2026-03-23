import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Custom error for redirect mock ---
class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`)
    this.url = url
  }
}

// --- Mock setup ---

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({
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

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

// --- Imports (after mocks) ---

import SettingsPage from '../page'
import { redirect } from 'next/navigation'

const mockRedirect = vi.mocked(redirect)

// --- Tests ---

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to home', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(SettingsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(RedirectError)
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('fetches profile data for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { email_notifications: true },
      error: null,
    })

    const result = await SettingsPage({ searchParams: Promise.resolve({}) })

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockSelect).toHaveBeenCalledWith('email_notifications')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
    // Server component returns JSX (not null)
    expect(result).toBeTruthy()
  })

  it('handles missing profile data with default true', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const result = await SettingsPage({ searchParams: Promise.resolve({}) })

    // Should still render (defaults to true)
    expect(result).toBeTruthy()
  })
})
