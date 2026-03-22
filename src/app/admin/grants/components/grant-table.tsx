'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GrantCatalogItem } from '@/app/actions/admin-grants'
import {
  duplicateGrant,
  deactivateGrant,
  reScrapeGrant,
} from '@/app/actions/admin-grants'
import { StatusBadge } from './status-badge'
import { DeadlineEditor } from './deadline-editor'

interface GrantTableProps {
  grants: GrantCatalogItem[]
}

export function GrantTable({ grants: initialGrants }: GrantTableProps) {
  const router = useRouter()
  const [grants, setGrants] = useState(initialGrants)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [reScrapeLoading, setReScrapeLoading] = useState<string | null>(null)

  function handleReScrape(grantId: string) {
    setOpenMenu(null)
    setReScrapeLoading(grantId)
    startTransition(async () => {
      const result = await reScrapeGrant(grantId)
      setReScrapeLoading(null)
      if ('error' in result) {
        window.alert(result.error)
      } else {
        window.alert('Datele au fost re-extrase cu succes')
        router.refresh()
      }
    })
  }

  function handleDeadlineUpdate(grantId: string, newDeadline: string) {
    setGrants((prev) =>
      prev.map((g) => (g.id === grantId ? { ...g, deadline: newDeadline } : g))
    )
  }

  function handleDuplicate(grantId: string) {
    setOpenMenu(null)
    startTransition(async () => {
      await duplicateGrant(grantId)
      router.refresh()
    })
  }

  function handleDeactivate(grantId: string) {
    setOpenMenu(null)
    const confirmed = window.confirm(
      'Sunteti sigur ca doriti sa dezactivati acest grant?'
    )
    if (!confirmed) return

    startTransition(async () => {
      await deactivateGrant(grantId)
      router.refresh()
    })
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Intl.DateTimeFormat('ro-MD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] divide-y divide-border">
        <thead>
          <tr className="text-left text-sm font-medium text-muted-foreground">
            <th className="px-4 py-3">Nume</th>
            <th className="px-4 py-3">Furnizor</th>
            <th className="px-4 py-3">Termen limita</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Aplicatii</th>
            <th className="px-4 py-3">Ultima extragere</th>
            <th className="px-4 py-3">Actiuni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {grants.map((grant) => (
            <tr
              key={grant.id}
              className="text-sm transition-colors hover:bg-muted/50"
            >
              <td className="px-4 py-3 font-medium">{grant.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {grant.provider_agency}
              </td>
              <td className="px-4 py-3">
                <DeadlineEditor
                  grantId={grant.id}
                  currentDeadline={grant.deadline}
                  onUpdate={(d) => handleDeadlineUpdate(grant.id, d)}
                />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={grant.displayStatus} />
              </td>
              <td className="px-4 py-3 text-center">
                {grant.applicationCount}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(grant.last_scraped_at)}
              </td>
              <td className="relative px-4 py-3">
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === grant.id ? null : grant.id)
                    }
                    disabled={isPending}
                    className="rounded px-2 py-1 text-sm hover:bg-muted"
                  >
                    Actiuni
                  </button>
                  {openMenu === grant.id && (
                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-border bg-background py-1 shadow-lg">
                      <button
                        onClick={() => {
                          setOpenMenu(null)
                          router.push(`/admin/grants/${grant.id}/edit`)
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      >
                        Editeaza
                      </button>
                      <button
                        onClick={() => handleDuplicate(grant.id)}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      >
                        Duplica
                      </button>
                      <button
                        onClick={() => handleDeactivate(grant.id)}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-muted"
                      >
                        Dezactiveaza
                      </button>
                      {grant.source_form_url && (
                        <button
                          onClick={() => handleReScrape(grant.id)}
                          disabled={reScrapeLoading === grant.id}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                        >
                          {reScrapeLoading === grant.id
                            ? 'Se re-extrage...'
                            : 'Re-extragere'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setOpenMenu(null)
                          router.push(
                            `/admin/grants/${grant.id}/applications`
                          )
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      >
                        Vizualizeaza aplicatii
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
