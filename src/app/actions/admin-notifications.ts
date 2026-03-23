'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import {
  buildDeadlineReminderEmail,
  buildAbandonedDraftEmail,
  buildGrantExpiringEmail,
  buildNewGrantMatchEmail,
  getDeadlineReminderSubject,
  getAbandonedDraftSubject,
  getGrantExpiringSubject,
  getNewGrantMatchSubject,
} from '@/lib/email/notification-emails'
import { randomUUID } from 'crypto'

// --- Types ---

export interface NotificationLogItem {
  id: string
  type: string
  channel: string
  sent_at: string
  unsubscribe_token: string | null
  profiles: { name: string; email: string } | null
  grants: { name: string } | null
}

export interface BulkSendResult {
  sent: number
  skipped: number
  errors: number
}

export interface BulkSendPreviewResult {
  count: number
  sample: { name: string; email: string }[]
}

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
 * Get notification log with optional type filter.
 * Returns notifications joined with profiles (name, email) and grants (name).
 */
export async function getNotificationLog(
  typeFilter?: string
): Promise<
  { data: NotificationLogItem[]; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const admin = createAdminClient()

    let query = admin
      .from('notifications_log')
      .select(
        'id, type, channel, sent_at, unsubscribe_token, profiles(name, email), grants(name)'
      )

    if (typeFilter) {
      query = query.eq('type', typeFilter)
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(200)

    if (error) {
      return { error: 'Eroare la incarcarea jurnalului de notificari' }
    }

    return { data: (data ?? []) as unknown as NotificationLogItem[] }
  } catch {
    return { error: 'Eroare la incarcarea jurnalului de notificari' }
  }
}

/**
 * Check if a notification of the given type was already sent to a user
 * for a specific grant within the last 24 hours.
 *
 * NOTE: Also called from cron routes (server-to-server), so auth is
 * checked at the caller level. Keeping this as a utility function.
 */
export async function checkDuplicateNotification(
  userId: string,
  grantId: string | null,
  type: string
): Promise<boolean> {
  const admin = createAdminClient()

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  let query = admin
    .from('notifications_log')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)

  if (grantId) {
    query = query.eq('grant_id', grantId)
  }

  const { data } = await query
    .gte('sent_at', oneDayAgo.toISOString())
    .limit(1)

  return (data ?? []).length > 0
}

// --- Target user resolution ---

interface TargetUser {
  userId: string
  email: string
  name: string
  grantId: string
  grantName: string
  grantDeadline: string | null
  maxFunding: number | null
  applicationId: string | null
  lastActivity: string | null
  emailNotifications: boolean
}

