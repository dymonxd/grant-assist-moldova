'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScoringHints } from '@/components/writer/scoring-hints'
import { Loader2, Check, ChevronRight, RefreshCw, Pencil, Save } from 'lucide-react'

/**
 * Individual section editor with state machine and AI generation.
 *
 * State machine: idle -> generating -> drafted -> editing | saved
 * Streaming: uses fetch + ReadableStream reader (not @ai-sdk/react)
 * with AbortController for cleanup on unmount (Pitfall 6).
 *
 * Requirements: WRITE-03, WRITE-04, WRITE-07, WRITE-08
 */

type SectionState = 'idle' | 'generating' | 'drafted' | 'editing' | 'saved'

interface SectionData {
  id: string
  grant_field_id: string
  user_brief: string | null
  ai_draft: string | null
  final_text: string | null
  is_saved: boolean
}

interface FieldData {
  id: string
  field_order: number
  field_label: string
  field_type: string
  is_required: boolean
  character_limit: number | null
  helper_text: string | null
}

interface ScoringRubric {
  criteria: Array<{ name: string; weight: number; description: string }>
}

interface SectionEditorProps {
  section: SectionData
  field: FieldData
  scoringRubric: ScoringRubric | null
  companyProfile: Record<string, unknown>
  onSave: (sectionId: string, text: string) => Promise<{ wasTruncated?: boolean }>
  sectionRef?: React.RefObject<HTMLDivElement | null>
  onNextSection?: () => void
  isPreview?: boolean
}

