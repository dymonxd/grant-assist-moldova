'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

export async function savePurchaseNeed(purchaseNeed: string) {
  const session = await getSession()

  if (!session.companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  if (!purchaseNeed || purchaseNeed.trim().length === 0) {
    return { error: 'Selecteaza sau descrie ce doresti sa achizitionezi' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('company_profiles')
    .update({ purchase_need: purchaseNeed.trim() })
    .eq('id', session.companyProfileId)

  if (error) {
    return { error: 'Eroare la salvarea nevoii de achizitie' }
  }

  return { success: true }
}
