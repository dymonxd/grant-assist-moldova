/**
 * Build HTML email content for grant application export.
 *
 * Uses template literals with inline styles for email client compatibility.
 * NOT a React Email component -- kept simple for this use case.
 */
export function buildApplicationEmailHtml({
  grantName,
  sections,
}: {
  grantName: string
  sections: Array<{ fieldLabel: string; finalText: string }>
}): string {
  const sectionHtml = sections
    .map(
      (section) => `
      <h3 style="font-size: 16px; color: #1a1a1a; margin: 20px 0 8px 0; font-family: sans-serif;">
        ${escapeHtml(section.fieldLabel)}
      </h3>
      <p style="font-size: 14px; color: #333; line-height: 1.6; margin: 0 0 16px 0; font-family: sans-serif; white-space: pre-wrap;">
        ${escapeHtml(section.finalText)}
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
        <h2 style="font-size: 22px; color: #111; margin: 0 0 24px 0; font-family: sans-serif;">
          ${escapeHtml(grantName)}
        </h2>

        ${sectionHtml}

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999; margin: 0; font-family: sans-serif;">
            Generat cu GrantAssist Moldova | ${new Date().toISOString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
