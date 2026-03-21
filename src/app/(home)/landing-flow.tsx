'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IdnoForm } from './idno-form'
import { IdeaForm } from './idea-form'
import { ProfileResult } from './profile-result'
import { ManualForm } from './manual-form'
import { PurchaseChips } from './purchase-chips'
import { CheckCircle2 } from 'lucide-react'

type Step = 'input' | 'profile' | 'manual' | 'purchase' | 'complete'
type InputMode = 'idno' | 'idea'

interface ProfileData {
  company_name?: string | null
  industry?: string | null
  location?: string | null
  legal_form?: string | null
  [key: string]: unknown
}

export function LandingFlow() {
  const [step, setStep] = useState<Step>('input')
  const [inputMode, setInputMode] = useState<InputMode>('idno')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isPartial, setIsPartial] = useState(false)
  const [sourceStatus, setSourceStatus] = useState<
    Record<string, 'success' | 'error' | 'timeout'> | undefined
  >(undefined)
  const [allFailed, setAllFailed] = useState(false)

  function handleLookupResult(result: {
    profile?: ProfileData
    sourceStatus?: Record<string, 'success' | 'error' | 'timeout'>
    isPartial?: boolean
    allFailed?: boolean
  }) {
    setProfile(result.profile ?? null)
    setSourceStatus(result.sourceStatus)
    setIsPartial(result.isPartial ?? false)
    setAllFailed(result.allFailed ?? false)

    if (result.allFailed) {
      setStep('manual')
    } else {
      setStep('profile')
    }
  }

  function handleIdeaResult(result: { profile?: ProfileData }) {
    setProfile(result.profile ?? null)
    setIsPartial(false)
    setSourceStatus(undefined)
    setAllFailed(false)
    setStep('profile')
  }

  function handleManualResult(result: { profile?: ProfileData }) {
    setProfile(result.profile ?? null)
    setIsPartial(false)
    setSourceStatus(undefined)
    setAllFailed(false)
    setStep('profile')
  }

  // Step: Input (IDNO or Idea)
  if (step === 'input') {
    return (
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setInputMode('idno')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              inputMode === 'idno'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Am IDNO
          </button>
          <button
            type="button"
            onClick={() => setInputMode('idea')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              inputMode === 'idea'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Am o idee de afacere
          </button>
        </div>

        {/* Form */}
        {inputMode === 'idno' ? (
          <IdnoForm onResult={handleLookupResult} />
        ) : (
          <IdeaForm onResult={handleIdeaResult} />
        )}
      </div>
    )
  }

  // Step: Manual entry (allFailed fallback)
  if (step === 'manual') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Nu am gasit date pentru acest IDNO. Completeaza datele manual.
        </p>
        <ManualForm onResult={handleManualResult} />
      </div>
    )
  }

  // Step: Profile result
  if (step === 'profile') {
    return (
      <ProfileResult
        profile={profile!}
        isPartial={isPartial}
        sourceStatus={sourceStatus}
        allFailed={allFailed}
        onManualEntry={() => setStep('manual')}
        onContinue={() => setStep('purchase')}
      />
    )
  }

  // Step: Purchase need selection
  if (step === 'purchase') {
    return <PurchaseChips onSaved={() => setStep('complete')} />
  }

  // Step: Complete
  return (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <CheckCircle2 className="size-16 text-green-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Profilul tau a fost creat!</h2>
        <p className="text-muted-foreground">
          Acum poti descoperi granturile potrivite pentru afacerea ta
        </p>
      </div>
      <Link
        href="/grants/browse"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Cauta granturi potrivite
      </Link>
    </div>
  )
}
