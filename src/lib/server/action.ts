import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod/v4";
import { NotFoundError } from "./services/plans";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a server action body: converts thrown errors into human-readable
 * messages and never leaks internals (stack traces, SQL, provider errors).
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // Next.js redirect/notFound use thrown errors — let them through.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    if (err instanceof NotFoundError) return { ok: false, error: "We couldn't find that. It may have been deleted." };
    if (err instanceof ZodError) return { ok: false, error: "Some of the values aren't valid. Please check and try again." };
    if (err instanceof Prisma.PrismaClientKnownRequestError || err instanceof Prisma.PrismaClientValidationError) {
      console.error("[action] database error", (err as { code?: string }).code ?? "validation");
      return { ok: false, error: "We couldn't save that. Please try again." };
    }
    if (err instanceof Error && err.constructor === Error && err.message.length < 160) return { ok: false, error: err.message };
    console.error("[action] unexpected error", err instanceof Error ? err.name : typeof err);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}
