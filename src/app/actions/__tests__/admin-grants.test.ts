import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup ---

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    })
  ),
}))

// Mock Supabase admin client with chainable query builder
const mockAdminSelect = vi.fn()
const mockAdminEq = vi.fn()
const mockAdminSingle = vi.fn()
const mockAdminOrder = vi.fn()
const mockAdminUpdate = vi.fn()
const mockAdminInsert = vi.fn()
const mockAdminDelete = vi.fn()

const buildChain = () => ({
  select: mockAdminSelect,
  eq: mockAdminEq,
  single: mockAdminSingle,
  order: mockAdminOrder,
  update: mockAdminUpdate,
  insert: mockAdminInsert,
  delete: mockAdminDelete,
})

const mockAdminFrom = vi.fn(() => buildChain())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// --- Imports (after mocks) ---

import {
  getGrantsCatalog,
  updateDeadline,
  duplicateGrant,
  deactivateGrant,
  publishGrant,
  updateGrant,
} from '../admin-grants'

// --- Helper: setup admin auth ---

function setupAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'admin-1' } },
    error: null,
  })
  // Profile check for is_admin
  mockAdminSelect.mockReturnValue({ eq: mockAdminEq })
  mockAdminEq.mockReturnValue({ single: mockAdminSingle })
  mockAdminSingle.mockResolvedValue({
    data: { is_admin: true },
    error: null,
  })
}

function setupNonAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  })
  mockAdminSelect.mockReturnValue({ eq: mockAdminEq })
  mockAdminEq.mockReturnValue({ single: mockAdminSingle })
  mockAdminSingle.mockResolvedValue({
    data: { is_admin: false },
    error: null,
  })
}

// --- Tests ---

describe('admin-grants: verifyAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await getGrantsCatalog()

    expect(result).toEqual({ error: 'Acces neautorizat' })
  })

  it('returns error when user is not admin', async () => {
    setupNonAdminAuth()

    const result = await getGrantsCatalog()

    expect(result).toEqual({ error: 'Acces neautorizat' })
  })
})

describe('getGrantsCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns grants with computed displayStatus and application count', async () => {
    setupAdminAuth()

    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const grants = [
      {
        id: 'g-1',
        name: 'Grant A',
        provider_agency: 'Agency X',
        deadline: futureDate,
        status: 'active',
        last_scraped_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]
    const appCounts = [{ grant_id: 'g-1', count: 5 }]

    // First from('grants') call
    let fromCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        fromCallCount++
        if (fromCallCount === 1) {
          // Skip past is_admin check (call #1 is profiles)
          // Actually the admin check uses profiles, so grants is for the catalog
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: grants, error: null }),
            }),
          }
        }
      }
      if (table === 'applications') {
        return {
          select: vi.fn().mockResolvedValue({ data: appCounts, error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await getGrantsCatalog()

    expect(result).toHaveProperty('grants')
    if ('grants' in result) {
      expect(result.grants).toHaveLength(1)
      expect(result.grants[0]).toMatchObject({
        id: 'g-1',
        name: 'Grant A',
        displayStatus: 'Active',
        applicationCount: 5,
      })
    }
  })

  it('computes Expiring status for grants within 14 days', async () => {
    setupAdminAuth()

    const soonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const grants = [
      {
        id: 'g-2',
        name: 'Grant B',
        provider_agency: 'Agency Y',
        deadline: soonDate,
        status: 'active',
        last_scraped_at: null,
      },
    ]

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: grants, error: null }),
          }),
        }
      }
      if (table === 'applications') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await getGrantsCatalog()

    if ('grants' in result) {
      expect(result.grants[0].displayStatus).toBe('Expiring')
    }
  })

  it('computes Draft status', async () => {
    setupAdminAuth()

    const grants = [
      {
        id: 'g-3',
        name: 'Draft Grant',
        provider_agency: 'Agency Z',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        last_scraped_at: null,
      },
    ]

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: grants, error: null }),
          }),
        }
      }
      if (table === 'applications') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await getGrantsCatalog()

    if ('grants' in result) {
      expect(result.grants[0].displayStatus).toBe('Draft')
    }
  })

  it('computes Expired status for past deadlines', async () => {
    setupAdminAuth()

    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const grants = [
      {
        id: 'g-4',
        name: 'Expired Grant',
        provider_agency: 'Agency W',
        deadline: pastDate,
        status: 'active',
        last_scraped_at: null,
      },
    ]

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: grants, error: null }),
          }),
        }
      }
      if (table === 'applications') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await getGrantsCatalog()

    if ('grants' in result) {
      expect(result.grants[0].displayStatus).toBe('Expired')
    }
  })
})