async function getTargetUsers(
  type: string,
  grantId?: string
): Promise<TargetUser[]> {
  const admin = createAdminClient()

  if (type === 'deadline_reminder') {
    // Users with applications for grants expiring in 7 or 3 days
    const now = new Date()
    const threeDays = new Date(now)
    threeDays.setDate(threeDays.getDate() + 3)
    const sevenDays = new Date(now)
    sevenDays.setDate(sevenDays.getDate() + 8)

    const { data: grants } = await admin
      .from('grants')
      .select('id')
      .gte('deadline', threeDays.toISOString().split('T')[0])
      .lte('deadline', sevenDays.toISOString().split('T')[0])

    if (!grants || grants.length === 0) return []

    const grantIds = grants.map((g) => g.id as string)

    const { data: apps } = await admin
      .from('applications')
      .select(
        'id, user_id, grant_id, profiles(name, email, email_notifications), grants(name, deadline, max_funding)'
      )
      .in('grant_id', grantIds)
      .eq('status', 'in_progress')

    return (apps ?? []).map((app) => {
      const profileRaw = app.profiles as unknown
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Record<string, unknown> | null
      const grantRaw = app.grants as unknown
      const grant = (Array.isArray(grantRaw) ? grantRaw[0] : grantRaw) as Record<string, unknown> | null
      return {
        userId: app.user_id as string,
        email: (profile?.email as string) ?? '',
        name: (profile?.name as string) ?? '',
        grantId: app.grant_id as string,
        grantName: (grant?.name as string) ?? '',
        grantDeadline: (grant?.deadline as string) ?? null,
        maxFunding: (grant?.max_funding as number) ?? null,
        applicationId: app.id as string,
        lastActivity: null,
        emailNotifications: (profile?.email_notifications as boolean) ?? false,
      }
    })
  }

  if (type === 'abandoned_draft') {
    // Users with in_progress applications not updated in 7+ days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: apps } = await admin
      .from('applications')
      .select(
        'id, user_id, grant_id, updated_at, profiles(name, email, email_notifications), grants(name, deadline, max_funding)'
      )
      .eq('status', 'in_progress')
      .lt('updated_at', sevenDaysAgo.toISOString())

    return (apps ?? []).map((app) => {
      const profileRaw = app.profiles as unknown
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Record<string, unknown> | null
      const grantRaw = app.grants as unknown
      const grant = (Array.isArray(grantRaw) ? grantRaw[0] : grantRaw) as Record<string, unknown> | null
      return {
        userId: app.user_id as string,
        email: (profile?.email as string) ?? '',
        name: (profile?.name as string) ?? '',
        grantId: app.grant_id as string,
        grantName: (grant?.name as string) ?? '',
        grantDeadline: (grant?.deadline as string) ?? null,
        maxFunding: (grant?.max_funding as number) ?? null,
        applicationId: app.id as string,
        lastActivity: app.updated_at as string,
        emailNotifications: (profile?.email_notifications as boolean) ?? false,
      }
    })
  }

  if (type === 'grant_expiring') {
    // General announcement: all users with email_notifications=true
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email, email_notifications')
      .eq('email_notifications', true)

    const targetGrantId = grantId ?? ''

    let grantInfo: { name: string; deadline: string | null; max_funding: number | null } = {
      name: '',
      deadline: null,
      max_funding: null,
    }

    if (targetGrantId) {
      const { data: grant } = await admin
        .from('grants')
        .select('name, deadline, max_funding')
        .eq('id', targetGrantId)
        .single()

      if (grant) {
        grantInfo = grant as typeof grantInfo
      }
    }

    return (profiles ?? []).map((p) => ({
      userId: p.id as string,
      email: (p.email as string) ?? '',
      name: (p.name as string) ?? '',
      grantId: targetGrantId,
      grantName: grantInfo.name,
      grantDeadline: grantInfo.deadline,
      maxFunding: grantInfo.max_funding,
      applicationId: null,
      lastActivity: null,
      emailNotifications: (p.email_notifications as boolean) ?? false,
    }))
  }

  if (type === 'new_grant_match') {
    // Users with matching profiles for a specific grant
    if (!grantId) return []

    const { data: grant } = await admin
      .from('grants')
      .select('name, deadline, max_funding')
      .eq('id', grantId)
      .single()

    if (!grant) return []

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email, email_notifications')
      .eq('email_notifications', true)

    return (profiles ?? []).map((p) => ({
      userId: p.id as string,
      email: (p.email as string) ?? '',
      name: (p.name as string) ?? '',
      grantId,
      grantName: (grant.name as string) ?? '',
      grantDeadline: (grant.deadline as string) ?? null,
      maxFunding: (grant.max_funding as number) ?? null,
      applicationId: null,
      lastActivity: null,
      emailNotifications: (p.email_notifications as boolean) ?? false,
    }))
  }

  return []
}

// --- Build email for target user ---

