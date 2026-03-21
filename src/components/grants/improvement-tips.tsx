import { Lightbulb } from 'lucide-react'

export function ImprovementTips({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) return null

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
        <Lightbulb className="size-4" />
        <span>Ce poti imbunatati:</span>
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-700">
        {suggestions.map((suggestion, i) => (
          <li key={i}>{suggestion}</li>
        ))}
      </ul>
    </div>
  )
}
