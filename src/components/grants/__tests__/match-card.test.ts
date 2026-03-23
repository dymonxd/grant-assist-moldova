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
  id: 'grant-xyz-456',
  name: 'ODA Digitalizare IMM',
  provider_agency: 'ODA',
  description: 'Grant pentru digitalizare',
  max_funding: 200000,
  currency: 'MDL',
  deadline: '2026-09-01T00:00:00Z',
  eligibility_rules: null,
  scoring_rubric: null,
}

const highScore: GrantScore = {
  grant_id: 'grant-xyz-456',
  score: 72,
  explanation: 'Compania are un profil bun pentru digitalizare.',
}

const lowScore: GrantScore = {
  grant_id: 'grant-xyz-456',
  score: 38,
  explanation: 'Compania nu corespunde tuturor criteriilor.',
  improvement_suggestions: [
    'Obtineti certificarea ISO pentru calitate',
    'Extindeti echipa tehnica cu minim 3 angajati',
  ],
}

// --- Tests ---

describe('MatchCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders grant name and score badge', async () => {
    const { MatchCard } = await import('../match-card')
    render(
      createElement(MatchCard, {
        grant: mockGrant,
        score: highScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('ODA Digitalizare IMM')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('renders "Aplica acum" link for authenticated user', async () => {
    const { MatchCard } = await import('../match-card')
    render(
      createElement(MatchCard, {
        grant: mockGrant,
        score: highScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    const link = screen.getByRole('link', { name: /Aplica acum/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/grants/grant-xyz-456/write')

    const button = screen.getByRole('button', { name: /Salveaza/i })
    expect(button).not.toBeDisabled()
  })

  it('renders "Aplica acum" button for unauthenticated user', async () => {
    const { MatchCard } = await import('../match-card')
    render(
      createElement(MatchCard, {
        grant: mockGrant,
        score: highScore,
        isAuthenticated: false,
        isSaved: false,
      })
    )

    const button = screen.getByRole('button', { name: /Aplica acum/i })
    expect(button).toBeInTheDocument()
  })

  it('renders ImprovementTips when score < 50 and improvement_suggestions exist', async () => {
    const { MatchCard } = await import('../match-card')
    render(
      createElement(MatchCard, {
        grant: mockGrant,
        score: lowScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.getByText('Ce poti imbunatati:')).toBeInTheDocument()
    expect(
      screen.getByText('Obtineti certificarea ISO pentru calitate')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Extindeti echipa tehnica cu minim 3 angajati')
    ).toBeInTheDocument()
  })

  it('does NOT render ImprovementTips when score >= 50', async () => {
    const { MatchCard } = await import('../match-card')
    render(
      createElement(MatchCard, {
        grant: mockGrant,
        score: highScore,
        isAuthenticated: true,
        isSaved: false,
      })
    )

    expect(screen.queryByText('Ce poti imbunatati:')).not.toBeInTheDocument()
  })
})
