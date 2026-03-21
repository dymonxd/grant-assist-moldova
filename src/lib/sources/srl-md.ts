import * as cheerio from 'cheerio'
import type { SourceResult } from './types'

const TIMEOUT_MS = 8000

export async function scrapeSrlMd(idno: string): Promise<SourceResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // srl.md uses /search?query={idno} — auto-redirects to company detail page
    const res = await fetch(`https://srl.md/search?query=${idno}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrantAssist/1.0' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // Detail page uses structured divs: entity-info-label + entity-info-value pairs
    function getField(label: string): string | null {
      const infoBlock = $('.entity-info').filter((_, el) => {
        return $(el).find('.entity-info-label').text().trim().toLowerCase().includes(label.toLowerCase())
      }).first()
      return infoBlock.find('.entity-info-value').text().trim() || null
    }

    // Extract list items from a labeled section (activities, etc.)
    function getListItems(label: string): string[] {
      const infoBlock = $('.entity-info').filter((_, el) => {
        return $(el).find('.entity-info-label').text().trim().toLowerCase().includes(label.toLowerCase())
      }).first()
      const items: string[] = []
      infoBlock.find('.list-group-item').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !text.toLowerCase().includes('nu are')) {
          items.push(text)
        }
      })
      return items
    }

    // Extract person names from links
    function getPersonNames(label: string): string[] {
      const infoBlock = $('.entity-info').filter((_, el) => {
        return $(el).find('.entity-info-label').text().trim().toLowerCase().includes(label.toLowerCase())
      }).first()
      const names: string[] = []
      infoBlock.find('.entity-info-name').each((_, el) => {
        const name = $(el).text().trim()
        if (name) names.push(name)
      })
      return names
    }

    // Strip legal form prefix from company name (e.g. "Societatea Cu Răspundere Limitată X" → "X")
    const rawName = $('h1.entity-info-title').first().text().trim() || null
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
    const location = getField('adresa')
    const legal_form = getField('forma organizatorico')
    const status = getField('statut')
    const registration_date = getField('data înregistr')
    const activities = getListItems('activitate nelicen')
    const directors = getPersonNames('conducăt')
    const founders = getPersonNames('fondator')

    // Use first activity as industry
    const industry = activities.length > 0 ? activities[0] : null

    if (!company_name) {
      return {
        source: 'srl.md',
        status: 'success',
        confidence: 0,
        data: null,
      }
    }

    return {
      source: 'srl.md',
      status: 'success',
      confidence: 0.8,
      data: {
        company_name,
        industry,
        location,
        legal_form,
        status,
        registration_date,
        activities,
        directors,
        founders,
      },
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
