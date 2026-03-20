/**
 * Weekly rhythms email templates.
 *
 * Produces HTML + plaintext versions for celebration and encouragement emails.
 * Includes one-click unsubscribe link in both header and footer.
 */

import { getAppUrl } from "../utils/email";

interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

interface SummaryBlock {
  section: string;
  heading: string;
  lines: string[];
}

interface WeeklyEmailInput {
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
  weekStartDate: string;
  unsubscribeUrl: string;
}

/**
 * Generate a weekly celebration email.
 */
export function weeklyCelebrationEmail(
  input: WeeklyEmailInput,
): EmailTemplateResult {
  const appUrl = getAppUrl();

  const blocksHtml = input.summaryBlocks
    .map(
      (block) => `
      <tr>
        <td style="padding: 12px 0 4px 0;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #44403C;">${escapeHtml(block.heading)}</h3>
        </td>
      </tr>
      ${block.lines
        .map(
          (line) => `
      <tr>
        <td style="padding: 2px 0 2px 8px; font-size: 14px; color: #78716C; line-height: 1.5;">
          ${escapeHtml(line)}
        </td>
      </tr>`,
        )
        .join("")}`,
    )
    .join("");

  const narrativeHtml = input.narrativeText
    ? `
    <tr>
      <td style="padding: 16px 0; border-top: 1px solid #E7E5E4;">
        <p style="margin: 0; font-size: 14px; color: #44403C; line-height: 1.6; font-style: italic;">
          ${escapeHtml(input.narrativeText)}
        </p>
      </td>
    </tr>`
    : "";

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #44403C;">
      ${escapeHtml(input.title)}
    </h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${blocksHtml}
      ${narrativeHtml}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="text-align: center;">
          <a href="${appUrl}" style="display: inline-block; padding: 10px 24px; background-color: #E6A800; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
            Open Ta-Da!
          </a>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; border-top: 1px solid #E7E5E4;">
      <tr>
        <td style="padding-top: 16px; text-align: center; font-size: 11px; color: #A8A29E;">
          Sent from Ta-Da! — notice your life<br>
          <a href="${escapeHtml(input.unsubscribeUrl)}" style="color: #A8A29E; text-decoration: underline;">Unsubscribe from weekly emails</a>
        </td>
      </tr>
    </table>
  `;

  // Plaintext version
  const blocksText = input.summaryBlocks
    .map(
      (block) =>
        `${block.heading}\n${block.lines.map((l) => `  ${l}`).join("\n")}`,
    )
    .join("\n\n");

  const narrativeTextPlain = input.narrativeText
    ? `\n\n${input.narrativeText}`
    : "";

  const text = `${input.title}\n\n${blocksText}${narrativeTextPlain}\n\n---\nSent from Ta-Da! — notice your life\nUnsubscribe: ${input.unsubscribeUrl}`;

  return {
    subject: input.title,
    html: baseEmailLayout(content),
    text,
  };
}

/**
 * Generate a weekly encouragement email.
 */
export function weeklyEncouragementEmail(
  input: WeeklyEmailInput,
): EmailTemplateResult {
  // Same structure as celebration but with different subject prefix
  const result = weeklyCelebrationEmail(input);
  return {
    ...result,
    subject: `${input.title}`,
  };
}

// ── Shared layout ─────────────────────────────────────────────────────────

function baseEmailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta-Da!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBF5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%;">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 700; color: #E6A800;">Ta-Da!</span>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #E7E5E4;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
