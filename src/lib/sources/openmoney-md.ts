import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeOpenMoney(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // openmoney.md is an Angular SPA with no server-rendered IDNO lookup API.
    // We attempt a search but the site is focused on public contract beneficiaries,
    // not general IDNO lookups. This source provides low-confidence fallback data.
    const res = await fetch(`https://openmoney.md/api/search?q=${idno}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GrantAssist/1.0',
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = await res.json()
      // Try to extract from various possible JSON shapes
      const item = Array.isArray(json) ? json[0] : json
      if (!item) {
        return {
          source: 'openmoney.md',
          status: 'success',
          confidence: 0,
          data: null,
        }
      }

      return {
        source: 'openmoney.md',
        status: 'success',
        confidence: 0.7,
        data: {
          company_name: item.name ?? item.company_name ?? null,
          industry: item.industry ?? null,
          location: item.location ?? item.address ?? null,
          legal_form: item.legal_form ?? null,
          status: null,
          registration_date: null,
          activities: [],
          directors: [],
          founders: [],
        },
      }
    }

    // Angular SPA returned HTML — no usable data available server-side
    return {
      source: 'openmoney.md',
      status: 'success',
      confidence: 0,
      data: null,
    }
  } catch (err) {
    const isTimeout =
      err instanceof DOMException && err.name === 'AbortError'
    return {
      source: 'openmoney.md',
      status: isTimeout ? 'timeout' : 'error',
      confidence: 0,
      data: null,
      error: String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}
