import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  // Backup auth check -- proxy.ts should catch this first
  if (!data?.claims) {
    redirect('/login')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold tracking-tight">
        Panou de administrare
      </h1>
      <p className="mt-4 text-muted-foreground">
        Aceasta pagina este in constructie
      </p>
    </main>
  )
}
