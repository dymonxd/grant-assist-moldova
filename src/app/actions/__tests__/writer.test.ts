import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockSession: { companyProfileId?: string } = {
  companyProfileId: undefined,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

// Track call sequence for mockSingle to return different values per call
let singleCallCount = 0
const singleReturnValues: Array<{ data: unknown; error: unknown }> = []

// Track call sequence for mockEq returning terminal data (not chained)
let eqTerminalValues: Array<{ data: unknown; error: unknown }> = []
let eqTerminalIndex = 0

// Track order terminal values
let orderReturnValues: Array<{ data: unknown; error: unknown }> = []
let orderIndex = 0

// Track insert return values
let insertReturnValues: Array<{ error: unknown }> = []
let insertIndex = 0

function resetCallCounts() {
  singleCallCount = 0
  singleReturnValues.length = 0
  eqTerminalValues = []
  eqTerminalIndex = 0
  orderReturnValues = []
  orderIndex = 0
  insertReturnValues = []
  insertIndex = 0
}

function queueSingle(data: unknown, error: unknown = null) {
  singleReturnValues.push({ data, error })
}

function queueEqTerminal(data: unknown, error: unknown = null) {
  eqTerminalValues.push({ data, error })
}

function queueOrder(data: unknown, error: unknown = null) {
  orderReturnValues.push({ data, error })
}

function queueInsert(error: unknown = null) {
  insertReturnValues.push({ error })
}

// Build a chainable query builder mock that supports .select().eq().eq().single() etc.
function makeChainable(): Record<string, unknown> {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => {
    if (orderIndex < orderReturnValues.length) {
      return orderReturnValues[orderIndex++]
    }
    return { data: null, error: null }
  })
  chain.single = vi.fn(() => {
    if (singleCallCount < singleReturnValues.length) {
      return Promise.resolve(singleReturnValues[singleCallCount++])
    }
    return Promise.resolve({ data: null, error: null })
  })
  chain.insert = vi.fn((rows: unknown) => {
    void rows
    // Insert chain: returns { select: () => chain, error }
    const insertResult = insertIndex < insertReturnValues.length
      ? insertReturnValues[insertIndex++]
      : { error: null }

    // If error on insert itself, still need select/single chain for the insert().select().single() pattern
    return {
      select: vi.fn(() => ({
        single: vi.fn(() => {
          if (singleCallCount < singleReturnValues.length) {
            return Promise.resolve(singleReturnValues[singleCallCount++])
          }
          return Promise.resolve({ data: null, error: null })
        }),
      })),
      error: insertResult.error,
    }
  })
  chain.update = vi.fn(() => {
    // update().eq() chain
    return {
      eq: vi.fn(() => {
        if (eqTerminalIndex < eqTerminalValues.length) {
          return eqTerminalValues[eqTerminalIndex++]
        }
        return { error: null }
      }),
    }
  })
  return chain
}

const chain = makeChainable()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => chain),
  })),
}))

// --- Import after mocks ---

import { getOrCreateApplication, saveSection, checkDeadline } from '../writer'

// --- Test data ---

const testGrant = {
  id: 'grant-1',
  name: 'Grant Test',
  provider_agency: 'ODIMM',
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  scoring_rubric: { criteria: [{ name: 'Inovatie', weight: 30, description: 'Test' }] },
  required_documents: ['Act de identitate', 'Extras bancar'],
  max_funding: 100000,
  currency: 'MDL',
  description: 'Grant pentru dezvoltare',
}

const testFields = [
  {
    id: 'field-1',
    grant_id: 'grant-1',
    field_order: 1,
    field_label: 'Descrierea proiectului',
    field_type: 'textarea',
    is_required: true,
    character_limit: 2000,
    helper_text: 'Descrieti proiectul',
  },
  {
    id: 'field-2',
    grant_id: 'grant-1',
    field_order: 2,
    field_label: 'Bugetul estimat',
    field_type: 'textarea',
    is_required: true,
    character_limit: 500,
    helper_text: 'Detaliati bugetul',
  },
]

const testApplication = {
  id: 'app-1',
  grant_id: 'grant-1',
  company_profile_id: 'profile-1',
  status: 'in_progress',
  field_snapshot: testFields,
}

const testSections = [
  { id: 'sec-1', application_id: 'app-1', grant_field_id: 'field-1', final_text: null, is_saved: false },
  { id: 'sec-2', application_id: 'app-1', grant_field_id: 'field-2', final_text: null, is_saved: false },
]

// --- Tests ---

