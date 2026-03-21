/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ProfileSidebar } from '../profile-sidebar'

// --- Fixtures ---

const mockProfile: Record<string, unknown> = {
  company_name: 'TechMold SRL',
  industry: 'Tehnologii informationale',
  location: 'Chisinau',
  legal_form: 'SRL',
  purchase_need: 'Software si digitalizare',
}

const minimalProfile: Record<string, unknown> = {
  company_name: 'Agro Plus',
  industry: 'Agricultura',
  location: 'Balti',
  legal_form: 'II',
}

// --- Tests ---

describe('ProfileSidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders "Profilul companiei" as card title', () => {
    render(ProfileSidebar({ profile: mockProfile }))

    expect(screen.getByText('Profilul companiei')).toBeInTheDocument()
  })

  it('renders company_name, industry, location, legal_form field rows', () => {
    render(ProfileSidebar({ profile: mockProfile }))

    expect(screen.getByText('TechMold SRL')).toBeInTheDocument()
    expect(screen.getByText('Tehnologii informationale')).toBeInTheDocument()
    expect(screen.getByText('Chisinau')).toBeInTheDocument()
    expect(screen.getByText('SRL')).toBeInTheDocument()
  })

  it('renders purchase_need when present in profile', () => {
    render(ProfileSidebar({ profile: mockProfile }))

    expect(
      screen.getByText('Software si digitalizare')
    ).toBeInTheDocument()
  })

  it('renders "Editeaza profilul" link pointing to /', () => {
    render(ProfileSidebar({ profile: mockProfile }))

    const link = screen.getByRole('link', { name: /Editeaza profilul/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
