/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { HeroCard } from '../hero-card'
import type { GrantWithRules, GrantScore } from '@/lib/matching/types'

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

  it('renders grant name as heading', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    expect(screen.getByText('AIPA Agricultura Ecologica')).toBeInTheDocument()
  })

  it('renders provider_agency in a badge', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    expect(screen.getByText('AIPA')).toBeInTheDocument()
  })

  it('renders ScoreBadge with the correct score percentage', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders AI explanation text from score.explanation', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    expect(
      screen.getByText(
        'Compania dumneavoastra corespunde criteriilor de eligibilitate pentru agricultura ecologica.'
      )
    ).toBeInTheDocument()
  })

  it('renders formatted funding amount and currency', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    // Intl.NumberFormat('ro-MD') formats 750000 as "750.000"
    expect(screen.getByText(/750\.000/)).toBeInTheDocument()
    expect(screen.getByText(/MDL/)).toBeInTheDocument()
  })

  it('renders formatted deadline date', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    // Intl.DateTimeFormat('ro-MD') formats 2026-06-15 as "15 iunie 2026"
    expect(screen.getByText(/15/)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('renders "Aplica acum" link pointing to /grants/{grant.id}', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    const link = screen.getByRole('link', { name: /Aplica acum/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/grants/grant-abc-123')
  })

  it('renders disabled "Salveaza" button', () => {
    render(HeroCard({ grant: mockGrant, score: mockScore }))

    const button = screen.getByRole('button', { name: /Salveaza/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })
})
