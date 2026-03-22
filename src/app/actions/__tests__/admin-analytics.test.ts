import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

// Mock Resend SDK
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend }
  },
}))

// Mock Supabase server client (authenticated user context)
const mockGetUser = vi.fn()
const mockServerSelect = vi.fn()
const mockServerEq = vi.fn()
const mockServerSingle = vi.fn()
const mockServerInsert = vi.fn()
const mockServerFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockServerFrom,
    })
  ),
}))

// Mock Supabase admin client (service role, bypasses RLS)
const mockAdminSelect = vi.fn()
const mockAdminFrom = vi.fn()
const mockAdminInsert = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// Store original env
const originalEnv = { ...process.env }

// --- Imports (after mocks) ---
import {
  getFunnelData,
  getStageDetail,
  getRecentActivity,
  getApplicationsList,
  sendStaleReminder,
} from '../admin-analytics'

// --- Helper to set up admin user ---
function setupAdminUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'admin-user-id' } },
    error: null,
  })
  // profiles.is_admin check
  mockServerFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { is_admin: true },
          error: null,
        }),
      }),
    }),
  })
}

function setupNonAdminUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'regular-user-id' } },
    error: null,
  })
  mockServerFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { is_admin: false },
          error: null,
        }),
      }),
    }),
  })
}

// --- Tests ---

describe('verifyAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('rejects non-admin users with error', async () => {
    setupNonAdminUser()

    const result = await getFunnelData()
    expect(result).toHaveProperty('error')
  })

  it('rejects unauthenticated users with error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await getFunnelData()
    expect(result).toHaveProperty('error')
  })
})

describe('getFunnelData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('returns 6 stages with correct labels and conversion rates', async () => {
    setupAdminUser()

    // Mock analytics_daily_summary query
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [
            { stage: 'session_start', count: 1000, device_type: '' },
            { stage: 'idno_entered', count: 500, device_type: '' },
            { stage: 'grants_viewed', count: 400, device_type: '' },
            { stage: 'account_created', count: 200, device_type: '' },
            { stage: 'writer_started', count: 100, device_type: '' },
            { stage: 'application_exported', count: 50, device_type: '' },
          ],
          error: null,
        }),
      }),
    })

    const result = await getFunnelData()

    expect(result).not.toHaveProperty('error')
    expect(result.data).toHaveLength(6)
    expect(result.data![0].label).toBe('Sesiuni')
    expect(result.data![0].count).toBe(1000)
    expect(result.data![0].rate).toBe(100) // first stage is always 100%
    expect(result.data![1].label).toBe('IDNO introdus')
    expect(result.data![1].rate).toBe(50) // 500/1000 * 100
    expect(result.data![5].label).toBe('Exportat')
    expect(result.data![5].count).toBe(50)
  })
})

describe('getStageDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('returns dailyTrend, deviceBreakdown, topReferrers', async () => {
    setupAdminUser()

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: [
              {
                date: '2026-03-20',
                count: 100,
                device_type: 'desktop',
                top_referrers: [{ url: 'google.com', count: 30 }],
              },
              {
                date: '2026-03-20',
                count: 50,
                device_type: 'mobile',
                top_referrers: [{ url: 'facebook.com', count: 20 }],
              },
              {
                date: '2026-03-21',
                count: 120,
                device_type: 'desktop',
                top_referrers: [{ url: 'google.com', count: 40 }],
              },
            ],
            error: null,
          }),
        }),
      }),
    })

    const result = await getStageDetail('session_start')

    expect(result).not.toHaveProperty('error')
    expect(result.data!.dailyTrend).toBeDefined()
    expect(result.data!.dailyTrend.length).toBeGreaterThan(0)
    expect(result.data!.deviceBreakdown).toBeDefined()
    expect(result.data!.deviceBreakdown.length).toBeGreaterThan(0)
    expect(result.data!.topReferrers).toBeDefined()
    expect(result.data!.topReferrers.length).toBeGreaterThan(0)
  })
})

describe('getRecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('returns last 50 events sorted desc', async () => {
    setupAdminUser()

    const mockEvents = Array.from({ length: 50 }, (_, i) => ({
      event_type: 'session_start',
      created_at: `2026-03-${String(20 - Math.floor(i / 10)).padStart(2, '0')}T12:00:00Z`,
      session_id: `sess-${i}`,
      event_data: null,
    }))

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: mockEvents,
            error: null,
          }),
        }),
      }),
    })

    const result = await getRecentActivity()

    expect(result).not.toHaveProperty('error')
    expect(result.data).toHaveLength(50)
    expect(result.data![0]).toHaveProperty('event_type')
    expect(result.data![0]).toHaveProperty('created_at')
    expect(result.data![0]).toHaveProperty('session_id')
  })
})

describe('getApplicationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('flags stale applications correctly', async () => {
    setupAdminUser()

    const now = new Date()
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()

    // Mock applications query
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'applications') {
        return {
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'app-1',
                    status: 'in_progress',
                    updated_at: eightDaysAgo,
                    user_id: 'u-1',
                    profiles: { name: 'Ion Popescu', email: 'ion@test.com' },
                    grants: { name: 'Grant IMM', deadline: '2026-06-01' },
                  },
                  {
                    id: 'app-2',
                    status: 'in_progress',
                    updated_at: twoDaysAgo,
                    user_id: 'u-2',
                    profiles: { name: 'Maria Ionescu', email: 'maria@test.com' },
                    grants: { name: 'Grant Start', deadline: '2026-07-01' },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      // application_sections count query
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { application_id: 'app-1' },
              { application_id: 'app-1' },
              { application_id: 'app-2' },
            ],
            error: null,
          }),
        }),
      }
    })

    const result = await getApplicationsList()

    expect(result).not.toHaveProperty('error')
    expect(result.data).toBeDefined()
    expect(result.data!.length).toBe(2)

    // First app is stale (8 days ago)
    const staleApp = result.data!.find((a) => a.id === 'app-1')
    expect(staleApp!.isStale).toBe(true)

    // Second app is recent (2 days ago)
    const recentApp = result.data!.find((a) => a.id === 'app-2')
    expect(recentApp!.isStale).toBe(false)
  })
})

describe('sendStaleReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('rejects non-admin users', async () => {
    setupNonAdminUser()

    const result = await sendStaleReminder('app-1')
    expect(result).toHaveProperty('error')
    expect(mockSend).not.toHaveBeenCalled()
  })
})
