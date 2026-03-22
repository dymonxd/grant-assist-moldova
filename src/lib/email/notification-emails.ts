/**
 * Email template builders for notification system.
 *
 * 4 notification types: deadline reminder, abandoned draft, grant expiring, new grant match.
 * All templates use inline styles for email client compatibility and include
 * one-click unsubscribe link at the bottom.
 */

// --- Helpers ---

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildUnsubscribeUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/unsubscribe?token=${token}`
}

function formatDateRo(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ro-MD', { dateStyle: 'long' }).format(
      new Date(dateStr)
    )
  } catch {
    return dateStr
  }
}

function formatCurrencyRo(amount: number): string {
  return new Intl.NumberFormat('ro-MD', {
    style: 'currency',
    currency: 'MDL',
    maximumFractionDigits: 0,
  }).format(amount)
}

// --- Base email wrapper ---

function wrapEmail(bodyContent: string, unsubscribeToken: string): string {
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeToken)

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
    ${bodyContent}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #999; margin: 0; font-family: sans-serif;">
        Generat cu GrantAssist Moldova
      </p>
      <p style="font-size: 11px; color: #bbb; margin: 8px 0 0 0; font-family: sans-serif;">
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #bbb; text-decoration: underline;">Dezabonare de la notificari</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function ctaButton(text: string, url: string): string {
  return `<div style="margin-top: 24px;">
  <a href="${escapeHtml(url)}"
     style="display: inline-block; padding: 10px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-family: sans-serif;">
    ${escapeHtml(text)}
  </a>
</div>`
}

// --- Subject line helpers ---

export function getDeadlineReminderSubject(
  grantName: string,
  daysLeft: number
): string {
  return `Memento: ${grantName} - ${daysLeft} zile ramase`
}

export function getAbandonedDraftSubject(grantName: string): string {
  return `Cererea ta pentru ${grantName} asteapta`
}

export function getGrantExpiringSubject(grantName: string): string {
  return `${grantName} expira curand`
}

export function getNewGrantMatchSubject(grantName: string): string {
  return `Grant nou potrivit: ${grantName}`
}

// --- Template builders ---

export function buildDeadlineReminderEmail({
  grantName,
  deadline,
  daysLeft,
  ctaUrl,
  unsubscribeToken,
}: {
  grantName: string
  deadline: string
  daysLeft: number
  ctaUrl: string
  unsubscribeToken: string
}): string {
  const formattedDeadline = formatDateRo(deadline)

  const body = `
    <h2 style="font-size: 20px; color: #111; margin: 0 0 16px 0; font-family: sans-serif;">
      ${escapeHtml(grantName)}
    </h2>
    <p style="font-size: 14px; color: #333; line-height: 1.6; font-family: sans-serif;">
      Termenul limita pentru ${escapeHtml(grantName)} este ${escapeHtml(formattedDeadline)}.
      Mai aveti ${daysLeft} zile.
    </p>
    ${ctaButton('Continua cererea', ctaUrl)}`

  return wrapEmail(body, unsubscribeToken)
}

export function buildAbandonedDraftEmail({
  grantName,
  lastActivity,
  ctaUrl,
  unsubscribeToken,
}: {
  grantName: string
  lastActivity: string
  ctaUrl: string
  unsubscribeToken: string
}): string {
  const formattedDate = formatDateRo(lastActivity)

  const body = `
    <h2 style="font-size: 20px; color: #111; margin: 0 0 16px 0; font-family: sans-serif;">
      Cererea ta asteapta
    </h2>
    <p style="font-size: 14px; color: #333; line-height: 1.6; font-family: sans-serif;">
      Ultima activitate pentru <strong>${escapeHtml(grantName)}</strong>: ${escapeHtml(formattedDate)}.
      Continua de unde ai ramas.
    </p>
    ${ctaButton('Reia cererea', ctaUrl)}`

  return wrapEmail(body, unsubscribeToken)
}

export function buildGrantExpiringEmail({
  grantName,
  deadline,
  ctaUrl,
  unsubscribeToken,
}: {
  grantName: string
  deadline: string
  ctaUrl: string
  unsubscribeToken: string
}): string {
  const formattedDeadline = formatDateRo(deadline)

  const body = `
    <h2 style="font-size: 20px; color: #111; margin: 0 0 16px 0; font-family: sans-serif;">
      ${escapeHtml(grantName)} expira curand
    </h2>
    <p style="font-size: 14px; color: #333; line-height: 1.6; font-family: sans-serif;">
      Termenul limita: ${escapeHtml(formattedDeadline)}. Nu pierdeti aceasta oportunitate.
    </p>
    ${ctaButton('Aplica acum', ctaUrl)}`

  return wrapEmail(body, unsubscribeToken)
}

export function buildNewGrantMatchEmail({
  grantName,
  maxFunding,
  ctaUrl,
  unsubscribeToken,
}: {
  grantName: string
  maxFunding: number
  ctaUrl: string
  unsubscribeToken: string
}): string {
  const formattedAmount = formatCurrencyRo(maxFunding)

  const body = `
    <h2 style="font-size: 20px; color: #111; margin: 0 0 16px 0; font-family: sans-serif;">
      Grant nou potrivit
    </h2>
    <p style="font-size: 14px; color: #333; line-height: 1.6; font-family: sans-serif;">
      <strong>${escapeHtml(grantName)}</strong> - finantare pana la ${escapeHtml(formattedAmount)}.
    </p>
    ${ctaButton('Vizualizeaza grantul', ctaUrl)}`

  return wrapEmail(body, unsubscribeToken)
}
