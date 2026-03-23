import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationToggle } from './notification-toggle'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ unsubscribed?: string }>
}) {
  const { unsubscribed } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch current notification preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_notifications')
    .eq('id', user.id)
    .single()

  const emailNotifications = profile?.email_notifications ?? true

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Inapoi la pagina principala
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Setari</h1>

      {unsubscribed === 'true' && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Ai fost dezabonat cu succes de la notificarile prin email.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notificari</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Gestioneaza preferintele tale de notificare prin email.
          </p>
          <NotificationToggle initialValue={emailNotifications} />
        </CardContent>
      </Card>
    </div>
  )
}
