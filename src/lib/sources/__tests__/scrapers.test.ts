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
          <h1 class="company-name">SC EXAMPLE SRL</h1>
          <span class="industry-field">IT si Comunicatii</span>
          <span class="location-field">Chisinau</span>
          <span class="legal-form-field">SRL</span>
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
        industry: 'IT si Comunicatii',
        location: 'Chisinau',
        legal_form: 'SRL',
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

  it('returns null for fields with missing selectors', async () => {
    const html = `<html><body><h1 class="company-name">SC EXAMPLE SRL</h1></body></html>`
    mockFetch.mockResolvedValueOnce(mockHtmlResponse(html))

    const { scrapeIdnoMd } = await import('../idno-md')
    const result = await scrapeIdnoMd('1003600070656')

    expect(result.status).toBe('success')
    expect(result.data!.company_name).toBe('SC EXAMPLE SRL')
    expect(result.data!.industry).toBeNull()
    expect(result.data!.location).toBeNull()
    expect(result.data!.legal_form).toBeNull()
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
          <h2 class="company-title">SC EXAMPLE SRL</h2>
          <div class="company-industry">Comert</div>
          <div class="company-location">Balti</div>
          <div class="company-legal-form">SRL</div>
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
