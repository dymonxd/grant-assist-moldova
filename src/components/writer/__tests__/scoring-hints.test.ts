// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { ScoringHints } from '../scoring-hints'

/**
 * Tests for ScoringHints component (WRITE-06).
 *
 * Verifies: collapsed by default, expands on click, shows all criteria,
 * renders nothing when criteria is null.
 */

afterEach(() => {
  cleanup()
})

const mockCriteria = [
  { name: 'Relevanta', weight: 30, description: 'Cat de relevant este proiectul' },
  { name: 'Fezabilitate', weight: 40, description: 'Capacitatea de implementare' },
  { name: 'Buget', weight: 30, description: 'Realismul bugetului propus' },
]

describe('ScoringHints', () => {
  it('renders nothing when criteria is null', () => {
    const { container } = render(
      createElement(ScoringHints, { criteria: null })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when criteria is empty array', () => {
    const { container } = render(
      createElement(ScoringHints, { criteria: [] })
    )
    expect(container.innerHTML).toBe('')
  })

  it('is collapsed by default (shows header, hides criteria)', () => {
    render(createElement(ScoringHints, { criteria: mockCriteria }))

    expect(screen.getByText('Criterii de evaluare')).toBeDefined()

    // Criteria text should not be visible when collapsed
    expect(screen.queryByText(/Cat de relevant/)).toBeNull()
    expect(screen.queryByText(/Capacitatea de implementare/)).toBeNull()
  })

  it('has aria-expanded=false when collapsed', () => {
    render(createElement(ScoringHints, { criteria: mockCriteria }))
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('expands on click showing all criteria', () => {
    render(createElement(ScoringHints, { criteria: mockCriteria }))

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(button.getAttribute('aria-expanded')).toBe('true')

    // All criteria should be visible
    expect(screen.getByText(/Cat de relevant/)).toBeDefined()
    expect(screen.getByText(/Capacitatea de implementare/)).toBeDefined()
    expect(screen.getByText(/Realismul bugetului/)).toBeDefined()
  })

  it('shows criterion name, weight, and description when expanded', () => {
    render(createElement(ScoringHints, { criteria: mockCriteria }))
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Relevanta')).toBeDefined()
    expect(screen.getByText('Fezabilitate')).toBeDefined()
    expect(screen.getByText(/40%/)).toBeDefined()
    // Both Relevanta and Buget have 30% weight so use getAllByText
    const thirtyPercent = screen.getAllByText(/30%/)
    expect(thirtyPercent.length).toBe(2)
  })

  it('collapses again on second click', () => {
    render(createElement(ScoringHints, { criteria: mockCriteria }))

    const button = screen.getByRole('button')
    fireEvent.click(button) // expand
    fireEvent.click(button) // collapse

    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/Cat de relevant/)).toBeNull()
  })
})
