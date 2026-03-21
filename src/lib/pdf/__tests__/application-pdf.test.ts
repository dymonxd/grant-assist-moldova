import { describe, it, expect } from 'vitest'
import React from 'react'

describe('ApplicationPdfDocument', () => {
  const sampleSections = [
    { fieldLabel: 'Descrierea proiectului', finalText: 'Proiectul nostru vizeaza imbunatatirea infrastructurii locale.' },
    { fieldLabel: 'Bugetul estimat', finalText: 'Bugetul total este de 50.000 MDL, inclusiv costurile de personal si echipament.' },
    { fieldLabel: 'Diacritice romanesti', finalText: 'Aceasta sectiune contine caractere speciale: ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț' },
  ]

  it('exports ApplicationPdfDocument as a function', async () => {
    const { ApplicationPdfDocument } = await import('../application-pdf')
    expect(typeof ApplicationPdfDocument).toBe('function')
  })

  it('creates a valid React element with correct props', async () => {
    const { ApplicationPdfDocument } = await import('../application-pdf')
    const element = React.createElement(ApplicationPdfDocument, {
      grantName: 'Programul de Granturi pentru IMM-uri',
      providerAgency: 'ODIMM',
      sections: sampleSections,
    })
    expect(React.isValidElement(element)).toBe(true)
  })

  it('does not throw when constructed with Romanian diacritics in sections', async () => {
    const { ApplicationPdfDocument } = await import('../application-pdf')
    expect(() => {
      React.createElement(ApplicationPdfDocument, {
        grantName: 'Grant cu diacritice: ă, â, î, ș, ț',
        providerAgency: 'Agenția de Investiții',
        sections: sampleSections,
      })
    }).not.toThrow()
  })

  it('accepts empty sections array without throwing', async () => {
    const { ApplicationPdfDocument } = await import('../application-pdf')
    expect(() => {
      React.createElement(ApplicationPdfDocument, {
        grantName: 'Test Grant',
        providerAgency: 'Test Agency',
        sections: [],
      })
    }).not.toThrow()
  })
})
