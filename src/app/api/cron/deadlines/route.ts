/**
 * Cron job: Deadline reminders
 * Schedule: Daily at 9:00 UTC (configured in vercel.json)
 *
 * Finds grants with deadlines in exactly 7 or 3 days,
 * sends reminder emails to users with in-progress applications,
 * respects notification preferences and duplicate prevention.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { checkDuplicateNotification } from '@/app/actions/admin-notifications'
import {
  buildDeadlineReminderEmail,
  getDeadlineReminderSubject,
} from '@/lib/email/notification-emails'
import { Resend } from 'resend'

import { validateCronSecret } from '@/lib/auth/validate-cron'

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Find grants with deadlines in exactly 7 or 3 days
    const today = new Date()
    const threeDays = new Date(today)
    threeDays.setDate(threeDays.getDate() + 3)
    const sevenDays = new Date(today)
    sevenDays.setDate(sevenDays.getDate() + 7)

    const threeDaysStr = threeDays.toISOString().split('T')[0]
    const sevenDaysStr = sevenDays.toISOString().split('T')[0]

    const { data: grants, error: grantsError } = await admin
      .from('grants')
      .select('id, name, deadline')
      .eq('status', 'active')
      .or(`deadline.eq.${sevenDaysStr},deadline.eq.${threeDaysStr}`)

    if (grantsError || !grants || grants.length === 0) {
      return Response.json({ sent: 0, skipped: 0 })
    }

    // Find users with applications for those grants
    const grantIds = grants.map((g) => g.id as string)

    const { data: apps, error: appsError } = await admin
      .from('applications')
      .select(
        'id, user_id, grant_id, profiles(name, email, email_notifications), grants(name, deadline)'
      )
      .in('grant_id', grantIds)
      .neq('status', 'exported')

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
      const deadline = (grant?.deadline as string) ?? ''
      const userId = app.user_id as string
      const grantId = app.grant_id as string

      // Skip users without email or with notifications disabled
      if (!email || !emailNotifications) {
        skipped++
        continue
      }

      // Check for duplicate within 24h
      const isDuplicate = await checkDuplicateNotification(
        userId,
        grantId,
        'deadline_reminder'
      )
      if (isDuplicate) {
        skipped++
        continue
      }

      // Calculate days left
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )

      // Generate unsubscribe token
      const unsubscribeToken = crypto.randomUUID()

      // Build and send email
      const subject = getDeadlineReminderSubject(grantName, daysLeft)
      const html = buildDeadlineReminderEmail({
        grantName,
        deadline,
        daysLeft,
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
        grant_id: grantId,
        type: 'deadline_reminder',
        channel: 'email',
        unsubscribe_token: unsubscribeToken,
      })

      sent++
    }

    return Response.json({ sent, skipped })
  } catch (error) {
    console.error('Deadline cron error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
