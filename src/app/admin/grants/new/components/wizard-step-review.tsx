'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { WizardBasicInfo } from '@/app/actions/admin-grants'
import type { ExtractedGrantData } from '@/lib/ai/extract-grant-pdf'
import {
  createGrantFromWizard,
  publishGrant,
  notifyMatchingProfiles,
} from '@/app/actions/admin-grants'

interface WizardStepReviewProps {
  basicInfo: WizardBasicInfo
  extractedData: ExtractedGrantData
  onBack: () => void
}

export function WizardStepReview({
  basicInfo,
  extractedData,
  onBack,
}: WizardStepReviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editable extracted data state
  const [rules, setRules] = useState<string[]>(extractedData.eligibilityRules)
  const [rubric, setRubric] = useState(extractedData.scoringRubric)
  const [fields, setFields] = useState(extractedData.applicationFields)
  const [docs, setDocs] = useState<string[]>(extractedData.requiredDocuments)

  // --- Rules editing ---
  function addRule() {
    setRules([...rules, ''])
  }
  function updateRule(index: number, value: string) {
    setRules(rules.map((r, i) => (i === index ? value : r)))
  }
  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index))
  }

  // --- Rubric editing ---
  function addRubricRow() {
    setRubric([...rubric, { criterion: '', weight: 0 }])
  }
  function updateRubricRow(
    index: number,
    field: 'criterion' | 'weight',
    value: string | number
  ) {
    setRubric(
      rubric.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
    )
  }
  function removeRubricRow(index: number) {
    setRubric(rubric.filter((_, i) => i !== index))
  }

  // --- Application fields editing ---
  function addField() {
    setFields([
      ...fields,
      { label: '', type: 'text', required: false, characterLimit: null },
    ])
  }
  function updateField(
    index: number,
    key: string,
    value: string | boolean | number | null
  ) {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    )
  }
  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }
  function moveField(index: number, direction: 'up' | 'down') {
    const newFields = [...fields]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newFields.length) return
    ;[newFields[index], newFields[swapIndex]] = [
      newFields[swapIndex],
      newFields[index],
    ]
    setFields(newFields)
  }

  // --- Documents editing ---
  function addDoc() {
    setDocs([...docs, ''])
  }
  function updateDoc(index: number, value: string) {
    setDocs(docs.map((d, i) => (i === index ? value : d)))
  }
  function removeDoc(index: number) {
    setDocs(docs.filter((_, i) => i !== index))
  }

  // --- Build final extracted data ---
  function buildExtractedData(): ExtractedGrantData {
    return {
      eligibilityRules: rules.filter((r) => r.trim() !== ''),
      scoringRubric: rubric.filter((r) => r.criterion.trim() !== ''),
      applicationFields: fields.filter((f) => f.label.trim() !== ''),
      requiredDocuments: docs.filter((d) => d.trim() !== ''),
    }
  }

  // --- Save as draft ---
  function handleSaveDraft() {
    setError(null)
    startTransition(async () => {
      const result = await createGrantFromWizard(basicInfo, buildExtractedData())
      if ('error' in result) {
        setError(result.error as string)
      } else {
        router.push('/admin/grants')
      }
    })
  }

  // --- Publish ---
  function handlePublish() {
    setError(null)
    startTransition(async () => {
      // First create the grant
      const createResult = await createGrantFromWizard(
        basicInfo,
        buildExtractedData()
      )
      if ('error' in createResult) {
        setError(createResult.error as string)
        return
      }

      const grantId = createResult.grantId as string

      // Then publish it
      const publishResult = await publishGrant(grantId)
      if ('error' in publishResult) {
        setError(publishResult.error as string)
        return
      }

      // Then notify matching profiles
      const notifyResult = await notifyMatchingProfiles(grantId)
      const sentCount =
        'sent' in notifyResult ? (notifyResult.sent as number) : 0

      setSuccessMessage(
        `Grant publicat. ${sentCount} utilizator${sentCount !== 1 ? 'i' : ''} notificat${sentCount !== 1 ? 'i' : ''}.`
      )

      // Redirect after brief delay to show success message
      setTimeout(() => router.push('/admin/grants'), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Revizuire si publicare</h2>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            {successMessage}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Basic info summary */}
      <div className="rounded-md border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Informatii de baza
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nume:</span>{' '}
            {basicInfo.name}
          </div>
          <div>
            <span className="text-muted-foreground">Furnizor:</span>{' '}
            {basicInfo.provider_agency}
          </div>
          <div>
            <span className="text-muted-foreground">Termen limita:</span>{' '}
            {new Intl.DateTimeFormat('ro-MD', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(new Date(basicInfo.deadline))}
          </div>
          {basicInfo.max_funding && (
            <div>
              <span className="text-muted-foreground">Finantare maxima:</span>{' '}
              {new Intl.NumberFormat('ro-MD').format(basicInfo.max_funding)} MDL
            </div>
          )}
        </div>
      </div>

      {/* Eligibility rules */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Reguli de eligibilitate</h3>
          <button
            onClick={addRule}
            className="text-xs text-primary hover:underline"
          >
            + Adauga regula
          </button>
        </div>
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateRule(i, e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                placeholder="Regula de eligibilitate..."
              />
              <button
                onClick={() => removeRule(i)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Sterge
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nicio regula adaugata
            </p>
          )}
        </div>
      </div>

      {/* Scoring rubric */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Grila de punctaj</h3>
          <button
            onClick={addRubricRow}
            className="text-xs text-primary hover:underline"
          >
            + Adauga criteriu
          </button>
        </div>
        {rubric.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-1">Criteriu</th>
                <th className="w-24 pb-1">Pondere (%)</th>
                <th className="w-16 pb-1" />
              </tr>
            </thead>
            <tbody>
              {rubric.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={row.criterion}
                      onChange={(e) =>
                        updateRubricRow(i, 'criterion', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      value={row.weight}
                      onChange={(e) =>
                        updateRubricRow(i, 'weight', Number(e.target.value))
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      min={0}
                      max={100}
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      onClick={() => removeRubricRow(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Sterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rubric.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Niciun criteriu adaugat
          </p>
        )}
      </div>

      {/* Application fields */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Campuri de aplicatie</h3>
          <button
            onClick={addField}
            className="text-xs text-primary hover:underline"
          >
            + Adauga camp
          </button>
        </div>
        {fields.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-1">Eticheta</th>
                <th className="w-28 pb-1">Tip</th>
                <th className="w-20 pb-1 text-center">Obligatoriu</th>
                <th className="w-24 pb-1">Limita car.</th>
                <th className="w-24 pb-1" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(i, 'label', e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(i, 'type', e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="number">Numar</option>
                      <option value="date">Data</option>
                    </select>
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateField(i, 'required', e.target.checked)
                      }
                      className="rounded border-border"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      value={field.characterLimit ?? ''}
                      onChange={(e) =>
                        updateField(
                          i,
                          'characterLimit',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      min={0}
                      placeholder="-"
                    />
                  </td>
                  <td className="flex items-center gap-1 py-1.5">
                    <button
                      onClick={() => moveField(i, 'up')}
                      disabled={i === 0}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Muta sus"
                    >
                      ^
                    </button>
                    <button
                      onClick={() => moveField(i, 'down')}
                      disabled={i === fields.length - 1}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Muta jos"
                    >
                      v
                    </button>
                    <button
                      onClick={() => removeField(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Sterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Niciun camp adaugat</p>
        )}
      </div>

      {/* Required documents */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Documente necesare</h3>
          <button
            onClick={addDoc}
            className="text-xs text-primary hover:underline"
          >
            + Adauga document
          </button>
        </div>
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={doc}
                onChange={(e) => updateDoc(i, e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                placeholder="Document necesar..."
              />
              <button
                onClick={() => removeDoc(i)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Sterge
              </button>
            </div>
          ))}
          {docs.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Niciun document adaugat
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Inapoi
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={isPending}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? 'Se salveaza...' : 'Salveaza ca ciorna'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Se publica...' : 'Publica'}
          </button>
        </div>
      </div>
    </div>
  )
}
