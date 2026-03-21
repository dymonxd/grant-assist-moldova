/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PrivacyPage from '../page'

describe('Privacy Policy Page', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders with "Politica de Confidentialitate" heading', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { level: 1, name: /Politica de Confidentialitate/i })
    ).toBeInTheDocument()
  })

  it('contains section about data collection ("Datele pe care le colectam")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Datele pe care le colectam/i })
    ).toBeInTheDocument()
  })

  it('contains section about data usage ("Cum folosim datele")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Cum folosim datele/i })
    ).toBeInTheDocument()
  })

  it('contains section about user rights ("Drepturile tale")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Drepturile tale/i })
    ).toBeInTheDocument()
  })

  it('contains section about data sharing ("Partajarea datelor")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Partajarea datelor/i })
    ).toBeInTheDocument()
  })

  it('contains section about storage and security ("Stocarea si securitatea")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Stocarea si securitatea/i })
    ).toBeInTheDocument()
  })

  it('contains section about cookies ("Cookie-uri")', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Cookie-uri/i })
    ).toBeInTheDocument()
  })

  it('contains contact section', () => {
    render(PrivacyPage())

    expect(
      screen.getByRole('heading', { name: /Contact/i })
    ).toBeInTheDocument()
  })
})
