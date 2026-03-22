'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// --- Types ---

export type DisplayStatus = 'Draft' | 'Active' | 'Expiring' | 'Expired'

export interface GrantCatalogItem {
  id: string
  name: string
  provider_agency: string
  deadline: string
  status: string
  last_scraped_at: string | null
  displayStatus: DisplayStatus
  applicationCount: number
}

export interface GrantUpdate {
  name: string
  provider_agency: string
  description: string
  max_funding: number
  deadline: string
  eligibility_rules: unknown[]
  scoring_rubric: unknown
  required_documents: unknown[]
  source_form_url: string
}

// --- Admin verification ---

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Acces neautorizat' }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: 'Acces neautorizat' }
  }

  return { userId: user.id }
}

// --- Status computation ---

function computeDisplayStatus(
  status: string,
  deadline: string
): DisplayStatus {
  if (status === 'draft') return 'Draft'

  const deadlineDate = new Date(deadline)
  const now = new Date()

  if (status === 'expired' || deadlineDate < now) return 'Expired'

  const fourteenDays = 14 * 24 * 60 * 60 * 1000
  if (deadlineDate.getTime() - now.getTime() <= fourteenDays) return 'Expiring'

  return 'Active'
}

// --- Server actions ---

export async function getGrantsCatalog() {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Fetch all grants ordered by deadline ASC
  const { data: grants, error: grantsError } = await admin
    .from('grants')
    .select('*')
    .order('deadline', { ascending: true })

  if (grantsError) {
    return { error: 'Nu am putut incarca granturile' }
  }

  // Fetch application counts per grant
  const { data: appCounts } = await admin
    .from('applications')
    .select('grant_id, count')

  // Build count map
  const countMap = new Map<string, number>()
  if (appCounts) {
    for (const row of appCounts) {
      countMap.set(row.grant_id, Number(row.count) || 0)
    }
  }

  // Map grants with computed displayStatus and applicationCount
  const catalogGrants: GrantCatalogItem[] = (grants ?? []).map(
    (grant: Record<string, unknown>) => ({
      id: grant.id as string,
      name: grant.name as string,
      provider_agency: grant.provider_agency as string,
      deadline: grant.deadline as string,
      status: grant.status as string,
      last_scraped_at: grant.last_scraped_at as string | null,
      displayStatus: computeDisplayStatus(
        grant.status as string,
        grant.deadline as string
      ),
      applicationCount: countMap.get(grant.id as string) ?? 0,
    })
  )

  return { grants: catalogGrants }
}

export async function updateDeadline(grantId: string, newDeadline: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  const { data: grant, error } = await admin
    .from('grants')
    .update({ deadline: newDeadline })
    .eq('id', grantId)
    .select()
    .single()

  if (error) {
    return { error: 'Nu am putut actualiza termenul limita' }
  }

  return { success: true, grant }
}

export async function duplicateGrant(grantId: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Fetch original grant
  const { data: original, error: fetchError } = await admin
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .single()

  if (fetchError || !original) {
    return { error: 'Grantul nu a fost gasit' }
  }

  // Fetch original fields
  const { data: originalFields } = await admin
    .from('grant_application_fields')
    .select('*')
    .eq('grant_id', grantId)

  // Insert new grant with draft status and "(copie)" suffix
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: _id,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    created_at: _created,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updated_at: _updated,
    ...grantData
  } = original as Record<string, unknown>

  const { data: newGrant, error: insertError } = await admin
    .from('grants')
    .insert({
      ...grantData,
      name: `${original.name} (copie)`,
      status: 'draft',
    })
    .select()
    .single()

  if (insertError || !newGrant) {
    return { error: 'Nu am putut duplica grantul' }
  }

  // Copy application fields if any
  if (originalFields && originalFields.length > 0) {
    const copiedFields = originalFields.map(
      (field: Record<string, unknown>) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          id: _fid,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          grant_id: _gid,
          ...fieldData
        } = field
        return { ...fieldData, grant_id: newGrant.id }
      }
    )
    await admin.from('grant_application_fields').insert(copiedFields)
  }

  return { success: true, grant: newGrant }
}

export async function deactivateGrant(grantId: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  const { error } = await admin
    .from('grants')
    .update({ status: 'expired' })
    .eq('id', grantId)

  if (error) {
    return { error: 'Nu am putut dezactiva grantul' }
  }

  return { success: true }
}

export async function publishGrant(grantId: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Fetch grant
  const { data: grant, error: fetchError } = await admin
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .single()

  if (fetchError || !grant) {
    return { error: 'Grantul nu a fost gasit' }
  }

  // Validate: name non-empty
  if (!grant.name || (grant.name as string).trim() === '') {
    return { error: 'Numele grantului este obligatoriu' }
  }

  // Validate: provider_agency non-empty
  if (
    !grant.provider_agency ||
    (grant.provider_agency as string).trim() === ''
  ) {
    return { error: 'Furnizorul grantului este obligatoriu' }
  }

  // Validate: deadline is future
  if (!grant.deadline || new Date(grant.deadline as string) <= new Date()) {
    return { error: 'Termenul limita trebuie sa fie in viitor' }
  }

  // Validate: at least 1 eligibility rule
  const rules = grant.eligibility_rules as unknown[] | null
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return { error: 'Cel putin o regula de eligibilitate este necesara' }
  }

  // Validate: at least 1 application field
  const { data: fields } = await admin
    .from('grant_application_fields')
    .select('id')
    .eq('grant_id', grantId)

  if (!fields || fields.length === 0) {
    return { error: 'Cel putin un camp de aplicatie este necesar' }
  }

  // All valid -- set status to active
  const { error: updateError } = await admin
    .from('grants')
    .update({ status: 'active' })
    .eq('id', grantId)

  if (updateError) {
    return { error: 'Nu am putut publica grantul' }
  }

  return { success: true }
}

export async function updateGrant(
  grantId: string,
  data: Partial<GrantUpdate>
) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Only allow updating specific fields
  const allowedFields: (keyof GrantUpdate)[] = [
    'name',
    'provider_agency',
    'description',
    'max_funding',
    'deadline',
    'eligibility_rules',
    'scoring_rubric',
    'required_documents',
    'source_form_url',
  ]

  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in data) {
      updateData[key] = data[key]
    }
  }

  const { data: grant, error } = await admin
    .from('grants')
    .update(updateData)
    .eq('id', grantId)
    .select()
    .single()

  if (error) {
    return { error: 'Nu am putut actualiza grantul' }
  }

  return { success: true, grant }
}
