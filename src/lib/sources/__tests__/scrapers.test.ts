import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SourceResult } from '../types'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create mock HTML responses
function mockHtmlResponse(html: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(html),
    json: () => Promise.resolve({}),
    headers: new Headers(),
  } as unknown as Response
}

describe('scrapeIdnoMd', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns success with parsed company data from HTML', async () => {
    const html = `
      <html>
        <body>
          <table id="companies">
            <tr><td>Denumirea</td><td>Conducatori</td><td>Localitatea</td><td>Anul</td></tr>
            <tr>
              <td><a href="companie?idno=1003600070656/example">SC EXAMPLE SRL</a></td>
              <td>Fondatori</td>
              <td>Chisinau</td>
              <td>2020</td>
            </tr>
          </table>
        </body>
      </html>
    `
    mockFetch.mockResolvedValueOnce(mockHtmlResponse(html))

    const { scrapeIdnoMd } = await import('../idno-md')
    const result = await scrapeIdnoMd('1003600070656')

    expect(result).toEqual<SourceResult>({
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: null,
        location: 'Chisinau',
        legal_form: null,
        status: null,
        registration_date: '2020',
        activities: [],
        directors: [],
        founders: [],
      },
    })
  })

  it('returns timeout status on AbortError', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new DOMException('The operation was aborted', 'AbortError'))
    )

    const { scrapeIdnoMd } = await import('../idno-md')
    const result = await scrapeIdnoMd('1003600070656')

    expect(result.source).toBe('idno.md')
    expect(result.status).toBe('timeout')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })

  it('returns error status on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(mockHtmlResponse('', 500))

    const { scrapeIdnoMd } = await import('../idno-md')
    const result = await scrapeIdnoMd('1003600070656')

    expect(result.source).toBe('idno.md')
    expect(result.status).toBe('error')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
    expect(result.error).toBeDefined()
  })

  it('returns null data when no matching table row found', async () => {
    const html = `<html><body><table><tr><td>No results</td></tr></table></body></html>`
    mockFetch.mockResolvedValueOnce(mockHtmlResponse(html))

    const { scrapeIdnoMd } = await import('../idno-md')
    const result = await scrapeIdnoMd('1003600070656')

    expect(result.status).toBe('success')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })
})

describe('scrapeSrlMd', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns success with parsed company data', async () => {
    const html = `
      <html>
        <body>
          <div class="entity-info"><p class="entity-info-label">Denumire</p><h1 class="entity-info-title">SC EXAMPLE SRL</h1></div>
          <div class="entity-info"><p class="entity-info-label">Adresa</p><p class="entity-info-value">Balti</p></div>
          <div class="entity-info"><p class="entity-info-label">Forma organizatorico-juridica</p><p class="entity-info-value">SRL</p></div>
          <div class="entity-info"><p class="entity-info-label">Statut</p><p class="entity-info-value"><span class="label label-success">Activa</span></p></div>
          <div class="entity-info"><p class="entity-info-label">Data înregistrării</p><p class="entity-info-value">01.01.2020</p></div>
          <div class="entity-info"><p class="entity-info-label">Conducători</p><a class="entity-info-name" href="/person/test">Ion Popescu</a></div>
          <div class="entity-info"><p class="entity-info-label">Fondatori</p><a class="entity-info-name" href="/person/test2">Maria Ionescu</a></div>
          <div class="entity-info"><p class="entity-info-label">Genuri de activitate nelicențiate</p><ul class="list-group"><li class="list-group-item">Comert</li><li class="list-group-item">Transport</li></ul></div>
        </body>
      </html>
    `
    mockFetch.mockResolvedValueOnce(mockHtmlResponse(html))

    const { scrapeSrlMd } = await import('../srl-md')
    const result = await scrapeSrlMd('1003600070656')

    expect(result).toEqual<SourceResult>({
      source: 'srl.md',
      status: 'success',
      confidence: 0.8,
      data: {
        company_name: 'SC EXAMPLE SRL',
        industry: 'Comert',
        location: 'Balti',
        legal_form: 'SRL',
        status: 'Activa',
        registration_date: '01.01.2020',
        activities: ['Comert', 'Transport'],
        directors: ['Ion Popescu'],
        founders: ['Maria Ionescu'],
      },
    })
  })

  it('returns timeout status on AbortError', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new DOMException('The operation was aborted', 'AbortError'))
    )

    const { scrapeSrlMd } = await import('../srl-md')
    const result = await scrapeSrlMd('1003600070656')

    expect(result.source).toBe('srl.md')
    expect(result.status).toBe('timeout')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })

  it('returns error status on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(mockHtmlResponse('', 404))

    const { scrapeSrlMd } = await import('../srl-md')
    const result = await scrapeSrlMd('1003600070656')

    expect(result.source).toBe('srl.md')
    expect(result.status).toBe('error')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })
})

describe('scrapeOpenMoney', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns success with parsed JSON data', async () => {
    const json = {
      company_name: 'SC EXAMPLE SRL',
      industry: null,
      location: 'Chisinau',
      legal_form: null,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(json),
      text: () => Promise.resolve(JSON.stringify(json)),
    } as unknown as Response)

    const { scrapeOpenMoney } = await import('../openmoney-md')
    const result = await scrapeOpenMoney('1003600070656')

    expect(result).toEqual<SourceResult>({
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
  })

  it('returns timeout status on AbortError', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new DOMException('The operation was aborted', 'AbortError'))
    )

    const { scrapeOpenMoney } = await import('../openmoney-md')
    const result = await scrapeOpenMoney('1003600070656')

    expect(result.source).toBe('openmoney.md')
    expect(result.status).toBe('timeout')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })

  it('returns error status on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(mockHtmlResponse('', 503))

    const { scrapeOpenMoney } = await import('../openmoney-md')
    const result = await scrapeOpenMoney('1003600070656')

    expect(result.source).toBe('openmoney.md')
    expect(result.status).toBe('error')
    expect(result.confidence).toBe(0)
    expect(result.data).toBeNull()
  })
})
