import * as cheerio from 'cheerio'
import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeIdnoMd(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // idno.md uses /companii?q={idno} search endpoint (PrimeFaces JSF app)
    const res = await fetch(`https://idno.md/companii?q=${idno}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantAssist/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // Search results rendered as table#companies rows
    // Only use the exact IDNO match — no fuzzy fallback (search returns similar IDNOs)
    const firstRow = $('table#companies tr').filter((_, el) => {
      return $(el).find(`a[href*="companie?idno=${idno}/"]`).length > 0
    }).first()

    if (firstRow.length === 0) {
      return {
        source: 'idno.md',
        status: 'success',
        confidence: 0,
        data: null,
      }
    }

    const cells = firstRow.find('td')
    const rawName = cells.eq(0).find('a').text().trim() || null
    // Strip legal form prefix from name
    const legalPrefixes = [
      /^societatea\s+cu\s+r[aă]spundere\s+limitat[aă]\s+/i,
      /^întreprinderea\s+individual[aă]\s+/i,
      /^societatea\s+pe\s+ac[tț]iuni\s+/i,
      /^gospod[aă]ria\s+[tț][aă]r[aă]neasc[aă]\s+(\(de\s+fermier\)\s+)?/i,
    ]
    let company_name = rawName
    if (company_name) {
      for (const prefix of legalPrefixes) {
        company_name = company_name.replace(prefix, '')
      }
      company_name = company_name.trim()
    }
    const location = cells.eq(2).text().trim() || null
    const foundingYear = cells.eq(3).text().trim() || null

    return {
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: {
        company_name,
        industry: null,
        location,
        legal_form: null,
        status: null,
        registration_date: foundingYear,
        activities: [],
        directors: [],
        founders: [],
      },
    }
  } catch (err) {
    const isTimeout =
      err instanceof DOMException && err.name === 'AbortError'
    return {
      source: 'idno.md',
      status: isTimeout ? 'timeout' : 'error',
      confidence: 0,
      data: null,
      error: String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}
