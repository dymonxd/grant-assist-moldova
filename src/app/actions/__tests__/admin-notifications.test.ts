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
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// Store original env
const originalEnv = { ...process.env }

// --- Imports (after mocks) ---
import {
  getNotificationLog,
  checkDuplicateNotification,
  bulkSendNotifications,
  getBulkSendPreview,
} from '../admin-notifications'

import {
  buildDeadlineReminderEmail,
  buildAbandonedDraftEmail,
  buildGrantExpiringEmail,
  buildNewGrantMatchEmail,
} from '@/lib/email/notification-emails'

// --- Helper to set up admin user ---
function setupAdminUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'admin-user-id' } },
    error: null,
  })
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

// --- Email Template Tests ---

describe('notification email templates', () => {
  it('buildDeadlineReminderEmail returns HTML with grant name, deadline, days, and unsubscribe link', () => {
    const html = buildDeadlineReminderEmail({
      grantName: 'Grant IMM',
      deadline: '2026-04-15',
      daysLeft: 7,
      ctaUrl: 'https://grantassist.md/grants/123',
      unsubscribeToken: 'tok-abc-123',
    })

    expect(html).toContain('Grant IMM')
    expect(html).toContain('7')
    expect(html).toContain('Continua cererea')
    expect(html).toContain('unsubscribe')
    expect(html).toContain('tok-abc-123')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('buildAbandonedDraftEmail returns HTML with grant name, last activity, and unsubscribe link', () => {
    const html = buildAbandonedDraftEmail({
      grantName: 'Grant Start',
      lastActivity: '2026-03-10',
      ctaUrl: 'https://grantassist.md/grants/456',
      unsubscribeToken: 'tok-def-456',
    })

    expect(html).toContain('Grant Start')
    expect(html).toContain('Reia cererea')
    expect(html).toContain('unsubscribe')
    expect(html).toContain('tok-def-456')
  })

  it('buildGrantExpiringEmail returns HTML with grant name, deadline, and unsubscribe link', () => {
    const html = buildGrantExpiringEmail({
      grantName: 'Grant Inovatie',
      deadline: '2026-04-01',
      ctaUrl: 'https://grantassist.md/grants/789',
      unsubscribeToken: 'tok-ghi-789',
    })

    expect(html).toContain('Grant Inovatie')
    expect(html).toContain('Aplica acum')
    expect(html).toContain('unsubscribe')
    expect(html).toContain('tok-ghi-789')
  })

  it('buildNewGrantMatchEmail returns HTML with grant name, funding amount, and unsubscribe link', () => {
    const html = buildNewGrantMatchEmail({
      grantName: 'Grant Digital',
      maxFunding: 500000,
      ctaUrl: 'https://grantassist.md/grants/101',
      unsubscribeToken: 'tok-jkl-101',
    })

    expect(html).toContain('Grant Digital')
    expect(html).toContain('500')
    expect(html).toContain('Vizualizeaza grantul')
    expect(html).toContain('unsubscribe')
    expect(html).toContain('tok-jkl-101')
  })

  it('all templates escape HTML in user-provided content', () => {
    const html = buildDeadlineReminderEmail({
      grantName: '<script>alert("xss")</script>',
      deadline: '2026-04-15',
      daysLeft: 7,
      ctaUrl: 'https://grantassist.md/grants/123',
      unsubscribeToken: 'tok-abc',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

// --- getNotificationLog Tests ---

describe('getNotificationLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('returns notifications joined with profiles and grants, ordered by sent_at DESC', async () => {
    setupAdminUser()

    const mockData = [
      {
        id: 'n-1',
        type: 'deadline_reminder',
        channel: 'email',
        sent_at: '2026-03-22T10:00:00Z',
        profiles: { name: 'Ion Popescu', email: 'ion@test.com' },
        grants: { name: 'Grant IMM' },
      },
      {
        id: 'n-2',
        type: 'abandoned_draft',
        channel: 'email',
        sent_at: '2026-03-21T10:00:00Z',
        profiles: { name: 'Maria Ionescu', email: 'maria@test.com' },
        grants: { name: 'Grant Start' },
      },
    ]

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      }),
    })

    const result = await getNotificationLog()

    expect(result).not.toHaveProperty('error')
    expect(result.data).toHaveLength(2)
    expect(result.data![0].id).toBe('n-1')
    expect(result.data![0].type).toBe('deadline_reminder')
  })

  it('filters by notification type when typeFilter is provided', async () => {
    setupAdminUser()

    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockOrder = vi.fn()
    const mockLimit = vi.fn()

    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'n-1',
          type: 'deadline_reminder',
          channel: 'email',
          sent_at: '2026-03-22T10:00:00Z',
          profiles: { name: 'Ion', email: 'ion@test.com' },
          grants: { name: 'Grant IMM' },
        },
      ],
      error: null,
    })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })

    mockAdminFrom.mockReturnValue({ select: mockSelect })

    const result = await getNotificationLog('deadline_reminder')

    expect(result).not.toHaveProperty('error')
    expect(result.data).toHaveLength(1)
    expect(mockEq).toHaveBeenCalledWith('type', 'deadline_reminder')
  })
})

