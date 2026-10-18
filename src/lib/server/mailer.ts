import "server-only";
import { env } from "./env";

// Mail transport abstraction. Without SMTP configured (development) messages are
// written to the server console so links can be followed locally. Plug a provider
// (Resend, SES, Postmark) into `send` for production.
export async function sendMail(to: string, subject: string, text: string) {
  if (!env.isProd) {
    console.info(`\n[dev-mail] to=${to.replace(/(.{2}).*@/, "$1***@")} subject="${subject}"\n${text}\n`);
    return { delivered: false, dev: true };
  }
  throw new Error("Mail provider not configured");
}
