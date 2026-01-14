/**
 * Email template utilities
 */

import { getAppUrl } from "../utils/email";

interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base email layout with Ta-Da branding
 */
function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta-Da!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo h1 {
      font-size: 32px;
      margin: 0;
      color: #6B46C1;
    }
    .content {
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #6B46C1;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #553C9A;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }
    .warning {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }
    .link-fallback {
      word-break: break-all;
      color: #6B46C1;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎉 Ta-Da!</h1>
    </div>
    ${content}
    <div class="footer">
      <p>This email was sent from Ta-Da!</p>
      <p>If you didn't request this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Password reset email template
 */
export function passwordResetEmail(
  username: string,
  resetToken: string
): EmailTemplateResult {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(
    resetToken
  )}`;

  const content = `
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hi ${username},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <div class="warning">
        <strong>⏰ This link expires in 6 hours.</strong>
        <br>If you didn't request this, you can safely ignore this email.
      </div>
      <p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
    </div>
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
    <div class="content">
      <h2>Welcome to Ta-Da! 🎉</h2>
      <p>Hi ${username},</p>
      <p>Thanks for joining Ta-Da! We're excited to help you track your activities and celebrate your accomplishments.</p>
      <p>Here are some things you can do:</p>
      <ul>
        <li>🧘 Track meditation and mindfulness sessions</li>
        <li>📝 Log journal entries and dreams</li>
        <li>✅ Record accomplishments and ta-das</li>
        <li>📊 Build rhythms with gentle tracking</li>
      </ul>
      <p style="text-align: center;">
        <a href="${appUrl}" class="button">Get Started</a>
      </p>
    </div>
  `;

  const text = `
Welcome to Ta-Da! 🎉

Hi ${username},

Thanks for joining Ta-Da! We're excited to help you track your activities and celebrate your accomplishments.

Here are some things you can do:
- 🧘 Track meditation and mindfulness sessions
- 📝 Log journal entries and dreams
- ✅ Record accomplishments and ta-das
- 📊 Build rhythms with gentle tracking

Get started: ${appUrl}

- Ta-Da!
`.trim();

  return {
    subject: "Welcome to Ta-Da! 🎉",
    html: baseLayout(content),
    text,
  };
}

/**
 * Email verification template
 */
export function emailVerificationEmail(
  username: string,
  verificationToken: string
): EmailTemplateResult {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(
    verificationToken
  )}`;

  const content = `
    <div class="content">
      <h2>Verify Your Email</h2>
      <p>Hi ${username},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="button">Verify Email</a>
      </p>
      <div class="warning">
        <strong>⏰ This link expires in 24 hours.</strong>
      </div>
      <p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
    </div>
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
 * Password changed notification email
 */
export function passwordChangedEmail(username: string): EmailTemplateResult {
  const appUrl = getAppUrl();

  const content = `
    <div class="content">
      <h2>Password Changed</h2>
      <p>Hi ${username},</p>
      <p>Your Ta-Da! password was successfully changed.</p>
      <div class="warning">
        <strong>🔒 Wasn't you?</strong>
        <br>If you didn't change your password, please reset it immediately and contact support.
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/forgot-password" class="button">Reset Password</a>
      </p>
    </div>
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
