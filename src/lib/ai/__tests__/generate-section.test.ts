import { describe, it, expect } from 'vitest'
import { buildSectionPrompt, buildSystemPrompt } from '../generate-section'

// --- Test data ---

const testField = {
  field_label: 'Descrierea proiectului',
  helper_text: 'Descrieti scopul si obiectivele proiectului propus',
  character_limit: 2000,
}

const testFieldNoLimit = {
  field_label: 'Motivatia',
  helper_text: 'De ce aplicati pentru acest grant',
  character_limit: null,
}

const testRubric = {
  criteria: [
    { name: 'Inovatie', weight: 30, description: 'Gradul de inovatie al proiectului' },
    { name: 'Impact', weight: 40, description: 'Impactul economic si social' },
    { name: 'Sustenabilitate', weight: 30, description: 'Capacitatea de a continua dupa finantare' },
  ],
}

const testProfile = {
  company_name: 'TechMold SRL',
  industry: 'IT',
  location: 'Chisinau',
  legal_form: 'SRL',
  purchase_need: 'Echipament IT',
  enriched_data: {
    sources: { raw: '<html>big scraper data</html>' },
    merged: { activities: ['Dezvoltare software', 'Consultanta IT'], company_size: 'micro' },
  },
}

// --- Tests ---

describe('buildSectionPrompt', () => {
  it('includes field_label, helper_text, and character_limit in prompt', () => {
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, 'Proiectul nostru vizeaza digitalizarea proceselor de productie')

    expect(prompt).toContain('Descrierea proiectului')
    expect(prompt).toContain('Descrieti scopul si obiectivele proiectului propus')
    expect(prompt).toContain('2000')
  })

  it('omits character limit line when character_limit is null', () => {
    const prompt = buildSectionPrompt(testFieldNoLimit, testRubric, testProfile, 'Dorim sa imbunatatim procesele')

    expect(prompt).toContain('Motivatia')
    expect(prompt).not.toContain('Limita de caractere')
  })

  it('includes rubric criteria formatted with name, weight, and description', () => {
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, 'Proiectul nostru este inovator')

    expect(prompt).toContain('Inovatie')
    expect(prompt).toContain('30%')
    expect(prompt).toContain('Gradul de inovatie al proiectului')
    expect(prompt).toContain('Impact')
    expect(prompt).toContain('40%')
    expect(prompt).toContain('Sustenabilitate')
  })

  it('includes lean company profile data (company_name, industry, location)', () => {
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, 'Descriere lunga a proiectului nostru de digitalizare')

    expect(prompt).toContain('TechMold SRL')
    expect(prompt).toContain('IT')
    expect(prompt).toContain('Chisinau')
  })

  it('strips raw scraper HTML from enriched_data (uses lean profile)', () => {
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, 'Descriere lunga a proiectului nostru de digitalizare')

    expect(prompt).not.toContain('<html>')
    expect(prompt).not.toContain('big scraper data')
  })

  it('includes enriched activities and company_size from merged data', () => {
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, 'Descriere lunga a proiectului nostru de digitalizare')

    expect(prompt).toContain('Dezvoltare software')
    expect(prompt).toContain('micro')
  })

  it('includes the user brief in the prompt', () => {
    const brief = 'Proiectul nostru vizeaza digitalizarea proceselor de productie in sectorul agricol'
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, brief)

    expect(prompt).toContain(brief)
  })

  it('triggers clarifying question instruction when userBrief is under 20 chars', () => {
    const shortBrief = 'echipament IT'
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, shortBrief)

    expect(prompt).toContain('intrebare de clarificare')
    expect(prompt).toContain(shortBrief)
  })

  it('does NOT trigger clarifying question when userBrief is 20+ chars', () => {
    const longBrief = 'Proiectul nostru vizeaza modernizarea echipamentelor'
    const prompt = buildSectionPrompt(testField, testRubric, testProfile, longBrief)

    expect(prompt).not.toContain('intrebare de clarificare')
  })

  it('handles empty rubric criteria array', () => {
    const emptyRubric = { criteria: [] }
    const prompt = buildSectionPrompt(testField, emptyRubric, testProfile, 'Descriere proiect de digitalizare')

    expect(prompt).toContain('Descrierea proiectului')
    // Should still work without criteria
    expect(prompt).toBeDefined()
  })

  it('handles null rubric gracefully', () => {
    const prompt = buildSectionPrompt(testField, null as unknown as typeof testRubric, testProfile, 'Descriere proiect de digitalizare')

    expect(prompt).toContain('Descrierea proiectului')
  })
})

describe('buildSystemPrompt', () => {
  it('returns a Romanian system prompt', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('romana')
  })

  it('instructs rubric-optimized grant writing', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('rubric')
  })

  it('mentions Moldova context', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('Moldova')
  })

  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt()

    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(50)
  })
})
