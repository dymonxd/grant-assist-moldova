// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

// Mock server action and navigation
vi.mock('@/app/actions/auth', () => ({
  signup: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => createElement('a', { href, ...props }, children),
}))

describe('AccountWallModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with title when open=true', async () => {
    const { AccountWallModal } = await import('../account-wall-modal')
    render(
      createElement(AccountWallModal, {
        open: true,
        onOpenChange: vi.fn(),
        grantId: 'test-grant-123',
      })
    )
    expect(
      screen.getByText('Creaza un cont pentru a aplica')
    ).toBeDefined()
  })

  it('renders SignupForm with correct redirectTo', async () => {
    const { AccountWallModal } = await import('../account-wall-modal')
    render(
      createElement(AccountWallModal, {
        open: true,
        onOpenChange: vi.fn(),
        grantId: 'test-grant-123',
      })
    )
    // The hidden input should have the redirect URL
    const hidden = document.querySelector(
      'input[name="redirectTo"]'
    ) as HTMLInputElement
    expect(hidden).not.toBeNull()
    expect(hidden.value).toBe('/grants/test-grant-123')
  })

  it('renders "Continua fara cont" skip link pointing to grant page', async () => {
    const { AccountWallModal } = await import('../account-wall-modal')
    render(
      createElement(AccountWallModal, {
        open: true,
        onOpenChange: vi.fn(),
        grantId: 'test-grant-123',
      })
    )
    const skipLink = screen.getByText('Continua fara cont')
    expect(skipLink).toBeDefined()
    expect(skipLink.getAttribute('href')).toBe('/grants/test-grant-123')
  })

  it('does not render dialog content when open=false', async () => {
    const { AccountWallModal } = await import('../account-wall-modal')
    render(
      createElement(AccountWallModal, {
        open: false,
        onOpenChange: vi.fn(),
        grantId: 'test-grant-123',
      })
    )
    expect(
      screen.queryByText('Creaza un cont pentru a aplica')
    ).toBeNull()
  })
})

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all required form fields', async () => {
    const { SignupForm } = await import('../signup-form')
    render(
      createElement(SignupForm, {
        redirectTo: '/grants/test-grant-123',
      })
    )

    // Name field
    expect(document.querySelector('input[name="name"]')).not.toBeNull()
    // Email field
    expect(
      document.querySelector('input[name="email"][type="email"]')
    ).not.toBeNull()
    // Phone field
    expect(
      document.querySelector('input[name="phone"][type="tel"]')
    ).not.toBeNull()
    // Password field
    expect(
      document.querySelector('input[name="password"][type="password"]')
    ).not.toBeNull()
  })

  it('renders hidden redirectTo input with provided value', async () => {
    const { SignupForm } = await import('../signup-form')
    render(
      createElement(SignupForm, {
        redirectTo: '/grants/test-grant-123',
      })
    )

    const hidden = document.querySelector(
      'input[name="redirectTo"]'
    ) as HTMLInputElement
    expect(hidden).not.toBeNull()
    expect(hidden.type).toBe('hidden')
    expect(hidden.value).toBe('/grants/test-grant-123')
  })

  it('renders notifications checkbox', async () => {
    const { SignupForm } = await import('../signup-form')
    render(
      createElement(SignupForm, {
        redirectTo: '/grants/test-grant-123',
      })
    )

    expect(
      screen.getByText(/Doresc sa primesc notificari/i)
    ).toBeDefined()
  })

  it('renders submit button with "Creaza cont"', async () => {
    const { SignupForm } = await import('../signup-form')
    render(
      createElement(SignupForm, {
        redirectTo: '/grants/test-grant-123',
      })
    )

    expect(screen.getByText('Creaza cont')).toBeDefined()
  })
})
