'use client'

import { useState, useTransition } from 'react'
import {
  bulkSendNotifications,
  getBulkSendPreview,
} from '@/app/actions/admin-notifications'

const TYPE_OPTIONS = [
  { value: 'deadline_reminder', label: 'Memento termen' },
  { value: 'abandoned_draft', label: 'Ciorna abandonata' },
  { value: 'grant_expiring', label: 'Grant expira' },
  { value: 'new_grant_match', label: 'Grant nou potrivit' },
]

interface PreviewData {
  count: number
  sample: { name: string; email: string }[]
}

interface SendResult {
  sent: number
  skipped: number
  errors: number
}

export function BulkSendDialog({
  onComplete,
}: {
  onComplete?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('deadline_reminder')
  const [grantId, setGrantId] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  function handleClose() {
    setOpen(false)
    setPreview(null)
    setResult(null)
    setError(null)
    setType('deadline_reminder')
    setGrantId('')
    if (result && result.sent > 0) {
      onComplete?.()
    }
  }

  function handlePreview() {
    startTransition(async () => {
      setError(null)
      setResult(null)
      const res = await getBulkSendPreview({
        type,
        grantId: grantId || undefined,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setPreview(res.data!)
      }
    })
  }

  function handleSend() {
    startTransition(async () => {
      setError(null)
      const res = await bulkSendNotifications({
        type,
        grantId: grantId || undefined,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setResult(res.data!)
        setPreview(null)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Trimitere in masa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md rounded-lg bg-card border border-border p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">
              Trimitere notificari in masa
            </h2>

            {/* Type selector */}
            <label className="block text-sm font-medium text-foreground mb-1">
              Tip notificare
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPreview(null)
                setResult(null)
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-4"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Grant ID (for new_grant_match) */}
            {type === 'new_grant_match' && (
              <>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ID Grant
                </label>
                <input
                  type="text"
                  value={grantId}
                  onChange={(e) => setGrantId(e.target.value)}
                  placeholder="UUID-ul grantului"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-4"
                />
              </>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            {/* Preview results */}
            {preview && (
              <div className="mb-4 rounded-md border border-border p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">
                  Aceasta actiune va trimite {preview.count} emailuri
                </p>
                {preview.sample.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {preview.sample.map((s, i) => (
                      <li key={i}>
                        {s.name} ({s.email})
                      </li>
                    ))}
                    {preview.count > 5 && (
                      <li className="italic">
                        ... si inca {preview.count - 5} destinatari
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Send result */}
            {result && (
              <div className="mb-4 rounded-md border border-green-200 p-3 bg-green-50">
                <p className="text-sm font-medium text-green-800">
                  Trimise: {result.sent}, Omise: {result.skipped}, Erori:{' '}
                  {result.errors}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {result ? 'Inchide' : 'Anuleaza'}
              </button>

              {!result && !preview && (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Se incarca...' : 'Previzualizeaza'}
                </button>
              )}

              {preview && !result && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || preview.count === 0}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Se trimite...' : 'Confirma si trimite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
