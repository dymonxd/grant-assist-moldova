import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { GrantFilters } from './filters'
import { GrantList } from './grant-list'
import type { Grant } from './grant-card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Granturi disponibile | GrantAssist Moldova',
  description:
    'Descopera oportunitatile de finantare disponibile pentru afacerea ta din Moldova.',
}

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string
    provider?: string
    maxFunding?: string
    deadline?: string
  }>
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams

  let grants: Grant[] = []
  let providers: string[] = []
  let error: string | null = null

  try {
    const supabase = await createClient()

    // Build the main query
    let query = supabase
      .from('grants')
      .select(
        'id, name, provider_agency, description, max_funding, currency, deadline'
      )
      .eq('status', 'active')
      .order('deadline', { ascending: true })

    // Apply filters conditionally
    if (params.q) {
      // Escape LIKE wildcards (% and _) in user input to prevent pattern injection
      const escapedQ = params.q.replace(/%/g, '\\%').replace(/_/g, '\\_')
      query = query.ilike('name', `%${escapedQ}%`)
    }
    if (params.provider) {
      query = query.eq('provider_agency', params.provider)
    }
    if (params.maxFunding) {
      const maxFundingNum = parseInt(params.maxFunding, 10)
      if (!isNaN(maxFundingNum)) {
        query = query.lte('max_funding', maxFundingNum)
      }
    }
    if (params.deadline) {
      query = query.lte('deadline', params.deadline)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      error = 'Nu am putut incarca granturile. Incearca din nou mai tarziu.'
      console.error('Grants query error:', queryError)
    } else {
      grants = (data ?? []) as Grant[]
    }

    // Fetch distinct providers for the filter dropdown
    const { data: providerData } = await supabase
      .from('grants')
      .select('provider_agency')
      .eq('status', 'active')

    if (providerData) {
      const uniqueProviders = [
        ...new Set(providerData.map((row) => row.provider_agency)),
      ]
      providers = uniqueProviders.sort()
    }
  } catch (e) {
    error = 'A aparut o eroare neasteptata. Incearca din nou mai tarziu.'
    console.error('Browse page error:', e)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold">Granturi disponibile</h1>
        <p className="text-muted-foreground">
          Descopera oportunitatile de finantare disponibile pentru afacerea ta
        </p>
      </div>

      <Suspense fallback={null}>
        <GrantFilters providers={providers} />
      </Suspense>

      <div className="mt-6">
        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <GrantList grants={grants} />
        )}
      </div>
    </main>
  )
}
