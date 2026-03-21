'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Collapsible rubric criteria display for grant sections.
 *
 * Shows scoring rubric criteria with weights to help users
 * understand what evaluators look for. Default state: collapsed.
 * Uses useState toggle rather than shadcn Accordion for simplicity.
 *
 * Requirement: WRITE-06
 */

interface Criterion {
  name: string
  weight: number
  description: string
}

interface ScoringHintsProps {
  criteria: Criterion[] | null
}

export function ScoringHints({ criteria }: ScoringHintsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!criteria || criteria.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 text-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium hover:bg-muted/50"
        aria-expanded={isExpanded}
      >
        <span>Criterii de evaluare</span>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {criteria.map((criterion, index) => (
            <div key={index} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {criterion.name}
              </span>{' '}
              ({criterion.weight}%): {criterion.description}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
