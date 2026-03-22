'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateGrant, publishGrant } from '@/app/actions/admin-grants'

interface Grant {
  id: string
  name: string
  provider_agency: string
  description: string | null
  max_funding: number | null
  deadline: string
  status: string
  eligibility_rules: unknown[] | null
  scoring_rubric: unknown | null
  required_documents: unknown[] | null
  source_form_url: string | null
}

interface EditGrantFormProps {
  grant: Grant
}

export function EditGrantForm({ grant }: EditGrantFormProps) {
  const [name, setName] = useState(grant.name)
  const [providerAgency, setProviderAgency] = useState(grant.provider_agency)
  const [description, setDescription] = useState(grant.description ?? '')
  const [maxFunding, setMaxFunding] = useState(
    grant.max_funding?.toString() ?? ''
  )
  const [deadline, setDeadline] = useState(grant.deadline?.split('T')[0] ?? '')
  const [eligibilityRules, setEligibilityRules] = useState(
    JSON.stringify(grant.eligibility_rules ?? [], null, 2)
  )
  const [scoringRubric, setScoringRubric] = useState(
    JSON.stringify(grant.scoring_rubric ?? {}, null, 2)
  )
  const [requiredDocuments, setRequiredDocuments] = useState(
    JSON.stringify(grant.required_documents ?? [], null, 2)
  )
  const [sourceFormUrl, setSourceFormUrl] = useState(
    grant.source_form_url ?? ''
  )

  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [isSaving, startSave] = useTransition()
  const [isPublishing, startPublish] = useTransition()

  function handleSave() {
    setMessage(null)

    let parsedRules: unknown[]
    let parsedRubric: unknown
    let parsedDocs: unknown[]

    try {
      parsedRules = JSON.parse(eligibilityRules)
    } catch {
      setMessage({ type: 'error', text: 'Regulile de eligibilitate nu sunt JSON valid' })
      return
    }
    try {
      parsedRubric = JSON.parse(scoringRubric)
    } catch {
      setMessage({ type: 'error', text: 'Rubrica de evaluare nu este JSON valid' })
      return
    }
    try {
      parsedDocs = JSON.parse(requiredDocuments)
    } catch {
      setMessage({ type: 'error', text: 'Documentele necesare nu sunt JSON valid' })
      return
    }

    startSave(async () => {
      const result = await updateGrant(grant.id, {
        name,
        provider_agency: providerAgency,
        description,
        max_funding: maxFunding ? Number(maxFunding) : 0,
        deadline,
        eligibility_rules: parsedRules,
        scoring_rubric: parsedRubric,
        required_documents: parsedDocs,
        source_form_url: sourceFormUrl,
      })

      if ('error' in result && result.error) {
        setMessage({ type: 'error', text: result.error as string })
      } else {
        setMessage({ type: 'success', text: 'Grantul a fost actualizat' })
      }
    })
  }

  function handlePublish() {
    setMessage(null)
    startPublish(async () => {
      const result = await publishGrant(grant.id)
      if ('error' in result && result.error) {
        setMessage({ type: 'error', text: result.error as string })
      } else {
        setMessage({ type: 'success', text: 'Grantul a fost publicat' })
      }
    })
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Editeaza grant
        </h1>
        <Link
          href="/admin/grants"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Inapoi la catalog
        </Link>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nume</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Furnizor</label>
          <input
            type="text"
            value={providerAgency}
            onChange={(e) => setProviderAgency(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descriere</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Finantare maxima (MDL)
            </label>
            <input
              type="number"
              value={maxFunding}
              onChange={(e) => setMaxFunding(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Termen limita
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Reguli de eligibilitate (JSON)
          </label>
          <textarea
            value={eligibilityRules}
            onChange={(e) => setEligibilityRules(e.target.value)}
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Rubrica de evaluare (JSON)
          </label>
          <textarea
            value={scoringRubric}
            onChange={(e) => setScoringRubric(e.target.value)}
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Documente necesare (JSON)
          </label>
          <textarea
            value={requiredDocuments}
            onChange={(e) => setRequiredDocuments(e.target.value)}
            rows={4}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            URL formular sursa
          </label>
          <input
            type="url"
            value={sourceFormUrl}
            onChange={(e) => setSourceFormUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || isPublishing}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Se salveaza...' : 'Salveaza'}
          </button>

          {grant.status !== 'active' && (
            <button
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPublishing ? 'Se publica...' : 'Publica'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
