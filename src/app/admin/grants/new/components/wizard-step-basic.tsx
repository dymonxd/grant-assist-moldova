'use client'

import { useState } from 'react'
import type { WizardBasicInfo } from '@/app/actions/admin-grants'

interface WizardStepBasicProps {
  initialData: WizardBasicInfo | null
  onComplete: (data: WizardBasicInfo) => void
}

export function WizardStepBasic({
  initialData,
  onComplete,
}: WizardStepBasicProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [providerAgency, setProviderAgency] = useState(
    initialData?.provider_agency ?? ''
  )
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '')
  const [description, setDescription] = useState(
    initialData?.description ?? ''
  )
  const [maxFunding, setMaxFunding] = useState<string>(
    initialData?.max_funding?.toString() ?? ''
  )
  const [sourceFormUrl, setSourceFormUrl] = useState(
    initialData?.source_form_url ?? ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Numele grantului este obligatoriu'
    }

    if (!providerAgency.trim()) {
      newErrors.providerAgency = 'Furnizorul este obligatoriu'
    }

    if (!deadline) {
      newErrors.deadline = 'Termenul limita este obligatoriu'
    } else if (new Date(deadline) <= new Date()) {
      newErrors.deadline = 'Termenul limita trebuie sa fie in viitor'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    onComplete({
      name: name.trim(),
      provider_agency: providerAgency.trim(),
      deadline,
      description: description.trim() || undefined,
      max_funding: maxFunding ? Number(maxFunding) : undefined,
      source_form_url: sourceFormUrl.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="mb-4 text-lg font-semibold">Informatii de baza</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Nume grant <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="ex: Programul PARE 1+1"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Furnizor <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={providerAgency}
          onChange={(e) => setProviderAgency(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="ex: ODIMM"
        />
        {errors.providerAgency && (
          <p className="mt-1 text-xs text-red-500">{errors.providerAgency}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Termen limita <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {errors.deadline && (
          <p className="mt-1 text-xs text-red-500">{errors.deadline}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descriere</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Descrierea programului de finantare..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Finantare maxima (MDL)
        </label>
        <input
          type="number"
          value={maxFunding}
          onChange={(e) => setMaxFunding(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="ex: 500000"
          min={0}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          URL formular (optional)
        </label>
        <input
          type="text"
          value={sourceFormUrl}
          onChange={(e) => setSourceFormUrl(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="https://odimm.md/program/formular"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Urmatorul pas
        </button>
      </div>
    </form>
  )
}
