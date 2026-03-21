'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleSavedGrant(grantId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Trebuie sa fii autentificat' }
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_grants')
    .select('id')
    .eq('user_id', user.id)
    .eq('grant_id', grantId)
    .maybeSingle()

  if (existing) {
    // Remove bookmark
    const { error: deleteError } = await supabase
      .from('saved_grants')
      .delete()
      .eq('user_id', user.id)
      .eq('grant_id', grantId)

    if (deleteError) {
      return { error: 'Nu am putut sterge grantul salvat' }
    }

    revalidatePath('/', 'layout')
    return { saved: false }
  }

  // Add bookmark
  const { error: insertError } = await supabase.from('saved_grants').insert({
    user_id: user.id,
    grant_id: grantId,
  })

  if (insertError) {
    return { error: 'Nu am putut salva grantul' }
  }

  revalidatePath('/', 'layout')
  return { saved: true }
}

export async function getSavedGrants() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { grants: [] }
  }

  const { data } = await supabase
    .from('saved_grants')
    .select('grant_id')
    .eq('user_id', user.id)

  return { grants: data?.map((d) => d.grant_id) ?? [] }
}
