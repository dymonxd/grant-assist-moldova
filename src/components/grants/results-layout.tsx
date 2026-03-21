'use client'

import { useState, type ReactNode } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileSidebar } from './profile-sidebar'

export function ResultsLayout({
  profile,
  shareToken,
  children,
}: {
  profile: Record<string, unknown>
  shareToken?: string | null
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    if (!shareToken) return
    const url = `${window.location.origin}/results/${shareToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezultatele tale</h1>
        {shareToken && (
          <div className="relative">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="size-4" />
              Distribuie
            </Button>
            {copied && (
              <span className="absolute -bottom-7 right-0 text-xs text-green-600">
                Copiat!
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-8">
        {/* Mobile: collapsible sidebar */}
        <div className="md:hidden">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Profilul companiei tale
            </summary>
            <div className="mt-2">
              <ProfileSidebar profile={profile} />
            </div>
          </details>
        </div>

        {/* Desktop: sticky sidebar */}
        <aside className="hidden shrink-0 md:block md:w-80">
          <div className="sticky top-8">
            <ProfileSidebar profile={profile} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
