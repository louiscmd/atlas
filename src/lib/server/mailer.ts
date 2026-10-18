import "server-only";
import { env } from "./env";

// Mail transport abstraction. Without a provider configured, messages are
// printed to the server console in development; in production they are
// skipped with a warning (never logging the link, which contains a token).
// Plug a provider (Resend, Postmark, SES) into `send` for production.
export async function sendMail(to: string, subject: string, text: string) {
  if (!env.isProd) {
    console.info(`\n[dev-mail] to=${to.replace(/(.{2}).*@/, "$1***@")} subject="${subject}"\n${text}\n`);
    return { delivered: false, dev: true };
  }
  console.warn(`[mail] No email provider configured — skipped "${subject}"`);
  return { delivered: false, dev: false };
}
