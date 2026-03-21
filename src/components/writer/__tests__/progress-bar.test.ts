// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { ProgressBar } from '../progress-bar'

/**
 * Tests for ProgressBar component (WRITE-09).
 *
 * Verifies: correct text display, bar width percentage, 0/0 edge case.
 */

afterEach(() => {
  cleanup()
})

describe('ProgressBar', () => {
  it('renders correct text "2 din 5 sectiuni completate"', () => {
    render(createElement(ProgressBar, { completedCount: 2, totalCount: 5 }))
    expect(
      screen.getByText('2 din 5 sectiuni completate')
    ).toBeDefined()
  })

  it('shows correct percentage text', () => {
    render(createElement(ProgressBar, { completedCount: 2, totalCount: 5 }))
    expect(screen.getByText('40%')).toBeDefined()
  })

  it('bar width style matches percentage', () => {
    render(createElement(ProgressBar, { completedCount: 3, totalCount: 4 }))
    const progressbar = screen.getByRole('progressbar')
    const fill = progressbar.firstElementChild as HTMLElement
    expect(fill.style.width).toBe('75%')
  })

  it('handles 0/0 gracefully (shows 0%)', () => {
    render(createElement(ProgressBar, { completedCount: 0, totalCount: 0 }))
    expect(
      screen.getByText('0 din 0 sectiuni completate')
    ).toBeDefined()
    expect(screen.getByText('0%')).toBeDefined()

    const progressbar = screen.getByRole('progressbar')
    const fill = progressbar.firstElementChild as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('shows 100% when all sections are complete', () => {
    render(createElement(ProgressBar, { completedCount: 5, totalCount: 5 }))
    expect(screen.getByText('100%')).toBeDefined()

    const progressbar = screen.getByRole('progressbar')
    const fill = progressbar.firstElementChild as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('sets correct aria attributes on progressbar', () => {
    render(createElement(ProgressBar, { completedCount: 1, totalCount: 3 }))
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('33')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100')
  })
})