export function SectionEditor({
  section,
  field,
  scoringRubric,
  companyProfile,
  onSave,
  sectionRef,
  onNextSection,
  isPreview = false,
}: SectionEditorProps) {
  // Determine initial state from section data
  const getInitialState = (): SectionState => {
    if (section.is_saved && section.final_text) return 'saved'
    if (section.ai_draft) return 'drafted'
    return 'idle'
  }

  const [state, setState] = useState<SectionState>(getInitialState)
  const [userBrief, setUserBrief] = useState(section.user_brief ?? '')
  const [aiText, setAiText] = useState(section.ai_draft ?? section.final_text ?? '')
  const [editText, setEditText] = useState('')
  const [truncationWarning, setTruncationWarning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // Character count for current text
  const currentText = state === 'editing' ? editText : aiText
  const charCount = currentText.length
  const charLimit = field.character_limit
  const charPercentage = charLimit ? (charCount / charLimit) * 100 : 0

  // Streaming generation
  const generateText = useCallback(async (brief: string) => {
    setState('generating')
    setErrorMessage(null)
    setTruncationWarning(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldLabel: field.field_label,
          helperText: field.helper_text,
          characterLimit: field.character_limit,
          scoringRubric: scoringRubric,
          companyProfile: companyProfile,
          userBrief: brief,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error('Eroare la generare')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setAiText(fullText)
      }

      setState('drafted')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setErrorMessage('Eroare la generarea textului. Incercati din nou.')
      setState('idle')
    } finally {
      abortRef.current = null
    }
  }, [field, scoringRubric, companyProfile])

  // Button handlers
  const handleGenerate = () => {
    generateText(userBrief)
  }

  const handleRegenerate = () => {
    generateText(userBrief)
  }

  const handleEdit = () => {
    setEditText(aiText)
    setState('editing')
  }

  const handleSave = async () => {
    const textToSave = state === 'editing' ? editText : aiText
    const result = await onSave(section.id, textToSave)
    if (result.wasTruncated) {
      setTruncationWarning(true)
    }
    setAiText(textToSave)
    setState('saved')
  }

  const handleNext = async () => {
    if (state === 'drafted' || state === 'editing') {
      const textToSave = state === 'editing' ? editText : aiText
      const result = await onSave(section.id, textToSave)
      if (result.wasTruncated) {
        setTruncationWarning(true)
      }
      setAiText(textToSave)
      setState('saved')
    }
    onNextSection?.()
  }

  const handleEditFromSaved = () => {
    setEditText(aiText)
    setState('editing')
  }

  return (
    <div ref={sectionRef} className="space-y-3" data-testid={`section-${field.id}`}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium">
          {field.field_order}. {field.field_label}
        </h3>
        {field.is_required && (
          <span className="text-xs text-destructive">*obligatoriu</span>
        )}
        {state === 'saved' && (
          <Check className="size-4 text-green-600" data-testid="saved-check" />
        )}
      </div>

      {/* Helper text */}
      {field.helper_text && (
        <p className="text-sm text-muted-foreground">{field.helper_text}</p>
      )}

      {/* Scoring hints */}
      <ScoringHints criteria={scoringRubric?.criteria ?? null} />

      {/* Section content based on state */}
      {state === 'idle' && (
        <div className="space-y-2">
          <Textarea
            placeholder="Descrieti pe scurt raspunsul dvs..."
            value={userBrief}
            onChange={(e) => setUserBrief(e.target.value)}
            className="min-h-20"
          />
          {/* WRITE-04: Short brief hint */}
          {userBrief.length > 0 && userBrief.length < 20 && (
            <p className="text-xs text-amber-600">
              Raspunsul este prea scurt -- AI-ul va pune o intrebare de clarificare
            </p>
          )}
          <Button
            onClick={handleGenerate}
            disabled={userBrief.length === 0}
            data-testid="generate-btn"
          >
            Genereaza cu AI
          </Button>
        </div>
      )}

      {state === 'generating' && (
        <div className="space-y-2">
          <div className="min-h-24 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            {aiText || (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Se genereaza...
              </span>
            )}
            {aiText && (
              <span className="inline-block animate-pulse text-primary">|</span>
            )}
          </div>
        </div>
      )}

      {state === 'drafted' && (
        <div className="space-y-2">
          <div
            className={`min-h-24 rounded-lg border border-border p-3 text-sm ${
              isPreview ? 'italic text-muted-foreground' : ''
            }`}
          >
            {aiText}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil data-icon="inline-start" className="size-3.5" />
              Editeaza
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              <RefreshCw data-icon="inline-start" className="size-3.5" />
              Regenereaza
            </Button>
            <Button size="sm" onClick={handleSave} data-testid="save-btn">
              <Save data-icon="inline-start" className="size-3.5" />
              Salveaza
            </Button>
            {onNextSection && (
              <Button variant="secondary" size="sm" onClick={handleNext}>
                Urmatoarea sectiune
                <ChevronRight data-icon="inline-end" className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {state === 'editing' && (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-32"
            data-testid="edit-textarea"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSave} data-testid="save-btn">
              <Save data-icon="inline-start" className="size-3.5" />
              Salveaza
            </Button>
            {onNextSection && (
              <Button variant="secondary" size="sm" onClick={handleNext}>
                Urmatoarea sectiune
                <ChevronRight data-icon="inline-end" className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {state === 'saved' && (
        <div className="space-y-2">
          <div className="min-h-24 rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm dark:border-green-900 dark:bg-green-950/20">
            {aiText}
          </div>
          <Button variant="outline" size="sm" onClick={handleEditFromSaved}>
            <Pencil data-icon="inline-start" className="size-3.5" />
            Editeaza
          </Button>
        </div>
      )}

      {/* Character count (WRITE-07) */}
      {charLimit && (state === 'drafted' || state === 'editing' || state === 'saved') && (
        <div className="flex items-center justify-between text-xs" data-testid="char-count">
          <span
            className={
              charPercentage >= 100
                ? 'font-medium text-destructive'
                : charPercentage >= 90
                  ? 'font-medium text-amber-600'
                  : 'text-muted-foreground'
            }
          >
            {charCount} / {charLimit} caractere
          </span>
        </div>
      )}

      {/* Truncation warning */}
      {truncationWarning && (
        <p className="text-xs text-amber-600" data-testid="truncation-warning">
          Textul a fost trunchiat la limita de {charLimit} caractere.
        </p>
      )}

      {/* Error message */}
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
