import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { getOrCreateApplication } from '@/app/actions/writer'
import { getSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { WriterClient } from './writer-client'
import type { Metadata } from 'next'

/**
 * Writer page (Server Component).
 *
 * Loads grant data, creates/reuses application with field snapshot,
 * checks deadline, and renders WriterClient with all data.
 * Blocks expired grants. Passes company profile for AI context.
 *
 * Requirements: WRITE-11, WRITE-12
 */

export const metadata: Metadata = {
  title: 'Scrieti cererea | GrantAssist Moldova',
  description: 'Scrieti cererea de finantare cu ajutorul AI-ului.',
}

interface WritePageProps {
  params: Promise<{ grantId: string }>
}

export default async function WritePage({ params }: WritePageProps) {
  const { grantId } = await params

  // Load application data (creates if first visit)
  const result = await getOrCreateApplication(grantId)

  // Handle expired grant with dedicated block
  if ('error' in result && result.error === 'Termenul limita pentru acest grant a expirat') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="size-10 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold">Grant expirat</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Termenul limita pentru acest grant a expirat. Nu mai puteti
                depune cererea.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Handle other errors
  if ('error' in result || !result.application) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {result.error ?? 'A aparut o eroare neasteptata'}
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Fetch company profile for AI context
  const session = await getSession()
  let companyProfile: Record<string, unknown> = {}

  if (session.companyProfileId) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('company_profiles')
      .select('*')
      .eq('id', session.companyProfileId)
      .single()

    if (profile) {
      companyProfile = profile as Record<string, unknown>
    }
  }

  return (
    <main>
      <WriterClient
        application={result.application as {
          id: string
          grant_id: string
          status: string
          field_snapshot: unknown
        }}
        sections={
          (result.sections as Array<{
            id: string
            grant_field_id: string
            user_brief: string | null
            ai_draft: string | null
            final_text: string | null
            is_saved: boolean
          }>) ?? []
        }
        fields={
          (result.fields as Array<{
            id: string
            field_order: number
            field_label: string
            field_type: string
            is_required: boolean
            character_limit: number | null
            helper_text: string | null
          }>) ?? []
        }
        grant={
          result.grant as {
            id: string
            name: string
            provider_agency: string
            deadline: string | null
            scoring_rubric: {
              criteria: Array<{
                name: string
                weight: number
                description: string
              }>
            } | null
            required_documents: string[] | null
            max_funding: number | null
            currency: string
            description: string | null
          }
        }
        isUrgent={result.isUrgent ?? false}
        companyProfile={companyProfile}
      />
    </main>
  )
}
