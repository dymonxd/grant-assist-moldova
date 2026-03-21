import * as cheerio from 'cheerio'
import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeIdnoMd(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`https://idno.md/${idno}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantAssist/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // Extract fields from HTML (selectors are best-guess, need live-testing refinement)
    const company_name = $('h1.company-name').text().trim() || null
    const industry = $('.industry-field').text().trim() || null
    const location = $('.location-field').text().trim() || null
    const legal_form = $('.legal-form-field').text().trim() || null

    return {
      source: 'idno.md',
      status: 'success',
      confidence: 0.9,
      data: { company_name, industry, location, legal_form },
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
