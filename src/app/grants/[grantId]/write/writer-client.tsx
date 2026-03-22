'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { GrantHeader } from './grant-header'
import { SectionEditor } from './section-editor'
import { ProgressBar } from '@/components/writer/progress-bar'
import { DocumentChecklist } from '@/components/writer/document-checklist'
import { saveSection } from '@/app/actions/writer'
import { trackEvent } from '@/app/actions/analytics'
import { ExportBar } from './export-bar'

/**
 * Writer client orchestrator.
 *
 * Renders grant header, progress bar, section editors (ordered by field_order),
 * and document checklist. Manages section save state and progress tracking.
 * Auto-previews section 1 on first visit (WRITE-02).
 *
 * Requirements: WRITE-09, WRITE-10
 */

interface GrantData {
  id: string
  name: string
  provider_agency: string
  deadline: string | null
  scoring_rubric: {
    criteria: Array<{ name: string; weight: number; description: string }>
  } | null
  required_documents: string[] | null
  max_funding: number | null
  currency: string
  description: string | null
}

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

interface ApplicationData {
  id: string
  grant_id: string
  status: string
  field_snapshot: unknown
}

interface WriterClientProps {
  application: ApplicationData
  sections: SectionData[]
  fields: FieldData[]
  grant: GrantData
  isUrgent: boolean
  companyProfile: Record<string, unknown>
  isAuthenticated: boolean
}

export function WriterClient({
  application,
  sections: initialSections,
  fields,
  grant,
  isUrgent,
  companyProfile,
  isAuthenticated,
}: WriterClientProps) {
  const [sections, setSections] = useState<SectionData[]>(initialSections)
  const [checkedDocs, setCheckedDocs] = useState<Set<number>>(new Set())
  const sectionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  // Sort fields by field_order
  const sortedFields = [...fields].sort(
    (a, b) => a.field_order - b.field_order
  )

  // Map sections by grant_field_id for quick lookup
  const sectionByFieldId = new Map(
    sections.map((s) => [s.grant_field_id, s])
  )

  // Count saved sections for progress bar
  const completedCount = sections.filter((s) => s.is_saved).length
  const totalCount = fields.length

  // Section save handler
  const handleSave = useCallback(
    async (
      sectionId: string,
      text: string
    ): Promise<{ wasTruncated?: boolean }> => {
      const result = await saveSection(sectionId, text)

      if ('error' in result) {
        return { wasTruncated: false }
      }

      // Update local state to reflect saved status
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, final_text: text, is_saved: true }
            : s
        )
      )

      return { wasTruncated: result.wasTruncated ?? false }
    },
    []
  )

  // Scroll to next section
  const scrollToSection = (fieldId: string) => {
    const el = sectionRefs.current.get(fieldId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Create ref setter for each section
  const setRef = (fieldId: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current.set(fieldId, el)
  }

  // Document checklist toggle
  const handleDocToggle = (index: number) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Track writer_started analytics event on mount (fire-and-forget)
  useEffect(() => {
    trackEvent({ eventType: 'writer_started' })
  }, [])

  // WRITE-02: Auto-preview section 1 on first visit
  // No state guard — AbortController handles Strict Mode cleanup naturally:
  // Strict Mode: mount1 starts fetch → cleanup aborts → mount2 starts new fetch → completes
  // Production: single mount → fetch completes
  useEffect(() => {
    const firstField = sortedFields[0]
    if (!firstField) return

    const firstSection = sectionByFieldId.get(firstField.id)
    if (!firstSection) return

    // Only auto-preview if section has no draft and no final text
    if (firstSection.ai_draft || firstSection.final_text) return

    const controller = new AbortController()

    fetch('/api/writer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldLabel: firstField.field_label,
        helperText: firstField.helper_text,
        characterLimit: firstField.character_limit,
        scoringRubric: grant.scoring_rubric,
        companyProfile: companyProfile,
        userBrief: 'Genereaza un text de previzualizare',
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          // Update section's ai_draft progressively
          setSections((prev) =>
            prev.map((s) =>
              s.id === firstSection.id
                ? { ...s, ai_draft: fullText }
                : s
            )
          )
        }
      })
      .catch(() => {
        // Silently ignore preview errors (including abort)
      })

    return () => {
      controller.abort()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Grant summary header */}
      <GrantHeader grant={grant} isUrgent={isUrgent} />

      {/* Progress bar */}
      <ProgressBar completedCount={completedCount} totalCount={totalCount} />

      {/* Section editors */}
      <div className="space-y-8">
        {sortedFields.map((field, index) => {
          const section = sectionByFieldId.get(field.id)
          if (!section) return null

          const nextField = sortedFields[index + 1]
          const isFirstSection = index === 0
          const hasPreviewDraft =
            isFirstSection && section.ai_draft && !section.final_text && !section.is_saved

          return (
            <SectionEditor
              key={field.id}
              section={section}
              field={field}
              scoringRubric={grant.scoring_rubric}
              companyProfile={companyProfile}
              onSave={handleSave}
              sectionRef={setRef(field.id) as unknown as React.RefObject<HTMLDivElement | null>}
              onNextSection={
                nextField ? () => scrollToSection(nextField.id) : undefined
              }
              isPreview={!!hasPreviewDraft}
            />
          )
        })}
      </div>

      {/* Document checklist */}
      <DocumentChecklist
        documents={grant.required_documents}
        checkedIds={checkedDocs}
        onToggle={handleDocToggle}
      />

      {/* Export bar with copy/PDF/email buttons */}
      <ExportBar
        grantId={grant.id}
        grantName={grant.name}
        providerAgency={grant.provider_agency}
        sections={sections
          .filter((s) => s.final_text)
          .map((s) => {
            const field = fields.find((f) => f.id === s.grant_field_id)
            return {
              fieldLabel: field?.field_label ?? '',
              finalText: s.final_text!,
            }
          })}
        isAuthenticated={isAuthenticated}
        requiredDocuments={grant.required_documents}
        checkedDocuments={checkedDocs}
      />
    </div>
  )
}
