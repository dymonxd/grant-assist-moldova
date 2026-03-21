'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Info } from 'lucide-react'

const SOURCE_LABELS: Record<string, string> = {
  'openmoney.md': 'OpenMoney',
  'idno.md': 'IDNO.md',
  'srl.md': 'SRL.md',
}

const STATUS_LABELS: Record<string, string> = {
  success: 'succes',
  error: 'eroare',
  timeout: 'timeout',
}

export function PartialBadge({
  sourceStatus,
}: {
  sourceStatus: Record<string, 'success' | 'error' | 'timeout'>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="focus:outline-none"
      >
        <Badge variant="secondary" className="cursor-pointer gap-1">
          <Info className="size-3" />
          Date partiale
        </Badge>
      </button>

      {expanded && (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs space-y-0.5">
          {Object.entries(sourceStatus).map(([source, status]) => (
            <p key={source}>
              <span className="font-medium">
                {SOURCE_LABELS[source] ?? source}
              </span>
              :{' '}
              <span
                className={
                  status === 'success'
                    ? 'text-green-600'
                    : status === 'error'
                      ? 'text-destructive'
                      : 'text-yellow-600'
                }
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
