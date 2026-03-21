'use client'

import { useState, useTransition } from 'react'
import { lookupCompany } from '@/app/actions/profile'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LookupResult {
  profile?: Record<string, unknown>
  sourceStatus?: Record<string, 'success' | 'error' | 'timeout'>
  isPartial?: boolean
  allFailed?: boolean
  error?: string
}

export function IdnoForm({
  onResult,
}: {
  onResult: (result: LookupResult) => void
}) {
  const [idno, setIdno] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = idno.trim()
    if (!/^\d{13}$/.test(trimmed)) {
      setError('IDNO-ul trebuie sa contina exact 13 cifre')
      return
    }

    startTransition(async () => {
      const result = await lookupCompany(trimmed)
      if (result.error) {
        setError(result.error)
      } else {
        onResult(result)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={13}
        placeholder="Introdu IDNO-ul (13 cifre)"
        value={idno}
        onChange={(e) => {
          setIdno(e.target.value.replace(/\D/g, ''))
          setError(null)
        }}
        className="h-11 px-4 text-base"
        disabled={isPending}
        aria-label="IDNO"
      />

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Se cauta datele companiei...
          </>
        ) : (
          'Cauta compania'
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
