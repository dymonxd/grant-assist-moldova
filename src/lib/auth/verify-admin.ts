import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verify the current user is an authenticated admin.
 * Use in server actions — returns result object.
 */
export async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
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

/**
 * Verify admin access for server components (pages).
 * Redirects to / if not admin. Use at top of admin page components.
 */
export async function requireAdmin(): Promise<void> {
  const result = await verifyAdmin()
  if ('error' in result) {
    redirect('/')
  }
}
