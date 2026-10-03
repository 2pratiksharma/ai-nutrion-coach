import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Development driver: writes emails to the log instead of sending them. */
class ConsoleMailer implements Mailer {
  async send(message: MailMessage) {
    if (env.isProduction) {
      logger.warn({ to: message.to, subject: message.subject }, "MAIL_DRIVER=console in production; email not delivered");
      return;
    }
    logger.info({ to: message.to, subject: message.subject }, `\n--- email ---\n${message.text}\n-------------`);
  }
}

// Add real drivers (Resend, SMTP) here and select them via MAIL_DRIVER.
export const mailer: Mailer = new ConsoleMailer();