describe('checkDeadline', () => {
  it('returns "expired" when deadline is in the past', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const result = checkDeadline(pastDate)

    expect(result.status).toBe('expired')
    expect(result.daysLeft).toBeLessThan(0)
  })

  it('returns "urgent" when deadline is less than 3 days away', () => {
    const urgentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const result = checkDeadline(urgentDate)

    expect(result.status).toBe('urgent')
    expect(result.daysLeft).toBeLessThanOrEqual(3)
    expect(result.daysLeft).toBeGreaterThan(0)
  })

  it('returns "ok" when deadline is more than 3 days away', () => {
    const okDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const result = checkDeadline(okDate)

    expect(result.status).toBe('ok')
    expect(result.daysLeft).toBeGreaterThan(3)
  })

  it('returns "ok" with Infinity daysLeft when deadline is null', () => {
    const result = checkDeadline(null)

    expect(result.status).toBe('ok')
    expect(result.daysLeft).toBe(Infinity)
  })

  it('returns "urgent" for deadline exactly on the boundary (3 days)', () => {
    // 2.5 days from now -- should be urgent
    const boundary = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString()
    const result = checkDeadline(boundary)

    expect(result.status).toBe('urgent')
  })
})

describe('getOrCreateApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCallCounts()
    mockSession.companyProfileId = undefined
  })

  it('returns error when session has no companyProfileId', async () => {
    const result = await getOrCreateApplication('grant-1')

    expect(result).toHaveProperty('error')
    expect(result.error).toBeDefined()
  })

  it('returns error when grant is expired', async () => {
    mockSession.companyProfileId = 'profile-1'

    const expiredGrant = {
      ...testGrant,
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    // single() call 1: grant fetch
    queueSingle(expiredGrant)

    const result = await getOrCreateApplication('grant-1')

    expect(result).toHaveProperty('error')
    expect(result.error).toContain('expirat')
  })

  it('returns existing application when one already exists for grant+profile', async () => {
    mockSession.companyProfileId = 'profile-1'

    // single() call 1: grant fetch
    queueSingle(testGrant)
    // single() call 2: existing application check
    queueSingle(testApplication)

    const result = await getOrCreateApplication('grant-1')

    expect(result).not.toHaveProperty('error')
    expect(result).toHaveProperty('application')
    expect((result as { application: typeof testApplication }).application.id).toBe('app-1')
  })

  it('creates new application with field_snapshot when none exists', async () => {
    mockSession.companyProfileId = 'profile-1'

    // single() call 1: grant fetch
    queueSingle(testGrant)
    // single() call 2: existing application check -- none found
    queueSingle(null)
    // order() call: fields fetch
    queueOrder(testFields)
    // single() call 3: application insert -> select -> single
    queueSingle({ ...testApplication, id: 'new-app' })

    const result = await getOrCreateApplication('grant-1')

    expect(result).not.toHaveProperty('error')
    expect(result).toHaveProperty('application')
    expect(result).toHaveProperty('fields')
  })

  it('includes isUrgent flag when deadline is less than 3 days away', async () => {
    mockSession.companyProfileId = 'profile-1'

    const urgentGrant = {
      ...testGrant,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
    // single() call 1: grant fetch
    queueSingle(urgentGrant)
    // single() call 2: existing application found
    queueSingle(testApplication)

    const result = await getOrCreateApplication('grant-1')

    expect(result).not.toHaveProperty('error')
    expect((result as { isUrgent: boolean }).isUrgent).toBe(true)
  })
})

describe('saveSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCallCounts()
  })

  it('saves section with final_text and sets is_saved=true', async () => {
    // single() call 1: fetch section with application
    queueSingle({
      id: 'sec-1',
      grant_field_id: 'field-1',
      application: { field_snapshot: testFields },
    })
    // update().eq() terminal: success
    queueEqTerminal(null)

    const result = await saveSection('sec-1', 'Textul final al sectiunii')

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('wasTruncated', false)
  })

  it('returns error if section not found', async () => {
    // single() call 1: section not found
    queueSingle(null, { message: 'Not found' })

    const result = await saveSection('invalid-id', 'Some text')

    expect(result).toHaveProperty('error')
  })

  it('truncates finalText to character_limit when exceeded and returns wasTruncated=true', async () => {
    const longText = 'A'.repeat(3000) // exceeds 2000 limit

    // single() call 1: fetch section
    queueSingle({
      id: 'sec-1',
      grant_field_id: 'field-1',
      application: { field_snapshot: testFields },
    })
    // update().eq() terminal: success
    queueEqTerminal(null)

    const result = await saveSection('sec-1', longText)

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('wasTruncated', true)
  })

  it('does not truncate when character_limit is null', async () => {
    const fieldsWithNullLimit = [
      { ...testFields[0], id: 'field-1', character_limit: null },
      testFields[1],
    ]

    // single() call 1: fetch section with null character_limit
    queueSingle({
      id: 'sec-1',
      grant_field_id: 'field-1',
      application: { field_snapshot: fieldsWithNullLimit },
    })
    // update().eq() terminal: success
    queueEqTerminal(null)

    const longText = 'A'.repeat(5000)
    const result = await saveSection('sec-1', longText)

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('wasTruncated', false)
  })
})
