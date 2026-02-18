/**
 * Email template utilities
 *
 * All emails use the Ta-Da! brand palette (gold accent, warm stone tones)
 * and the canonical ⚡ logotype. Never use 🎉 for Ta-Da! branding.
 */

import { getAppUrl } from "../utils/email";

interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base email layout with Ta-Da! branding
 *
 * Uses table-based layout for maximum email client compatibility.
 * Brand colors: gold #E6A800, stone #44403C / #78716C, warm white #FFFBF5.
 */
function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta-Da!</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F0EB;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Inner card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Logo header -->
          <tr>
            <td style="background-color: #2B0F3A; padding: 28px 32px; text-align: center;">
              <a href="${getAppUrl()}" style="text-decoration: none;">
                <!--[if mso]><table role="presentation" width="100%"><tr><td style="background-color: #2B0F3A; padding: 28px 32px; text-align: center;"><![endif]-->
                <img src="${getAppUrl()}/icons/tada-logotype.png" alt="Ta-Da!" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border: 0;" />
                <!--[if mso]></td></tr></table><![endif]-->
              </a>
            </td>
          </tr>
          <!-- Content area -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top: 1px solid #E7E5E4; padding-top: 20px; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #78716C;">
                      Sent from <a href="${getAppUrl()}" style="color: #E6A800; text-decoration: none; font-weight: 500;">Ta-Da!</a> — notice your life
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
</html>
`;
}

/** Branded CTA button */
function ctaButton(label: string, url: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px auto;">
  <tr>
    <td align="center" style="background-color: #E6A800; border-radius: 8px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" fillcolor="#E6A800"><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">
        ${label}
      </center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #E6A800; color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; line-height: 1;">
        ${label}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/** Warning/info callout box */
function calloutBox(icon: string, text: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: #FFFBF5; border-left: 3px solid #E6A800; padding: 12px 16px; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-size: 14px; color: #44403C;">${icon} ${text}</p>
    </td>
  </tr>
</table>`;
}

/** Fallback link for when buttons don't work */
function fallbackLink(url: string): string {
  return `
<p style="margin: 16px 0 0 0; font-size: 12px; color: #A8A29E; line-height: 1.5;">
  If the button doesn't work, copy and paste this link into your browser:<br>
  <a href="${url}" style="color: #E6A800; word-break: break-all;">${url}</a>
</p>`;
}

/**
 * Email verification template
 */
export function emailVerificationEmail(
  username: string,
  verificationToken: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Verify Your Email</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, please confirm your email address so you can get the most out of Ta-Da!
    </p>
    ${ctaButton("Verify Email", verifyUrl)}
    ${calloutBox("⏰", "This link expires in 24 hours.")}
    ${fallbackLink(verifyUrl)}
  `;

  const text = `
Verify Your Email

Hi ${username},

Please verify your email address by visiting the link below:

${verifyUrl}

This link expires in 24 hours.

- Ta-Da!
`.trim();

  return {
    subject: "Verify your Ta-Da! email",
    html: baseLayout(content),
    text,
  };
}

/**
 * Password reset email template
 */
export function passwordResetEmail(
  username: string,
  resetToken: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Reset Your Password</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, we received a request to reset your password. Tap the button below to create a new one.
    </p>
    ${ctaButton("Reset Password", resetUrl)}
    ${calloutBox("⏰", "This link expires in 6 hours. If you didn't request this, you can safely ignore it.")}
    ${fallbackLink(resetUrl)}
  `;

  const text = `
Reset Your Password

Hi ${username},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link expires in 6 hours.

If you didn't request this, you can safely ignore this email.

- Ta-Da!
`.trim();

  return {
    subject: "Reset your Ta-Da! password",
    html: baseLayout(content),
    text,
  };
}

/**
 * Welcome email template
 */
export function welcomeEmail(username: string): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
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
    ${ctaButton("Get Started", appUrl)}
  `;

  const text = `
