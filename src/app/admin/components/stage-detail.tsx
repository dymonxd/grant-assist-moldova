'use client'

import type { StageDetailData } from '@/app/actions/admin-analytics'

interface StageDetailProps {
  stage: string
  data: StageDetailData | null
}

const STAGE_LABELS: Record<string, string> = {
  session_start: 'Sesiuni',
  idno_entered: 'IDNO introdus',
  grants_viewed: 'Granturi vizualizate',
  account_created: 'Cont creat',
  writer_started: 'Redactor pornit',
  application_exported: 'Exportat',
}

export function StageDetail({ stage, data }: StageDetailProps) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    )
  }

  const maxTrendCount = Math.max(...data.dailyTrend.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <h3 className="text-lg font-semibold">
        Detalii: {STAGE_LABELS[stage] ?? stage}
      </h3>

      {/* Daily trend bar chart */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          Tendinta zilnica (ultimele 30 zile)
        </h4>
        <div className="flex items-end gap-px h-32">
          {data.dailyTrend.map((day) => {
            const height = Math.max(
              (day.count / maxTrendCount) * 100,
              2
            )
            return (
              <div
                key={day.date}
                className="flex-1 group relative"
              >
                <div
                  className="bg-blue-500 rounded-t transition-all hover:bg-blue-600 mx-px"
                  style={{ height: `${height}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-xs whitespace-nowrap z-10 shadow-md">
                  {day.date}: {day.count}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Device breakdown */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Dispozitive
          </h4>
          <ul className="space-y-2">
            {data.deviceBreakdown.map((d) => (
              <li
                key={d.device}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">
                  {d.device === '' || d.device === 'unknown'
                    ? 'Necunoscut'
                    : d.device}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {d.count.toLocaleString('ro-MD')}
                </span>
              </li>
            ))}
            {data.deviceBreakdown.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Fara date disponibile
              </li>
            )}
          </ul>
        </div>

        {/* Top referrers */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Surse de trafic
          </h4>
          <ol className="space-y-2">
            {data.topReferrers.map((ref, i) => (
              <li
                key={ref.url}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate mr-2">
                  {i + 1}. {ref.url}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {ref.count.toLocaleString('ro-MD')}
                </span>
              </li>
            ))}
            {data.topReferrers.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Fara date disponibile
              </li>
            )}
          </ol>
        </div>
      </div>
    </div>
  )
}
