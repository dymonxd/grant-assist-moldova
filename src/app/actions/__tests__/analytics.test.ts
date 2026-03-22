import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockSession: { companyProfileId?: string } = {
  companyProfileId: undefined,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

// Mock Supabase admin client (analytics_events RLS is admin-only INSERT)
const mockAdminInsert = vi.fn(() => ({ error: null }))
const mockAdminFrom = vi.fn(() => ({
  insert: mockAdminInsert,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// --- Imports (after mocks) ---

import { trackEvent } from '../analytics'

// --- Tests ---

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('inserts into analytics_events with correct fields', async () => {
    mockAdminInsert.mockReturnValue({ error: null })
    mockSession.companyProfileId = 'cp-123'

    const result = await trackEvent({
      eventType: 'writer_started',
      eventData: { grantId: 'g-1' },
      userId: 'user-1',
      referrerUrl: '/grants/g-1/write',
      deviceType: 'desktop',
    })

    expect(mockAdminFrom).toHaveBeenCalledWith('analytics_events')
    expect(mockAdminInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'writer_started',
        event_data: { grantId: 'g-1' },
        user_id: 'user-1',
        referrer_url: '/grants/g-1/write',
        device_type: 'desktop',
        session_id: 'cp-123',
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('handles optional user_id gracefully (null when not provided)', async () => {
    mockAdminInsert.mockReturnValue({ error: null })
    mockSession.companyProfileId = 'cp-456'

    const result = await trackEvent({
      eventType: 'session_start',
    })

    expect(mockAdminInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'session_start',
        user_id: null,
        event_data: null,
        referrer_url: null,
        device_type: null,
        session_id: 'cp-456',
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('uses fallback session_id when companyProfileId is missing', async () => {
    mockAdminInsert.mockReturnValue({ error: null })
    mockSession.companyProfileId = undefined

    await trackEvent({ eventType: 'grants_viewed' })

    expect(mockAdminInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'anonymous',
      })
    )
  })

  it('returns error when insert fails', async () => {
    mockAdminInsert.mockReturnValue({
      error: { message: 'Insert failed' },
    })
    mockSession.companyProfileId = 'cp-789'

    const result = await trackEvent({ eventType: 'account_created' })

    expect(result).toEqual({ error: 'Nu am putut inregistra evenimentul' })
  })
})
