/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import type { GrantWithRules, GrantScore } from '@/lib/matching/types'

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

// --- Fixtures ---

const mockGrant: GrantWithRules = {
  id: 'grant-abc-123',
  name: 'AIPA Agricultura Ecologica',
  provider_agency: 'AIPA',
  description: 'Grant pentru agricultura ecologica',
  max_funding: 750000,
  currency: 'MDL',
  deadline: '2026-06-15T00:00:00Z',
  eligibility_rules: null,
  scoring_rubric: null,
}

const mockScore: GrantScore = {
  grant_id: 'grant-abc-123',
  score: 87,
  explanation:
    'Compania dumneavoastra corespunde criteriilor de eligibilitate pentru agricultura ecologica.',
  improvement_suggestions: [],
}

// --- Tests ---

describe('HeroCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders grant name as heading', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('AIPA Agricultura Ecologica')).toBeInTheDocument()
  })

  it('renders provider_agency in a badge', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('AIPA')).toBeInTheDocument()
  })

  it('renders ScoreBadge with the correct score percentage', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders AI explanation text from score.explanation', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(
      screen.getByText(
        'Compania dumneavoastra corespunde criteriilor de eligibilitate pentru agricultura ecologica.'
      )
    ).toBeInTheDocument()
  })

  it('renders formatted funding amount and currency', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText(/750\.000/)).toBeInTheDocument()
    expect(screen.getByText(/MDL/)).toBeInTheDocument()
  })

  it('renders formatted deadline date', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText(/15/)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('renders "Aplica acum" as a link when authenticated', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    const link = screen.getByRole('link', { name: /Aplica acum/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/grants/grant-abc-123/write')
  })

  it('renders "Aplica acum" as a button when not authenticated', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: false,
        isSaved: false,
      })
    )

    const button = screen.getByRole('button', { name: /Aplica acum/i })
    expect(button).toBeInTheDocument()
  })

  it('renders "Salveaza" button (enabled) for authenticated user', async () => {
    const { HeroCard } = await import('../hero-card')
    render(
      createElement(HeroCard, {
        grant: mockGrant,
        score: mockScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    const button = screen.getByRole('button', { name: /Salveaza/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })
})
