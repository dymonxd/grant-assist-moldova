import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

// Mock Resend SDK
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend }
  },
}))

// Mock Supabase server client for saveReminderOptIn
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockSupabaseFrom,
    })
  ),
}))

// Store original env
const originalEnv = { ...process.env }

describe('sendApplicationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  const sections = [
    { fieldLabel: 'Descrierea proiectului', finalText: 'Text despre proiect.' },
    { fieldLabel: 'Bugetul', finalText: 'Bugetul este de 100.000 MDL.' },
  ]

  it('calls resend.emails.send with correct to/subject/html', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'user@example.com' } },
      error: null,
    })

    const { sendApplicationEmail } = await import('@/app/actions/export')
    const result = await sendApplicationEmail('', 'Grant IMM', sections)

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toEqual(['user@example.com'])
    expect(call.subject).toContain('Grant IMM')
    expect(call.html).toContain('Grant IMM')
    expect(call.html).toContain('Descrierea proiectului')
    expect(call.html).toContain('Text despre proiect.')
    expect(result).toEqual({ success: true })
  })

  it('returns error when Resend returns error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'user@example.com' } },
      error: null,
    })

    const { sendApplicationEmail } = await import('@/app/actions/export')
    const result = await sendApplicationEmail('', 'Grant Test', sections)

    expect(result).toHaveProperty('error')
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { sendApplicationEmail } = await import('@/app/actions/export')
    const result = await sendApplicationEmail('', 'Grant Test', sections)

    expect(result).toEqual({ error: 'Trebuie sa fiti autentificat cu un email valid' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns error when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY

    // Re-import to pick up missing env
    vi.resetModules()

    // Re-apply mocks after reset
    vi.doMock('resend', () => ({
      Resend: class MockResend {
        emails = { send: mockSend }
      },
    }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(() =>
        Promise.resolve({
          auth: { getUser: mockGetUser },
          from: mockSupabaseFrom,
        })
      ),
    }))

    const { sendApplicationEmail } = await import('@/app/actions/export')
    const result = await sendApplicationEmail('user@example.com', 'Grant Test', sections)

    expect(result).toEqual({ error: 'Serviciul de email nu este configurat' })
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('saveReminderOptIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('inserts into notifications_log for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-123' } },
      error: null,
    })
    mockInsert.mockReturnValue({ error: null })
    mockSupabaseFrom.mockReturnValue({ insert: mockInsert })

    const { saveReminderOptIn } = await import('@/app/actions/export')
    const result = await saveReminderOptIn('grant-uuid-456')

    expect(mockSupabaseFrom).toHaveBeenCalledWith('notifications_log')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-uuid-123',
      grant_id: 'grant-uuid-456',
      type: 'deadline_reminder',
      channel: 'email',
    })
    expect(result).toEqual({ success: true })
  })

  it('returns error for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { saveReminderOptIn } = await import('@/app/actions/export')
    const result = await saveReminderOptIn('grant-uuid-456')

    expect(result).toHaveProperty('error')
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })
})
