/**
 * Unsubscribe utilities for notification emails.
 *
 * findUserByUnsubscribeToken: Looks up notifications_log by unsubscribe_token.
 * disableEmailNotifications: Sets profiles.email_notifications = false.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Find user_id from an unsubscribe token in notifications_log.
 * Returns user_id if found, null otherwise.
 */
export async function findUserByUnsubscribeToken(
  token: string
): Promise<string | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('notifications_log')
    .select('user_id')
    .eq('unsubscribe_token', token)
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].user_id as string
}

/**
 * Disable email notifications for a user.
 * Sets profiles.email_notifications = false.
 */
export async function disableEmailNotifications(
  userId: string
): Promise<void> {
  const admin = createAdminClient()

  await admin
    .from('profiles')
    .update({ email_notifications: false })
    .eq('id', userId)
}
