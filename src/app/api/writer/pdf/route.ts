import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ApplicationPdfDocument } from '@/lib/pdf/application-pdf'

/**
 * POST /api/writer/pdf
 *
 * Server-side PDF generation for grant application export.
 * Accepts section data, renders with Geist Sans font (Romanian diacritics),
 * and returns downloadable PDF binary.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grantName, providerAgency, sections } = body

    // Validate required fields
    if (!grantName || !sections || !Array.isArray(sections)) {
      return new Response(
        JSON.stringify({ error: 'grantName si sections sunt obligatorii' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create PDF document element
    const element = React.createElement(ApplicationPdfDocument, {
      grantName,
      providerAgency: providerAgency ?? '',
      sections,
    })

    // Render to buffer
    const buffer = await renderToBuffer(element)

    // Sanitize grant name for filename
    const sanitized = grantName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cerere-${sanitized}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Eroare la generarea PDF-ului'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
