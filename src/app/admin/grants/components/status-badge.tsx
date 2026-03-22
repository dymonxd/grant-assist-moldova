import type { DisplayStatus } from '@/app/actions/admin-grants'

const statusStyles: Record<DisplayStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Active:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Expiring:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels: Record<DisplayStatus, string> = {
  Draft: 'Ciorna',
  Active: 'Activ',
  Expiring: 'Expira curand',
  Expired: 'Expirat',
}

interface StatusBadgeProps {
  status: DisplayStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
