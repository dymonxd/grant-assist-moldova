import type { ActivityEvent } from '@/app/actions/admin-analytics'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  session_start: { label: 'Sesiune', color: 'bg-slate-100 text-slate-700' },
  idno_entered: { label: 'IDNO', color: 'bg-blue-100 text-blue-700' },
  idea_entered: { label: 'Idee', color: 'bg-cyan-100 text-cyan-700' },
  profile_created: { label: 'Profil', color: 'bg-teal-100 text-teal-700' },
  grants_viewed: {
    label: 'Granturi',
    color: 'bg-indigo-100 text-indigo-700',
  },
  account_created: { label: 'Cont', color: 'bg-green-100 text-green-700' },
  writer_started: {
    label: 'Redactor',
    color: 'bg-purple-100 text-purple-700',
  },
  section_generated: {
    label: 'Sectiune',
    color: 'bg-violet-100 text-violet-700',
  },
  section_saved: { label: 'Salvat', color: 'bg-amber-100 text-amber-700' },
  application_exported: {
    label: 'Export',
    color: 'bg-emerald-100 text-emerald-700',
  },
}

const dateFormatter = new Intl.DateTimeFormat('ro-MD', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nicio activitate recenta
      </p>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-1">
      {events.map((event, i) => {
        const meta = EVENT_LABELS[event.event_type] ?? {
          label: event.event_type,
          color: 'bg-muted text-muted-foreground',
        }

        return (
          <div
            key={`${event.session_id}-${event.created_at}-${i}`}
            className="flex items-center gap-3 rounded px-3 py-2 hover:bg-accent/50 transition-colors"
          >
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}
            >
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground flex-1 truncate">
              {dateFormatter.format(new Date(event.created_at))}
            </span>
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {event.session_id.slice(0, 8)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
