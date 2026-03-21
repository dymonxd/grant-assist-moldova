/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'

vi.mock('@/app/actions/auth', () => ({
  signup: vi.fn(),
}))
vi.mock('@/app/actions/saved-grants', () => ({
  toggleSavedGrant: vi.fn(),
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

// Grant type matching the grants table shape
interface Grant {
  id: string
  name: string
  provider_agency: string
  description: string | null
  max_funding: number | null
  currency: string
  deadline: string | null
}

// --- Fixtures ---

const fullGrant: Grant = {
  id: '1',
  name: 'AIPA Agricultura',
  provider_agency: 'AIPA',
  description: 'Grant pentru agricultura',
  max_funding: 600000,
  currency: 'MDL',
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

const nullFieldsGrant: Grant = {
  id: '2',
  name: 'Grant Gol',
  provider_agency: 'Test',
  description: null,
  max_funding: null,
  currency: 'MDL',
  deadline: null,
}

const expiringGrant: Grant = {
  id: '3',
  name: 'Grant Urgent',
  provider_agency: 'ODA',
  description: 'Grant cu termen scurt',
  max_funding: 100000,
  currency: 'MDL',
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

const safeGrant: Grant = {
  id: '4',
  name: 'Grant Sigur',
  provider_agency: 'EU4Moldova',
  description: 'Termen lung',
  max_funding: 500000,
  currency: 'EUR',
  deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
}

// --- Tests ---

describe('GrantCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all fields: name, provider badge, formatted funding, deadline, description, and Aplica CTA', async () => {
    const { GrantCard } = await import('../grant-card')
    render(
      createElement(GrantCard, {
        grant: fullGrant,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('AIPA Agricultura')).toBeInTheDocument()
    expect(screen.getByText('AIPA')).toBeInTheDocument()
    expect(screen.getByText(/600/)).toBeInTheDocument()
    expect(screen.getByText(/MDL/)).toBeInTheDocument()
    expect(screen.getByText('Grant pentru agricultura')).toBeInTheDocument()

    const aplicaLink = screen.getByRole('link', { name: /Aplica/i })
    expect(aplicaLink).toBeInTheDocument()
  })

  it('handles null fields: shows Romanian fallback text', async () => {
    const { GrantCard } = await import('../grant-card')
    render(
      createElement(GrantCard, {
        grant: nullFieldsGrant,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('Fara descriere')).toBeInTheDocument()
    expect(screen.getByText('Suma necunoscuta')).toBeInTheDocument()
    expect(screen.getByText(/Fara termen limita/)).toBeInTheDocument()
  })

  it('shows red "Expira curand" badge when deadline is within 14 days', async () => {
    const { GrantCard } = await import('../grant-card')
    render(
      createElement(GrantCard, {
        grant: expiringGrant,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('Expira curand')).toBeInTheDocument()
  })

  it('does NOT show "Expira curand" badge when deadline is more than 14 days away', async () => {
    const { GrantCard } = await import('../grant-card')
    render(
      createElement(GrantCard, {
        grant: safeGrant,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.queryByText('Expira curand')).not.toBeInTheDocument()
  })

  it('renders "Aplica" as button for unauthenticated user', async () => {
    const { GrantCard } = await import('../grant-card')
    render(
      createElement(GrantCard, {
        grant: fullGrant,
        isAuthenticated: false,
        isSaved: false,
      })
    )

    const button = screen.getByRole('button', { name: /Aplica/i })
    expect(button).toBeInTheDocument()
  })
})
