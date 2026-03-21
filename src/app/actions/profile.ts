'use server'

import { validateIdno } from '@/lib/validation/idno'
import { aggregate } from '@/lib/sources/aggregate'
import { inferProfileFromIdea } from '@/lib/ai/infer-profile'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

export async function lookupCompany(idno: string) {
  const validated = validateIdno(idno)
  if (!validated.valid) {
    return { error: validated.error }
  }

  const result = await aggregate(validated.idno)

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('company_profiles')
    .upsert(
      {
        idno: validated.idno,
        company_name: result.merged.company_name,
        industry: result.merged.industry,
        location: result.merged.location,
        legal_form: result.merged.legal_form,
        enriched_data: result.raw,
      },
      { onConflict: 'idno' }
    )
    .select()
    .single()

  if (error) {
    return { error: 'Eroare la salvarea profilului companiei' }
  }

  const session = await getSession()
  session.companyProfileId = data.id
  await session.save()

  return {
    profile: data,
    sourceStatus: result.sourceStatus,
    isPartial: result.isPartial,
    allFailed: result.allFailed,
  }
}

export async function inferFromIdea(businessIdea: string) {
  if (!businessIdea || businessIdea.trim().length < 10) {
    return { error: 'Descrierea ideii de afacere trebuie sa aiba cel putin 10 caractere' }
  }

  const result = await inferProfileFromIdea(businessIdea.trim())

  if (!result) {
    return { error: 'Nu am putut analiza ideea de afacere' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('company_profiles')
    .insert({
      business_idea: businessIdea.trim(),
      company_name: result.company_name,
      industry: result.industry,
      location: result.location,
      legal_form: result.legal_form,
      enriched_data: { source: 'ai_inference', ai_output: result },
    })
    .select()
    .single()

  if (error) {
    return { error: 'Eroare la salvarea profilului companiei' }
  }

  const session = await getSession()
  session.companyProfileId = data.id
  await session.save()

  return { profile: data }
}

export async function saveManualProfile(fields: {
  company_name: string
  industry: string
  location: string
  legal_form: string
}) {
  if (!fields.company_name || fields.company_name.trim().length === 0) {
    return { error: 'Numele companiei este obligatoriu' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('company_profiles')
    .insert({
      company_name: fields.company_name.trim(),
      industry: fields.industry.trim() || null,
      location: fields.location.trim() || null,
      legal_form: fields.legal_form.trim() || null,
      enriched_data: { source: 'manual_entry' },
    })
    .select()
    .single()

  if (error) {
    return { error: 'Eroare la salvarea profilului companiei' }
  }

  const session = await getSession()
  session.companyProfileId = data.id
  await session.save()

  return { profile: data }
}
