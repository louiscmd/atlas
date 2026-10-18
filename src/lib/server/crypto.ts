import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
/** Keyed hash so a leaked DB can't be used to forge session/reset tokens. */
export const hashToken = (token: string) => createHmac("sha256", env.secret).update(token).digest("hex");
export const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
