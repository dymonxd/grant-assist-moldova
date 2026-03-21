'use client'

import { useState, useTransition } from 'react'
import { inferFromIdea } from '@/app/actions/profile'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface IdeaResult {
  profile?: Record<string, unknown>
  error?: string
}

export function IdeaForm({
  onResult,
}: {
  onResult: (result: IdeaResult) => void
}) {
  const [idea, setIdea] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = idea.trim()
    if (trimmed.length < 10) {
      setError('Descrierea trebuie sa contina cel putin 10 caractere')
      return
    }

    startTransition(async () => {
      const result = await inferFromIdea(trimmed)
      if (result.error) {
        setError(result.error)
      } else {
        onResult(result)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <Textarea
        placeholder="Descrie ideea ta de afacere in cateva propozitii..."
        value={idea}
        onChange={(e) => {
          setIdea(e.target.value)
          setError(null)
        }}
        className="min-h-24 px-4 text-base"
        disabled={isPending}
        aria-label="Ideea de afacere"
      />

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isPending || idea.trim().length < 10}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Se analizeaza ideea ta...
          </>
        ) : (
          'Analizeaza ideea'
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
