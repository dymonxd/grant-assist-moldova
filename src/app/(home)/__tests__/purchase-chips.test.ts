/**
 * @vitest-environment jsdom
 */
import { createElement } from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock server action before importing component
vi.mock('@/app/actions/purchase', () => ({
  savePurchaseNeed: vi.fn().mockResolvedValue({ success: true }),
}))

// Import after mock setup
import { PurchaseChips } from '../purchase-chips'

function renderChips() {
  return render(createElement(PurchaseChips, { onSaved: vi.fn() }))
}

describe('PurchaseChips', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders 4 chips initially', () => {
    renderChips()

    // First 4 chips should be visible
    expect(screen.getByText('Echipament si utilaje')).toBeInTheDocument()
    expect(screen.getByText('Software si digitalizare')).toBeInTheDocument()
    expect(screen.getByText('Instruirea personalului')).toBeInTheDocument()
    expect(screen.getByText('Materii prime')).toBeInTheDocument()

    // Remaining 4 should NOT be visible
    expect(screen.queryByText('Renovare spatii')).not.toBeInTheDocument()
    expect(screen.queryByText('Transport si logistica')).not.toBeInTheDocument()
    expect(screen.queryByText('Marketing si promovare')).not.toBeInTheDocument()
    expect(screen.queryByText('Consultanta')).not.toBeInTheDocument()

    // "Mai multe..." button should be visible
    expect(screen.getByText('Mai multe...')).toBeInTheDocument()
  })

  it('expands to show all 8 chips on Mai multe click', () => {
    renderChips()

    fireEvent.click(screen.getByText('Mai multe...'))

    // All 8 chips should now be visible
    expect(screen.getByText('Echipament si utilaje')).toBeInTheDocument()
    expect(screen.getByText('Software si digitalizare')).toBeInTheDocument()
    expect(screen.getByText('Instruirea personalului')).toBeInTheDocument()
    expect(screen.getByText('Materii prime')).toBeInTheDocument()
    expect(screen.getByText('Renovare spatii')).toBeInTheDocument()
    expect(screen.getByText('Transport si logistica')).toBeInTheDocument()
    expect(screen.getByText('Marketing si promovare')).toBeInTheDocument()
    expect(screen.getByText('Consultanta')).toBeInTheDocument()

    // "Mai multe..." should be gone
    expect(screen.queryByText('Mai multe...')).not.toBeInTheDocument()
  })

  it('clicking chip pre-fills textarea', () => {
    renderChips()

    fireEvent.click(screen.getByText('Echipament si utilaje'))

    const textarea = screen.getByPlaceholderText(
      'Descrie ce doresti sa achizitionezi...'
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe('Echipament si utilaje')
  })

  it('clicking different chip replaces textarea value', () => {
    renderChips()

    fireEvent.click(screen.getByText('Echipament si utilaje'))
    fireEvent.click(screen.getByText('Software si digitalizare'))

    const textarea = screen.getByPlaceholderText(
      'Descrie ce doresti sa achizitionezi...'
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe('Software si digitalizare')
  })

  it('textarea accepts custom text', () => {
    renderChips()

    const textarea = screen.getByPlaceholderText(
      'Descrie ce doresti sa achizitionezi...'
    ) as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: 'Custom need' } })
    expect(textarea.value).toBe('Custom need')
  })
})
