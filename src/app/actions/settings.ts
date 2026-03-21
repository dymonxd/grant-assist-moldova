'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateNotificationPreferences(
  emailNotifications: boolean
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Trebuie sa fiti autentificat' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ email_notifications: emailNotifications })
    .eq('id', user.id)

  if (error) {
    return { error: 'Nu am putut actualiza preferintele' }
  }

  return { success: true, emailNotifications }
}