function buildEmailForType(
  type: string,
  target: TargetUser,
  unsubscribeToken: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (type === 'deadline_reminder') {
    const daysLeft = target.grantDeadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(target.grantDeadline).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0

    return {
      subject: getDeadlineReminderSubject(target.grantName, daysLeft),
      html: buildDeadlineReminderEmail({
        grantName: target.grantName,
        deadline: target.grantDeadline ?? '',
        daysLeft,
        ctaUrl: `${baseUrl}/grants/${target.grantId}/write`,
        unsubscribeToken,
      }),
    }
  }

  if (type === 'abandoned_draft') {
    return {
      subject: getAbandonedDraftSubject(target.grantName),
      html: buildAbandonedDraftEmail({
        grantName: target.grantName,
        lastActivity: target.lastActivity ?? '',
        ctaUrl: `${baseUrl}/grants/${target.grantId}/write`,
        unsubscribeToken,
      }),
    }
  }

  if (type === 'grant_expiring') {
    return {
      subject: getGrantExpiringSubject(target.grantName),
      html: buildGrantExpiringEmail({
        grantName: target.grantName,
        deadline: target.grantDeadline ?? '',
        ctaUrl: `${baseUrl}/grants/${target.grantId}/write`,
        unsubscribeToken,
      }),
    }
  }

  // new_grant_match
  return {
    subject: getNewGrantMatchSubject(target.grantName),
    html: buildNewGrantMatchEmail({
      grantName: target.grantName,
      maxFunding: target.maxFunding ?? 0,
      ctaUrl: `${baseUrl}/grants/${target.grantId}/write`,
      unsubscribeToken,
    }),
  }
}

/**
 * Bulk send notifications of a specific type.
 * Checks email_notifications preference, checks duplicates,
 * sends emails via Resend, logs each send to notifications_log.
 */
export async function bulkSendNotifications({
  type,
  grantId,
}: {
  type: string
  grantId?: string
}): Promise<
  { data: BulkSendResult; error?: never } | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  if (!process.env.RESEND_API_KEY) {
    return { error: 'Serviciul de email nu este configurat' }
  }

  try {
    const targets = await getTargetUsers(type, grantId)
    const admin = createAdminClient()
    const resend = new Resend(process.env.RESEND_API_KEY)

    let sent = 0
    let skipped = 0
    let errors = 0

    for (const target of targets) {
      // Check notification preferences
      if (!target.emailNotifications) {
        skipped++
        continue
      }

      // Check for duplicate within 24h
      const isDuplicate = await checkDuplicateNotification(
        target.userId,
        target.grantId || null,
        type
      )
      if (isDuplicate) {
        skipped++
        continue
      }

      // Generate unsubscribe token
      const unsubscribeToken = randomUUID()

      // Build email
      const { subject, html } = buildEmailForType(type, target, unsubscribeToken)

      // Send via Resend
      const { error: emailError } = await resend.emails.send({
        from: 'GrantAssist <onboarding@resend.dev>',
        to: [target.email],
        subject,
        html,
      })

      if (emailError) {
        errors++
        continue
      }

      // Log to notifications_log
      await admin.from('notifications_log').insert({
        user_id: target.userId,
        application_id: target.applicationId,
        grant_id: target.grantId || null,
        type,
        channel: 'email',
        unsubscribe_token: unsubscribeToken,
      })

      sent++
    }

    return { data: { sent, skipped, errors } }
  } catch {
    return { error: 'Eroare la trimiterea notificarilor' }
  }
}

/**
 * Preview bulk send: returns count of target users and sample (first 5).
 * Used for confirmation dialog before actual send.
 */
export async function getBulkSendPreview({
  type,
  grantId,
}: {
  type: string
  grantId?: string
}): Promise<
  | { data: BulkSendPreviewResult; error?: never }
  | { data?: never; error: string }
> {
  const auth = await verifyAdmin()
  if (auth.error) return { error: auth.error }

  try {
    const targets = await getTargetUsers(type, grantId)

    // Filter to users with email_notifications enabled
    const eligible = targets.filter((t) => t.emailNotifications)

    const sample = eligible.slice(0, 5).map((t) => ({
      name: t.name,
      email: t.email,
    }))

    return {
      data: {
        count: eligible.length,
        sample,
      },
    }
  } catch {
    return { error: 'Eroare la previzualizare' }
  }
}
