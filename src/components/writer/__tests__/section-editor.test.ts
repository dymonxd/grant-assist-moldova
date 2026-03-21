// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'

/**
 * Tests for SectionEditor component (WRITE-07, WRITE-08).
 *
 * Covers: character count display, character count warnings,
 * button state transitions, wasTruncated warning display.
 */

// Mock the scoring hints component to avoid lucide-react icon issues
vi.mock('@/components/writer/scoring-hints', () => ({
  ScoringHints: () => null,
}))

// We need to import after mocking
const { SectionEditor } = await import(
  '@/app/grants/[grantId]/write/section-editor'
)

const baseSectionIdle = {
  id: 'sec-1',
  grant_field_id: 'field-1',
  user_brief: null,
  ai_draft: null,
  final_text: null,
  is_saved: false,
}

const baseSectionDrafted = {
  id: 'sec-1',
  grant_field_id: 'field-1',
  user_brief: 'Proiect de dezvoltare a afacerii',
  ai_draft: 'Proiectul nostru vizeaza dezvoltarea afacerii prin achizitia de echipament modern.',
  final_text: null,
  is_saved: false,
}

const baseSectionSaved = {
  id: 'sec-1',
  grant_field_id: 'field-1',
  user_brief: 'Proiect de dezvoltare',
  ai_draft: 'Text generat de AI.',
  final_text: 'Text final salvat de utilizator.',
  is_saved: true,
}

const baseField = {
  id: 'field-1',
  field_order: 1,
  field_label: 'Descrierea proiectului',
  field_type: 'text',
  is_required: true,
  character_limit: 500,
  helper_text: 'Descrieti proiectul pe scurt',
}

const fieldNoLimit = {
  ...baseField,
  character_limit: null,
}

const mockOnSave = vi.fn().mockResolvedValue({ wasTruncated: false })
const mockOnSaveTruncated = vi.fn().mockResolvedValue({ wasTruncated: true })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SectionEditor - Character count (WRITE-07)', () => {
  it('shows "X / Y caractere" when field has character_limit and section is drafted', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionDrafted,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const charCount = screen.getByTestId('char-count')
    expect(charCount.textContent).toContain('/ 500 caractere')
  })

  it('does not show character count when field has no character_limit', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionDrafted,
        field: fieldNoLimit,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    expect(screen.queryByTestId('char-count')).toBeNull()
  })

  it('shows yellow warning at >90% of character limit', () => {
    // Create section with text that is ~95% of 500 chars = 475 chars
    const longText = 'A'.repeat(460)
    const section = {
      ...baseSectionDrafted,
      ai_draft: longText,
    }

    render(
      createElement(SectionEditor, {
        section,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const charCount = screen.getByTestId('char-count')
    const span = charCount.querySelector('span')!
    expect(span.className).toContain('text-amber-600')
  })

  it('shows red warning at 100% of character limit', () => {
    const exactText = 'A'.repeat(500)
    const section = {
      ...baseSectionDrafted,
      ai_draft: exactText,
    }

    render(
      createElement(SectionEditor, {
        section,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const charCount = screen.getByTestId('char-count')
    const span = charCount.querySelector('span')!
    expect(span.className).toContain('text-destructive')
  })

  it('shows truncation warning when save returns wasTruncated=true', async () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionDrafted,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSaveTruncated,
      })
    )

    // Click save on the drafted section
    const saveBtn = screen.getByTestId('save-btn')
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    await waitFor(() => {
      const warning = screen.getByTestId('truncation-warning')
      expect(warning.textContent).toContain('Textul a fost trunchiat la limita de 500 caractere')
    })
  })
})

describe('SectionEditor - Button states (WRITE-08)', () => {
  it('idle state: shows "Genereaza cu AI" disabled without input', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionIdle,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const btn = screen.getByTestId('generate-btn')
    expect(btn.textContent).toContain('Genereaza cu AI')
    expect(btn.getAttribute('disabled')).not.toBeNull()
  })

  it('idle state: "Genereaza cu AI" enabled with input', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionIdle,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const textarea = screen.getByPlaceholderText('Descrieti pe scurt raspunsul dvs...')
    fireEvent.change(textarea, { target: { value: 'Un proiect de dezvoltare important' } })

    const btn = screen.getByTestId('generate-btn')
    expect(btn.getAttribute('disabled')).toBeNull()
  })

  it('drafted state: shows "Editeaza", "Regenereaza", "Salveaza", and "Urmatoarea sectiune"', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionDrafted,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
        onNextSection: () => {},
      })
    )

    expect(screen.getByText('Editeaza')).toBeDefined()
    expect(screen.getByText('Regenereaza')).toBeDefined()
    expect(screen.getByText('Salveaza')).toBeDefined()
    expect(screen.getByText('Urmatoarea sectiune')).toBeDefined()
  })

  it('saved state: shows check icon and "Editeaza" button', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionSaved,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    expect(screen.getByTestId('saved-check')).toBeDefined()
    expect(screen.getByText('Editeaza')).toBeDefined()
    // Should NOT show Regenereaza or Salveaza in saved state
    expect(screen.queryByText('Regenereaza')).toBeNull()
    expect(screen.queryByText('Salveaza')).toBeNull()
  })

  it('clicking "Editeaza" in drafted state switches to editing with editable textarea', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionDrafted,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    fireEvent.click(screen.getByText('Editeaza'))

    // Should show editable textarea
    const textarea = screen.getByTestId('edit-textarea')
    expect(textarea).toBeDefined()
    // Should show Salveaza button
    expect(screen.getByText('Salveaza')).toBeDefined()
  })

  it('short brief shows clarifying question hint (WRITE-04)', () => {
    render(
      createElement(SectionEditor, {
        section: baseSectionIdle,
        field: baseField,
        scoringRubric: null,
        companyProfile: {},
        onSave: mockOnSave,
      })
    )

    const textarea = screen.getByPlaceholderText('Descrieti pe scurt raspunsul dvs...')
    fireEvent.change(textarea, { target: { value: 'scurt' } })

    expect(
      screen.getByText(/AI-ul va pune o intrebare de clarificare/)
    ).toBeDefined()
  })
})
