import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/verify-admin'

interface ApplicationsPageProps {
  params: Promise<{ id: string }>
}

export default async function ApplicationsPage({
  params,
}: ApplicationsPageProps) {
  await requireAdmin()
  const { id } = await params
  const admin = createAdminClient()

  // Fetch grant name for header
  const { data: grant } = await admin
    .from('grants')
    .select('name')
    .eq('id', id)
    .single()

  // Fetch applications with profile info
  const { data: applications, error } = await admin
    .from('applications')
    .select('id, status, updated_at, user_id, profiles(full_name, email)')
    .eq('grant_id', id)
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-red-600">Nu am putut incarca aplicatiile.</p>
      </main>
    )
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Intl.DateTimeFormat('ro-MD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  const statusLabels: Record<string, string> = {
    draft: 'Ciorna',
    in_progress: 'In progres',
    submitted: 'Depusa',
    approved: 'Aprobata',
    rejected: 'Respinsa',
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Aplicatii
          </h1>
          {grant && (
            <p className="mt-1 text-sm text-muted-foreground">
              {grant.name}
            </p>
          )}
        </div>
        <Link
          href="/admin/grants"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Inapoi la catalog
        </Link>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Nu exista aplicatii pentru acest grant.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[600px] divide-y divide-border">
            <thead>
              <tr className="text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Utilizator</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ultima activitate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map(
                (app: Record<string, unknown>) => {
                  const profile = Array.isArray(app.profiles)
                    ? (app.profiles[0] as { full_name?: string; email?: string } | undefined)
                    : (app.profiles as { full_name?: string; email?: string } | null)
                  return (
                  <tr
                    key={app.id as string}
                    className="text-sm transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {profile?.full_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {profile?.email ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {statusLabels[app.status as string] ?? (app.status as string)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(app.updated_at as string | null)}
                    </td>
                  </tr>
                  )
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
