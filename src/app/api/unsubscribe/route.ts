/**
 * One-click unsubscribe endpoint.
 *
 * GET /api/unsubscribe?token=UUID
 *
 * Looks up the unsubscribe token in notifications_log,
 * disables email_notifications for the user,
 * and redirects to /settings?unsubscribed=true.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  findUserByUnsubscribeToken,
  disableEmailNotifications,
} from '@/lib/email/unsubscribe'

// UUID v4 format regex
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token || !UUID_RE.test(token)) {
    return new NextResponse('Link invalid', { status: 400 })
  }

  const userId = await findUserByUnsubscribeToken(token)

  if (!userId) {
    return new NextResponse('Link invalid', { status: 400 })
  }

  await disableEmailNotifications(userId)

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dezabonat</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa">
<div style="text-align:center;max-width:400px;padding:2rem">
<h1 style="font-size:1.25rem;margin-bottom:0.5rem">Ai fost dezabonat</h1>
<p style="color:#666;margin-bottom:1.5rem">Nu vei mai primi notificari prin email de la GrantAssist.</p>
<a href="/" style="color:#2563eb;text-decoration:none">Inapoi la pagina principala</a>
</div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
