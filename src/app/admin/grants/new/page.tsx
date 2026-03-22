'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepBasic } from './components/wizard-step-basic'
import { WizardStepExtract } from './components/wizard-step-extract'
import { WizardStepReview } from './components/wizard-step-review'
import type { WizardBasicInfo } from '@/app/actions/admin-grants'
import type { ExtractedGrantData } from '@/lib/ai/extract-grant-pdf'

const STEPS = [
  '1. Informatii de baza',
  '2. Extragere din PDF',
  '3. Revizuire si publicare',
]

const EMPTY_EXTRACTION: ExtractedGrantData = {
  eligibilityRules: [],
  scoringRubric: [],
  applicationFields: [],
  requiredDocuments: [],
}

export default function NewGrantPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [basicInfo, setBasicInfo] = useState<WizardBasicInfo | null>(null)
  const [extractedData, setExtractedData] =
    useState<ExtractedGrantData>(EMPTY_EXTRACTION)

  function handleBasicInfoComplete(info: WizardBasicInfo) {
    setBasicInfo(info)
    setStep(2)
  }

  function handleExtractComplete(data: ExtractedGrantData) {
    setExtractedData(data)
    setStep(3)
  }

  function handleSkipExtract() {
    setExtractedData(EMPTY_EXTRACTION)
    setStep(3)
  }

  function handleBack() {
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grant nou</h1>
        <button
          onClick={() => router.push('/admin/grants')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Anuleaza
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isActive = step === stepNum
          const isCompleted = step > stepNum

          return (
            <div key={label} className="flex items-center">
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 ${
                    isCompleted || isActive ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-xs whitespace-nowrap ${
                    isActive
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {step === 1 && (
          <WizardStepBasic
            initialData={basicInfo}
            onComplete={handleBasicInfoComplete}
          />
        )}
        {step === 2 && (
          <WizardStepExtract
            onComplete={handleExtractComplete}
            onSkip={handleSkipExtract}
            onBack={handleBack}
          />
        )}
        {step === 3 && basicInfo && (
          <WizardStepReview
            basicInfo={basicInfo}
            extractedData={extractedData}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
