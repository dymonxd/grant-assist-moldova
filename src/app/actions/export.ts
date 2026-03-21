'use server'

import { Resend } from 'resend'
import { buildApplicationEmailHtml } from '@/lib/email/application-email'
import { createClient } from '@/lib/supabase/server'

/**
 * Send grant application sections via email using Resend.
 *
 * Uses onboarding@resend.dev for development (no domain verification needed).
 * For production, configure a verified domain in Resend dashboard.
 */
export async function sendApplicationEmail(
  to: string,
  grantName: string,
  sections: Array<{ fieldLabel: string; finalText: string }>
): Promise<{ success: true } | { error: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { error: 'Serviciul de email nu este configurat' }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = buildApplicationEmailHtml({ grantName, sections })

    const { error } = await resend.emails.send({
      from: 'GrantAssist <onboarding@resend.dev>',
      to: [to],
      subject: `Cererea ta de finantare: ${grantName}`,
      html,
    })

    if (error) {
      return { error: 'Eroare la trimiterea emailului' }
    }

    return { success: true }
  } catch {
    return { error: 'Eroare la trimiterea emailului' }
  }
}

/**
 * Save deadline reminder opt-in for authenticated user.
 *
 * Inserts a deadline_reminder row into notifications_log so the
 * cron job can send reminders at 7 and 3 days before deadline.
 */
export async function saveReminderOptIn(
  grantId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Trebuie sa fiti autentificat' }
  }

  const { error } = await supabase.from('notifications_log').insert({
    user_id: user.id,
    grant_id: grantId,
    type: 'deadline_reminder',
    channel: 'email',
  })

  if (error) {
    return { error: 'Eroare la salvarea notificarii' }
  }

  return { success: true }
}
