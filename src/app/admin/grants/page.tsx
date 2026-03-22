import Link from 'next/link'
import { getGrantsCatalog } from '@/app/actions/admin-grants'
import { GrantTable } from './components/grant-table'

export default async function AdminGrantsPage() {
  const result = await getGrantsCatalog()

  if ('error' in result) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    )
  }

  const { grants } = result

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Catalog de granturi
        </h1>
        <Link
          href="/admin/grants/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Grant nou
        </Link>
      </div>

      {grants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Nu exista granturi. Adaugati primul grant.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <GrantTable grants={grants} />
        </div>
      )}
    </main>
  )
}
