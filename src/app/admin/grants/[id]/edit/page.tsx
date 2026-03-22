import { createAdminClient } from '@/lib/supabase/admin'
import { EditGrantForm } from './edit-grant-form'

interface EditGrantPageProps {
  params: Promise<{ id: string }>
}

export default async function EditGrantPage({ params }: EditGrantPageProps) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: grant, error } = await admin
    .from('grants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !grant) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-red-600">Grantul nu a fost gasit.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <EditGrantForm grant={grant} />
    </main>
  )
}
