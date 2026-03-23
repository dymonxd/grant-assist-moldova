'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// --- Types ---

export interface FunnelStage {
  label: string
  stage: string
  count: number
  rate: number
}

export interface StageDetailData {
  dailyTrend: { date: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
  topReferrers: { url: string; count: number }[]
}

export interface ActivityEvent {
  event_type: string
  created_at: string
  session_id: string
  event_data: Record<string, unknown> | null
}

export interface ApplicationListItem {
  id: string
  status: string
  updated_at: string
  userName: string
  userEmail: string
  grantName: string
  grantDeadline: string | null
  isStale: boolean
  completionPercent: number
}

// --- Funnel stage mapping ---

const FUNNEL_STAGES: { eventType: string; label: string }[] = [
  { eventType: 'session_start', label: 'Sesiuni' },
  { eventType: 'idno_entered', label: 'IDNO introdus' },
  { eventType: 'grants_viewed', label: 'Granturi vizualizate' },
  { eventType: 'account_created', label: 'Cont creat' },
  { eventType: 'writer_started', label: 'Redactor pornit' },
  { eventType: 'application_exported', label: 'Exportat' },
]

// --- Helper: Verify admin ---

async function verifyAdmin(): Promise<
  { user: { id: string }; error?: never } | { user?: never; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Trebuie sa fiti autentificat' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: 'Acces interzis: nu sunteti administrator' }
  }

  return { user }
}

// --- Server Actions ---

/**
 * Get funnel data aggregated from analytics_daily_summary (last 30 days).
 * Returns 6 stages with label, count, and conversion rate.
 */
export async function getFunnelData(): Promise<
  { data: FunnelStage[]; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const admin = createAdminClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: rows, error } = await admin
      .from('analytics_daily_summary')
      .select('stage, count, device_type')
      .gte('date', dateStr)

    if (error) {
      return { error: 'Eroare la incarcarea datelor funnel' }
    }

    // Aggregate counts by stage across all dates and device types
    const stageCounts: Record<string, number> = {}
    for (const row of rows ?? []) {
      const stage = row.stage as string
      stageCounts[stage] = (stageCounts[stage] ?? 0) + (row.count as number)
    }

    // Build funnel stages with conversion rates
    const stages: FunnelStage[] = FUNNEL_STAGES.map((fs, index) => {
      const count = stageCounts[fs.eventType] ?? 0
      let rate = 100
      if (index > 0) {
        const prevCount = stageCounts[FUNNEL_STAGES[index - 1].eventType] ?? 0
        rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0
      }
      return {
        label: fs.label,
        stage: fs.eventType,
        count,
        rate,
      }
    })

    return { data: stages }
  } catch {
    return { error: 'Eroare la incarcarea datelor funnel' }
  }
}

/**
 * Get detailed analytics for a specific funnel stage.
 * Returns daily trend, device breakdown, and top referrers for last 30 days.
 */
export async function getStageDetail(
  stage: string
): Promise<
  { data: StageDetailData; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const admin = createAdminClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: rows, error } = await admin
      .from('analytics_daily_summary')
      .select('date, count, device_type, top_referrers')
      .eq('stage', stage)
      .gte('date', dateStr)

    if (error) {
      return { error: 'Eroare la incarcarea detaliilor' }
    }

    // Daily trend: aggregate by date across device types
    const dailyMap: Record<string, number> = {}
    const deviceMap: Record<string, number> = {}
    const referrerMap: Record<string, number> = {}

    for (const row of rows ?? []) {
      const date = row.date as string
      const count = row.count as number
      const device = (row.device_type as string) || 'unknown'
      const referrers = row.top_referrers as
        | { url: string; count: number }[]
        | null

      dailyMap[date] = (dailyMap[date] ?? 0) + count
      deviceMap[device] = (deviceMap[device] ?? 0) + count

      if (referrers && Array.isArray(referrers)) {
        for (const ref of referrers) {
          referrerMap[ref.url] = (referrerMap[ref.url] ?? 0) + ref.count
        }
      }
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const deviceBreakdown = Object.entries(deviceMap)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)

    const topReferrers = Object.entries(referrerMap)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { data: { dailyTrend, deviceBreakdown, topReferrers } }
  } catch {
    return { error: 'Eroare la incarcarea detaliilor' }
  }
}

/**
 * Get last 50 analytics events for the activity feed.
 */
export async function getRecentActivity(): Promise<
  { data: ActivityEvent[]; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const admin = createAdminClient()

    const { data: events, error } = await admin
      .from('analytics_events')
      .select('event_type, created_at, session_id, event_data')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return { error: 'Eroare la incarcarea activitatii recente' }
    }

    return { data: (events ?? []) as ActivityEvent[] }
  } catch {
    return { error: 'Eroare la incarcarea activitatii recente' }
  }
}

/**
 * Get active applications with user/grant info and staleness flag.
 * Stale = updated_at > 7 days ago.
 */
