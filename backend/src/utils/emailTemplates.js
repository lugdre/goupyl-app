const verificationEmail = (firstName, verifyUrl) => {
  const subject = 'Vérifiez votre adresse email — Goupyl Sport';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;color:#1e3a5f;font-weight:700;">Goupyl Sport</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.5;">
                Bonjour ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.5;">
                Merci de vous être inscrit sur Goupyl Sport. Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Vérifier mon email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5;">
                Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
              </p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                ${verifyUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;border-top:1px solid #f3f4f6;padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Goupyl Sport — La plateforme sport & bien-être
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
};

const invitationEmail = (companyName, registerUrl, expiresAt) => {
  const subject = `${companyName} vous invite à rejoindre Goupyl Sport`;
  const expiryDate = new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;color:#1e3a5f;font-weight:700;">Goupyl Sport</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.5;">
                Bonjour,
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.5;">
                <strong>${companyName}</strong> vous invite à rejoindre Goupyl Sport, la plateforme sport &amp; bien-être de votre entreprise.
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.5;">
                Créez votre compte en un clic pour accéder à vos séances de coaching, nutrition, bien-être et préparation mentale.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${registerUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Créer mon compte
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5;">
                Cette invitation est valable jusqu'au <strong>${expiryDate}</strong>.
              </p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
                ${registerUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;border-top:1px solid #f3f4f6;padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Goupyl Sport — La plateforme sport &amp; bien-être
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
};

module.exports = { verificationEmail, invitationEmail };
