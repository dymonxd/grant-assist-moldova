import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ApplicationPdfDocument } from '@/lib/pdf/application-pdf'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/writer/pdf
 *
 * Server-side PDF generation for grant application export.
 * Accepts section data, renders with Geist Sans font (Romanian diacritics),
 * and returns downloadable PDF binary.
 * Requires authentication (EXPRT-04).
 */
export async function POST(request: Request) {
  try {
    // Auth gate — PDF export requires authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Autentificarea este necesara pentru descarcarea PDF' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

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