describe('updateDeadline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates grant deadline and returns updated row', async () => {
    setupAdminAuth()

    const updatedGrant = { id: 'g-1', deadline: '2027-06-01' }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedGrant,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await updateDeadline('g-1', '2027-06-01')

    expect(result).toEqual({ success: true, grant: updatedGrant })
  })
})

describe('duplicateGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies grant with " (copie)" suffix and draft status', async () => {
    setupAdminAuth()

    const originalGrant = {
      id: 'g-1',
      name: 'Original Grant',
      provider_agency: 'Agency X',
      description: 'Desc',
      max_funding: 10000,
      deadline: '2027-06-01',
      status: 'active',
      eligibility_rules: [{ rule: 'test' }],
      scoring_rubric: {},
      required_documents: [],
      source_form_url: null,
    }
    const originalFields = [
      { id: 'f-1', grant_id: 'g-1', field_order: 1, field_label: 'Nume', field_type: 'text', is_required: true },
    ]
    const newGrant = { ...originalGrant, id: 'g-new', name: 'Original Grant (copie)', status: 'draft' }

    let grantCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        grantCallCount++
        if (grantCallCount === 1) {
          // Fetch original
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: originalGrant,
                  error: null,
                }),
              }),
            }),
          }
        }
        // Insert new grant
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: newGrant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        if (grantCallCount <= 1) {
          // Fetch original fields
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: originalFields,
                error: null,
              }),
            }),
          }
        }
        // Insert copied fields
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await duplicateGrant('g-1')

    expect(result).toHaveProperty('success', true)
    if ('grant' in result) {
      expect(result.grant.name).toContain('(copie)')
      expect(result.grant.status).toBe('draft')
    }
  })
})

describe('deactivateGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets grant status to expired', async () => {
    setupAdminAuth()

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await deactivateGrant('g-1')

    expect(result).toEqual({ success: true })
  })
})

describe('publishGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects grant with missing name', async () => {
    setupAdminAuth()

    const grant = {
      id: 'g-1',
      name: '',
      provider_agency: 'Agency X',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      eligibility_rules: [{ rule: 'test' }],
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: grant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'f-1' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ error: 'Numele grantului este obligatoriu' })
  })

  it('rejects grant with past deadline', async () => {
    setupAdminAuth()

    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const grant = {
      id: 'g-1',
      name: 'Valid Grant',
      provider_agency: 'Agency X',
      deadline: pastDate,
      status: 'draft',
      eligibility_rules: [{ rule: 'test' }],
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: grant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'f-1' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ error: 'Termenul limita trebuie sa fie in viitor' })
  })

  it('rejects grant with missing provider', async () => {
    setupAdminAuth()

    const grant = {
      id: 'g-1',
      name: 'Valid Grant',
      provider_agency: '',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      eligibility_rules: [{ rule: 'test' }],
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: grant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'f-1' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ error: 'Furnizorul grantului este obligatoriu' })
  })

  it('rejects grant with no eligibility rules', async () => {
    setupAdminAuth()

    const grant = {
      id: 'g-1',
      name: 'Valid Grant',
      provider_agency: 'Agency X',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      eligibility_rules: [],
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: grant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'f-1' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ error: 'Cel putin o regula de eligibilitate este necesara' })
  })

  it('rejects grant with no application fields', async () => {
    setupAdminAuth()

    const grant = {
      id: 'g-1',
      name: 'Valid Grant',
      provider_agency: 'Agency X',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      eligibility_rules: [{ rule: 'test' }],
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: grant,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ error: 'Cel putin un camp de aplicatie este necesar' })
  })

  it('publishes valid grant successfully', async () => {
    setupAdminAuth()

    const grant = {
      id: 'g-1',
      name: 'Valid Grant',
      provider_agency: 'Agency X',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      eligibility_rules: [{ rule: 'test' }],
    }

    let grantCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        grantCallCount++
        if (grantCallCount === 1) {
          // Fetch grant
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: grant,
                  error: null,
                }),
              }),
            }),
          }
        }
        // Update status to active
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'grant_application_fields') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'f-1' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await publishGrant('g-1')

    expect(result).toEqual({ success: true })
  })
})

describe('updateGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates allowed grant fields and returns updated data', async () => {
    setupAdminAuth()

    const updatedGrant = {
      id: 'g-1',
      name: 'Updated Name',
      provider_agency: 'New Agency',
    }

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'grants') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedGrant,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        }
      }
      return buildChain()
    })

    const result = await updateGrant('g-1', {
      name: 'Updated Name',
      provider_agency: 'New Agency',
    })

    expect(result).toEqual({ success: true, grant: updatedGrant })
  })
})
