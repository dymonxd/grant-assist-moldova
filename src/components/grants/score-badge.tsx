import { cn } from '@/lib/utils'

export function ScoreBadge({ score }: { score: number }) {
  const tier =
    score >= 75
      ? 'bg-green-100 text-green-800 border-green-200'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold',
        tier
      )}
    >
      {score}%
    </span>
  )
}
