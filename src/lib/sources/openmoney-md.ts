import type { SourceResult, CompanyFields } from './types'

const TIMEOUT_MS = 8000

export async function scrapeOpenMoney(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`https://openmoney.md/api/search?q=${idno}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GrantAssist/1.0',
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = res.headers.get('content-type') || ''

    let data: CompanyFields

    if (contentType.includes('application/json')) {
      // Angular SPA backend likely returns JSON
      const json = await res.json()
      data = {
        company_name: json.company_name ?? null,
        industry: json.industry ?? null,
        location: json.location ?? null,
        legal_form: json.legal_form ?? null,
      }
    } else {
      // Fallback: parse HTML with Cheerio
      const cheerio = await import('cheerio')
      const html = await res.text()
      const $ = cheerio.load(html)

      data = {
        company_name: $('.company-name').text().trim() || null,
        industry: $('.industry').text().trim() || null,
        location: $('.location').text().trim() || null,
        legal_form: $('.legal-form').text().trim() || null,
      }
    }

    return {
      source: 'openmoney.md',
      status: 'success',
      confidence: 0.7,
      data,
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
