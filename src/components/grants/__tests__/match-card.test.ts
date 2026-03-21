/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MatchCard } from '../match-card'
import type { GrantWithRules, GrantScore } from '@/lib/matching/types'

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

  it('renders grant name and score badge', () => {
    render(MatchCard({ grant: mockGrant, score: highScore }))

    expect(screen.getByText('ODA Digitalizare IMM')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('renders "Aplica acum" link and disabled "Salveaza" button', () => {
    render(MatchCard({ grant: mockGrant, score: highScore }))

    const link = screen.getByRole('link', { name: /Aplica acum/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/grants/grant-xyz-456')

    const button = screen.getByRole('button', { name: /Salveaza/i })
    expect(button).toBeDisabled()
  })

  it('renders ImprovementTips when score < 50 and improvement_suggestions exist', () => {
    render(MatchCard({ grant: mockGrant, score: lowScore }))

    expect(screen.getByText('Ce poti imbunatati:')).toBeInTheDocument()
    expect(
      screen.getByText('Obtineti certificarea ISO pentru calitate')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Extindeti echipa tehnica cu minim 3 angajati')
    ).toBeInTheDocument()
  })

  it('does NOT render ImprovementTips when score >= 50', () => {
    render(MatchCard({ grant: mockGrant, score: highScore }))

    expect(screen.queryByText('Ce poti imbunatati:')).not.toBeInTheDocument()
  })
})
