import type { SourceResult, AggregateResult, CompanyFields } from './types'
import { scrapeIdnoMd } from './idno-md'
import { scrapeSrlMd } from './srl-md'
import { scrapeOpenMoney } from './openmoney-md'

function mergeFields(results: SourceResult[]): CompanyFields {
  const successful = results
    .filter((r) => r.status === 'success' && r.data)
    .sort((a, b) => b.confidence - a.confidence)

  const merged: CompanyFields = {
    company_name: null,
    industry: null,
    location: null,
    legal_form: null,
    status: null,
    registration_date: null,
    activities: [],
    directors: [],
    founders: [],
  }

  // For scalar fields, use the first non-null value (highest confidence first)
  for (const result of successful) {
    if (!result.data) continue
    if (merged.company_name === null && result.data.company_name) merged.company_name = result.data.company_name
    if (merged.industry === null && result.data.industry) merged.industry = result.data.industry
    if (merged.location === null && result.data.location) merged.location = result.data.location
    if (merged.legal_form === null && result.data.legal_form) merged.legal_form = result.data.legal_form
    if (merged.status === null && result.data.status) merged.status = result.data.status
    if (merged.registration_date === null && result.data.registration_date) merged.registration_date = result.data.registration_date
  }

  // For array fields, use the longest non-empty array (richest data)
  for (const result of successful) {
    if (!result.data) continue
    if (result.data.activities.length > merged.activities.length) merged.activities = result.data.activities
    if (result.data.directors.length > merged.directors.length) merged.directors = result.data.directors
    if (result.data.founders.length > merged.founders.length) merged.founders = result.data.founders
  }

  return merged
}

export async function aggregate(idno: string): Promise<AggregateResult> {
  const settled = await Promise.allSettled([
    scrapeIdnoMd(idno),
    scrapeSrlMd(idno),
    scrapeOpenMoney(idno),
  ])

  // Extract SourceResults from settled promises
  const results: SourceResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      return s.value
    }
    // Promise itself rejected (unexpected -- scrapers should catch internally)
    const sources = ['idno.md', 'srl.md', 'openmoney.md'] as const
    return {
      source: sources[i],
      status: 'error' as const,
      confidence: 0,
      data: null,
      error: String(s.reason),
    }
  })

  // Build raw map keyed by source name
  const raw: Record<string, SourceResult> = {}
  for (const r of results) {
    raw[r.source] = r
  }

  // Build per-source status map
  const sourceStatus: Record<string, 'success' | 'error' | 'timeout'> = {}
  for (const r of results) {
    sourceStatus[r.source] = r.status
  }

  // Count successes and failures
  const successes = results.filter((r) => r.status === 'success')
  const failures = results.filter((r) => r.status !== 'success')

  const merged = mergeFields(results)
  const allFailed = successes.length === 0
  const isPartial = successes.length > 0 && failures.length > 0

  return {
    merged,
    raw,
    sourceStatus,
    isPartial,
    allFailed,
  }
}
