'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

interface GrantFiltersProps {
  providers: string[]
}

export function GrantFilters({ providers }: GrantFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams('q', searchValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue, updateParams])

  const resetFilters = () => {
    setSearchValue('')
    router.push('/grants/browse')
  }

  const hasFilters =
    searchParams.get('q') ||
    searchParams.get('provider') ||
    searchParams.get('maxFunding') ||
    searchParams.get('deadline')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search input */}
        <div className="w-full sm:w-64">
          <label
            htmlFor="grant-search"
            className="mb-1 block text-sm font-medium"
          >
            Cauta
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="grant-search"
              type="text"
              placeholder="Cauta granturi..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Provider dropdown (native select for simplicity) */}
        <div className="w-full sm:w-48">
          <label
            htmlFor="grant-provider"
            className="mb-1 block text-sm font-medium"
          >
            Furnizor
          </label>
          <select
            id="grant-provider"
            value={searchParams.get('provider') ?? ''}
            onChange={(e) => updateParams('provider', e.target.value)}
            className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Toti furnizorii</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Max funding input */}
        <div className="w-full sm:w-44">
          <label
            htmlFor="grant-funding"
            className="mb-1 block text-sm font-medium"
          >
            Suma maxima (MDL)
          </label>
          <Input
            id="grant-funding"
            type="number"
            placeholder="ex: 500000"
            value={searchParams.get('maxFunding') ?? ''}
            onChange={(e) => updateParams('maxFunding', e.target.value)}
            min={0}
          />
        </div>

        {/* Deadline date input */}
        <div className="w-full sm:w-44">
          <label
            htmlFor="grant-deadline"
            className="mb-1 block text-sm font-medium"
          >
            Pana la data
          </label>
          <Input
            id="grant-deadline"
            type="date"
            value={searchParams.get('deadline') ?? ''}
            onChange={(e) => updateParams('deadline', e.target.value)}
          />
        </div>

        {/* Reset button */}
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
            Reseteaza filtrele
          </button>
        )}
      </div>
    </div>
  )
}
