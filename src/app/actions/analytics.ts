'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

/**
 * Funnel stage event types for analytics tracking.
 *
 * Stages: session_start -> idno_entered -> idea_entered -> profile_created ->
 * grants_viewed -> account_created -> writer_started -> section_generated ->
 * section_saved -> application_exported
 */

interface TrackEventParams {
  eventType: string
  eventData?: Record<string, unknown> | null
  userId?: string | null
  referrerUrl?: string | null
  deviceType?: string | null
}

export async function trackEvent({
  eventType,
  eventData,
  userId,
  referrerUrl,
  deviceType,
}: TrackEventParams) {
  try {
    const session = await getSession()
    const sessionId = session.companyProfileId ?? 'anonymous'

    const admin = createAdminClient()

    const { error } = await admin
      .from('analytics_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData ?? null,
        user_id: userId ?? null,
        referrer_url: referrerUrl ?? null,
        device_type: deviceType ?? null,
      })

    if (error) {
      return { error: 'Nu am putut inregistra evenimentul' }
    }

    return { success: true }
  } catch {
    return { error: 'Nu am putut inregistra evenimentul' }
  }
}
