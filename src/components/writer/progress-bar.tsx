'use client'

/**
 * Progress bar showing "X din Y sectiuni completate" with visual bar.
 *
 * Uses a simple div-based bar (bg-muted track, bg-primary fill) to avoid
 * unnecessary shadcn Progress dependency. Mobile-responsive: full width.
 *
 * Requirement: WRITE-09
 */

interface ProgressBarProps {
  completedCount: number
  totalCount: number
}

export function ProgressBar({ completedCount, totalCount }: ProgressBarProps) {
  const percentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>
          {completedCount} din {totalCount} sectiuni completate
        </span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