// --- checkDuplicateNotification Tests ---

describe('checkDuplicateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  it('returns true if notification was sent within last 24 hours', async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'existing-notif' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await checkDuplicateNotification('user-1', 'grant-1', 'deadline_reminder')
    expect(result).toBe(true)
  })

  it('returns false if no notification was sent recently', async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await checkDuplicateNotification('user-1', 'grant-1', 'deadline_reminder')
    expect(result).toBe(false)
  })
})

// --- bulkSendNotifications Tests ---

describe('bulkSendNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://grantassist.md'
  })

  it('skips users with email_notifications=false', async () => {
    setupAdminUser()

    // First call: target users query (deadline_reminder = apps expiring in 7/3 days)
    // Second call: duplicate check
    // Third call: insert notification log
    let callCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++
      if (table === 'applications') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'app-1',
                    user_id: 'u-1',
                    grant_id: 'g-1',
                    profiles: { name: 'Ion', email: 'ion@test.com', email_notifications: false },
                    grants: { name: 'Grant IMM', deadline: '2026-04-01', max_funding: 100000 },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [{ id: 'g-1' }],
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await bulkSendNotifications({ type: 'deadline_reminder' })

    expect(result).not.toHaveProperty('error')
    expect(result.data!.skipped).toBeGreaterThanOrEqual(1)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips duplicate notifications within 24h', async () => {
    setupAdminUser()

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'applications') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'app-1',
                    user_id: 'u-1',
                    grant_id: 'g-1',
                    profiles: { name: 'Ion', email: 'ion@test.com', email_notifications: true },
                    grants: { name: 'Grant IMM', deadline: '2026-04-01', max_funding: 100000 },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [{ id: 'g-1' }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'notifications_log') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [{ id: 'existing-notif' }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'existing' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const result = await bulkSendNotifications({ type: 'deadline_reminder' })

    expect(result).not.toHaveProperty('error')
    expect(result.data!.skipped).toBeGreaterThanOrEqual(1)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

// --- getBulkSendPreview Tests ---

describe('getBulkSendPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 're_test_key_123'
  })

  it('returns count and sample recipients', async () => {
    setupAdminUser()

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'applications') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'app-1',
                    user_id: 'u-1',
                    grant_id: 'g-1',
                    profiles: { name: 'Ion Popescu', email: 'ion@test.com', email_notifications: true },
                    grants: { name: 'Grant IMM', deadline: '2026-04-01', max_funding: 100000 },
                  },
                  {
                    id: 'app-2',
                    user_id: 'u-2',
                    grant_id: 'g-1',
                    profiles: { name: 'Maria Ionescu', email: 'maria@test.com', email_notifications: true },
                    grants: { name: 'Grant IMM', deadline: '2026-04-01', max_funding: 100000 },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [{ id: 'g-1' }],
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }
    })

    const result = await getBulkSendPreview({ type: 'deadline_reminder' })

    expect(result).not.toHaveProperty('error')
    expect(result.data!.count).toBe(2)
    expect(result.data!.sample).toHaveLength(2)
    expect(result.data!.sample[0]).toHaveProperty('name')
    expect(result.data!.sample[0]).toHaveProperty('email')
  })
})
