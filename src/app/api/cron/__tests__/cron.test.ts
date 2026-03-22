import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mock setup (vi.hoisted ensures availability before vi.mock hoisting) ---

const {
  mockSend,
  mockAdminFrom,
  mockAdminRpc,
  mockCheckDuplicate,
  mockBuildDeadlineEmail,
  mockBuildAbandonedEmail,
  mockGetDeadlineSubject,
  mockGetAbandonedSubject,
} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockAdminRpc: vi.fn(),
  mockCheckDuplicate: vi.fn(),
  mockBuildDeadlineEmail: vi.fn().mockReturnValue('<html>deadline</html>'),
  mockBuildAbandonedEmail: vi.fn().mockReturnValue('<html>abandoned</html>'),
  mockGetDeadlineSubject: vi.fn().mockReturnValue('Memento: Grant IMM - 7 zile ramase'),
  mockGetAbandonedSubject: vi.fn().mockReturnValue('Cererea ta pentru Grant IMM asteapta'),
}))

// Mock Resend SDK
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend }
  },
}))

// Mock Supabase admin client (service role, bypasses RLS)
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))

// Mock checkDuplicateNotification from admin-notifications
vi.mock('@/app/actions/admin-notifications', () => ({
  checkDuplicateNotification: mockCheckDuplicate,
}))

// Mock notification-emails
vi.mock('@/lib/email/notification-emails', () => ({
  buildDeadlineReminderEmail: mockBuildDeadlineEmail,
  buildAbandonedDraftEmail: mockBuildAbandonedEmail,
  getDeadlineReminderSubject: mockGetDeadlineSubject,
  getAbandonedDraftSubject: mockGetAbandonedSubject,
}))

// Store original env
const originalEnv = { ...process.env }

// --- Imports (after mocks) ---
import { GET as deadlinesGET } from '../deadlines/route'
import { GET as abandonedGET } from '../abandoned/route'
import { GET as analyticsGET } from '../analytics/route'

// --- Helpers ---

function makeRequest(cronSecret?: string): Request {
  const headers: Record<string, string> = {}
  if (cronSecret) {
    headers['authorization'] = `Bearer ${cronSecret}`
  }
  return new Request('http://localhost:3000/api/cron/test', { headers })
}

// --- Auth validation tests ---

describe('cron auth validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.CRON_SECRET = 'test-cron-secret-123'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('deadlines route returns 401 without Authorization header', async () => {
    const response = await deadlinesGET(makeRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('abandoned route returns 401 without Authorization header', async () => {
    const response = await abandonedGET(makeRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('analytics route returns 401 without Authorization header', async () => {
    const response = await analyticsGET(makeRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('deadlines route returns 401 with wrong CRON_SECRET', async () => {
    const response = await deadlinesGET(makeRequest('wrong-secret'))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('abandoned route returns 401 with wrong CRON_SECRET', async () => {
    const response = await abandonedGET(makeRequest('wrong-secret'))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('analytics route returns 401 with wrong CRON_SECRET', async () => {
    const response = await analyticsGET(makeRequest('wrong-secret'))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})

// --- Deadline cron tests ---

describe('deadline cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.CRON_SECRET = 'test-cron-secret-123'
    process.env.RESEND_API_KEY = 're_test_key_123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://grantassist.md'
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockCheckDuplicate.mockResolvedValue(false)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('finds grants expiring in 7 days and sends reminders', async () => {
    // Mock grants query: finds grants with upcoming deadlines
    const mockGrantsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            { id: 'grant-1', name: 'Grant IMM', deadline: getFutureDate(7) },
          ],
          error: null,
        }),
      }),
    })

    // Mock applications query: users for those grants
    const mockAppsSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'app-1',
              user_id: 'user-1',
              grant_id: 'grant-1',
              profiles: {
                name: 'Ion Popescu',
                email: 'ion@test.com',
                email_notifications: true,
              },
              grants: {
                name: 'Grant IMM',
                deadline: getFutureDate(7),
              },
            },
          ],
          error: null,
        }),
      }),
    })

    // Mock notifications_log insert
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') return { select: mockGrantsSelect }
      if (table === 'applications') return { select: mockAppsSelect }
      if (table === 'notifications_log') return { insert: mockInsert }
      return { select: vi.fn() }
    })

    const response = await deadlinesGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.sent).toBe(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('skips users with email_notifications=false', async () => {
    const mockGrantsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            { id: 'grant-1', name: 'Grant IMM', deadline: getFutureDate(7) },
          ],
          error: null,
        }),
      }),
    })

    const mockAppsSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'app-1',
              user_id: 'user-1',
              grant_id: 'grant-1',
              profiles: {
                name: 'Ion Popescu',
                email: 'ion@test.com',
                email_notifications: false,
              },
              grants: {
                name: 'Grant IMM',
                deadline: getFutureDate(7),
              },
            },
          ],
          error: null,
        }),
      }),
    })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') return { select: mockGrantsSelect }
      if (table === 'applications') return { select: mockAppsSelect }
      return { select: vi.fn() }
    })

    const response = await deadlinesGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.skipped).toBeGreaterThanOrEqual(1)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips duplicate notifications', async () => {
    mockCheckDuplicate.mockResolvedValue(true)

    const mockGrantsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            { id: 'grant-1', name: 'Grant IMM', deadline: getFutureDate(7) },
          ],
          error: null,
        }),
      }),
    })

    const mockAppsSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'app-1',
              user_id: 'user-1',
              grant_id: 'grant-1',
              profiles: {
                name: 'Ion Popescu',
                email: 'ion@test.com',
                email_notifications: true,
              },
              grants: {
                name: 'Grant IMM',
                deadline: getFutureDate(7),
              },
            },
          ],
          error: null,
        }),
      }),
    })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') return { select: mockGrantsSelect }
      if (table === 'applications') return { select: mockAppsSelect }
      return { select: vi.fn() }
    })

    const response = await deadlinesGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.skipped).toBeGreaterThanOrEqual(1)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

