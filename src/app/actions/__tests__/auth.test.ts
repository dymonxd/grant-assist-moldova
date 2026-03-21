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

const mockSave = vi.fn()
const mockSession: { companyProfileId?: string; save: typeof mockSave } = {
  companyProfileId: undefined,
  save: mockSave,
}

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}))

// Mock Supabase server client (for auth operations)
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    })
  ),
}))

// Mock Supabase admin client (for privileged operations)
const mockAdminEq = vi.fn()
const mockAdminUpdate = vi.fn(() => ({ eq: mockAdminEq }))
const mockAdminFrom = vi.fn(() => ({
  update: mockAdminUpdate,
}))
const mockAdminRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/navigation (redirect throws internally)
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

// --- Imports (after mocks) ---

import { signup, signIn, signOut } from '../auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const mockRedirect = vi.mocked(redirect)
const mockRevalidatePath = vi.mocked(revalidatePath)

// --- Helper to create FormData ---

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// --- Tests ---

describe('signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.companyProfileId = undefined
  })

  it('calls supabase.auth.signUp with email, password, and metadata (name, phone)', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
      redirectTo: '/results',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ion@example.com',
        password: 'securepass',
        options: expect.objectContaining({
          data: { name: 'Ion Popescu', phone: '+37360123456' },
        }),
      })
    )
  })

  it('calls claim_company_profile RPC when session has companyProfileId', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockAdminRpc).toHaveBeenCalledWith('claim_company_profile', {
      p_profile_id: 'profile-1',
      p_user_id: 'user-1',
    })
  })

  it('updates profiles with phone and email_notifications=false when notifications unchecked', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
      // no notifications field = unchecked
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
    expect(mockAdminUpdate).toHaveBeenCalledWith({
      phone: '+37360123456',
      email_notifications: false,
    })
    expect(mockAdminEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('updates profiles with email_notifications=true when notifications checked', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
      notifications: 'on',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockAdminUpdate).toHaveBeenCalledWith({
      phone: '+37360123456',
      email_notifications: true,
    })
  })

  it('clears iron-session companyProfileId after successful merge', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockSession.companyProfileId).toBeUndefined()
    expect(mockSave).toHaveBeenCalled()
  })

  it('preserves session when claim_company_profile RPC fails', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: { message: 'RPC failed' } })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    // Session NOT cleared — profile preserved for retry
    expect(mockSession.companyProfileId).toBe('profile-1')
    expect(mockSave).not.toHaveBeenCalled()
    // Profile update NOT called
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('passes redirectTo as part of emailRedirectTo URL', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAdminRpc.mockResolvedValue({ error: null })
    mockAdminEq.mockResolvedValue({ error: null })
    mockSession.companyProfileId = 'profile-1'

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
      redirectTo: '/results',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/api/auth/callback?next=/results'),
        }),
      })
    )
  })

  it('sanitizes absolute URL redirectTo to /', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSession.companyProfileId = undefined

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: 'https://evil.com',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/')
      }
    }
  })

  it('sanitizes protocol-relative URL redirectTo to /', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSession.companyProfileId = undefined

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: '//evil.com',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/')
      }
    }
  })

  it('returns {error} when supabase.auth.signUp fails', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '+37360123456',
      password: 'securepass',
    })

    const result = await signup(null, fd)

    expect(result).toEqual({ error: 'Email already registered' })
    expect(mockAdminRpc).not.toHaveBeenCalled()
  })

  it('returns validation error for missing name', async () => {
    const fd = makeFormData({
      name: '',
      email: 'ion@example.com',
      password: 'securepass',
    })

    const result = await signup(null, fd)

    expect(result).toHaveProperty('error')
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns validation error for short password', async () => {
    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      password: '123',
    })

    const result = await signup(null, fd)

    expect(result).toHaveProperty('error')
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('redirects to redirectTo after successful signup', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSession.companyProfileId = undefined

    const fd = makeFormData({
      name: 'Ion Popescu',
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: '/results',
    })

    try {
      await signup(null, fd)
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/results')
      }
    }

    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls supabase.auth.signInWithPassword with email and password', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const fd = makeFormData({
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: '/',
    })

    try {
      await signIn(null, fd)
    } catch (e) {
      // redirect throws
    }

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'ion@example.com',
      password: 'securepass',
    })
  })

  it('returns {error} when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const fd = makeFormData({
      email: 'ion@example.com',
      password: 'wrongpass',
    })

    const result = await signIn(null, fd)

    expect(result).toEqual({ error: 'Email sau parola incorecta' })
  })

  it('redirects to redirectTo after successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const fd = makeFormData({
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: '/dashboard',
    })

    try {
      await signIn(null, fd)
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/dashboard')
      }
    }

    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('sanitizes absolute URL redirectTo to /', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const fd = makeFormData({
      email: 'ion@example.com',
      password: 'securepass',
      redirectTo: 'https://evil.com/steal',
    })

    try {
      await signIn(null, fd)
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/')
      }
    }
  })
})

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls supabase.auth.signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    try {
      await signOut()
    } catch (e) {
      // redirect throws
    }

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('redirects to / after sign-out', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    try {
      await signOut()
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe('/')
      }
    }

    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