Welcome to Ta-Da! ⚡

Hi ${username},

You're in! Ta-Da! is your space for celebrating what you do — sessions, wins, moments, and the rhythms that shape who you're becoming.

- Timed sessions for meditation, focus, or creative flow
- Ta-Da! wins — celebrate accomplishments big and small
- Moments — dreams, magic, gratitude, and reflections
- Tallies and rhythms that notice your patterns

Get started: ${appUrl}

- Ta-Da!
`.trim();

  return {
    subject: "Welcome to Ta-Da! ⚡",
    html: baseLayout(content),
    text,
  };
}

/**
 * Password changed notification email
 */
export function passwordChangedEmail(username: string): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Password Changed</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, your Ta-Da! password was successfully changed.
    </p>
    ${calloutBox("🔒", "If you didn't make this change, reset your password immediately.")}
    ${ctaButton("Reset Password", `${appUrl}/forgot-password`)}
  `;

  const text = `
Password Changed

Hi ${username},

Your Ta-Da! password was successfully changed.

If you didn't change your password, please reset it immediately:
${appUrl}/forgot-password

- Ta-Da!
`.trim();

  return {
    subject: "Your Ta-Da! password was changed",
    html: baseLayout(content),
    text,
  };
}

// ============================================================
// Supporter / Subscription Lifecycle Emails
// ============================================================

/**
 * New supporter welcome email — sent on checkout.session.completed
 */
export function supporterWelcomeEmail(
  username: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Welcome, Supporter! ⚡</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      I'm genuinely delighted you've chosen to support Ta-Da! It means a huge amount to me personally.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      I built Ta-Da! because I believe we should spend more time noticing the good things in our lives. The things we do, the small wins, the quiet moments. Your support helps keep it independent, ad-free, and focused on what matters.
    </p>
    <p style="margin: 0 0 8px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      As a supporter you get:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
      <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">🌳 &nbsp;Unlimited data retention — your journey is yours forever</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">☁️ &nbsp;Priority access to new features as they're built</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: #57534E;">💛 &nbsp;The knowledge you're funding mindful, independent software</td></tr>
    </table>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      If you ever have ideas, feedback, or just want to say hello, reply to this email. I read every message.
    </p>
    ${ctaButton("Continue to Ta-Da!", appUrl)}
    <p style="margin: 24px 0 0 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      With gratitude,<br>
      <strong style="color: #1C1917;">Caspar</strong><br>
      <span style="font-size: 13px; color: #78716C;">Creator of Ta-Da!</span>
    </p>
  `;

  const text = `
Welcome, Supporter! ⚡

Hi ${username},

I'm genuinely delighted you've chosen to support Ta-Da! It means a huge amount to me personally.

I built Ta-Da! because I believe we should spend more time noticing the good things in our lives. The things we do, the small wins, the quiet moments. Your support helps keep it independent, ad-free, and focused on what matters.

As a supporter you get:
- Unlimited data retention — your journey is yours forever
- Priority access to new features as they're built
- The knowledge you're funding mindful, independent software

If you ever have ideas, feedback, or just want to say hello, reply to this email. I read every message.

Continue: ${appUrl}

With gratitude,
Caspar
Creator of Ta-Da!
`.trim();

  return {
    subject: "Welcome, Supporter! ⚡ Thank you for backing Ta-Da!",
    html: baseLayout(content),
    text,
  };
}

/**
 * Subscription renewed — sent on invoice.paid (for recurring payments)
 */
export function subscriptionRenewedEmail(
  username: string,
  nextRenewalDate: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Subscription Renewed ⚡</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, thank you for another year of supporting Ta-Da! Your continued support keeps this project going and I'm truly grateful.
    </p>
    ${calloutBox("📅", `Your next renewal is ${nextRenewalDate}.`)}
    <p style="margin: 20px 0 0 0; font-size: 14px; color: #78716C; line-height: 1.5;">
      You can manage your subscription anytime from <a href="${appUrl}/settings" style="color: #E6A800; text-decoration: none; font-weight: 500;">Settings</a>.
    </p>
    <p style="margin: 20px 0 0 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      With gratitude,<br>
      <strong style="color: #1C1917;">Caspar</strong>
    </p>
  `;

  const text = `
Subscription Renewed ⚡

Hi ${username},

Thank you for another year of supporting Ta-Da! Your continued support keeps this project going and I'm truly grateful.

Next renewal: ${nextRenewalDate}

Manage your subscription: ${appUrl}/settings

With gratitude,
Caspar
`.trim();

  return {
    subject: "Your Ta-Da! subscription has been renewed",
    html: baseLayout(content),
    text,
  };
}

