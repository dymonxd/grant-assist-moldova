/**
 * Cron job: Abandoned draft nudges
 * Schedule: Daily at 10:00 UTC (configured in vercel.json)
 *
 * Finds applications with status='in_progress' that haven't been
 * updated in 7+ days, sends nudge emails to re-engage users.
 * Respects notification preferences and duplicate prevention.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { checkDuplicateNotification } from '@/app/actions/admin-notifications'
import {
  buildAbandonedDraftEmail,
  getAbandonedDraftSubject,
} from '@/lib/email/notification-emails'
import { Resend } from 'resend'

// --- Cron auth validation ---

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === process.env.CRON_SECRET
}

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Find applications inactive for 7+ days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: apps, error: appsError } = await admin
      .from('applications')
      .select(
        'id, user_id, grant_id, updated_at, profiles(name, email, email_notifications), grants(name)'
      )
      .eq('status', 'in_progress')
      .lt('updated_at', sevenDaysAgo.toISOString())

    if (appsError || !apps || apps.length === 0) {
      return Response.json({ sent: 0, skipped: 0 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    let sent = 0
    let skipped = 0

    for (const app of apps) {
      const profileRaw = app.profiles as unknown
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Record<string, unknown> | null
      const grantRaw = app.grants as unknown
      const grant = (Array.isArray(grantRaw) ? grantRaw[0] : grantRaw) as Record<string, unknown> | null

      const email = (profile?.email as string) ?? ''
      const emailNotifications = (profile?.email_notifications as boolean) ?? false
      const grantName = (grant?.name as string) ?? ''
      const userId = app.user_id as string
      const grantId = app.grant_id as string
      const updatedAt = app.updated_at as string

      // Skip users without email or with notifications disabled
      if (!email || !emailNotifications) {
        skipped++
        continue
      }

      // Check for duplicate within 24h
      const isDuplicate = await checkDuplicateNotification(
        userId,
        grantId,
        'abandoned_draft'
      )
      if (isDuplicate) {
        skipped++
        continue
      }

      // Generate unsubscribe token
      const unsubscribeToken = crypto.randomUUID()

      // Build and send email
      const subject = getAbandonedDraftSubject(grantName)
      const html = buildAbandonedDraftEmail({
        grantName,
        lastActivity: updatedAt,
        ctaUrl: `${baseUrl}/grants/${grantId}/write`,
        unsubscribeToken,
      })

      const { error: emailError } = await resend.emails.send({
        from: 'GrantAssist <onboarding@resend.dev>',
        to: [email],
        subject,
        html,
      })

      if (emailError) {
        skipped++
        continue
      }

      // Log to notifications_log
      await admin.from('notifications_log').insert({
        user_id: userId,
        application_id: app.id as string,
        grant_id: grantId,
        type: 'abandoned_draft',
        channel: 'email',
        unsubscribe_token: unsubscribeToken,
      })

      sent++
    }

    return Response.json({ sent, skipped })
  } catch (error) {
    console.error('Abandoned draft cron error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
