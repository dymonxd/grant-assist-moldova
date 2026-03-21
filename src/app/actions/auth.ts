'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const phone = (formData.get('phone') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const notifications = formData.get('notifications')
  const redirectTo = (formData.get('redirectTo') as string | null) ?? '/'

  // Validation
  if (!name || name.length < 2) {
    return { error: 'Numele trebuie sa aiba cel putin 2 caractere' }
  }
  if (!email) {
    return { error: 'Adresa de email este obligatorie' }
  }
  if (!password || password.length < 6) {
    return { error: 'Parola trebuie sa aiba cel putin 6 caractere' }
  }

  const supabase = await createClient()
  const wantsNotifications = notifications === 'on'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=${redirectTo}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Profile merge: claim anonymous company profile and update user profile
  const session = await getSession()
  if (session.companyProfileId && data.user) {
    const admin = createAdminClient()

    // Claim the anonymous company profile for this user
    await admin.rpc('claim_company_profile', {
      p_profile_id: session.companyProfileId,
      p_user_id: data.user.id,
    })

    // Update profiles with phone and notification preference
    // (handle_new_user trigger does NOT extract phone from metadata)
    await admin
      .from('profiles')
      .update({
        phone,
        email_notifications: wantsNotifications,
      })
      .eq('id', data.user.id)

    // Clear anonymous session
    session.companyProfileId = undefined
    await session.save()
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signIn(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const redirectTo = (formData.get('redirectTo') as string | null) ?? '/'

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Email sau parola incorecta' }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/')
}
