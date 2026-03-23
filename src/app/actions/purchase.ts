'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCompanyProfileId } from '@/lib/auth/resolve-profile'

export async function savePurchaseNeed(purchaseNeed: string) {
  const companyProfileId = await resolveCompanyProfileId()

  if (!companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  if (!purchaseNeed || purchaseNeed.trim().length === 0) {
    return { error: 'Selecteaza sau descrie ce doresti sa achizitionezi' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('company_profiles')
    .update({ purchase_need: purchaseNeed.trim() })
    .eq('id', companyProfileId)

  if (error) {
    return { error: 'Eroare la salvarea nevoii de achizitie' }
  }

  return { success: true }
}
