'use client'

import { useState, useTransition } from 'react'
import { savePurchaseNeed } from '@/app/actions/purchase'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const QUICK_NEEDS = [
  'Echipament si utilaje',
  'Software si digitalizare',
  'Instruirea personalului',
  'Materii prime',
  'Renovare spatii',
  'Transport si logistica',
  'Marketing si promovare',
  'Consultanta',
]

const INITIAL_VISIBLE = 4

export function PurchaseChips({
  onSaved,
}: {
  onSaved: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visibleChips = expanded ? QUICK_NEEDS : QUICK_NEEDS.slice(0, INITIAL_VISIBLE)

  function handleChipClick(chip: string) {
    setSelected(chip)
    setText(chip)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = text.trim()
    if (!trimmed) {
      setError('Selecteaza sau descrie ce doresti sa achizitionezi')
      return
    }

    startTransition(async () => {
      const result = await savePurchaseNeed(trimmed)
      if (result.error) {
        setError(result.error)
      } else {
        onSaved()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <h3 className="text-lg font-semibold">Ce doresti sa achizitionezi?</h3>

      <div className="flex flex-wrap gap-2">
        {visibleChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selected === chip
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            {chip}
          </button>
        ))}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Mai multe...
          </button>
        )}
      </div>

      <textarea
        aria-label="Descrierea achizitiei"
        placeholder="Descrie ce doresti sa achizitionezi..."
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSelected(null)
          setError(null)
        }}
        className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-4 py-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        disabled={isPending}
      />

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isPending || !text.trim()}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Se salveaza...
          </>
        ) : (
          'Continua'
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