// --- Abandoned draft cron tests ---

describe('abandoned draft cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.CRON_SECRET = 'test-cron-secret-123'
    process.env.RESEND_API_KEY = 're_test_key_123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://grantassist.md'
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockCheckDuplicate.mockResolvedValue(false)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('finds stale applications (7+ days) and sends nudge emails', async () => {
    const mockAppsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'app-1',
              user_id: 'user-1',
              grant_id: 'grant-1',
              updated_at: getPastDate(10),
              profiles: {
                name: 'Ion Popescu',
                email: 'ion@test.com',
                email_notifications: true,
              },
              grants: {
                name: 'Grant IMM',
              },
            },
          ],
          error: null,
        }),
      }),
    })

    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'applications') return { select: mockAppsSelect }
      if (table === 'notifications_log') return { insert: mockInsert }
      return { select: vi.fn() }
    })

    const response = await abandonedGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.sent).toBe(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('skips users with email_notifications=false', async () => {
    const mockAppsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'app-1',
              user_id: 'user-1',
              grant_id: 'grant-1',
              updated_at: getPastDate(10),
              profiles: {
                name: 'Ion Popescu',
                email: 'ion@test.com',
                email_notifications: false,
              },
              grants: {
                name: 'Grant IMM',
              },
            },
          ],
          error: null,
        }),
      }),
    })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'applications') return { select: mockAppsSelect }
      return { select: vi.fn() }
    })

    const response = await abandonedGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.skipped).toBeGreaterThanOrEqual(1)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

// --- Analytics cron tests ---

describe('analytics cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.CRON_SECRET = 'test-cron-secret-123'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('aggregates events by stage and device_type', async () => {
    const mockEventsSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [
            { event_type: 'session_start', device_type: 'desktop', referrer_url: 'https://google.com' },
            { event_type: 'session_start', device_type: 'desktop', referrer_url: 'https://google.com' },
            { event_type: 'session_start', device_type: 'mobile', referrer_url: 'https://facebook.com' },
            { event_type: 'grants_viewed', device_type: 'desktop', referrer_url: null },
            { event_type: 'account_created', device_type: null, referrer_url: null },
            { event_type: 'section_generated', device_type: 'desktop', referrer_url: null }, // unmapped, should be skipped
          ],
          error: null,
        }),
      }),
    })

    const mockUpsert = vi.fn().mockResolvedValue({ error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'analytics_events') return { select: mockEventsSelect }
      if (table === 'analytics_daily_summary') return { upsert: mockUpsert }
      return { select: vi.fn() }
    })

    const response = await analyticsGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.date).toBeDefined()
    expect(body.stages_aggregated).toBeGreaterThan(0)
    expect(mockUpsert).toHaveBeenCalled()

    // Verify upsert was called with correct data structure
    const upsertCall = mockUpsert.mock.calls[0][0]
    expect(Array.isArray(upsertCall)).toBe(true)

    // Check that session_start mapped to 'sessions' stage
    const sessionsRows = upsertCall.filter((row: Record<string, unknown>) => row.stage === 'sessions')
    expect(sessionsRows.length).toBeGreaterThan(0)

    // Check that unmapped event_type 'section_generated' was not included
    const unmappedRows = upsertCall.filter((row: Record<string, unknown>) => row.stage === 'section_generated')
    expect(unmappedRows.length).toBe(0)

    // Check that null device_type was mapped to empty string
    const accountRows = upsertCall.filter((row: Record<string, unknown>) => row.stage === 'account_created')
    if (accountRows.length > 0) {
      expect(accountRows[0].device_type).toBe('')
    }
  })

  it('handles empty event set gracefully (no errors, no inserts)', async () => {
    const mockEventsSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    const mockUpsert = vi.fn()

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'analytics_events') return { select: mockEventsSelect }
      if (table === 'analytics_daily_summary') return { upsert: mockUpsert }
      return { select: vi.fn() }
    })

    const response = await analyticsGET(makeRequest('test-cron-secret-123'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.stages_aggregated).toBe(0)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

// --- Date helpers ---

function getFutureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getPastDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