export async function getApplicationsList(): Promise<
  { data: ApplicationListItem[]; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const admin = createAdminClient()

    const { data: apps, error } = await admin
      .from('applications')
      .select(
        'id, status, updated_at, user_id, profiles(name, email), grants(name, deadline)'
      )
      .neq('status', 'exported')
      .order('updated_at', { ascending: false })

    if (error) {
      return { error: 'Eroare la incarcarea aplicatiilor' }
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get section counts for completion percentage
    const appIds = (apps ?? []).map((a) => a.id as string)

    let sectionCounts: Record<string, number> = {}

    if (appIds.length > 0) {
      const { data: sections } = await admin
        .from('application_sections')
        .select('application_id')
        .in('application_id', appIds)

      if (sections) {
        for (const s of sections) {
          const appId = s.application_id as string
          sectionCounts[appId] = (sectionCounts[appId] ?? 0) + 1
        }
      }
    }

    const result: ApplicationListItem[] = (apps ?? []).map((app) => {
      const updatedAt = new Date(app.updated_at as string)
      const profile = app.profiles as unknown as { name: string; email: string } | null
      const grant = app.grants as unknown as {
        name: string
        deadline: string | null
      } | null

      // Estimate completion: sections saved / total expected (use 5 as default if unknown)
      const savedCount = sectionCounts[app.id as string] ?? 0
      const completionPercent = Math.min(
        Math.round((savedCount / 5) * 100),
        100
      )

      return {
        id: app.id as string,
        status: app.status as string,
        updated_at: app.updated_at as string,
        userName: profile?.name ?? 'Necunoscut',
        userEmail: profile?.email ?? '',
        grantName: grant?.name ?? 'Grant necunoscut',
        grantDeadline: grant?.deadline ?? null,
        isStale: updatedAt < sevenDaysAgo,
        completionPercent,
      }
    })

    return { data: result }
  } catch {
    return { error: 'Eroare la incarcarea aplicatiilor' }
  }
}

/**
 * Send a reminder email for a stale application.
 * Verifies admin, checks for recent duplicate, sends via Resend, logs to notifications_log.
 */
export async function sendStaleReminder(
  applicationId: string
): Promise<{ success: true; error?: never } | { success?: never; error: string }> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  if (!process.env.RESEND_API_KEY) {
    return { error: 'Serviciul de email nu este configurat' }
  }

  try {
    const admin = createAdminClient()

    // Fetch application + user + grant data
    const { data: app, error: appError } = await admin
      .from('applications')
      .select(
        'id, user_id, grant_id, profiles(name, email), grants(name, deadline)'
      )
      .eq('id', applicationId)
      .single()

    if (appError || !app) {
      return { error: 'Aplicatia nu a fost gasita' }
    }

    const profile = app.profiles as unknown as { name: string; email: string } | null
    const grant = app.grants as unknown as {
      name: string
      deadline: string | null
    } | null

    if (!profile?.email) {
      return { error: 'Utilizatorul nu are adresa de email' }
    }

    // Check for recent duplicate notification (last 24h)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: existing } = await admin
      .from('notifications_log')
      .select('id')
      .eq('user_id', app.user_id as string)
      .eq('grant_id', app.grant_id as string)
      .eq('type', 'abandoned_draft')
      .gte('sent_at', oneDayAgo.toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: 'Un memento a fost deja trimis in ultimele 24 ore' }
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error: emailError } = await resend.emails.send({
      from: 'GrantAssist <onboarding@resend.dev>',
      to: [profile.email],
      subject: `Continua cererea ta: ${grant?.name ?? 'Grant'}`,
      html: buildReminderHtml({
        userName: profile.name,
        grantName: grant?.name ?? 'Grant',
        deadline: grant?.deadline ?? null,
      }),
    })

    if (emailError) {
      return { error: 'Eroare la trimiterea emailului' }
    }

    // Log to notifications_log
    await admin.from('notifications_log').insert({
      user_id: app.user_id,
      application_id: applicationId,
      grant_id: app.grant_id,
      type: 'abandoned_draft',
      channel: 'email',
    })

    return { success: true }
  } catch {
    return { error: 'Eroare la trimiterea mementoului' }
  }
}

// --- Helper: Build reminder email HTML ---

function buildReminderHtml({
  userName,
  grantName,
  deadline,
}: {
  userName: string
  grantName: string
  deadline: string | null
}): string {
  const deadlineText = deadline
    ? `Termen limita: ${new Intl.DateTimeFormat('ro-MD', { dateStyle: 'long' }).format(new Date(deadline))}`
    : ''

  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head><meta charset="utf-8" /></head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
        <h2 style="font-size: 20px; color: #111; margin: 0 0 16px 0;">
          Buna, ${escapeHtml(userName)}!
        </h2>
        <p style="font-size: 14px; color: #333; line-height: 1.6;">
          Ai inceput o cerere de finantare pentru <strong>${escapeHtml(grantName)}</strong> dar nu ai finalizat-o inca.
        </p>
        ${deadlineText ? `<p style="font-size: 14px; color: #c2410c; font-weight: 600;">${escapeHtml(deadlineText)}</p>` : ''}
        <p style="font-size: 14px; color: #333; line-height: 1.6;">
          Intra pe platforma pentru a continua redactarea cererii tale.
        </p>
        <div style="margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://grantassist.md'}/grants"
             style="display: inline-block; padding: 10px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">
            Continua cererea
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Generat cu GrantAssist Moldova
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
