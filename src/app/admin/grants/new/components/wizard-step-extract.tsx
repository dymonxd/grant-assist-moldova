'use client'

import { useState, useRef } from 'react'
import { uploadAndExtractPdf } from '@/app/actions/admin-grants'
import type { ExtractedGrantData } from '@/lib/ai/extract-grant-pdf'

interface WizardStepExtractProps {
  onComplete: (data: ExtractedGrantData) => void
  onSkip: () => void
  onBack: () => void
}

export function WizardStepExtract({
  onComplete,
  onSkip,
  onBack,
}: WizardStepExtractProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] =
    useState<ExtractedGrantData | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)

    // Client-side validation
    if (file.type !== 'application/pdf') {
      setError('Doar fisiere PDF sunt acceptate')
      return
    }

    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('Fisierul depaseste limita de 20MB')
      return
    }

    setFileName(file.name)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const result = await uploadAndExtractPdf(formData)

      if ('error' in result) {
        setError(result.error as string)
        setExtractedData(null)
      } else {
        setExtractedData(result.data as ExtractedGrantData)
      }
    } catch {
      setError('Nu am putut extrage datele din PDF')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-4 text-lg font-semibold">Extragere din PDF</h2>

      {!extractedData && !isLoading && (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <svg
              className="mb-3 h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium">
              Trageti fisierul PDF aici sau faceti click pentru a selecta
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Doar .pdf, maxim 20MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />
        </>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Se extrag datele din PDF...</p>
          {fileName && (
            <p className="text-xs text-muted-foreground">{fileName}</p>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={onSkip}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Introducere manuala
          </button>
        </div>
      )}

      {/* Extraction success preview */}
      {extractedData && !isLoading && (
        <div className="space-y-3">
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-sm font-medium text-green-700">
              Datele au fost extrase cu succes din {fileName}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-600">
              <div>
                Reguli de eligibilitate:{' '}
                <strong>{extractedData.eligibilityRules.length}</strong>
              </div>
              <div>
                Criterii de punctaj:{' '}
                <strong>{extractedData.scoringRubric.length}</strong>
              </div>
              <div>
                Campuri de aplicatie:{' '}
                <strong>{extractedData.applicationFields.length}</strong>
              </div>
              <div>
                Documente necesare:{' '}
                <strong>{extractedData.requiredDocuments.length}</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onComplete(extractedData)}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Urmatorul pas
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Inapoi
        </button>
        {!extractedData && !isLoading && (
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Sariti acest pas
          </button>
        )}
      </div>
    </div>
  )
}
