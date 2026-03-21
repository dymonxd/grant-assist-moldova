'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'

/**
 * Writer server actions for application lifecycle management.
 *
 * - getOrCreateApplication: creates or reuses applications with field snapshots
 * - saveSection: persists section text with server-side truncation (WRITE-07)
 * - checkDeadline: evaluates deadline status (WRITE-12)
 *
 * Uses createAdminClient for RLS bypass -- anonymous users (AUTH-04)
 * need service-role access since RLS requires auth.uid().
 */

// --- Types ---

interface DeadlineResult {
  status: 'expired' | 'urgent' | 'ok'
  daysLeft: number
}

interface ApplicationResult {
  application?: Record<string, unknown>
  sections?: Record<string, unknown>[]
  fields?: Record<string, unknown>[]
  grant?: Record<string, unknown>
  isUrgent?: boolean
  error?: string
}

interface SaveResult {
  success?: boolean
  wasTruncated?: boolean
  error?: string
}

// --- Deadline check ---

/**
 * Evaluates a grant deadline and returns status.
 *
 * - expired: deadline has passed
 * - urgent: deadline is within 3 days
 * - ok: deadline is more than 3 days away, or null (no deadline)
 */
export function checkDeadline(deadline: string | null): DeadlineResult {
  if (deadline === null) {
    return { status: 'ok', daysLeft: Infinity }
  }

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return { status: 'expired', daysLeft }
  }

  if (daysLeft <= 3) {
    return { status: 'urgent', daysLeft }
  }

  return { status: 'ok', daysLeft }
}

// --- Application CRUD ---

/**
 * Gets or creates an application for the given grant.
 *
 * On first visit: creates application with field_snapshot JSONB,
 * pre-creates application_sections rows for each field (WRITE-13).
 * On subsequent visits: returns existing in-progress application.
 * Checks deadline: blocks expired grants, flags urgent ones (WRITE-12).
 */
export async function getOrCreateApplication(
  grantId: string
): Promise<ApplicationResult> {
  const session = await getSession()
  if (!session.companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  const admin = createAdminClient()

  // 1. Fetch grant data
  const { data: grant, error: grantErr } = await admin
    .from('grants')
    .select(
      'id, name, provider_agency, deadline, scoring_rubric, required_documents, max_funding, currency, description'
    )
    .eq('id', grantId)
    .single()

  if (grantErr || !grant) {
    return { error: 'Grantul nu a fost gasit' }
  }

  // 2. Check deadline (WRITE-12)
  const deadlineCheck = checkDeadline(grant.deadline)
  if (deadlineCheck.status === 'expired') {
    return { error: 'Termenul limita pentru acest grant a expirat' }
  }
  const isUrgent = deadlineCheck.status === 'urgent'

  // 3. Check for existing in-progress application
  const { data: existingApp } = await admin
    .from('applications')
    .select('*')
    .eq('grant_id', grantId)
    .eq('company_profile_id', session.companyProfileId)
    .eq('status', 'in_progress')
    .single()

  if (existingApp) {
    // Fetch existing sections
    const { data: sections } = await admin
      .from('application_sections')
      .select('*')
      .eq('application_id', existingApp.id)

    return {
      application: existingApp,
      sections: sections ?? [],
      fields: existingApp.field_snapshot ?? [],
      grant,
      isUrgent,
    }
  }

  // 4. No existing application -- create new one
  // Fetch grant_application_fields
  const { data: fields } = await admin
    .from('grant_application_fields')
    .select('*')
    .eq('grant_id', grantId)
    .order('field_order')

  if (!fields || fields.length === 0) {
    return { error: 'Nu au fost gasite campuri pentru acest grant' }
  }

  // Create application with field_snapshot (WRITE-13)
  const { data: newApp, error: appErr } = await admin
    .from('applications')
    .insert({
      grant_id: grantId,
      company_profile_id: session.companyProfileId,
      field_snapshot: fields,
      status: 'in_progress',
    })
    .select()
    .single()

  if (appErr || !newApp) {
    return { error: 'Eroare la crearea aplicatiei' }
  }

  // Pre-create application_sections for each field
  const sectionInserts = fields.map(
    (f: Record<string, unknown>) => ({
      application_id: newApp.id,
      grant_field_id: f.id,
    })
  )
  await admin.from('application_sections').insert(sectionInserts)

  return {
    application: newApp,
    sections: sectionInserts,
    fields,
    grant,
    isUrgent,
  }
}

// --- Section save ---

/**
 * Saves a section's final text with server-side truncation (WRITE-07).
 *
 * If finalText exceeds the field's character_limit, truncates before
 * persisting and returns wasTruncated=true so the client can warn the user.
 */
export async function saveSection(
  sectionId: string,
  finalText: string
): Promise<SaveResult> {
  const admin = createAdminClient()

  // 1. Fetch the section with its application's field_snapshot
  const { data: section, error: sectionErr } = await admin
    .from('application_sections')
    .select('id, grant_field_id, application:applications(field_snapshot)')
    .eq('id', sectionId)
    .single()

  if (sectionErr || !section) {
    return { error: 'Sectiunea nu a fost gasita' }
  }

  // 2. Look up character_limit from field_snapshot
  let wasTruncated = false
  let textToSave = finalText

  const fieldSnapshot = (
    section.application as { field_snapshot: Record<string, unknown>[] } | null
  )?.field_snapshot

  if (fieldSnapshot && Array.isArray(fieldSnapshot)) {
    const field = fieldSnapshot.find(
      (f: Record<string, unknown>) => f.id === section.grant_field_id
    )
    if (field && field.character_limit != null) {
      const limit = field.character_limit as number
      if (finalText.length > limit) {
        textToSave = finalText.slice(0, limit)
        wasTruncated = true
      }
    }
  }

  // 3. Update section
  const { error: updateErr } = await admin
    .from('application_sections')
    .update({
      final_text: textToSave,
      is_saved: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sectionId)

  if (updateErr) {
    return { error: 'Eroare la salvarea sectiunii' }
  }

  return { success: true, wasTruncated }
}
