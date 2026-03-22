'use client'

import type { FunnelStage } from '@/app/actions/admin-analytics'

interface FunnelBarProps {
  stages: FunnelStage[]
  onStageClick: (stage: string) => void
  selectedStage: string | null
}

const OPACITY_STEPS = [1, 0.9, 0.8, 0.7, 0.6, 0.5]

export function FunnelBar({
  stages,
  onStageClick,
  selectedStage,
}: FunnelBarProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, index) => {
        const percent = Math.max((stage.count / maxCount) * 100, 8)
        const isSelected = selectedStage === stage.stage

        return (
          <button
            key={stage.stage}
            type="button"
            onClick={() => onStageClick(stage.stage)}
            className={`flex items-center gap-3 rounded-md p-2 text-left transition-colors ${
              isSelected
                ? 'bg-accent ring-2 ring-ring'
                : 'hover:bg-accent/50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">
                  {stage.label}
                </span>
                <span className="text-sm font-semibold tabular-nums ml-2">
                  {stage.count.toLocaleString('ro-MD')}
                </span>
              </div>
              <div className="h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full rounded bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${percent}%`,
                    opacity: OPACITY_STEPS[index] ?? 0.5,
                  }}
                />
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                index === 0
                  ? 'bg-blue-100 text-blue-800'
                  : stage.rate >= 50
                    ? 'bg-green-100 text-green-800'
                    : stage.rate >= 25
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
              }`}
            >
              {stage.rate}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
