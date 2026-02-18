/**
 * Quick script to send a test email via Ethereal (preview service)
 * or real SMTP if configured.
 *
 * Usage: node send-test-email.mjs [template] [to-email]
 */

import nodemailer from "nodemailer";

const APP_URL = "https://tada.living";

// --- Template helpers (duplicated from server for standalone use) ---

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta-Da!</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F0EB;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #2B0F3A; padding: 28px 32px; text-align: center;">
              <a href="${APP_URL}" style="text-decoration: none;">
                <!--[if mso]><table role="presentation" width="100%"><tr><td style="background-color: #2B0F3A; padding: 28px 32px; text-align: center;"><![endif]-->
                <img src="${APP_URL}/icons/tada-logotype.png" alt="Ta-Da!" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border: 0;" />
                <!--[if mso]></td></tr></table><![endif]-->
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top: 1px solid #E7E5E4; padding-top: 20px; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #78716C;">
                      Sent from <a href="${APP_URL}" style="color: #E6A800; text-decoration: none; font-weight: 500;">Ta-Da!</a> — notice your life
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #A8A29E;">
                      If you didn't request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px auto;">
  <tr>
    <td align="center" style="background-color: #E6A800; border-radius: 8px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" fillcolor="#E6A800"><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #E6A800; color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; line-height: 1;">${label}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function calloutBox(icon, text) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: #FFFBF5; border-left: 3px solid #E6A800; padding: 12px 16px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-size: 14px; color: #44403C;">${icon} ${text}</p>
    </td>
  </tr>
</table>`;
}

function fallbackLink(url) {
  return `<p style="margin: 16px 0 0 0; font-size: 12px; color: #A8A29E; line-height: 1.5;">
  If the button doesn't work, copy and paste this link into your browser:<br>
  <a href="${url}" style="color: #E6A800; word-break: break-all;">${url}</a>
</p>`;
}

// --- Templates ---

const templates = {
  verify: (username) => {
    const url = `${APP_URL}/verify-email?token=test-preview-token`;
    return {
      subject: "Verify your Ta-Da! email",
      html: baseLayout(`
        <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Verify Your Email</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
          Hi ${username}, please confirm your email address so you can get the most out of Ta-Da!
        </p>
        ${ctaButton("Verify Email", url)}
        ${calloutBox("⏰", "This link expires in 24 hours.")}
        ${fallbackLink(url)}
      `),
    };
  },
  welcome: (username) => ({
    subject: "Welcome to Ta-Da! ⚡",
    html: baseLayout(`
      <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Welcome to Ta-Da! ⚡</h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
        Hi ${username}, you're in! Ta-Da! is your space for celebrating what you do — sessions, wins, moments, and the rhythms that shape who you're becoming.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">⏱️ &nbsp;Timed sessions for meditation, focus, or creative flow</td></tr>
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">⚡ &nbsp;Ta-Da! wins — celebrate accomplishments big and small</td></tr>
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">✨ &nbsp;Moments — dreams, magic, gratitude, and reflections</td></tr>
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">📊 &nbsp;Tallies and rhythms that notice your patterns</td></tr>
      </table>
      ${ctaButton("Get Started", APP_URL)}
    `),
  }),
  supporter: (username) => ({
    subject: "Welcome, Supporter! ⚡ Thank you for backing Ta-Da!",
    html: baseLayout(`
      <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">You're a Supporter! ⚡</h2>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
        Hi ${username}, thank you for supporting Ta-Da! Your contribution keeps this project alive and independent.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">🌳 &nbsp;Unlimited data retention — your journey is yours forever</td></tr>
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">☁️ &nbsp;Priority cloud features as they're built</td></tr>
        <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">💛 &nbsp;You're directly funding mindful, ad-free software</td></tr>
      </table>
      ${calloutBox("🙏", "Your support means the world. Ta-Da! is built by one person, for everyone.")}
      ${ctaButton("Continue to Ta-Da!", APP_URL)}
    `),
  }),
};

// --- Main ---

const templateName = process.argv[2] || "verify";
const toEmail = process.argv[3] || "infantologist@gmail.com";
const username = "infantologist";

const templateFn = templates[templateName];
if (!templateFn) {
  console.error(`Unknown template: ${templateName}`);
  console.error(`Available: ${Object.keys(templates).join(", ")}`);
  process.exit(1);
}

const email = templateFn(username);

// Check for real SMTP config
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;

let transporter;
let isEthereal = false;

if (smtpHost && smtpUser && smtpPass) {
  console.log(`Using real SMTP: ${smtpHost}`);
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });
} else {
  console.log("No SMTP configured — using Ethereal test service...");
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  isEthereal = true;
}

console.log(`Sending "${templateName}" email to ${toEmail}...`);

const info = await transporter.sendMail({
  from: '"Ta-Da!" <hello@tada.living>',
  to: toEmail,
  subject: `[TEST] ${email.subject}`,
  html: email.html,
});

console.log(`\n✅ Email sent! Message ID: ${info.messageId}`);

if (isEthereal) {
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`\n📧 Preview URL (open in browser):\n${previewUrl}`);
  console.log(`\n(This is an Ethereal preview — it won't arrive in your real inbox.`);
  console.log(`To send to your real inbox, configure SMTP_HOST/USER/PASSWORD in .env)`);
}
