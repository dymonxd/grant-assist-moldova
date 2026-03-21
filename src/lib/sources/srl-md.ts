import * as cheerio from 'cheerio'
import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeSrlMd(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`https://srl.md/search?q=${idno}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantAssist/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // Extract fields from HTML (selectors are best-guess, need live-testing refinement)
    const company_name = $('h2.company-title').text().trim() || null
    const industry = $('.company-industry').text().trim() || null
    const location = $('.company-location').text().trim() || null
    const legal_form = $('.company-legal-form').text().trim() || null

    return {
      source: 'srl.md',
      status: 'success',
      confidence: 0.8,
      data: { company_name, industry, location, legal_form },
    }
  } catch (err) {
    const isTimeout =
      err instanceof DOMException && err.name === 'AbortError'
    return {
      source: 'srl.md',
      status: isTimeout ? 'timeout' : 'error',
      confidence: 0,
      data: null,
      error: String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}