/**
 * Subscription cancelled — sent on customer.subscription.deleted
 */
export function subscriptionCancelledEmail(
  username: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Subscription Cancelled</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, your Ta-Da! supporter subscription has been cancelled. We're sorry to see you go.
    </p>
    ${calloutBox("📋", "Your data is safe. You'll keep free-tier access with up to 365 days of data retention.")}
    <p style="margin: 20px 0 0 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      If you change your mind, you can resubscribe anytime. Your journey continues either way — Ta-Da! is about celebrating who you're becoming.
    </p>
    ${ctaButton("Resubscribe", `${appUrl}/settings`)}
    <p style="margin: 20px 0 0 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      All the best,<br>
      <strong style="color: #1C1917;">Caspar</strong>
    </p>
  `;

  const text = `
Subscription Cancelled

Hi ${username},

Your Ta-Da! supporter subscription has been cancelled. We're sorry to see you go.

Your data is safe. You'll keep free-tier access with up to 365 days of data retention.

If you change your mind, you can resubscribe anytime: ${appUrl}/settings

Your journey continues either way — Ta-Da! is about celebrating who you're becoming.

All the best,
Caspar
`.trim();

  return {
    subject: "Your Ta-Da! subscription has been cancelled",
    html: baseLayout(content),
    text,
  };
}

/**
 * Payment failed — sent on invoice.payment_failed
 */
export function paymentFailedEmail(
  username: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Payment Issue</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, we weren't able to process your latest payment for Ta-Da! This is usually a temporary issue with your card.
    </p>
    ${calloutBox("💳", "We'll retry automatically over the next few days. If the issue persists, please update your payment method.")}
    ${ctaButton("Update Payment Method", `${appUrl}/settings`)}
    <p style="margin: 20px 0 0 0; font-size: 14px; color: #78716C; line-height: 1.5;">
      Your account will remain active during this time. No action needed if the retry succeeds.
    </p>
  `;

  const text = `
Payment Issue

Hi ${username},

We weren't able to process your latest payment for Ta-Da! This is usually a temporary issue with your card.

We'll retry automatically over the next few days. If the issue persists, please update your payment method:
${appUrl}/settings

Your account will remain active during this time.

- Ta-Da!
`.trim();

  return {
    subject: "Ta-Da! payment issue — action may be needed",
    html: baseLayout(content),
    text,
  };
}

/**
 * Payment recovered — sent on invoice.paid when previously past_due
 */
export function paymentRecoveredEmail(
  username: string,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1C1917;">Payment Successful ⚡</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #57534E; line-height: 1.6;">
      Hi ${username}, great news — your payment has been processed successfully and your supporter subscription is back on track.
    </p>
    ${calloutBox("✅", "No action needed. Everything is working perfectly.")}
    ${ctaButton("Continue to Ta-Da!", appUrl)}
  `;

  const text = `
Payment Successful ⚡

Hi ${username},

Great news — your payment has been processed successfully and your supporter subscription is back on track.

No action needed. Everything is working perfectly.

Continue: ${appUrl}

- Ta-Da!
`.trim();

  return {
    subject: "Ta-Da! payment successful — you're all set!",
    html: baseLayout(content),
    text,
  };
}
