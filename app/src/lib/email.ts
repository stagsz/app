import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Use Resend's test address until you verify a custom domain
const FROM_EMAIL = process.env.FROM_EMAIL || 'SimpleSign <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface SendSigningRequestParams {
  to: string
  signerName: string
  documentTitle: string
  senderName: string
  accessToken: string
}

export async function sendSigningRequest({
  to,
  signerName,
  documentTitle,
  senderName,
  accessToken
}: SendSigningRequestParams): Promise<{ success: boolean; signingUrl: string; error?: unknown }> {
  const signingUrl = `${APP_URL}/sign/${accessToken}`

  // If Resend is not configured, return success with signing URL
  if (!resend) {
    console.log('Resend not configured. Signing URL:', signingUrl)
    return { success: true, signingUrl }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${senderName} har skickat ett dokument för signering`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">SimpleSign</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">
                        Hej ${signerName},
                      </p>
                      <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                        <strong>${senderName}</strong> har skickat dokumentet <strong>"${documentTitle}"</strong> till dig för signering.
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 16px 0;">
                            <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Granska och signera
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
                        Eller kopiera denna länk till din webbläsare:
                      </p>
                      <p style="margin: 8px 0 0; color: #7c3aed; font-size: 14px; word-break: break-all;">
                        ${signingUrl}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        Detta mail skickades via SimpleSign. Om du inte förväntat dig detta mail, kan du ignorera det.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send email:', error)
      // Return success anyway so the document flow continues
      return { success: true, signingUrl, error }
    }

    console.log('Email sent successfully:', data)
    return { success: true, signingUrl }
  } catch (error) {
    console.error('Email error:', error)
    // Return success anyway so the document flow continues
    return { success: true, signingUrl, error }
  }
}

interface SendCompletionNotificationParams {
  to: string
  recipientName: string
  documentTitle: string
  downloadUrl?: string
}

export async function sendCompletionNotification({
  to,
  recipientName,
  documentTitle,
  downloadUrl
}: SendCompletionNotificationParams) {
  if (!resend) {
    console.log('Resend not configured. Would send completion email to:', to)
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Dokumentet "${documentTitle}" har signerats`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Signerat!</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">
                        Hej ${recipientName},
                      </p>
                      <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                        Dokumentet <strong>"${documentTitle}"</strong> har nu signerats av alla parter.
                      </p>

                      ${downloadUrl ? `
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 16px 0;">
                            <a href="${downloadUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Ladda ner dokument
                            </a>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        SimpleSign - E-signaturer för småföretag
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Failed to send completion email:', error)
      return { success: true, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    return { success: true, error }
  }
}
