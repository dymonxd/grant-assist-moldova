import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SourceResult } from '../types'

// Mock scraper modules
vi.mock('../idno-md', () => ({
  scrapeIdnoMd: vi.fn(),
}))
vi.mock('../srl-md', () => ({
  scrapeSrlMd: vi.fn(),
}))
vi.mock('../openmoney-md', () => ({
  scrapeOpenMoney: vi.fn(),
}))

import { scrapeIdnoMd } from '../idno-md'
import { scrapeSrlMd } from '../srl-md'
import { scrapeOpenMoney } from '../openmoney-md'
import { aggregate } from '../aggregate'

const mockIdno = vi.mocked(scrapeIdnoMd)
const mockSrl = vi.mocked(scrapeSrlMd)
const mockOpen = vi.mocked(scrapeOpenMoney)

describe('aggregate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('merges all successful sources using highest-confidence values', async () => {
    mockIdno.mockResolvedValue({
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: 'IT',
        location: 'Chisinau',
        legal_form: 'SRL',
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })
    mockSrl.mockResolvedValue({
      source: 'srl.md',
      status: 'success',
      confidence: 0.8,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: 'Comert',
        location: 'Balti',
        legal_form: 'SRL',
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })
    mockOpen.mockResolvedValue({
      source: 'openmoney.md',
      status: 'success',
      confidence: 0.7,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: null,
        location: 'Chisinau',
        legal_form: null,
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })

    const result = await aggregate('1003600070656')

    // Merged should use highest confidence (idno.md) values
    expect(result.merged).toEqual({
      company_name: 'SC EXAMPLE SRL',
      industry: 'IT',
      location: 'Chisinau',
      legal_form: 'SRL',
      status: null,
      registration_date: null,
      activities: [],
      directors: [],
      founders: [],
    })
    expect(result.isPartial).toBe(false)
    expect(result.allFailed).toBe(false)
    expect(result.sourceStatus).toEqual({
      'idno.md': 'success',
      'srl.md': 'success',
      'openmoney.md': 'success',
    })
  })

  it('handles partial failure (some succeed, some fail)', async () => {
    mockIdno.mockResolvedValue({
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: 'IT',
        location: null,
        legal_form: 'SRL',
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })
    mockSrl.mockResolvedValue({
      source: 'srl.md',
      status: 'error',
      confidence: 0,
      data: null,
      error: 'HTTP 500',
    })
    mockOpen.mockResolvedValue({
      source: 'openmoney.md',
      status: 'timeout',
      confidence: 0,
      data: null,
    })

    const result = await aggregate('1003600070656')

    expect(result.merged.company_name).toBe('SC EXAMPLE SRL')
    expect(result.merged.industry).toBe('IT')
    expect(result.isPartial).toBe(true)
    expect(result.allFailed).toBe(false)
    expect(result.sourceStatus['idno.md']).toBe('success')
    expect(result.sourceStatus['srl.md']).toBe('error')
    expect(result.sourceStatus['openmoney.md']).toBe('timeout')
  })

  it('handles all sources failing', async () => {
    mockIdno.mockResolvedValue({
      source: 'idno.md',
      status: 'error',
      confidence: 0,
      data: null,
      error: 'Network error',
    })
    mockSrl.mockResolvedValue({
      source: 'srl.md',
      status: 'timeout',
      confidence: 0,
      data: null,
    })
    mockOpen.mockResolvedValue({
      source: 'openmoney.md',
      status: 'error',
      confidence: 0,
      data: null,
      error: 'HTTP 503',
    })

    const result = await aggregate('1003600070656')

    expect(result.merged).toEqual({
      company_name: null,
      industry: null,
      location: null,
      legal_form: null,
      status: null,
      registration_date: null,
      activities: [],
      directors: [],
      founders: [],
    })
    expect(result.isPartial).toBe(false)
    expect(result.allFailed).toBe(true)
  })

  it('fills missing fields from lower-confidence source', async () => {
    // idno.md has company_name but NOT industry
    mockIdno.mockResolvedValue({
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: null,
        location: 'Chisinau',
        legal_form: null,
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })
    // srl.md has industry and legal_form
    mockSrl.mockResolvedValue({
      source: 'srl.md',
      status: 'success',
      confidence: 0.8,
      data: {
        company_name: 'SC EXAMPLE',
        industry: 'Agricultura',
        location: null,
        legal_form: 'SRL',
        status: null,
        registration_date: null,
        activities: [],
        directors: [],
        founders: [],
      },
    })
    mockOpen.mockResolvedValue({
      source: 'openmoney.md',
      status: 'error',
      confidence: 0,
      data: null,
    })

    const result = await aggregate('1003600070656')

    // company_name from idno.md (highest confidence)
    expect(result.merged.company_name).toBe('SC EXAMPLE SRL')
    // industry from srl.md (idno.md had null)
    expect(result.merged.industry).toBe('Agricultura')
    // location from idno.md
    expect(result.merged.location).toBe('Chisinau')
    // legal_form from srl.md (idno.md had null)
    expect(result.merged.legal_form).toBe('SRL')
    expect(result.isPartial).toBe(true)
  })

  it('stores raw results keyed by source name', async () => {
    const idnoResult: SourceResult = {
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: { company_name: 'Test', industry: null, location: null, legal_form: null, status: null, registration_date: null, activities: [], directors: [], founders: [] },
    }
    const srlResult: SourceResult = {
      source: 'srl.md',
      status: 'error',
      confidence: 0,
      data: null,
      error: 'fail',
    }
    const openResult: SourceResult = {
      source: 'openmoney.md',
      status: 'timeout',
      confidence: 0,
      data: null,
    }

    mockIdno.mockResolvedValue(idnoResult)
    mockSrl.mockResolvedValue(srlResult)
    mockOpen.mockResolvedValue(openResult)

    const result = await aggregate('1003600070656')

    expect(result.raw['idno.md']).toEqual(idnoResult)
    expect(result.raw['srl.md']).toEqual(srlResult)
    expect(result.raw['openmoney.md']).toEqual(openResult)
  })
})
