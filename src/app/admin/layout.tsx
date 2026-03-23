import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Admin | GrantAssist Moldova',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/grants', label: 'Granturi' },
    { href: '/admin/notifications', label: 'Notificari' },
  ]

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card">
        <nav className="flex flex-col gap-1 p-4">
          <span className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
            Administrare
          </span>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="flex flex-col flex-1">
        <nav className="flex md:hidden gap-1 px-4 py-2 border-b border-border bg-card overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
