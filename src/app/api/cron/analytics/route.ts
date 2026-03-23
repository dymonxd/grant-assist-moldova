/**
 * Cron job: Analytics aggregation
 * Schedule: Nightly at 2:00 UTC (configured in vercel.json)
 *
 * Queries analytics_events for the previous day, maps event_type to
 * funnel stage, groups by (stage, device_type), counts per group,
 * aggregates top 5 referrers per stage, and upserts into
 * analytics_daily_summary.
 */

import { createAdminClient } from '@/lib/supabase/admin'

import { validateCronSecret } from '@/lib/auth/validate-cron'

// Funnel stage mapping: event_type -> stage name
const EVENT_TO_STAGE: Record<string, string> = {
  session_start: 'session_start',
  idno_entered: 'idno_entered',
  grants_viewed: 'grants_viewed',
  account_created: 'account_created',
  writer_started: 'writer_started',
  application_exported: 'application_exported',
}

interface AnalyticsEvent {
  event_type: string
  device_type: string | null
  referrer_url: string | null
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // Calculate yesterday's date range
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]

    // Query analytics events for yesterday
    const { data: events, error: eventsError } = await admin
      .from('analytics_events')
      .select('event_type, device_type, referrer_url')
      .gte('created_at', `${yesterdayStr}T00:00:00.000Z`)
      .lt('created_at', `${todayStr}T00:00:00.000Z`)

    if (eventsError) {
      console.error('Analytics events query error:', eventsError)
      return Response.json(
        { error: 'Failed to query analytics events' },
        { status: 500 }
      )
    }

    if (!events || events.length === 0) {
      return Response.json({ date: yesterdayStr, stages_aggregated: 0 })
    }

    // Filter to mapped events only and group by (stage, device_type)
    const groups = new Map<string, { count: number; referrers: Map<string, number> }>()

    for (const event of events as AnalyticsEvent[]) {
      const stage = EVENT_TO_STAGE[event.event_type]
      if (!stage) continue // Skip unmapped event types

      // Map null device_type to empty string for composite PK compatibility
      const deviceType = event.device_type ?? ''
      const key = `${stage}|${deviceType}`

      if (!groups.has(key)) {
        groups.set(key, { count: 0, referrers: new Map() })
      }

      const group = groups.get(key)!
      group.count++

      // Aggregate referrer URLs
      if (event.referrer_url) {
        const currentCount = group.referrers.get(event.referrer_url) ?? 0
        group.referrers.set(event.referrer_url, currentCount + 1)
      }
    }

    if (groups.size === 0) {
      return Response.json({ date: yesterdayStr, stages_aggregated: 0 })
    }

    // Build upsert rows
    const rows: {
      date: string
      stage: string
      device_type: string
      count: number
      top_referrers: { url: string; count: number }[]
    }[] = []

    const stagesSet = new Set<string>()

    for (const [key, group] of Array.from(groups.entries())) {
      const [stage, deviceType] = key.split('|')
      stagesSet.add(stage)

      // Get top 5 referrers for this group
      const referrerEntries = Array.from(group.referrers.entries()) as [string, number][]
      const topReferrers = referrerEntries
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 5)
        .map((entry: [string, number]) => ({ url: entry[0], count: entry[1] }))

      rows.push({
        date: yesterdayStr,
        stage,
        device_type: deviceType,
        count: group.count,
        top_referrers: topReferrers,
      })
    }

    // Upsert into analytics_daily_summary
    const { error: upsertError } = await admin
      .from('analytics_daily_summary')
      .upsert(rows, {
        onConflict: 'date,stage,device_type',
      })

    if (upsertError) {
      console.error('Analytics upsert error:', upsertError)
      return Response.json(
        { error: 'Failed to upsert analytics summary' },
        { status: 500 }
      )
    }

    return Response.json({
      date: yesterdayStr,
      stages_aggregated: stagesSet.size,
    })
  } catch (error) {
    console.error('Analytics cron error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
