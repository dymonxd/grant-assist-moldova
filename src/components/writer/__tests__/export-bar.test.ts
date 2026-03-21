// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mock setup ---

const mockTrackEvent = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/app/actions/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

const mockSendApplicationEmail = vi.fn()
const mockSaveReminderOptIn = vi.fn()
vi.mock('@/app/actions/export', () => ({
  sendApplicationEmail: (...args: unknown[]) => mockSendApplicationEmail(...args),
  saveReminderOptIn: (...args: unknown[]) => mockSaveReminderOptIn(...args),
}))

vi.mock('@/components/auth/account-wall-modal', () => ({
  AccountWallModal: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'account-wall-modal' }, 'AccountWallModal') : null,
}))

const defaultProps = {
  grantId: 'grant-123',
  grantName: 'Test Grant',
  providerAgency: 'ODIMM',
  sections: [
    { fieldLabel: 'Descrierea proiectului', finalText: 'Text despre proiect.' },
    { fieldLabel: 'Bugetul', finalText: 'Buget 100.000 MDL.' },
  ],
  isAuthenticated: true,
  requiredDocuments: ['Certificat fiscal', 'Extras IDNO', 'Plan de afaceri'],
  checkedDocuments: new Set([0, 1]) as Set<number>,
}

describe('ExportBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(cleanup)

  it('renders three export buttons', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(React.createElement(ExportBar, defaultProps))

    expect(screen.getByText('Copiaza tot')).toBeDefined()
    expect(screen.getByText('Descarca PDF')).toBeDefined()
    expect(screen.getByText('Trimite pe email')).toBeDefined()
  })

  it('copy button calls navigator.clipboard.writeText with concatenated text', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(React.createElement(ExportBar, defaultProps))

    const copyBtn = screen.getByText('Copiaza tot')
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledOnce()
    })

    const clipboardText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(clipboardText).toContain('Descrierea proiectului')
    expect(clipboardText).toContain('Text despre proiect.')
    expect(clipboardText).toContain('Bugetul')
    expect(clipboardText).toContain('Buget 100.000 MDL.')
  })

  it('trackEvent called on successful copy', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(React.createElement(ExportBar, defaultProps))

    fireEvent.click(screen.getByText('Copiaza tot'))

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventType: 'application_exported',
        eventData: { method: 'clipboard' },
      })
    })
  })

  it('PDF button shows AccountWallModal when not authenticated', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(
      React.createElement(ExportBar, {
        ...defaultProps,
        isAuthenticated: false,
      })
    )

    fireEvent.click(screen.getByText('Descarca PDF'))

    await waitFor(() => {
      expect(screen.getByTestId('account-wall-modal')).toBeDefined()
    })
  })

  it('email button shows AccountWallModal when not authenticated', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(
      React.createElement(ExportBar, {
        ...defaultProps,
        isAuthenticated: false,
      })
    )

    fireEvent.click(screen.getByText('Trimite pe email'))

    await waitFor(() => {
      expect(screen.getByTestId('account-wall-modal')).toBeDefined()
    })
  })

  it('reminder checkbox visible only for authenticated users', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )

    // Authenticated: checkbox visible
    const { unmount } = render(React.createElement(ExportBar, defaultProps))
    expect(screen.getByText(/Notifica-ma cu 7 zile/)).toBeDefined()
    unmount()

    // Not authenticated: checkbox hidden
    render(
      React.createElement(ExportBar, {
        ...defaultProps,
        isAuthenticated: false,
      })
    )
    expect(screen.queryByText(/Notifica-ma cu 7 zile/)).toBeNull()
  })

  it('shows document completion summary', async () => {
    const { ExportBar } = await import(
      '@/app/grants/[grantId]/write/export-bar'
    )
    render(React.createElement(ExportBar, defaultProps))

    expect(screen.getByText('2 din 3 documente pregatite')).toBeDefined()
  })
})
