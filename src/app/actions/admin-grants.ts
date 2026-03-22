'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractGrantFromPdf, validateScrapeUrl } from '@/lib/ai/extract-grant-pdf'
import type { ExtractedGrantData } from '@/lib/ai/extract-grant-pdf'
import { Resend } from 'resend'

// --- Types ---

export type DisplayStatus = 'Draft' | 'Active' | 'Expiring' | 'Expired'

export interface GrantCatalogItem {
  id: string
  name: string
  provider_agency: string
  deadline: string
  status: string
  last_scraped_at: string | null
  source_form_url: string | null
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
      source_form_url: grant.source_form_url as string | null,
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

// --- Wizard & extraction actions (Plan 03) ---

export interface WizardBasicInfo {
  name: string
  provider_agency: string
  deadline: string
  description?: string
  max_funding?: number
  source_form_url?: string
}

export async function createGrantFromWizard(
  basicInfo: WizardBasicInfo,
  extractedData: ExtractedGrantData
) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Insert grant with draft status
  const { data: grant, error: insertError } = await admin
    .from('grants')
    .insert({
      name: basicInfo.name,
      provider_agency: basicInfo.provider_agency,
      deadline: basicInfo.deadline,
      description: basicInfo.description || null,
      max_funding: basicInfo.max_funding || null,
      source_form_url: basicInfo.source_form_url || null,
      eligibility_rules: extractedData.eligibilityRules,
      scoring_rubric: extractedData.scoringRubric,
      required_documents: extractedData.requiredDocuments,
      status: 'draft',
    })
    .select()
    .single()

  if (insertError || !grant) {
    return { error: 'Nu am putut crea grantul' }
  }

  // Insert application fields
  if (extractedData.applicationFields.length > 0) {
    const fieldRows = extractedData.applicationFields.map((field, index) => ({
      grant_id: grant.id,
      field_order: index + 1,
      field_label: field.label,
      field_type: field.type,
      is_required: field.required,
      character_limit: field.characterLimit,
      helper_text: null,
    }))

    const { error: fieldsError } = await admin
      .from('grant_application_fields')
      .insert(fieldRows)

    if (fieldsError) {
      return { error: 'Grantul a fost creat, dar campurile nu au fost salvate' }
    }
  }

  return { success: true, grantId: grant.id as string }
}

export async function uploadAndExtractPdf(formData: FormData) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const file = formData.get('pdf') as File | null
  if (!file) {
    return { error: 'Fisierul PDF lipseste' }
  }

  // Validate MIME type
  if (file.type !== 'application/pdf') {
    return { error: 'Doar fisiere PDF sunt acceptate' }
  }

  // Validate file size (20MB max)
  const MAX_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { error: 'Fisierul depaseste limita de 20MB' }
  }

  try {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = Buffer.from(await file.arrayBuffer())
    const { text } = await pdfParse(buffer)

    const extracted = await extractGrantFromPdf(text)
    return { success: true, data: extracted }
  } catch {
    return { error: 'Nu am putut extrage datele din PDF' }
  }
}

export async function reScrapeGrant(grantId: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Fetch grant's source URL
  const { data: grant, error: fetchError } = await admin
    .from('grants')
    .select('source_form_url')
    .eq('id', grantId)
    .single()

  if (fetchError || !grant) {
    return { error: 'Grantul nu a fost gasit' }
  }

  const url = grant.source_form_url as string | null
  if (!url) {
    return { error: 'Grantul nu are un URL sursa' }
  }

  // SSRF protection
  if (!validateScrapeUrl(url)) {
    return { error: 'URL-ul nu este permis' }
  }

  try {
    // Fetch URL content
    const response = await fetch(url)
    const html = await response.text()

    // Extract text from HTML (strip tags)
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // AI extraction
    const extracted = await extractGrantFromPdf(textContent)

    // Update grant with new extracted data
    const { error: updateError } = await admin
      .from('grants')
      .update({
        eligibility_rules: extracted.eligibilityRules,
        scoring_rubric: extracted.scoringRubric,
        required_documents: extracted.requiredDocuments,
        last_scraped_at: new Date().toISOString(),
      })
      .eq('id', grantId)

    if (updateError) {
      return { error: 'Nu am putut actualiza grantul' }
    }

    // Update application fields -- delete old, insert new
    await admin.from('grant_application_fields').delete().eq('grant_id', grantId)

    if (extracted.applicationFields.length > 0) {
      const fieldRows = extracted.applicationFields.map((field, index) => ({
        grant_id: grantId,
        field_order: index + 1,
        field_label: field.label,
        field_type: field.type,
        is_required: field.required,
        character_limit: field.characterLimit,
        helper_text: null,
      }))

      await admin.from('grant_application_fields').insert(fieldRows)
    }

    return { success: true }
  } catch {
    return { error: 'Nu am putut re-extrage datele' }
  }
}

export async function notifyMatchingProfiles(grantId: string) {
  const authResult = await verifyAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const admin = createAdminClient()

  // Fetch the new grant
  const { data: grant, error: grantError } = await admin
    .from('grants')
    .select('id, name, max_funding, deadline')
    .eq('id', grantId)
    .single()

  if (grantError || !grant) {
    return { error: 'Grantul nu a fost gasit' }
  }

  // Query profiles with email_notifications enabled
  const { data: profiles, error: profilesError } = await admin
    .from('company_profiles')
    .select('id, user_id, company_name, profiles(email)')
    .eq('email_notifications', true)

  if (profilesError || !profiles) {
    return { sent: 0 }
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: 'Serviciul de email nu este configurat' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sentCount = 0

  for (const profile of profiles) {
    // Check for existing notification (prevent duplicates)
    const { data: existing } = await admin
      .from('notifications_log')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('grant_id', grantId)
      .eq('type', 'new_grant_match')
      .limit(1)

    if (existing && existing.length > 0) {
      continue
    }

    // Get email from profiles join
    const profileData = Array.isArray(profile.profiles)
      ? profile.profiles[0]
      : profile.profiles
    const email = (profileData as Record<string, unknown>)?.email as string | null

    if (!email) continue

    try {
      // Format funding for email
      const funding = grant.max_funding
        ? new Intl.NumberFormat('ro-MD', {
            style: 'currency',
            currency: 'MDL',
            maximumFractionDigits: 0,
          }).format(Number(grant.max_funding))
        : 'Nespecificat'

      const deadline = grant.deadline
        ? new Intl.DateTimeFormat('ro-MD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(grant.deadline as string))
        : 'Nespecificat'

      await resend.emails.send({
        from: 'GrantAssist <onboarding@resend.dev>',
        to: [email],
        subject: `Grant nou disponibil: ${grant.name}`,
        html: `
          <h2>Grant nou disponibil</h2>
          <p>Un grant care se potriveste profilului dvs. a fost publicat:</p>
          <h3>${grant.name}</h3>
          <ul>
            <li><strong>Finantare maxima:</strong> ${funding}</li>
            <li><strong>Termen limita:</strong> ${deadline}</li>
          </ul>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/grants/${grant.id}"
               style="display:inline-block;padding:12px 24px;background:#e67e22;color:#fff;text-decoration:none;border-radius:6px;">
              Vezi detalii grant
            </a>
          </p>
        `,
      })

      // Log notification
      await admin.from('notifications_log').insert({
        user_id: profile.user_id,
        grant_id: grantId,
        type: 'new_grant_match',
        channel: 'email',
      })

      sentCount++
    } catch {
      // Continue sending to other profiles on individual failures
    }
  }

  return { sent: sentCount }
}
