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

  return NextResponse.redirect(
    new URL('/settings?unsubscribed=true', request.url),
    302
  )
}
