'use client'

import { Checkbox } from '@/components/ui/checkbox'

/**
 * Required documents checklist with checkable items.
 *
 * State is managed by the parent component (checkedIds + onToggle)
 * for persistence flexibility. Renders nothing if documents is null or empty.
 *
 * Requirement: WRITE-10
 */

interface DocumentChecklistProps {
  documents: string[] | null
  checkedIds: Set<number>
  onToggle: (index: number) => void
}

export function DocumentChecklist({
  documents,
  checkedIds,
  onToggle,
}: DocumentChecklistProps) {
  if (!documents || documents.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium">Documente necesare</h3>
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <label
            key={index}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
          >
            <Checkbox
              checked={checkedIds.has(index)}
              onCheckedChange={() => onToggle(index)}
            />
            <span
              className={
                checkedIds.has(index)
                  ? 'text-muted-foreground line-through'
                  : ''
              }
            >
              {doc}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
