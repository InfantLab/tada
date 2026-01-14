/**
 * Email service using Nodemailer
 * Gracefully degrades when SMTP is not configured
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { createLogger } from "./logger";

const logger = createLogger("email");

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;
let emailConfig: EmailConfig | null = null;

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig | null {
  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const password = process.env["SMTP_PASSWORD"];

  if (!host || !user || !password) {
    return null;
  }

  return {
    host,
    port: parseInt(process.env["SMTP_PORT"] || "587", 10),
    secure: process.env["SMTP_SECURE"] === "true",
    user,
    password,
    from: process.env["SMTP_FROM"] || `Ta-Da! <${user}>`,
  };
}

/**
 * Initialize the email transporter
 */
function initTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  emailConfig = getEmailConfig();
  if (!emailConfig) {
    logger.warn("SMTP not configured - email features disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password,
    },
  });

  logger.info("Email transporter initialized", { host: emailConfig.host });
  return transporter;
}

/**
 * Check if email is configured and available
 */
export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

/**
 * Get the app URL for email links
 */
export function getAppUrl(): string {
  return process.env["APP_URL"] || "http://localhost:3000";
}

/**
 * Send an email
 * Returns true if sent successfully, false if email not configured or failed
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transport = initTransporter();

  if (!transport || !emailConfig) {
    // In development, log the email content for debugging
    if (process.env["NODE_ENV"] !== "production") {
      logger.info("Email not sent (SMTP not configured)", {
        to: options.to,
        subject: options.subject,
        // Only log in dev for debugging
        html: options.html.substring(0, 200) + "...",
      });
    }
    return false;
  }

  try {
    const result = await transport.sendMail({
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    });

    logger.info("Email sent successfully", {
      to: options.to,
      subject: options.subject,
      messageId: result.messageId,
    });

    return true;
  } catch (error) {
    logger.error("Failed to send email", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Verify SMTP connection
 * Useful for testing configuration
 */
export async function verifyEmailConnection(): Promise<boolean> {
  const transport = initTransporter();

  if (!transport) {
    return false;
  }

  try {
    await transport.verify();
    logger.info("SMTP connection verified");
    return true;
  } catch (error) {
    logger.error("SMTP connection failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Simple HTML to text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
