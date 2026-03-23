'use client'

import { useState } from 'react'
import { Copy, Download, Mail, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccountWallModal } from '@/components/auth/account-wall-modal'
import { sendApplicationEmail, saveReminderOptIn } from '@/app/actions/export'
import { trackEvent } from '@/app/actions/analytics'

/**
 * Export bar with copy/PDF/email buttons, auth gating, deadline reminder opt-in,
 * and document checklist completion summary.
 *
 * - Copy: Available to ALL users (no auth gate)
 * - PDF/Email: Requires authentication (AccountWallModal for anonymous)
 * - Analytics: Fires application_exported on each successful export
 *
 * Requirements: EXPRT-01, EXPRT-04, EXPRT-05, EXPRT-06
 */

interface ExportBarProps {
  grantId: string
  grantName: string
  providerAgency: string
  sections: Array<{ fieldLabel: string; finalText: string }>
  isAuthenticated: boolean
  requiredDocuments: string[] | null
  checkedDocuments: Set<number>
}

export function ExportBar({
  grantId,
  grantName,
  providerAgency,
  sections,
  isAuthenticated,
  requiredDocuments,
  checkedDocuments,
}: ExportBarProps) {
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [reminderChecked, setReminderChecked] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)

  // ---- Copy to clipboard (no auth required) ----
  const handleCopy = async () => {
    const text = sections
      .map((s) => `${s.fieldLabel}\n===\n${s.finalText}`)
      .join('\n\n---\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // Fire analytics (non-blocking)
      trackEvent({
        eventType: 'application_exported',
        eventData: { method: 'clipboard' },
      })
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  // ---- Download PDF (auth required) ----
  const handlePdf = async () => {
    if (!isAuthenticated) {
      setShowModal(true)
      return
    }

    setPdfLoading(true)
    try {
      const res = await fetch('/api/writer/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantName, providerAgency, sections }),
      })

      if (!res.ok) throw new Error('PDF generation failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cerere-${grantName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Fire analytics (non-blocking)
      trackEvent({
        eventType: 'application_exported',
        eventData: { method: 'pdf' },
      })
    } catch {
      // PDF download failed silently
    } finally {
      setPdfLoading(false)
    }
  }

  // ---- Send via email (auth required) ----
  const handleEmail = async () => {
    if (!isAuthenticated) {
      setShowModal(true)
      return
    }

    setEmailLoading(true)
    setEmailStatus('idle')
    try {
      const result = await sendApplicationEmail(
        grantName,
        sections
      )

      if ('error' in result) {
        setEmailStatus('error')
      } else {
        setEmailStatus('success')

        // Fire analytics (non-blocking)
        trackEvent({
          eventType: 'application_exported',
          eventData: { method: 'email' },
        })
      }
    } catch {
      setEmailStatus('error')
    } finally {
      setEmailLoading(false)
    }
  }

  // ---- Deadline reminder opt-in ----
  const handleReminderToggle = async () => {
    if (reminderChecked) return // Already opted in

    setReminderSaving(true)
    const result = await saveReminderOptIn(grantId)

    if (!('error' in result)) {
      setReminderChecked(true)
    }
    setReminderSaving(false)
  }

  // ---- Document completion count ----
  const totalDocs = requiredDocuments?.length ?? 0
  const checkedCount = checkedDocuments.size

  return (
    <>
      <Card>
        <CardContent className="space-y-4 py-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Exporta cererea
          </h3>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="size-4 text-green-600" />
                  Copiat!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copiaza tot
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handlePdf}
              disabled={pdfLoading}
              className="gap-2"
            >
              <Download className="size-4" />
              {pdfLoading ? 'Se genereaza...' : 'Descarca PDF'}
            </Button>

            <Button
              variant="outline"
              onClick={handleEmail}
              disabled={emailLoading}
              className="gap-2"
            >
              <Mail className="size-4" />
              {emailLoading ? 'Se trimite...' : 'Trimite pe email'}
            </Button>
          </div>

          {/* Email status feedback */}
          {emailStatus === 'success' && (
            <p className="text-sm text-green-600">
              Emailul a fost trimis cu succes!
            </p>
          )}
          {emailStatus === 'error' && (
            <p className="text-sm text-red-600">
              Nu am putut trimite emailul. Incercati din nou.
            </p>
          )}

          {/* Deadline reminder opt-in (authenticated only) */}
          {isAuthenticated && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderChecked}
                onChange={handleReminderToggle}
                disabled={reminderSaving || reminderChecked}
                className="mt-0.5 size-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">
                Notifica-ma cu 7 zile si 3 zile inainte de termenul limita
              </span>
            </label>
          )}

          {/* Required documents completion summary */}
          {totalDocs > 0 && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              {checkedCount} din {totalDocs} documente pregatite
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth gate modal for unauthenticated PDF/email */}
      <AccountWallModal
        open={showModal}
        onOpenChange={setShowModal}
        grantId={grantId}
      />
    </>
  )
}
