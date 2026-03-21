'use client'

import { useState, useTransition } from 'react'
import { saveManualProfile } from '@/app/actions/profile'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ManualResult {
  profile?: Record<string, unknown>
  error?: string
}

const LEGAL_FORMS = [
  { value: 'SRL', label: 'SRL' },
  { value: 'II', label: 'II' },
  { value: 'SA', label: 'SA' },
  { value: 'GTC', label: 'GTC' },
]

export function ManualForm({
  onResult,
}: {
  onResult: (result: ManualResult) => void
}) {
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('Moldova')
  const [legalForm, setLegalForm] = useState('SRL')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!companyName.trim()) {
      setError('Numele companiei este obligatoriu')
      return
    }

    startTransition(async () => {
      const result = await saveManualProfile({
        company_name: companyName.trim(),
        industry: industry.trim(),
        location: location.trim(),
        legal_form: legalForm,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onResult(result)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <h3 className="text-lg font-semibold">Completeaza datele companiei</h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="company-name" className="text-sm font-medium">
            Denumirea companiei *
          </label>
          <Input
            id="company-name"
            placeholder="Numele companiei"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              setError(null)
            }}
            className="h-11 px-4"
            disabled={isPending}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="industry" className="text-sm font-medium">
            Industria *
          </label>
          <Input
            id="industry"
            placeholder="ex: Agricultura, IT, Comert"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="h-11 px-4"
            disabled={isPending}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">
            Locatie
          </label>
          <Input
            id="location"
            placeholder="Moldova"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-11 px-4"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="legal-form" className="text-sm font-medium">
            Forma juridica
          </label>
          <select
            id="legal-form"
            value={legalForm}
            onChange={(e) => setLegalForm(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-transparent px-4 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            disabled={isPending}
          >
            {LEGAL_FORMS.map((form) => (
              <option key={form.value} value={form.value}>
                {form.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Se salveaza...
          </>
        ) : (
          'Salveaza datele companiei'
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
